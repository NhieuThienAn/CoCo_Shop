const createBaseModel = require('./BaseModel');
const createTokenBlacklistModel = () => {
  const baseModel = createBaseModel({
    tableName: 'tokenblacklist',
    primaryKey: 'id',
    columns: [
      'id',
      'token',
      'token_type',
      'expires_at',
      'blacklisted_at',
    ],
  });
  const isTokenBlacklisted = async (token) => {
    const sql = `SELECT * FROM \`${baseModel.tableName}\` WHERE \`token\` = ? LIMIT 1`;
    const rows = await baseModel.execute(sql, [token]);
    return Array.isArray(rows) ? rows.length > 0 : false;
  };
  const addToBlacklist = async (token, tokenType = 'access', expiresAt = null) => {
    return await baseModel.create({
      token,
      token_type: tokenType,
      expires_at: expiresAt,
    });
  };
  const cleanupExpiredTokens = async () => {
    const sql = `DELETE FROM \`${baseModel.tableName}\` WHERE \`expires_at\` IS NOT NULL AND \`expires_at\` < NOW()`;
    return await baseModel.execute(sql);
  };
  return {
    ...baseModel,
    isTokenBlacklisted,
    addToBlacklist,
    cleanupExpiredTokens,
  };
};
module.exports = createTokenBlacklistModel;
