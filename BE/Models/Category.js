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
  const findAllSortedForTree = async () => {
    const sql = `SELECT * FROM \`${baseModel.tableName}\` 
      ORDER BY 
        CASE WHEN \`parent_id\` IS NULL THEN 0 ELSE 1 END,
        \`parent_id\` ASC,
        \`name\` ASC`;
    return await baseModel.execute(sql, []);
  };
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
      if (!existing || (excludeId && existing.category_id === excludeId)) {
        isUnique = true;
      } else {
        slug = `${baseSlug}-${counter}`;
        counter++;
        if (counter > 1000) {
          throw new Error('Không thể tạo slug duy nhất sau nhiều lần thử');
        }
      }
    }
    return slug;
  };
  const create = async (data = {}) => {
    console.log('[CategoryModel] 🔧 create() OVERRIDE called with data:', JSON.stringify(data, null, 2));
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
  const update = async (id, data = {}) => {
    // Convert id to number for comparison
    const categoryId = parseInt(id);
    
    // Get current category to check if slug is being changed
    const currentCategory = await baseModel.findById(id);
    
    if (data.name && (!data.slug || !data.slug.trim())) {
      data.slug = await generateUniqueSlug(data.name, categoryId);
    } else if (data.slug && data.slug.trim()) {
      // Only check uniqueness if slug is actually being changed
      const isSlugUnchanged = currentCategory && currentCategory.slug === data.slug;
      
      if (!isSlugUnchanged) {
        const existing = await findBySlug(data.slug);
        // Compare both as numbers to avoid type mismatch
        if (existing && parseInt(existing.category_id) !== categoryId) {
          throw new Error(`Slug "${data.slug}" đã tồn tại`);
        }
      }
    }
    return baseModel.update(id, data);
  };
  const model = {
    ...baseModel,
    findBySlug,
    findByParent,
    findAllSortedForTree,
    generateSlug,
    generateUniqueSlug,
  };
  model.create = create;
  model.update = update;
  console.log('[CategoryModel] ✅ Category model initialized with create override');
  console.log('[CategoryModel] create method type:', typeof model.create);
  console.log('[CategoryModel] create method is override:', model.create !== baseModel.create);
  return model;
};
module.exports = createCategoryModel;
