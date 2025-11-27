const fs = require('fs');
const path = require('path');

const SCHEMA_FILE = path.join(__dirname, '..', 'database');

/**
 * Thực hiện parse file SQL để lấy ra metadata của các bảng.
 */
const parseSchemaFile = () => {
  let raw = '';
  try {
    raw = fs.readFileSync(SCHEMA_FILE, { encoding: 'utf8' });
  } catch (error) {
    console.warn('⚠️ Không đọc được file schema:', SCHEMA_FILE, error.message);
    return [];
  }

  // Regex để match CREATE TABLE với multiline support
  const tableRegex = /CREATE TABLE\s+`([^`]+)`\s*\(([\s\S]*?)\)\s*ENGINE\s*=/gi;
  const schemas = [];
  let match = null;

  while ((match = tableRegex.exec(raw)) !== null) {
    const rawTableName = match[1];
    const tableDefinition = match[2];
    const columns = [];
    let primaryKey = null;

    // Parse từng dòng trong table definition
    const lines = tableDefinition.split('\n');
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('--')) {
        continue;
      }

      // Loại bỏ dấu phẩy ở cuối
      const cleanLine = trimmed.replace(/,$/, '');

      // Tìm column name (bắt đầu bằng `)
      if (cleanLine.startsWith('`')) {
        const columnMatch = cleanLine.match(/^`([^`]+)`/);
        if (columnMatch) {
          const colName = columnMatch[1];
          // Chỉ thêm nếu chưa có (tránh duplicate)
          if (!columns.includes(colName)) {
            columns.push(colName);
          }
        }
      }

      // Tìm PRIMARY KEY
      const pkMatch = cleanLine.match(/PRIMARY KEY\s*\(([^)]+)\)/i);
      if (pkMatch && !primaryKey) {
        const pkColumns = pkMatch[1]
          .split(',')
          .map((item) => item.replace(/`/g, '').trim())
          .filter(Boolean);
        if (pkColumns.length === 1) {
          primaryKey = pkColumns[0];
        } else if (pkColumns.length > 1) {
          primaryKey = pkColumns;
        }
      }
    }

    schemas.push({
      tableName: rawTableName,
      columns,
      primaryKey,
    });
  }

  return schemas;
};

const tableSchemas = parseSchemaFile();

const tableSchemaMap = tableSchemas.reduce((acc, schema) => {
  acc[schema.tableName] = schema;
  return acc;
}, {});

module.exports = {
  tableSchemas,
  tableSchemaMap,
};

