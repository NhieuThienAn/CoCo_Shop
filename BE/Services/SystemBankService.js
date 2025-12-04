const { bank, bankAccount } = require('../Models');
const { getDatabase } = require('../Config/database');
class SystemBankService {
  /**
   * Lấy hoặc tạo system bank (ngân hàng nội bộ)
   * @returns {Promise<Object>} Bank object
   */

  static async getOrCreateSystemBank() {
    try {
      const systemBank = await bank.findFirstInternalBank();
      if (systemBank) {
        console.log('[SystemBankService] ✅ Found existing system bank:', systemBank.bank_id);
        return systemBank;
      }
      console.log('[SystemBankService] 🔄 Creating new system bank...');
      const db = getDatabase();
      const [result] = await db.execute(
        `INSERT INTO \`banks\` 
        (\`provider_name\`, \`provider_code\`, \`is_internal\`, \`country\`, \`notes\`) 
        VALUES (?, ?, ?, ?, ?)`,
        [
          'Ngân Hàng Hệ Thống CoCo',
          'SYSTEM_COCO',
          1,
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
      const systemBank = await this.getOrCreateSystemBank();
      const mainAccount = await bankAccount.findByBankIdTypeAndInternal(systemBank.bank_id, 'main', 1);
      if (mainAccount) {
        console.log('[SystemBankService] ✅ Found existing system account:', mainAccount.account_id);
        return mainAccount;
      }
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
          1,
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
      
      const { bankTransaction } = require('../Models');
      
      // Get system account first to ensure we have the latest balance
      const systemAccount = await this.getOrCreateSystemAccount();
      
      // Check for existing transaction by payment ID first
      if (paymentId) {
        const existingTransaction = await bankTransaction.findFirstByPaymentId(paymentId);
        if (existingTransaction) {
          console.log('[SystemBankService] ⚠️ Payment already recorded, returning existing transaction:', {
            paymentId,
            transactionId: existingTransaction.txn_id,
            amount: existingTransaction.amount,
            balanceAfter: existingTransaction.balance_after
          });
          // Verify account balance matches transaction balance_after
          const currentAccountBalance = parseFloat(systemAccount.balance || 0);
          const transactionBalanceAfter = parseFloat(existingTransaction.balance_after || 0);
          
          console.log('[SystemBankService] 📊 Balance verification:', {
            accountId: systemAccount.account_id,
            currentAccountBalance,
            transactionBalanceAfter,
            difference: currentAccountBalance - transactionBalanceAfter
          });
          
          // If balance doesn't match, log warning but don't fix automatically
          // (balance might have been updated by other transactions)
          if (Math.abs(currentAccountBalance - transactionBalanceAfter) > 0.01) {
            console.warn('[SystemBankService] ⚠️ WARNING: Account balance does not match transaction balance_after!', {
              accountBalance: currentAccountBalance,
              transactionBalanceAfter: transactionBalanceAfter,
              difference: currentAccountBalance - transactionBalanceAfter
            });
          }
          
          return existingTransaction;
        }
      }
      
      // Check for existing transaction by external transaction ID
      if (externalTxnId) {
        const existingByExternal = await bankTransaction.findByExternalTxnId(externalTxnId);
        if (existingByExternal) {
          console.log('[SystemBankService] ⚠️ Transaction with external ID already exists, returning existing:', {
            externalTxnId,
            transactionId: existingByExternal.txn_id,
            amount: existingByExternal.amount,
            balanceAfter: existingByExternal.balance_after
          });
          // Verify account balance matches transaction balance_after
          const currentAccountBalance = parseFloat(systemAccount.balance || 0);
          const transactionBalanceAfter = parseFloat(existingByExternal.balance_after || 0);
          
          console.log('[SystemBankService] 📊 Balance verification:', {
            accountId: systemAccount.account_id,
            currentAccountBalance,
            transactionBalanceAfter,
            difference: currentAccountBalance - transactionBalanceAfter
          });
          
          // If balance doesn't match, log warning but don't fix automatically
          if (Math.abs(currentAccountBalance - transactionBalanceAfter) > 0.01) {
            console.warn('[SystemBankService] ⚠️ WARNING: Account balance does not match transaction balance_after!', {
              accountBalance: currentAccountBalance,
              transactionBalanceAfter: transactionBalanceAfter,
              difference: currentAccountBalance - transactionBalanceAfter
            });
          }
          
          return existingByExternal;
        }
      }
      
      // System account already retrieved above, refresh to get latest balance
      // (in case it was updated by another process)
      const refreshedAccount = await bankAccount.findById(systemAccount.account_id);
      const finalAccount = refreshedAccount || systemAccount;
      
      console.log('[SystemBankService] 📊 Current account balance:', {
        accountId: finalAccount.account_id,
        currentBalance: finalAccount.balance,
        currentAvailableBalance: finalAccount.available_balance
      });
      
      // Calculate new balance using the refreshed account data
      const currentBalance = parseFloat(finalAccount.balance || 0);
      const currentAvailableBalance = parseFloat(finalAccount.available_balance || 0);
      const paymentAmount = parseFloat(amount);
      const newBalance = currentBalance + paymentAmount;
      const newAvailableBalance = currentAvailableBalance + paymentAmount;
      
      console.log('[SystemBankService] 💰 Balance calculation:', {
        currentBalance,
        paymentAmount,
        newBalance,
        currentAvailableBalance,
        newAvailableBalance
      });
      
      // Use database transaction to ensure atomicity
      const db = getDatabase();
      
      // Update account balance first
      await bankAccount.update(finalAccount.account_id, {
        balance: newBalance,
        available_balance: newAvailableBalance,
        updated_at: new Date()
      });
      
      console.log('[SystemBankService] ✅ Account balance updated in database');
      
      // Create bank transaction record
      const [txnResult] = await db.execute(
        `INSERT INTO \`bank_transactions\` 
        (\`account_id\`, \`external_txn_id\`, \`txn_type\`, \`amount\`, \`currency\`, 
         \`description\`, \`status\`, \`balance_before\`, \`balance_after\`, 
         \`related_order_id\`, \`related_payment_id\`, \`posted_at\`, \`metadata\`) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), ?)`,
        [
          finalAccount.account_id,
          externalTxnId,
          'credit',
          paymentAmount,
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
      
      // Verify the balance was updated correctly by reading from database
      const updatedAccount = await bankAccount.findById(finalAccount.account_id);
      const actualBalance = parseFloat(updatedAccount.balance || 0);
      const expectedBalance = parseFloat(newBalance);
      
      console.log('[SystemBankService] ✅✅✅ Payment recorded successfully ✅✅✅');
      console.log('[SystemBankService] Transaction details:', {
        transactionId: transaction.txn_id,
        amount: transaction.amount,
        balanceBefore: transaction.balance_before,
        balanceAfter: transaction.balance_after
      });
      console.log('[SystemBankService] Account balance verification:', {
        accountId: updatedAccount.account_id,
        expectedBalance: expectedBalance,
        actualBalance: actualBalance,
        match: Math.abs(actualBalance - expectedBalance) < 0.01
      });
      
      // If balance doesn't match, log error (should not happen)
      if (Math.abs(actualBalance - expectedBalance) >= 0.01) {
        console.error('[SystemBankService] ❌❌❌ CRITICAL: Balance mismatch after update! ❌❌❌', {
          expected: expectedBalance,
          actual: actualBalance,
          difference: actualBalance - expectedBalance
        });
      }
      
      return transaction;
    } catch (error) {
      console.error('[SystemBankService] ❌❌❌ ERROR IN recordPayment ❌❌❌');
      console.error('[SystemBankService] Error message:', error.message);
      console.error('[SystemBankService] Error stack:', error.stack);
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
