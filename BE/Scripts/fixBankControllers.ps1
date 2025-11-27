# Script to fix bank controller files
$controllersDir = "D:\DuAn\DOANCUOICUNG\Do-An-Tot-Nghiep-2025\BE\Controllers"

# BankController
$bankContent = @'
const createBaseController = require('./BaseController');
const { bank } = require('../Models');

const createBankController = () => {
  const baseController = createBaseController(bank);

  const getByProviderCode = async (req, res) => {
    try {
      const { providerCode } = req.params;
      const data = await bank.findByProviderCode(providerCode);

      if (!data) {
        return res.status(404).json({
          success: false,
          message: 'Không tìm thấy ngân hàng',
        });
      }

      return res.status(200).json({
        success: true,
        data,
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: 'Lỗi khi lấy dữ liệu',
        error: error.message,
      });
    }
  };

  const getInternalBanks = async (req, res) => {
    try {
      const data = await bank.findInternalBanks();
      return res.status(200).json({
        success: true,
        data,
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: 'Lỗi khi lấy dữ liệu',
        error: error.message,
      });
    }
  };

  const getExternalBanks = async (req, res) => {
    try {
      const data = await bank.findExternalBanks();
      return res.status(200).json({
        success: true,
        data,
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: 'Lỗi khi lấy dữ liệu',
        error: error.message,
      });
    }
  };

  return {
    ...baseController,
    getByProviderCode,
    getInternalBanks,
    getExternalBanks,
  };
};

module.exports = createBankController();
'@

# BankAccountController
$bankAccountContent = @'
const createBaseController = require('./BaseController');
const { bankAccount } = require('../Models');

const createBankAccountController = () => {
  const baseController = createBaseController(bankAccount);

  const getByBank = async (req, res) => {
    try {
      const { bankId } = req.params;
      const data = await bankAccount.findByBankId(bankId);

      return res.status(200).json({
        success: true,
        data,
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: 'Lỗi khi lấy dữ liệu',
        error: error.message,
      });
    }
  };

  const getByAccountNumber = async (req, res) => {
    try {
      const { accountNumber } = req.params;
      const { bankId } = req.query;
      const data = await bankAccount.findByAccountNumber(accountNumber, bankId);

      if (!data) {
        return res.status(404).json({
          success: false,
          message: 'Không tìm thấy tài khoản',
        });
      }

      return res.status(200).json({
        success: true,
        data,
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: 'Lỗi khi lấy dữ liệu',
        error: error.message,
      });
    }
  };

  const getActiveAccounts = async (req, res) => {
    try {
      const { accountType } = req.query;
      const data = await bankAccount.findActiveAccounts(accountType);

      return res.status(200).json({
        success: true,
        data,
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: 'Lỗi khi lấy dữ liệu',
        error: error.message,
      });
    }
  };

  const updateBalance = async (req, res) => {
    try {
      const { id } = req.params;
      const { amount, type = 'credit' } = req.body;

      if (amount === undefined) {
        return res.status(400).json({
          success: false,
          message: 'Vui lòng cung cấp số tiền',
        });
      }

      await bankAccount.updateBalance(id, parseFloat(amount), type);
      const updated = await bankAccount.findById(id);

      return res.status(200).json({
        success: true,
        message: 'Cập nhật số dư thành công',
        data: updated,
      });
    } catch (error) {
      return res.status(400).json({
        success: false,
        message: 'Lỗi khi cập nhật số dư',
        error: error.message,
      });
    }
  };

  return {
    ...baseController,
    getByBank,
    getByAccountNumber,
    getActiveAccounts,
    updateBalance,
  };
};

module.exports = createBankAccountController();
'@

# BankTransactionController
$bankTransactionContent = @'
const createBaseController = require('./BaseController');
const { bankTransaction } = require('../Models');

