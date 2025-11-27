/**
 * System Bank Service
 * Quản lý ngân hàng hệ thống (1 bank nội bộ, 1 account main)
 */

const { bank, bankAccount } = require('../Models');
const { getDatabase } = require('../Config/database');

class SystemBankService {
  /**
   * Lấy hoặc tạo system bank (ngân hàng nội bộ)
   * @returns {Promise<Object>} Bank object
   */
  static async getOrCreateSystemBank() {
    try {
      // Tìm bank nội bộ đầu tiên - Use SQL LIMIT 1 instead of JavaScript array access
      const systemBank = await bank.findFirstInternalBank();
      
      if (systemBank) {
        console.log('[SystemBankService] ✅ Found existing system bank:', systemBank.bank_id);
        return systemBank;
      }

      // Nếu chưa có, tạo mới
      console.log('[SystemBankService] 🔄 Creating new system bank...');
      const db = getDatabase();
      
      const [result] = await db.execute(
        `INSERT INTO \`banks\` 
        (\`provider_name\`, \`provider_code\`, \`is_internal\`, \`country\`, \`notes\`) 
        VALUES (?, ?, ?, ?, ?)`,
        [
          'Ngân Hàng Hệ Thống CoCo',
          'SYSTEM_COCO',
          1, // is_internal = true
          'VN',
          'Ngân hàng nội bộ của hệ thống CoCo - Tất cả thanh toán sẽ được ghi vào đây'
        ]
      );

      const newBank = await bank.findById(result.insertId);
      console.log('[SystemBankService] ✅ Created system bank:', newBank.bank_id);
      return newBank;
    } catch (error) {
      console.error('[SystemBankService] ❌ Error in getOrCreateSystemBank:', error);
      throw error;
    }
  }

  /**
   * Lấy hoặc tạo system account (tài khoản main)
   * @returns {Promise<Object>} BankAccount object
   */
  static async getOrCreateSystemAccount() {
    try {
      // Lấy system bank trước
      const systemBank = await this.getOrCreateSystemBank();

      // Tìm account main của system bank - Use SQL WHERE clause instead of JavaScript filter
      const mainAccount = await bankAccount.findByBankIdTypeAndInternal(systemBank.bank_id, 'main', 1);

      if (mainAccount) {
        console.log('[SystemBankService] ✅ Found existing system account:', mainAccount.account_id);
        return mainAccount;
      }

      // Nếu chưa có, tạo mới
      console.log('[SystemBankService] 🔄 Creating new system account...');
      const db = getDatabase();
      
      const [result] = await db.execute(
        `INSERT INTO \`bank_accounts\` 
        (\`bank_id\`, \`account_name\`, \`account_number\`, \`account_type\`, \`currency\`, \`is_internal\`, \`status\`) 
        VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          systemBank.bank_id,
          'CoCo - Tài Khoản Chính',
          'SYSTEM_MAIN_001',
          'main',
          'VND',
          1, // is_internal = true
          'active'
        ]
      );

      const newAccount = await bankAccount.findById(result.insertId);
      console.log('[SystemBankService] ✅ Created system account:', newAccount.account_id);
      return newAccount;
    } catch (error) {
      console.error('[SystemBankService] ❌ Error in getOrCreateSystemAccount:', error);
      throw error;
    }
  }

  /**
   * Ghi tiền vào system account khi thanh toán thành công
   * @param {number} amount - Số tiền
   * @param {number} orderId - Order ID
   * @param {number} paymentId - Payment ID
   * @param {string} description - Mô tả
   * @param {string} gateway - Gateway (MOMO, COD, etc.)
   * @param {string} externalTxnId - External transaction ID (nếu có)
   * @returns {Promise<Object>} BankTransaction object hoặc null nếu đã tồn tại
   */
  static async recordPayment(amount, orderId, paymentId, description, gateway = null, externalTxnId = null) {
    try {
      console.log('[SystemBankService] 💰 Recording payment:', {
        amount,
        orderId,
        paymentId,
        description,
        gateway,
        externalTxnId
      });

      // Kiểm tra xem đã có transaction cho payment này chưa (tránh duplicate) - Use SQL LIMIT 1 instead of JavaScript array access
      const { bankTransaction } = require('../Models');
      const existingTransaction = await bankTransaction.findFirstByPaymentId(paymentId);
      if (existingTransaction) {
        console.log('[SystemBankService] ⚠️ Payment already recorded, skipping:', paymentId);
        return existingTransaction;
      }

      // Kiểm tra bằng external_txn_id nếu có
      if (externalTxnId) {
        const existingByExternal = await bankTransaction.findByExternalTxnId(externalTxnId);
        if (existingByExternal) {
          console.log('[SystemBankService] ⚠️ Transaction with external ID already exists, skipping:', externalTxnId);
          return existingByExternal;
        }
      }

      // Lấy system account
      const systemAccount = await this.getOrCreateSystemAccount();

      // Lấy số dư hiện tại
      const currentBalance = parseFloat(systemAccount.balance || 0);
      const currentAvailableBalance = parseFloat(systemAccount.available_balance || 0);

      // Cập nhật số dư
      const newBalance = currentBalance + parseFloat(amount);
      const newAvailableBalance = currentAvailableBalance + parseFloat(amount);

      await bankAccount.update(systemAccount.account_id, {
        balance: newBalance,
        available_balance: newAvailableBalance,
        updated_at: new Date()
      });

      // Tạo bank transaction record
      const db = getDatabase();
      
      const [txnResult] = await db.execute(
        `INSERT INTO \`bank_transactions\` 
        (\`account_id\`, \`external_txn_id\`, \`txn_type\`, \`amount\`, \`currency\`, 
         \`description\`, \`status\`, \`balance_before\`, \`balance_after\`, 
         \`related_order_id\`, \`related_payment_id\`, \`posted_at\`, \`metadata\`) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), ?)`,
        [
          systemAccount.account_id,
          externalTxnId,
          'credit',
          amount,
          'VND',
          description || `Thanh toán đơn hàng #${orderId} qua ${gateway || 'COD'}`,
          'posted',
          currentBalance,
          newBalance,
          orderId,
          paymentId,
          JSON.stringify({ gateway, externalTxnId })
        ]
      );

      const transaction = await bankTransaction.findById(txnResult.insertId);
      console.log('[SystemBankService] ✅ Payment recorded successfully:', transaction.txn_id);
      console.log('[SystemBankService] 💰 New balance:', newBalance);

      return transaction;
    } catch (error) {
      console.error('[SystemBankService] ❌ Error in recordPayment:', error);
      throw error;
    }
  }

  /**
   * Lấy thông tin system bank và account
   * @returns {Promise<Object>} { bank, account }
   */
  static async getSystemBankInfo() {
    try {
      const systemBank = await this.getOrCreateSystemBank();
      const systemAccount = await this.getOrCreateSystemAccount();

      return {
        bank: systemBank,
        account: systemAccount
      };
    } catch (error) {
      console.error('[SystemBankService] ❌ Error in getSystemBankInfo:', error);
      throw error;
    }
  }
}

module.exports = SystemBankService;

