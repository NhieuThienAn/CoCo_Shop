const createBaseModel = require('./BaseModel');
const slugify = require('slugify');

const createCategoryModel = () => {
  const baseModel = createBaseModel({
    tableName: 'categories',
    primaryKey: 'category_id',
    columns: [
      'category_id',
      'name',
      'slug',
      'description',
      'parent_id',
      'created_at',
    ],
  });

  const findBySlug = async (slug) => {
    const sql = `SELECT * FROM \`${baseModel.tableName}\` WHERE \`slug\` = ? LIMIT 1`;
    const rows = await baseModel.execute(sql, [slug]);
    return Array.isArray(rows) ? rows[0] || null : rows;
  };

  const findByParent = async (parentId) => {
    const sql = `SELECT * FROM \`${baseModel.tableName}\` WHERE \`parent_id\` = ? ORDER BY \`name\` ASC`;
    return await baseModel.execute(sql, [parentId]);
  };

  /**
   * Find all categories sorted for tree building
   * Uses SQL ORDER BY to sort by parent_id (NULL first for root categories) and name
   * This optimizes tree building by pre-sorting in database
   */
  const findAllSortedForTree = async () => {
    const sql = `SELECT * FROM \`${baseModel.tableName}\` 
      ORDER BY 
        CASE WHEN \`parent_id\` IS NULL THEN 0 ELSE 1 END,
        \`parent_id\` ASC,
        \`name\` ASC`;
    return await baseModel.execute(sql, []);
  };

  /**
   * Generate slug from name
   */
  const generateSlug = (name) => {
    if (!name || !name.trim()) {
      return '';
    }
    return slugify(name, {
      lower: true,
      strict: true,
      locale: 'vi',
    });
  };

  /**
   * Generate unique slug by checking database
   */
  const generateUniqueSlug = async (name, excludeId = null) => {
    let baseSlug = generateSlug(name);
    
    if (!baseSlug) {
      throw new Error('Không thể tạo slug từ tên danh mục');
    }

    let slug = baseSlug;
    let counter = 1;
    let isUnique = false;

    while (!isUnique) {
      const existing = await findBySlug(slug);
      
      // Nếu không tìm thấy hoặc là chính record đang update
      if (!existing || (excludeId && existing.category_id === excludeId)) {
        isUnique = true;
      } else {
        slug = `${baseSlug}-${counter}`;
        counter++;
        
        // Giới hạn số lần thử để tránh vòng lặp vô hạn
        if (counter > 1000) {
          throw new Error('Không thể tạo slug duy nhất sau nhiều lần thử');
        }
      }
    }

    return slug;
  };

  /**
   * Override create to auto-generate slug
   */
  const create = async (data = {}) => {
    console.log('[CategoryModel] 🔧 create() OVERRIDE called with data:', JSON.stringify(data, null, 2));
    
    // Auto-generate slug if not provided or empty
    if (!data.slug || !data.slug.trim()) {
      console.log('[CategoryModel] 🔗 Slug not provided, generating from name...');
      if (!data.name || !data.name.trim()) {
        console.log('[CategoryModel] ❌ Name is required for slug generation');
        throw new Error('Tên danh mục là bắt buộc để tạo slug');
      }
      data.slug = await generateUniqueSlug(data.name);
      console.log('[CategoryModel] ✅ Generated slug:', data.slug);
    } else {
      console.log('[CategoryModel] 🔍 Slug provided, validating uniqueness...');
      // Validate slug is unique if provided
      const existing = await findBySlug(data.slug);
      if (existing) {
        console.log('[CategoryModel] ❌ Slug already exists');
        throw new Error(`Slug "${data.slug}" đã tồn tại`);
      }
      console.log('[CategoryModel] ✅ Slug is unique');
    }

    console.log('[CategoryModel] 💾 Calling baseModel.create() with data:', JSON.stringify(data, null, 2));
    return baseModel.create(data);
  };

  /**
   * Override update to auto-generate slug if name changed
   */
  const update = async (id, data = {}) => {
    // If name is being updated and slug is not provided, regenerate slug
    if (data.name && (!data.slug || !data.slug.trim())) {
      data.slug = await generateUniqueSlug(data.name, id);
    } else if (data.slug && data.slug.trim()) {
      // Validate slug is unique (excluding current record)
      const existing = await findBySlug(data.slug);
      if (existing && existing.category_id !== id) {
        throw new Error(`Slug "${data.slug}" đã tồn tại`);
      }
    }

    return baseModel.update(id, data);
  };

  // Create return object with explicit method override
  // IMPORTANT: create and update must come AFTER spread to properly override
  const model = {
    ...baseModel,
    findBySlug,
    findByParent,
    findAllSortedForTree,
    generateSlug,
    generateUniqueSlug,
  };
  
  // Explicitly override create and update methods
  model.create = create;
  model.update = update;
  
  console.log('[CategoryModel] ✅ Category model initialized with create override');
  console.log('[CategoryModel] create method type:', typeof model.create);
  console.log('[CategoryModel] create method is override:', model.create !== baseModel.create);
  
  return model;
};

module.exports = createCategoryModel;