const createBankTransactionController = () => {
  const baseController = createBaseController(bankTransaction);

  const getByAccount = async (req, res) => {
    try {
      const { accountId } = req.params;
      const { page = 1, limit = 10 } = req.query;
      const offset = (parseInt(page) - 1) * parseInt(limit);

      const data = await bankTransaction.findByAccountId(accountId, {
        limit: parseInt(limit),
        offset,
      });

      return res.status(200).json({
        success: true,
        data,
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: 'Lỗi khi lấy dữ liệu',
        error: error.message,
      });
    }
  };

  const getByExternalTxnId = async (req, res) => {
    try {
      const { externalTxnId } = req.params;
      const data = await bankTransaction.findByExternalTxnId(externalTxnId);

      if (!data) {
        return res.status(404).json({
          success: false,
          message: 'Không tìm thấy giao dịch',
        });
      }

      return res.status(200).json({
        success: true,
        data,
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: 'Lỗi khi lấy dữ liệu',
        error: error.message,
      });
    }
  };

  const getByOrder = async (req, res) => {
    try {
      const { orderId } = req.params;
      const data = await bankTransaction.findByOrderId(orderId);

      return res.status(200).json({
        success: true,
        data,
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: 'Lỗi khi lấy dữ liệu',
        error: error.message,
      });
    }
  };

  const getByPayment = async (req, res) => {
    try {
      const { paymentId } = req.params;
      const data = await bankTransaction.findByPaymentId(paymentId);

      return res.status(200).json({
        success: true,
        data,
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: 'Lỗi khi lấy dữ liệu',
        error: error.message,
      });
    }
  };

  const getByDateRange = async (req, res) => {
    try {
      const { accountId } = req.params;
      const { startDate, endDate } = req.query;

      if (!startDate || !endDate) {
        return res.status(400).json({
          success: false,
          message: 'Vui lòng cung cấp startDate và endDate',
        });
      }

      const data = await bankTransaction.findByDateRange(accountId, startDate, endDate);

      return res.status(200).json({
        success: true,
        data,
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: 'Lỗi khi lấy dữ liệu',
        error: error.message,
      });
    }
  };

  return {
    ...baseController,
    getByAccount,
    getByExternalTxnId,
    getByOrder,
    getByPayment,
    getByDateRange,
  };
};

module.exports = createBankTransactionController();
'@

# BankTransferRequestController
$bankTransferRequestContent = @'
const createBaseController = require('./BaseController');
const { bankTransferRequest } = require('../Models');

const createBankTransferRequestController = () => {
  const baseController = createBaseController(bankTransferRequest);

  const getByAccountFrom = async (req, res) => {
    try {
      const { accountFromId } = req.params;
      const data = await bankTransferRequest.findByAccountFrom(accountFromId);

      return res.status(200).json({
        success: true,
        data,
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: 'Lỗi khi lấy dữ liệu',
        error: error.message,
      });
    }
  };

  const getByAccountTo = async (req, res) => {
    try {
      const { accountToId } = req.params;
      const data = await bankTransferRequest.findByAccountTo(accountToId);

      return res.status(200).json({
        success: true,
        data,
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: 'Lỗi khi lấy dữ liệu',
        error: error.message,
      });
    }
  };

  const getByStatus = async (req, res) => {
    try {
      const { status } = req.params;
      const data = await bankTransferRequest.findByStatus(status);

      return res.status(200).json({
        success: true,
        data,
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: 'Lỗi khi lấy dữ liệu',
        error: error.message,
      });
    }
  };

  const updateStatus = async (req, res) => {
    try {
      const { id } = req.params;
      const { status, processedAt } = req.body;

      if (!status) {
        return res.status(400).json({
          success: false,
          message: 'Vui lòng cung cấp trạng thái',
        });
      }

      await bankTransferRequest.updateStatus(id, status, processedAt);
      const updated = await bankTransferRequest.findById(id);

      return res.status(200).json({
        success: true,
        message: 'Cập nhật trạng thái thành công',
        data: updated,
      });
    } catch (error) {
      return res.status(400).json({
        success: false,
        message: 'Lỗi khi cập nhật',
        error: error.message,
      });
    }
  };

  return {
    ...baseController,
    getByAccountFrom,
    getByAccountTo,
    getByStatus,
    updateStatus,
  };
};

