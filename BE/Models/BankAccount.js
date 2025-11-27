const createBaseModel = require('./BaseModel');

const createBankAccountModel = () => {
  const baseModel = createBaseModel({
    tableName: 'bank_accounts',
    primaryKey: 'account_id',
    columns: [
      'account_id',
      'bank_id',
      'account_name',
      'account_number',
      'account_type',
      'iban',
      'branch',
      'currency',
      'balance',
      'available_balance',
      'pending_balance',
      'status',
      'credentials',
      'webhook_url',
      'last_synced_at',
      'is_internal',
      'created_by',
      'created_at',
      'updated_at',
    ],
  });

  const findByBankId = async (bankId) => {
    return baseModel.findAll({ filters: { bank_id: bankId } });
  };

  const findByAccountNumber = async (accountNumber, bankId = null) => {
    if (bankId) {
      const sql = `SELECT * FROM \`${baseModel.tableName}\` WHERE \`account_number\` = ? AND \`bank_id\` = ? LIMIT 1`;
      const rows = await baseModel.execute(sql, [accountNumber, bankId]);
      return Array.isArray(rows) ? rows[0] || null : rows;
    } else {
      const sql = `SELECT * FROM \`${baseModel.tableName}\` WHERE \`account_number\` = ? LIMIT 1`;
      const rows = await baseModel.execute(sql, [accountNumber]);
      return Array.isArray(rows) ? rows[0] || null : rows;
    }
  };

  const findActiveAccounts = async (accountType = null) => {
    const filters = { status: 'active' };
    if (accountType) {
      filters.account_type = accountType;
    }
    return baseModel.findAll({ filters });
  };

  /**
   * Find account by bank_id, account_type and is_internal (SQL WHERE clause)
   */
  const findByBankIdTypeAndInternal = async (bankId, accountType, isInternal) => {
    const sql = `SELECT * FROM \`${baseModel.tableName}\` WHERE \`bank_id\` = ? AND \`account_type\` = ? AND \`is_internal\` = ? LIMIT 1`;
    const rows = await baseModel.execute(sql, [bankId, accountType, isInternal]);
    return Array.isArray(rows) ? rows[0] || null : rows;
  };

  const updateBalance = async (accountId, amount, type = 'credit') => {
    const account = await baseModel.findById(accountId);
    if (!account) return null;

    const balance = parseFloat(account.balance || 0);
    const availableBalance = parseFloat(account.available_balance || 0);
    const pendingBalance = parseFloat(account.pending_balance || 0);

    let newBalance = balance;
    let newAvailableBalance = availableBalance;
    let newPendingBalance = pendingBalance;

    if (type === 'credit') {
      newBalance = balance + amount;
      newAvailableBalance = availableBalance + amount;
    } else if (type === 'debit') {
      newBalance = balance - amount;
      newAvailableBalance = availableBalance - amount;
    } else if (type === 'pending') {
      newPendingBalance = pendingBalance + amount;
      newAvailableBalance = availableBalance - amount;
    }

    return baseModel.update(accountId, {
      balance: newBalance,
      available_balance: newAvailableBalance,
      pending_balance: newPendingBalance,
      updated_at: new Date(),
    });
  };

  return {
    ...baseModel,
    findByBankId,
    findByAccountNumber,
    findActiveAccounts,
    findByBankIdTypeAndInternal,
    updateBalance,
  };
};

module.exports = createBankAccountModel;