module.exports = createBankTransferRequestController();
'@

# BankApiLogController
$bankApiLogContent = @'
const createBaseController = require('./BaseController');
const { bankApiLog } = require('../Models');

const createBankApiLogController = () => {
  const baseController = createBaseController(bankApiLog);

  const getByBank = async (req, res) => {
    try {
      const { bankId } = req.params;
      const { page = 1, limit = 10 } = req.query;
      const offset = (parseInt(page) - 1) * parseInt(limit);

      const data = await bankApiLog.findByBankId(bankId, {
        limit: parseInt(limit),
        offset,
      });

      return res.status(200).json({
        success: true,
        data,
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: 'Lỗi khi lấy dữ liệu',
        error: error.message,
      });
    }
  };

  const getByAccount = async (req, res) => {
    try {
      const { accountId } = req.params;
      const { page = 1, limit = 10 } = req.query;
      const offset = (parseInt(page) - 1) * parseInt(limit);

      const data = await bankApiLog.findByAccountId(accountId, {
        limit: parseInt(limit),
        offset,
      });

      return res.status(200).json({
        success: true,
        data,
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: 'Lỗi khi lấy dữ liệu',
        error: error.message,
      });
    }
  };

  return {
    ...baseController,
    getByBank,
    getByAccount,
  };
};

module.exports = createBankApiLogController();
'@

# BankReconciliationController
$bankReconciliationContent = @'
const createBaseController = require('./BaseController');
const { bankReconciliation } = require('../Models');

const createBankReconciliationController = () => {
  const baseController = createBaseController(bankReconciliation);

  const getByBankTransaction = async (req, res) => {
    try {
      const { bankTxnId } = req.params;
      const data = await bankReconciliation.findByBankTransaction(bankTxnId);

      if (!data) {
        return res.status(404).json({
          success: false,
          message: 'Không tìm thấy đối soát',
        });
      }

      return res.status(200).json({
        success: true,
        data,
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: 'Lỗi khi lấy dữ liệu',
        error: error.message,
      });
    }
  };

  const getByOrder = async (req, res) => {
    try {
      const { orderId } = req.params;
      const data = await bankReconciliation.findByOrderId(orderId);

      return res.status(200).json({
        success: true,
        data,
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: 'Lỗi khi lấy dữ liệu',
        error: error.message,
      });
    }
  };

  const getByPayment = async (req, res) => {
    try {
      const { paymentId } = req.params;
      const data = await bankReconciliation.findByPaymentId(paymentId);

      return res.status(200).json({
        success: true,
        data,
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: 'Lỗi khi lấy dữ liệu',
        error: error.message,
      });
    }
  };

  return {
    ...baseController,
    getByBankTransaction,
    getByOrder,
    getByPayment,
  };
};

module.exports = createBankReconciliationController();
'@

# Write all files
$files = @{
  'BankController.js' = $bankContent
  'BankAccountController.js' = $bankAccountContent
  'BankTransactionController.js' = $bankTransactionContent
  'BankTransferRequestController.js' = $bankTransferRequestContent
  'BankApiLogController.js' = $bankApiLogContent
  'BankReconciliationController.js' = $bankReconciliationContent
}

foreach ($file in $files.GetEnumerator()) {
  $filePath = Join-Path $controllersDir $file.Key
  [System.IO.File]::WriteAllText($filePath, $file.Value, [System.Text.Encoding]::UTF8)
  Write-Host "✅ Written $($file.Key)"
}

Write-Host "`n✅ All bank controller files have been written!"

