const createBaseController = require('./BaseController');
const { product } = require('../Models');
/**
 * Tạo ProductController với các HTTP handlers cho quản lý sản phẩm
 * ProductController kế thừa tất cả handlers từ BaseController và override/thêm các handlers riêng
 * 
 * @returns {Object} ProductController object với các handlers:
 * - Từ BaseController: getAll, getById, create, update, delete, count (một số được override)
 * - Riêng Product: getBySlug, getBySku, getByCategory, getActive, search, 
 *   softDelete, getDeleted, restore, updateStock, addImage, removeImage, 
 *   setPrimaryImage, getPrimaryImage, updateImages
 */

const createProductController = () => {
  const baseController = createBaseController(product);
  /**
   * HTTP Handler: POST /products
   * Override create từ BaseController để thêm validation đầy đủ cho sản phẩm
   * 
   * Validation bao gồm:
   * - Kiểm tra các trường bắt buộc (name, slug, sku, price)
   * - Kiểm tra SKU và slug đã tồn tại chưa (duplicate check)
   * - Validate và xử lý images (validate, normalize, kiểm tra kích thước)
   * 
   * Request Body:
   * - name: Tên sản phẩm (bắt buộc)
   * - slug: URL-friendly name (bắt buộc, unique)
   * - sku: Stock Keeping Unit (bắt buộc, unique)
   * - price: Giá sản phẩm (bắt buộc, >= 0)
   * - category_id: ID danh mục (tùy chọn)
   * - stock_quantity: Số lượng tồn kho (mặc định: 0)
   * - is_active: Trạng thái active (mặc định: 1)
   * - images: Mảng các image objects (tùy chọn)
   * - ...otherData: Các trường khác
   * 
   * Response:
   * - 201: Created { success: true, message: "...", data: {...} }
   * - 400: Bad Request (validation error)
   * 
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @returns {Promise<void>} JSON response
   */

  const create = async (req, res) => {
    console.log('========================================');
    console.log('[ProductController] create function called');
    console.log('[ProductController] Request IP:', req.ip);
    console.log('[ProductController] Request body:', JSON.stringify(req.body, null, 2));
    try {
      const {
        name,
        slug,
        sku,
        price,
        category_id,
        stock_quantity = 0,
        is_active = 1,
        ...otherData
      } = req.body;
      console.log('[ProductController] Extracted data:', {
        name,
        slug,
        sku,
        price,
        category_id,
        stock_quantity,
        is_active,
        otherDataKeys: Object.keys(otherData)  
      });
      if (!name || !name.trim()) {
        console.log('[ProductController] ❌ Validation failed: Missing name');
        return res.status(400).json({
          success: false,
          message: 'Tên sản phẩm là bắt buộc',
        });
      }
      if (!slug || !slug.trim()) {
        return res.status(400).json({
          success: false,
          message: 'Slug là bắt buộc',
        });
      }
      if (!sku || !sku.trim()) {
        return res.status(400).json({
          success: false,
          message: 'SKU là bắt buộc',
        });
      }
      if (price === undefined || price === null || parseFloat(price) < 0) {
        return res.status(400).json({
          success: false,
          message: 'Giá sản phẩm phải >= 0',
        });
      }
      console.log('[ProductController] 🔍 Checking if SKU and slug exist (parallel)...');
      const [existingSku, existingSlug] = await Promise.all([
        product.findBySku(sku),
        product.findBySlug(slug)
      ]);
      if (existingSku) {
        console.log('[ProductController] ❌ SKU already exists');
        return res.status(400).json({
          success: false,
          message: 'SKU đã tồn tại',
        });
      }
      console.log('[ProductController] ✅ SKU is available');
      if (existingSlug) {
        console.log('[ProductController] ❌ Slug already exists');
        return res.status(400).json({
          success: false,
          message: 'Slug đã tồn tại',
        });
      }
      console.log('[ProductController] ✅ Slug is available');
      let imagesData = null;
      const { images: imagesArray, ...otherDataWithoutImages } = otherData;
      if (imagesArray !== undefined) {
        if (Array.isArray(imagesArray)) {
          for (const img of imagesArray) {
            if (!product.validateImage(img)) {
              return res.status(400).json({
                success: false,
                message: `Image không hợp lệ: ${JSON.stringify(img)}. Mỗi image cần có url.`,
              });
            }
          }
          const normalizedImages = imagesArray.map((img, index) => ({
            url: img.url.trim(),                    
            alt: img.alt || '',
            is_primary: img.is_primary === true || index === 0,  
            order: img.order !== undefined ? parseInt(img.order) : index,
          }));
          if (normalizedImages.length > 0) {
            normalizedImages.forEach((img, idx) => {
              if (idx > 0) img.is_primary = false;  
            });
          }
          normalizedImages.sort((a, b) => (a.order || 0) - (b.order || 0));
          console.log('[ProductController] 📏 Checking images size...');
          let totalSize = 0;
          const imageSizes = normalizedImages.map((img, idx) => {
            const size = img.url ? img.url.length : 0;
            totalSize += size;  

            console.log(`[ProductController] Image ${idx + 1} size:`, {
              sizeBytes: size,                                    
              sizeKB: (size / 1024).toFixed(2),                   
              sizeMB: (size / (1024 * 1024)).toFixed(2),         
              urlPreview: img.url ? (img.url.length > 100 ? img.url.substring(0, 100) + '...' : img.url) : 'no url',
              isBase64: img.url ? img.url.startsWith('data:') : false,
            });
            return size;
          });
          console.log('[ProductController] 📊 Total images size:', {
            totalSizeBytes: totalSize,
            totalSizeKB: (totalSize / 1024).toFixed(2),
            totalSizeMB: (totalSize / (1024 * 1024)).toFixed(2),
            imageCount: normalizedImages.length,
          });
          const MAX_IMAGES_SIZE = 10 * 1024 * 1024;
          if (totalSize > MAX_IMAGES_SIZE) {
            const totalSizeMB = (totalSize / (1024 * 1024)).toFixed(2);
            const maxSizeMB = (MAX_IMAGES_SIZE / (1024 * 1024)).toFixed(2);
            console.error('[ProductController] ❌ Images too large:', {
              totalSizeMB: totalSizeMB,
              maxSizeMB: maxSizeMB,
            });
            return res.status(400).json({
              success: false,
              message: `Tổng kích thước hình ảnh quá lớn (${totalSizeMB}MB). Vui lòng giảm kích thước hình ảnh hoặc sử dụng ít hình ảnh hơn. Tối đa: ${maxSizeMB}MB`,
            });
          }
          imagesData = product.serializeImages(normalizedImages);
          console.log('[ProductController] ✅ Images serialized, size:', {
            serializedSizeBytes: imagesData ? imagesData.length : 0,
            serializedSizeKB: imagesData ? (imagesData.length / 1024).toFixed(2) : 0,
            serializedSizeMB: imagesData ? (imagesData.length / (1024 * 1024)).toFixed(2) : 0,
          });
        } 
        else {
          return res.status(400).json({
            success: false,
            message: 'Images phải là một mảng',
          });
        }
      }
      console.log('[ProductController] 💾 Creating product in database...');
      console.log('[ProductController] Images data to save:', {
        hasImages: !!imagesData,                                    
        imagesDataType: typeof imagesData,
        imagesDataLength: imagesData ? imagesData.length : 0,
        imagesDataSizeKB: imagesData ? (imagesData.length / 1024).toFixed(2) : 0,  
        imagesDataSizeMB: imagesData ? (imagesData.length / (1024 * 1024)).toFixed(2) : 0,  
        imagesDataPreview: typeof imagesData === 'string' 
          ? (imagesData.length > 200 ? imagesData.substring(0, 200) + '...' : imagesData)
          : imagesData,
      });
      const productData = {
        name: name.trim(),
        slug: slug.trim(),
        sku: sku.trim(),
        price: parseFloat(price),
        category_id: category_id || null,
        stock_quantity: parseInt(stock_quantity) || 0,
        is_active: is_active ? 1 : 0,
        deleted_at: null,
        ...otherDataWithoutImages,
        images: imagesData,                   
        created_at: new Date(),               
        updated_at: new Date(),               
      };
      console.log('[ProductController] Product data to create:', {
        ...productData,
        images: typeof productData.images === 'string' 
          ? (productData.images.length > 200 ? productData.images.substring(0, 200) + '...' : productData.images)
          : productData.images,
      });
      const result = await product.create(productData);
      console.log('[ProductController] ✅ Product created with ID:', result.insertId);
      const newProduct = await product.findById(result.insertId);
      console.log('[ProductController] Retrieved created product:', {
        productId: newProduct?.id || newProduct?.product_id,
        name: newProduct?.name,
        hasImages: !!newProduct?.images,
        imagesType: typeof newProduct?.images,
      });
      if (newProduct && newProduct.images) {
        console.log('[ProductController] Parsing images from created product...');
        try {
          const parsedImages = product.parseImages(newProduct.images);
          console.log('[ProductController] Parsed images from created product:', {
            count: parsedImages.length,
            images: parsedImages.map(img => ({
              url: img.url ? (img.url.length > 50 ? img.url.substring(0, 50) + '...' : img.url) : 'no url',
              alt: img.alt,
              is_primary: img.is_primary,
              order: img.order,
            })),
          });
          newProduct.images = parsedImages;
        } catch (parseError) {
          console.error('[ProductController] ❌ Error parsing images from created product:', parseError);
          newProduct.images = [];
        }
      } else {
        console.log('[ProductController] Created product has no images');
      }
      console.log('[ProductController] ✅✅✅ PRODUCT CREATED SUCCESSFULLY ✅✅✅');
      console.log('[ProductController] Product ID:', result.insertId);
      console.log('[ProductController] Product Name:', newProduct?.name);
      console.log('========================================');
      return res.status(201).json({
        success: true,
        message: 'Tạo sản phẩm thành công',
        data: newProduct,  
      });
    } 
    catch (error) {
      console.error('[ProductController] ❌❌❌ ERROR IN create ❌❌❌');
      console.error('[ProductController] Error message:', error.message);
      console.error('[ProductController] Error stack:', error.stack);
      console.error('[ProductController] Error details:', {
        name: error.name,
        message: error.message,  
        code: error.code
      });
      console.log('========================================');
      return res.status(400).json({
        success: false,
        message: 'Lỗi khi tạo sản phẩm',
        error: error.message,
      });
    }
  }
  /**
   * HTTP Handler: PUT /products/:id hoặc PATCH /products/:id
   * Override update từ BaseController để thêm validation đầy đủ cho sản phẩm
   * 
   * Validation bao gồm:
   * - Kiểm tra product tồn tại và chưa bị xóa
   * - Validate các trường nếu có (name, slug, sku, price, stock_quantity)
   * - Kiểm tra SKU và slug duplicate (nếu thay đổi)
   * - Xử lý images update nếu có
   * 
   * URL Params:
   * - id: ID của sản phẩm cần cập nhật (bắt buộc)
   * 
   * Request Body:
   * - name, slug, sku, price, stock_quantity: Các trường có thể cập nhật (tùy chọn)
   * - images: Mảng images để cập nhật (tùy chọn)
   * - deleted_at: KHÔNG được phép update qua method này (phải dùng softDelete)
   * - ...updateData: Các trường khác
   * 
   * Response:
   * - 200: Success { success: true, message: "...", data: {...} }
   * - 400: Bad Request (validation error)
   * - 404: Not Found (product không tồn tại)
   * 
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @returns {Promise<void>} JSON response
   */

  const update = async (req, res) => {
    console.log('========================================');
    console.log('[ProductController] update function called');
    console.log('[ProductController] Request IP:', req.ip);
    console.log('[ProductController] Request method:', req.method);
    console.log('[ProductController] Request URL:', req.originalUrl);
    console.log('[ProductController] Params:', req.params);
    console.log('[ProductController] Request body:', JSON.stringify(req.body, null, 2));
    const startTime = Date.now();
    try {
      const { id } = req.params;
      const {
        name,
        slug,
        sku,
        price,
        stock_quantity,
        deleted_at,
        ...updateData
      } = req.body;
      console.log('[ProductController] Extracted data:', {
        productId: id,
        name,
        slug,
        sku,
        price,
        stock_quantity,
        updateDataKeys: Object.keys(updateData)  
      });
      if (!id) {
        console.log('[ProductController] ❌ Validation failed: Missing product ID');
        return res.status(400).json({
          success: false,
          message: 'Product ID là bắt buộc',
        });
      }
      console.log('[ProductController] 🔍 Checking if product exists...');
      const existing = await product.findById(id);
      if (!existing) {
        console.log('[ProductController] ❌ Product not found');
        return res.status(404).json({
          success: false,
          message: 'Không tìm thấy sản phẩm',
        });
      }
      console.log('[ProductController] ✅ Product found:', {
        productId: existing.product_id,
        name: existing.name,
        isDeleted: !!existing.deleted_at
      });
      if (existing.deleted_at) {
        console.log('[ProductController] ❌ Product already deleted');
        return res.status(400).json({
          success: false,
          message: 'Không thể cập nhật sản phẩm đã bị xóa. Vui lòng khôi phục trước.',
        });
      }
      console.log('[ProductController] ✅ Product is active, proceeding with validation...');
      if (name !== undefined && (!name || !name.trim())) {
        console.log('[ProductController] ❌ Validation failed: Empty name');
        return res.status(400).json({
          success: false,
          message: 'Tên sản phẩm không được để trống',
        });
      }
      if (slug !== undefined && (!slug || !slug.trim())) {
        console.log('[ProductController] ❌ Validation failed: Empty slug');
        return res.status(400).json({
          success: false,
          message: 'Slug không được để trống',
        });
      }
      if (sku !== undefined && (!sku || !sku.trim())) {
        console.log('[ProductController] ❌ Validation failed: Empty SKU');
        return res.status(400).json({
          success: false,
          message: 'SKU không được để trống',
        });
      }
      if (price !== undefined && (price === null || parseFloat(price) < 0)) {
        console.log('[ProductController] ❌ Validation failed: Invalid price');
        return res.status(400).json({
          success: false,
          message: 'Giá sản phẩm phải >= 0',
        });
      }
      if (stock_quantity !== undefined && parseInt(stock_quantity) < 0) {
        console.log('[ProductController] ❌ Validation failed: Invalid stock quantity');
        return res.status(400).json({
          success: false,
          message: 'Số lượng tồn kho phải >= 0',
        });
      }
      const needsSkuCheck = sku && sku !== existing.sku;    
      const needsSlugCheck = slug && slug !== existing.slug;  

      if (needsSkuCheck || needsSlugCheck) {
        console.log('[ProductController] 🔍 Checking if new SKU/slug exist (parallel)...');
        const checkPromises = [];
        if (needsSkuCheck) {
          checkPromises.push(
            product.findBySku(sku).then(result => ({ type: 'sku', result }))
          );
        }
        if (needsSlugCheck) {
          checkPromises.push(
            product.findBySlug(slug).then(result => ({ type: 'slug', result }))
          );
        }
        const checkResults = await Promise.all(checkPromises);
        for (const { type, result } of checkResults) {
          if (type === 'sku' && result && result.id !== parseInt(id)) {
            console.log('[ProductController] ❌ SKU already exists');
            return res.status(400).json({
              success: false,
              message: 'SKU đã tồn tại',
            });
          }
          if (type === 'slug' && result && result.id !== parseInt(id)) {
            console.log('[ProductController] ❌ Slug already exists');
            return res.status(400).json({
              success: false,
              message: 'Slug đã tồn tại',
            });
          }
        }
        if (needsSkuCheck) console.log('[ProductController] ✅ SKU is available');
        if (needsSlugCheck) console.log('[ProductController] ✅ Slug is available');
      }
      if (updateData.images !== undefined) {
        console.log('[ProductController] 🖼️ Processing images update...');
        if (Array.isArray(updateData.images)) {
          try {
            await product.updateImages(id, updateData.images);
            console.log('[ProductController] ✅ Images updated successfully');
          } catch (error) {
            console.log('[ProductController] ❌ Error updating images:', error.message);
            return res.status(400).json({
              success: false,
              message: error.message,
            });
          }
          delete updateData.images;
        } else {
          console.log('[ProductController] ❌ Validation failed: Images must be an array');
          return res.status(400).json({
            success: false,
            message: 'Images phải là một mảng',
          });
        }
      }
      console.log('[ProductController] ✏️ Preparing update payload...');
      const updatePayload = {
        ...updateData,              
        updated_at: new Date(),     
      };
      if (name !== undefined) updatePayload.name = name.trim();
      if (slug !== undefined) updatePayload.slug = slug.trim();
      if (sku !== undefined) updatePayload.sku = sku.trim();
      if (price !== undefined) updatePayload.price = parseFloat(price);
      if (stock_quantity !== undefined) updatePayload.stock_quantity = parseInt(stock_quantity);
      console.log('[ProductController] 💾 Updating product in database...');
      await product.update(id, updatePayload);
      console.log('[ProductController] 🔍 Fetching updated product...');
      const updated = await product.findById(id);
      console.log('[ProductController] Retrieved updated product:', {
        productId: updated?.id || updated?.product_id,
        name: updated?.name,
        hasImages: !!updated?.images,
        imagesType: typeof updated?.images,
      });
      if (updated && updated.images) {
        console.log('[ProductController] Parsing images from updated product...');
        try {
          const parsedImages = product.parseImages(updated.images);
          console.log('[ProductController] Parsed images from updated product:', {
            count: parsedImages.length,
            images: parsedImages.map(img => ({
              url: img.url ? (img.url.length > 50 ? img.url.substring(0, 50) + '...' : img.url) : 'no url',
              alt: img.alt,
              is_primary: img.is_primary,
              order: img.order,
            })),
          });
          updated.images = parsedImages;
        } catch (parseError) {
          console.error('[ProductController] ❌ Error parsing images from updated product:', parseError);
          updated.images = [];
        }
      } else {
        console.log('[ProductController] Updated product has no images');
      }
      
      // Nếu giá sản phẩm được cập nhật, đồng bộ giá trong tất cả giỏ hàng
      if (price !== undefined && updated && updated.product_id) {
        try {
          console.log('[ProductController] 🔄 Syncing cart item prices for product:', updated.product_id);
          const { cartItem } = require('../Models');
          await cartItem.syncPriceForProduct(updated.product_id);
          console.log('[ProductController] ✅ Cart item prices synced successfully');
        } catch (syncError) {
          console.error('[ProductController] ⚠️ Error syncing cart item prices:', syncError.message);
          // Không throw error để không ảnh hưởng đến việc cập nhật sản phẩm
        }
      }
      
      const duration = Date.now() - startTime;
      console.log('[ProductController] ✅✅✅ PRODUCT UPDATED SUCCESSFULLY ✅✅✅');
      console.log('[ProductController] Duration:', duration, 'ms');
      console.log('========================================');
      return res.status(200).json({
        success: true,
        message: 'Cập nhật sản phẩm thành công',
        data: updated,  
      });
    } catch (error) {
      console.error('[ProductController] ❌❌❌ ERROR IN update ❌❌❌');
      console.error('[ProductController] Error message:', error.message);
      console.error('[ProductController] Error stack:', error.stack);
      console.error('[ProductController] Error details:', {
        name: error.name,
        message: error.message,
        code: error.code
      });
      console.log('========================================');
      return res.status(400).json({
        success: false,
        message: 'Lỗi khi cập nhật sản phẩm',
        error: error.message,
      });
    }
  }
  /**
   * HTTP Handler: DELETE /products/:id
   * Override delete từ BaseController để CHỈ cho phép soft delete (không hard delete)
   * 
   * Soft delete: Chỉ set deleted_at = current timestamp, không xóa record khỏi database
   * Lợi ích: Có thể khôi phục sau, giữ lại lịch sử
   * 
   * URL Params:
   * - id: ID của sản phẩm cần xóa (bắt buộc)
   * 
   * Response:
   * - 200: Success { success: true, message: "Xóa sản phẩm thành công (soft delete)" }
   * - 400: Bad Request (thiếu ID, đã bị xóa)
   * - 404: Not Found (không tìm thấy)
   * 
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @returns {Promise<void>} JSON response
   */

  const deleteProduct = async (req, res) => {
    console.log('========================================');
    console.log('[ProductController] deleteProduct function called');
    console.log('[ProductController] Request IP:', req.ip);
    console.log('[ProductController] Request method:', req.method);
    console.log('[ProductController] Request URL:', req.originalUrl);
    console.log('[ProductController] Params:', req.params);
    const startTime = Date.now();
    try {
      const { id } = req.params;
      console.log('[ProductController] Extracted productId:', id);
      if (!id) {
        console.log('[ProductController] ❌ Validation failed: Missing product ID');
        return res.status(400).json({
          success: false,
          message: 'Product ID là bắt buộc',
        });
      }
      console.log('[ProductController] 🔍 Checking if product exists...');
      const existing = await product.findById(id);
      if (!existing) {
        console.log('[ProductController] ❌ Product not found');
        return res.status(404).json({
          success: false,
          message: 'Không tìm thấy sản phẩm',
        });
      }
      console.log('[ProductController] ✅ Product found:', {
        productId: existing.product_id,
        name: existing.name,
        isDeleted: !!existing.deleted_at
      });
      if (existing.deleted_at) {
        console.log('[ProductController] ❌ Product already deleted');
        return res.status(400).json({
          success: false,
          message: 'Sản phẩm đã bị xóa trước đó',
        });
      }
      console.log('[ProductController] 🗑️ Performing soft delete...');
      await product.softDelete(id);
      console.log('[ProductController] ✅ Product soft deleted successfully');
      const duration = Date.now() - startTime;
      console.log('[ProductController] ✅ deleteProduct completed successfully in', duration, 'ms');
      console.log('========================================');
      return res.status(200).json({
        success: true,
        message: 'Xóa sản phẩm thành công (soft delete)',
      });
    } catch (error) {
      console.error('[ProductController] ❌❌❌ ERROR IN deleteProduct ❌❌❌');
      console.error('[ProductController] Error message:', error.message);
      console.error('[ProductController] Error stack:', error.stack);
      console.error('[ProductController] Error details:', {
        name: error.name,
        message: error.message,
        code: error.code
      });
      console.log('========================================');
      return res.status(400).json({
        success: false,
        message: 'Lỗi khi xóa sản phẩm',
        error: error.message,
      });
    }
  }
  /**
   * HTTP Handler: GET /products/:id
   * Override getById từ BaseController để filter deleted products
   * 
   * Query Parameters:
   * - includeDeleted: true/false - Có bao gồm sản phẩm đã bị xóa không (mặc định: false)
   * 
   * URL Params:
   * - id: ID của sản phẩm cần lấy (bắt buộc)
   * 
   * Response:
   * - 200: Success { success: true, data: {...} }
   * - 400: Bad Request (thiếu ID)
   * - 404: Not Found (không tìm thấy hoặc đã bị xóa)
   * 
   * Đặc biệt:
   * - Tự động parse images từ JSON string thành array
   * - Tự động set primary_image nếu chưa có
   * 
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @returns {Promise<void>} JSON response
   */

  const getById = async (req, res) => {
    console.log('========================================');
    console.log('[ProductController] getById function called');
    console.log('[ProductController] Request IP:', req.ip);
    console.log('[ProductController] Request method:', req.method);
    console.log('[ProductController] Request URL:', req.originalUrl);
    console.log('[ProductController] Params:', req.params);
    console.log('[ProductController] Query:', req.query);
    const startTime = Date.now();
    try {
      const { id } = req.params;
      const { includeDeleted = false } = req.query;
      console.log('[ProductController] Extracted data:', { productId: id, includeDeleted });
      if (!id) {
        console.log('[ProductController] ❌ Validation failed: Missing product ID');
        return res.status(400).json({
          success: false,
          message: 'Product ID là bắt buộc',
        });
      }
      console.log('[ProductController] 🔍 Finding product by ID...');
      const data = await product.findById(id);
      if (!data) {
        console.log('[ProductController] ❌ Product not found');
        return res.status(404).json({
          success: false,
          message: 'Không tìm thấy sản phẩm',
        });
      }
      console.log('[ProductController] ✅ Product found:', {
        productId: data.product_id,
        name: data.name,
        isDeleted: !!data.deleted_at
      });
      if (!includeDeleted && data.deleted_at) {
        console.log('[ProductController] ❌ Product is deleted and includeDeleted is false');
        return res.status(404).json({
          success: false,
          message: 'Sản phẩm đã bị xóa',
        });
      }
      console.log('[ProductController] 🖼️  Processing images for getById...');
      console.log('[ProductController] Product data:', {
        productId: data?.id || data?.product_id,
        name: data?.name,
        hasImages: !!data?.images,
        imagesType: typeof data?.images,
        imagesValue: typeof data?.images === 'string' 
          ? (data.images.length > 100 ? data.images.substring(0, 100) + '...' : data.images)
          : data?.images,
        hasPrimaryImage: !!data?.primary_image,
        primaryImage: data?.primary_image,
      });
      if (data && data.images) {
        try {
          const parsedImages = product.parseImages(data.images);
          console.log('[ProductController] Parsed images:', {
            count: parsedImages.length,
            images: parsedImages.map(img => ({
              url: img.url ? (img.url.length > 50 ? img.url.substring(0, 50) + '...' : img.url) : 'no url',
              alt: img.alt,
              is_primary: img.is_primary,
              order: img.order,
            })),
          });
          data.images = parsedImages;
          if (!data.primary_image && parsedImages.length > 0) {
            const primaryImg = parsedImages.find(img => img.is_primary) || parsedImages[0];
            data.primary_image = primaryImg?.url;
            console.log('[ProductController] Set primary_image:', {
              url: data.primary_image ? (data.primary_image.length > 50 ? data.primary_image.substring(0, 50) + '...' : data.primary_image) : 'null',
            });
          } else if (data.primary_image) {
            console.log('[ProductController] Product already has primary_image:', {
              url: data.primary_image.length > 50 ? data.primary_image.substring(0, 50) + '...' : data.primary_image,
            });
          } else {
            console.log('[ProductController] ⚠️  Product has no primary_image and no images');
          }
        } catch (parseError) {
          console.error('[ProductController] ❌ Error parsing images:', parseError);
          data.images = [];
        }
      } else {
        console.log('[ProductController] Product has no images field');
      }
      const duration = Date.now() - startTime;
      console.log('[ProductController] ✅ getById completed successfully in', duration, 'ms');
      console.log('========================================');
      return res.status(200).json({
        success: true,
        data,
      });
    } catch (error) {
      console.error('[ProductController] ❌❌❌ ERROR IN getById ❌❌❌');
      console.error('[ProductController] Error message:', error.message);
      console.error('[ProductController] Error stack:', error.stack);
      console.error('[ProductController] Error details:', {
        name: error.name,
        message: error.message,
        code: error.code
      });
      console.log('========================================');
      return res.status(500).json({
        success: false,
        message: 'Lỗi khi lấy dữ liệu',
        error: error.message,
      });
    }
  }
  /**
   * HTTP Handler: GET /products/slug/:slug
   * Lấy product theo slug (URL-friendly identifier)
   * 
   * Query Parameters:
   * - includeDeleted: true/false - Có bao gồm sản phẩm đã bị xóa không (mặc định: false)
   * 
   * URL Params:
   * - slug: Slug của sản phẩm (bắt buộc)
   * 
   * Response:
   * - 200: Success { success: true, data: {...} }
   * - 400: Bad Request (thiếu slug)
   * - 404: Not Found (không tìm thấy hoặc đã bị xóa)
   * 
   * Đặc biệt:
   * - Tự động parse images từ JSON string thành array
   * 
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @returns {Promise<void>} JSON response
   */

  const getBySlug = async (req, res) => {
    console.log('========================================');
    console.log('[ProductController] getBySlug function called');
    console.log('[ProductController] Request IP:', req.ip);
    console.log('[ProductController] Request method:', req.method);
    console.log('[ProductController] Request URL:', req.originalUrl);
    console.log('[ProductController] Params:', req.params);
    console.log('[ProductController] Query:', req.query);
    const startTime = Date.now();
    try {
      const { slug } = req.params;
      const { includeDeleted = false } = req.query;
      console.log('[ProductController] Extracted data:', { slug, includeDeleted });
      if (!slug || !slug.trim()) {
        console.log('[ProductController] ❌ Validation failed: Missing slug');
        return res.status(400).json({
          success: false,
          message: 'Slug là bắt buộc',
        });
      }
      console.log('[ProductController] 🔍 Finding product by slug...');
      const data = await product.findBySlug(slug.trim());
      if (!data) {
        console.log('[ProductController] ❌ Product not found');
        return res.status(404).json({
          success: false,
          message: 'Không tìm thấy sản phẩm',
        });
      }
      console.log('[ProductController] ✅ Product found:', {
        productId: data.product_id,
        name: data.name,
        isDeleted: !!data.deleted_at
      });
      if (!includeDeleted && data.deleted_at) {
        console.log('[ProductController] ❌ Product is deleted and includeDeleted is false');
        return res.status(404).json({
          success: false,
          message: 'Sản phẩm đã bị xóa',
        });
      }
      if (data && data.images) {
        data.images = product.parseImages(data.images);
      }
      const duration = Date.now() - startTime;
      console.log('[ProductController] ✅ getBySlug completed successfully in', duration, 'ms');
      console.log('========================================');
      return res.status(200).json({
        success: true,
        data,
      });
    } catch (error) {
      console.error('[ProductController] ❌❌❌ ERROR IN getBySlug ❌❌❌');
      console.error('[ProductController] Error message:', error.message);
      console.error('[ProductController] Error stack:', error.stack);
      console.error('[ProductController] Error details:', {
        name: error.name,
        message: error.message,
        code: error.code
      });
      console.log('========================================');
      return res.status(500).json({
        success: false,
        message: 'Lỗi khi lấy dữ liệu',
        error: error.message,
      });
    }
  }
  /**
   * HTTP Handler: GET /products/sku/:sku
   * Lấy product theo SKU (Stock Keeping Unit)
   * 
   * Query Parameters:
   * - includeDeleted: true/false - Có bao gồm sản phẩm đã bị xóa không (mặc định: false)
   * 
   * URL Params:
   * - sku: SKU của sản phẩm (bắt buộc)
   * 
   * Response:
   * - 200: Success { success: true, data: {...} }
   * - 400: Bad Request (thiếu SKU)
   * - 404: Not Found (không tìm thấy hoặc đã bị xóa)
   * 
   * Đặc biệt:
   * - Tự động parse images từ JSON string thành array
   * 
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @returns {Promise<void>} JSON response
   */

  const getBySku = async (req, res) => {
    console.log('========================================');
    console.log('[ProductController] getBySku function called');
    console.log('[ProductController] Request IP:', req.ip);
    console.log('[ProductController] Request method:', req.method);
    console.log('[ProductController] Request URL:', req.originalUrl);
    console.log('[ProductController] Params:', req.params);
    console.log('[ProductController] Query:', req.query);
    const startTime = Date.now();
    try {
      const { sku } = req.params;
      const { includeDeleted = false } = req.query;
      console.log('[ProductController] Extracted data:', { sku, includeDeleted });
      if (!sku || !sku.trim()) {
        console.log('[ProductController] ❌ Validation failed: Missing SKU');
        return res.status(400).json({
          success: false,
          message: 'SKU là bắt buộc',
        });
      }
      console.log('[ProductController] 🔍 Finding product by SKU...');
      const data = await product.findBySku(sku.trim());
      if (!data) {
        console.log('[ProductController] ❌ Product not found');
        return res.status(404).json({
          success: false,
          message: 'Không tìm thấy sản phẩm',
        });
      }
      console.log('[ProductController] ✅ Product found:', {
        productId: data.product_id,
        name: data.name,
        isDeleted: !!data.deleted_at
      });
      if (!includeDeleted && data.deleted_at) {
        console.log('[ProductController] ❌ Product is deleted and includeDeleted is false');
        return res.status(404).json({
          success: false,
          message: 'Sản phẩm đã bị xóa',
        });
      }
      if (data && data.images) {
        data.images = product.parseImages(data.images);
      }
      const duration = Date.now() - startTime;
      console.log('[ProductController] ✅ getBySku completed successfully in', duration, 'ms');
      console.log('========================================');
      return res.status(200).json({
        success: true,
        data,
      });
    } catch (error) {
      console.error('[ProductController] ❌❌❌ ERROR IN getBySku ❌❌❌');
      console.error('[ProductController] Error message:', error.message);
      console.error('[ProductController] Error stack:', error.stack);
      console.error('[ProductController] Error details:', {
        name: error.name,
        message: error.message,
        code: error.code
      });
      console.log('========================================');
      return res.status(500).json({
        success: false,
        message: 'Lỗi khi lấy dữ liệu',
        error: error.message,
      });
    }
  }
  /**
   * HTTP Handler: GET /products/category/:categoryId
   * Lấy danh sách products theo category ID
   * 
   * Query Parameters:
   * - page: Số trang (mặc định: 1)
   * - limit: Số lượng/trang (mặc định: 10)
   * 
   * URL Params:
   * - categoryId: ID của category (bắt buộc)
   * 
   * Response:
   * - 200: Success { success: true, data: [...] }
   * - 400: Bad Request (thiếu categoryId)
   * 
   * Đặc biệt:
   * - Tự động parse images cho tất cả products
   * 
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @returns {Promise<void>} JSON response
   */

  const getByCategory = async (req, res) => {
    console.log('========================================');
    console.log('[ProductController] getByCategory function called');
    console.log('[ProductController] Request IP:', req.ip);
    console.log('[ProductController] Request method:', req.method);
    console.log('[ProductController] Request URL:', req.originalUrl);
    console.log('[ProductController] Params:', req.params);
    console.log('[ProductController] Query:', req.query);
    const startTime = Date.now();
    try {
      const { categoryId } = req.params;
      const { page = 1, limit = 10 } = req.query;
      const offset = (parseInt(page) - 1) * parseInt(limit);
      console.log('[ProductController] Extracted data:', {
        categoryId,
        page,
        limit,
        offset
      });
      if (!categoryId) {
        console.log('[ProductController] ❌ Validation failed: Missing categoryId');
        return res.status(400).json({
          success: false,
          message: 'Category ID là bắt buộc',
        });
      }
      console.log('[ProductController] 🔍 Fetching products by category...');
      const data = await product.findByCategory(categoryId, {
        limit: parseInt(limit),
        offset,
      });
      console.log('[ProductController] ✅ Products found:', data?.length || 0);
      if (Array.isArray(data)) {
        console.log('[ProductController] 🖼️ Parsing images for products...');
        data.forEach(item => {
          if (item.images) {
            item.images = product.parseImages(item.images);
          }
        });
      }
      const duration = Date.now() - startTime;
      console.log('[ProductController] ✅ getByCategory completed successfully in', duration, 'ms');
      console.log('========================================');
      return res.status(200).json({
        success: true,
        data,
      });
    } catch (error) {
      console.error('[ProductController] ❌❌❌ ERROR IN getByCategory ❌❌❌');
      console.error('[ProductController] Error message:', error.message);
      console.error('[ProductController] Error stack:', error.stack);
      console.error('[ProductController] Error details:', {
        name: error.name,
        message: error.message,
        code: error.code
      });
      console.log('========================================');
      return res.status(500).json({
        success: false,
        message: 'Lỗi khi lấy dữ liệu',
        error: error.message,
      });
    }
  }
  /**
   * HTTP Handler: GET /products/active
   * Lấy danh sách products đang active (is_active = 1 và chưa bị xóa)
   * 
   * Query Parameters:
   * - page: Số trang (mặc định: 1)
   * - limit: Số lượng/trang (mặc định: 10)
   * 
   * Response:
   * - 200: Success { success: true, data: [...] }
   * 
   * Đặc biệt:
   * - Chỉ lấy products có is_active = 1 và deleted_at = null
   * - Tự động parse images cho tất cả products
   * 
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @returns {Promise<void>} JSON response
   */

  const getActive = async (req, res) => {
    console.log('========================================');
    console.log('[ProductController] getActive function called');
    console.log('[ProductController] Request IP:', req.ip);
    console.log('[ProductController] Request method:', req.method);
    console.log('[ProductController] Request URL:', req.originalUrl);
    console.log('[ProductController] Query:', req.query);
    const startTime = Date.now();
    try {
      const { page = 1, limit = 10 } = req.query;
      const offset = (parseInt(page) - 1) * parseInt(limit);
      console.log('[ProductController] Pagination:', { page, limit, offset });
      console.log('[ProductController] 🔍 Fetching active products...');
      console.log('[ProductController] Using filters: is_active=1, deleted_at=null');
      const data = await product.findActive({
        limit: parseInt(limit),
        offset,
      });
      console.log('[ProductController] ✅ Active products found:', data?.length || 0);
      if (!data || data.length === 0) {
        console.log('[ProductController] ⚠️  No active products found');
        console.log('[ProductController] 🔍 Debugging: Checking product status in database...');
        const stats = await product.getProductStatisticsCounts();
        console.log('[ProductController] 📊 Product statistics (single query):', stats);
      }
      if (Array.isArray(data)) {
        console.log('[ProductController] 🖼️ Parsing images for products...');
        data.forEach(item => {
          if (item.images) {
            item.images = product.parseImages(item.images);
          }
        });
      }
      const duration = Date.now() - startTime;
      console.log('[ProductController] ✅ getActive completed successfully in', duration, 'ms');
      console.log('========================================');
      return res.status(200).json({
        success: true,
        data,
      });
    } catch (error) {
      console.error('[ProductController] ❌❌❌ ERROR IN getActive ❌❌❌');
      console.error('[ProductController] Error message:', error.message);
      console.error('[ProductController] Error stack:', error.stack);
      console.error('[ProductController] Error details:', {
        name: error.name,
        message: error.message,
        code: error.code
      });
      console.log('========================================');
      return res.status(500).json({
        success: false,
        message: 'Lỗi khi lấy dữ liệu',
        error: error.message,
      });
    }
  }
  /**
   * HTTP Handler: GET /products/search
   * Tìm kiếm products theo keyword (tìm trong name, description, SKU)
   * 
   * Query Parameters:
   * - keyword: Từ khóa tìm kiếm (bắt buộc)
   * - page: Số trang (mặc định: 1)
   * - limit: Số lượng/trang (mặc định: 10)
   * 
   * Response:
   * - 200: Success { success: true, data: [...] }
   * - 400: Bad Request (thiếu keyword)
   * 
   * Đặc biệt:
   * - Tìm kiếm trong name, description, SKU
   * - Tự động parse images cho tất cả products
   * 
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @returns {Promise<void>} JSON response
   */

  const search = async (req, res) => {
    console.log('========================================');
    console.log('[ProductController] search function called');
    console.log('[ProductController] Request IP:', req.ip);
    console.log('[ProductController] Request method:', req.method);
    console.log('[ProductController] Request URL:', req.originalUrl);
    console.log('[ProductController] Query:', req.query);
    const startTime = Date.now();
    try {
      const { keyword } = req.query;
      const { page = 1, limit = 10 } = req.query;
      const offset = (parseInt(page) - 1) * parseInt(limit);
      console.log('[ProductController] Search parameters:', {
        keyword,
        page,
        limit,
        offset
      });
      if (!keyword || !keyword.trim()) {
        console.log('[ProductController] ❌ Validation failed: Missing keyword');
        return res.status(400).json({
          success: false,
          message: 'Vui lòng nhập từ khóa tìm kiếm',
        });
      }
      console.log('[ProductController] 🔍 Searching products with keyword:', keyword.trim());
      const data = await product.search(keyword.trim(), {
        limit: parseInt(limit),
        offset,
      });
      console.log('[ProductController] ✅ Search results:', data?.length || 0);
      if (Array.isArray(data)) {
        console.log('[ProductController] 🖼️ Parsing images for products...');
        data.forEach(item => {
          if (item.images) {
            item.images = product.parseImages(item.images);
          }
        });
      }
      const duration = Date.now() - startTime;
      console.log('[ProductController] ✅ search completed successfully in', duration, 'ms');
      console.log('========================================');
      return res.status(200).json({
        success: true,
        data,
      });
    } catch (error) {
      console.error('[ProductController] ❌❌❌ ERROR IN search ❌❌❌');
      console.error('[ProductController] Error message:', error.message);
      console.error('[ProductController] Error stack:', error.stack);
      console.error('[ProductController] Error details:', {
        name: error.name,
        message: error.message,
        code: error.code
      });
      console.log('========================================');
      return res.status(500).json({
        success: false,
        message: 'Lỗi khi tìm kiếm',
        error: error.message,
      });
    }
  }
  /**
   * HTTP Handler: DELETE /products/:id/soft
   * Alias cho deleteProduct method
   * Giữ lại để backward compatibility
   * 
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @returns {Promise<void>} JSON response (từ deleteProduct)
   */

  const softDelete = async (req, res) => {
    return deleteProduct(req, res);
  };
  /**
   * HTTP Handler: GET /products/deleted
   * Lấy danh sách sản phẩm đã bị soft delete (admin only)
   * 
   * Query Parameters:
   * - page: Số trang (mặc định: 1)
   * - limit: Số lượng/trang (mặc định: 10)
   * 
   * Response:
   * - 200: Success { success: true, data: [...], pagination: {...} }
   * 
   * Đặc biệt:
   * - Sử dụng window function COUNT(*) OVER() để tối ưu (1 query thay vì 2)
   * 
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @returns {Promise<void>} JSON response
   */

  const getDeleted = async (req, res) => {
    console.log('========================================');
    console.log('[ProductController] getDeleted function called');
    console.log('[ProductController] Request IP:', req.ip);
    console.log('[ProductController] Request method:', req.method);
    console.log('[ProductController] Request URL:', req.originalUrl);
    console.log('[ProductController] Query:', req.query);
    const startTime = Date.now();
    try {
      const { page = 1, limit = 10 } = req.query;
      const offset = (parseInt(page) - 1) * parseInt(limit);
      console.log('[ProductController] Pagination:', { page, limit, offset });
      console.log('[ProductController] 🔍 Fetching deleted products...');
      const { data, total } = await product.getDeletedWithCount({
        limit: parseInt(limit),
        offset,
      });
      console.log('[ProductController] ✅ Deleted products found:', {
        count: data?.length || 0,
        total
      });
      const duration = Date.now() - startTime;
      console.log('[ProductController] ✅ getDeleted completed successfully in', duration, 'ms');
      console.log('========================================');
      return res.status(200).json({
        success: true,
        data,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          totalPages: Math.ceil(total / parseInt(limit)),
        },
      });
    } catch (error) {
      console.error('[ProductController] ❌❌❌ ERROR IN getDeleted ❌❌❌');
      console.error('[ProductController] Error message:', error.message);
      console.error('[ProductController] Error stack:', error.stack);
      console.error('[ProductController] Error details:', {
        name: error.name,
        message: error.message,
        code: error.code
      });
      console.log('========================================');
      return res.status(500).json({
        success: false,
        message: 'Lỗi khi lấy dữ liệu',
        error: error.message,
      });
    }
  }
  /**
   * HTTP Handler: POST /products/:id/restore
   * Khôi phục sản phẩm đã bị soft delete (set deleted_at = null)
   * 
   * URL Params:
   * - id: ID của sản phẩm cần khôi phục (bắt buộc)
   * 
   * Response:
   * - 200: Success { success: true, message: "Khôi phục thành công" }
   * - 400: Bad Request (thiếu ID, sản phẩm chưa bị xóa)
   * - 404: Not Found (không tìm thấy)
   * 
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @returns {Promise<void>} JSON response
   */

  const restore = async (req, res) => {
    console.log('========================================');
    console.log('[ProductController] restore function called');
    console.log('[ProductController] Request IP:', req.ip);
    console.log('[ProductController] Request method:', req.method);
    console.log('[ProductController] Request URL:', req.originalUrl);
    console.log('[ProductController] Params:', req.params);
    const startTime = Date.now();
    try {
      const { id } = req.params;
      console.log('[ProductController] Extracted productId:', id);
      if (!id) {
        console.log('[ProductController] ❌ Validation failed: Missing product ID');
        return res.status(400).json({
          success: false,
          message: 'Product ID là bắt buộc',
        });
      }
      console.log('[ProductController] 🔍 Checking if product exists...');
      const existing = await product.findById(id);
      if (!existing) {
        console.log('[ProductController] ❌ Product not found');
        return res.status(404).json({
          success: false,
          message: 'Không tìm thấy sản phẩm',
        });
      }
      console.log('[ProductController] ✅ Product found:', {
        productId: existing.product_id,
        name: existing.name,
        isDeleted: !!existing.deleted_at
      });
      if (!existing.deleted_at) {
        console.log('[ProductController] ⚠️ Product is not deleted');
        return res.status(400).json({
          success: false,
          message: 'Sản phẩm chưa bị xóa',
        });
      }
      console.log('[ProductController] 🔄 Restoring product...');
      await product.restore(id);
      console.log('[ProductController] ✅ Product restored successfully');
      const duration = Date.now() - startTime;
      console.log('[ProductController] ✅ restore completed successfully in', duration, 'ms');
      console.log('========================================');
      return res.status(200).json({
        success: true,
        message: 'Khôi phục thành công',
      });
    } catch (error) {
      console.error('[ProductController] ❌❌❌ ERROR IN restore ❌❌❌');
      console.error('[ProductController] Error message:', error.message);
      console.error('[ProductController] Error stack:', error.stack);
      console.error('[ProductController] Error details:', {
        name: error.name,
        message: error.message,
        code: error.code
      });
      console.log('========================================');
      return res.status(400).json({
        success: false,
        message: 'Lỗi khi khôi phục',
        error: error.message,
      });
    }
  }
  /**
   * HTTP Handler: PUT /products/:id/stock
   * Cập nhật số lượng tồn kho của sản phẩm
   * 
   * URL Params:
   * - id: ID của sản phẩm (bắt buộc)
   * 
   * Request Body:
   * - quantityChange: Số lượng thay đổi (có thể âm để giảm, dương để tăng) (bắt buộc)
   * - note: Ghi chú cho thay đổi (tùy chọn)
   * - createdBy: ID người thực hiện (tùy chọn)
   * 
   * Response:
   * - 200: Success { success: true, message: "...", data: {...} }
   * - 400: Bad Request (thiếu ID, thiếu quantityChange, không đủ stock)
   * - 404: Not Found (không tìm thấy sản phẩm)
   * 
   * Đặc biệt:
   * - Tự động ghi inventory transaction để tracking
   * - Kiểm tra stock không được < 0
   * 
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @returns {Promise<void>} JSON response
   */

  const updateStock = async (req, res) => {
    console.log('========================================');
    console.log('[ProductController] updateStock function called');
    console.log('[ProductController] Request IP:', req.ip);
    console.log('[ProductController] Request method:', req.method);
    console.log('[ProductController] Request URL:', req.originalUrl);
    console.log('[ProductController] Params:', req.params);
    console.log('[ProductController] Request body:', JSON.stringify(req.body, null, 2));
    const startTime = Date.now();
    try {
      const { id } = req.params;
      const { quantityChange, note, createdBy } = req.body;
      console.log('[ProductController] Extracted data:', {
        productId: id,
        quantityChange,
        hasNote: !!note,
        createdBy
      });
      if (!id) {
        console.log('[ProductController] ❌ Validation failed: Missing product ID');
        return res.status(400).json({
          success: false,
          message: 'Product ID là bắt buộc',
        });
      }
      if (quantityChange === undefined) {
        console.log('[ProductController] ❌ Validation failed: Missing quantityChange');
        return res.status(400).json({
          success: false,
          message: 'Vui lòng cung cấp quantityChange',
        });
      }
      console.log('[ProductController] 🔍 Checking if product exists...');
      const productData = await product.findById(id);
      if (!productData) {
        console.log('[ProductController] ❌ Product not found');
        return res.status(404).json({
          success: false,
          message: 'Không tìm thấy sản phẩm',
        });
      }
      console.log('[ProductController] ✅ Product found:', {
        productId: productData.product_id,
        name: productData.name,
        currentStock: productData.stock_quantity,
        isDeleted: !!productData.deleted_at
      });
      if (productData.deleted_at) {
        console.log('[ProductController] ❌ Product is deleted');
        return res.status(400).json({
          success: false,
          message: 'Không thể cập nhật stock cho sản phẩm đã bị xóa',
        });
      }
      const newStock = (productData.stock_quantity || 0) + parseInt(quantityChange);
      console.log('[ProductController] Stock calculation:', {
        currentStock: productData.stock_quantity || 0,
        quantityChange: parseInt(quantityChange),
        newStock
      });
      if (newStock < 0) {
        console.log('[ProductController] ❌ Validation failed: Insufficient stock');
        return res.status(400).json({
          success: false,
          message: 'Số lượng tồn kho không đủ',
        });
      }
      console.log('[ProductController] 📦 Updating stock...');
      await product.updateStock(id, parseInt(quantityChange));
      console.log('[ProductController] 📝 Recording inventory transaction...');
      const { inventoryTransaction } = require('../Models');
      await inventoryTransaction.recordTransaction(
        id,
        parseInt(quantityChange),
        quantityChange > 0 ? 'IN' : 'OUT',
        note || 'Manual adjustment',
        createdBy
      );
      console.log('[ProductController] ✅ Inventory transaction recorded');
      console.log('[ProductController] 🔍 Fetching updated product...');
      const updated = await product.findById(id);
      console.log('[ProductController] ✅ Stock updated successfully');
      console.log('[ProductController] New stock:', updated?.stock_quantity);
      const duration = Date.now() - startTime;
      console.log('[ProductController] ✅ updateStock completed successfully in', duration, 'ms');
      console.log('========================================');
      return res.status(200).json({
        success: true,
        message: 'Cập nhật stock thành công',
        data: updated,
      });
    } catch (error) {
      console.error('[ProductController] ❌❌❌ ERROR IN updateStock ❌❌❌');
      console.error('[ProductController] Error message:', error.message);
      console.error('[ProductController] Error stack:', error.stack);
      console.error('[ProductController] Error details:', {
        name: error.name,
        message: error.message,
        code: error.code
      });
      console.log('========================================');
      return res.status(400).json({
        success: false,
        message: 'Lỗi khi cập nhật stock',
        error: error.message,
      });
    }
  }
  /**
   * HTTP Handler: GET /products
   * Override getAll từ BaseController để filter products theo trạng thái
   * 
   * Query Parameters:
   * - page: Số trang (mặc định: 1)
   * - limit: Số lượng/trang (mặc định: 10)
   * - includeDeleted: true/false - Có bao gồm sản phẩm đã bị xóa không (mặc định: false)
   * - includeInactive: true/false - Có bao gồm sản phẩm inactive không (mặc định: false)
   * - orderBy: Câu lệnh ORDER BY (mặc định: 'sort_order ASC, created_at DESC')
   * - ...filters: Các filter khác (category_id, brand_id, etc.)
   * 
   * Response:
   * - 200: Success { success: true, data: [...], pagination: {...} }
   * 
   * Đặc biệt:
   * - Mặc định chỉ lấy products active và chưa bị xóa
   * - Admin có thể xem tất cả bằng cách truyền includeDeleted=true và includeInactive=true
   * - Sử dụng window function COUNT(*) OVER() để tối ưu (1 query thay vì 2)
   * - Tự động parse images cho tất cả products
   * - Tự động set primary_image nếu chưa có
   * 
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @returns {Promise<void>} JSON response
   */

  const getAll = async (req, res) => {
    console.log('========================================');
    console.log('[ProductController] getAll function called');
    console.log('[ProductController] Request IP:', req.ip);
    console.log('[ProductController] Request URL:', req.originalUrl);
    console.log('[ProductController] Query params:', req.query);
    console.log('[ProductController] User:', req.user ? { userId: req.user.userId, roleId: req.user.roleId } : 'No user');
    try {
      const { page = 1, limit = 10, includeDeleted = false, includeInactive = false, ...filters } = req.query;
      const offset = (parseInt(page) - 1) * parseInt(limit);
      console.log('[ProductController] 📋 Initial filters:', {
        page,
        limit,
        offset,
        includeDeleted,
        includeInactive,
        otherFilters: filters,
      });
      const isAdmin = req.user && req.user.roleId === 1;
      console.log('[ProductController] 👤 User check:', {
        hasUser: !!req.user,
        isAdmin,
        roleId: req.user?.roleId,
      });
      const shouldIncludeDeleted = includeDeleted === 'true' || includeDeleted === true || isAdmin;
      const shouldIncludeInactive = includeInactive === 'true' || includeInactive === true || isAdmin;
      console.log('[ProductController] 🔍 Filter logic:', {
        shouldIncludeDeleted,
        shouldIncludeInactive,
        includeDeletedValue: includeDeleted,
        includeInactiveValue: includeInactive,
      });
      if (!shouldIncludeDeleted) {
        filters.deleted_at = null;
        console.log('[ProductController] ✅ Added filter: deleted_at = null');
      } else {
        console.log('[ProductController] ⚠️  Including deleted products');
      }
      if (!shouldIncludeInactive) {
        filters.is_active = 1;
        console.log('[ProductController] ✅ Added filter: is_active = 1');
      } else {
        console.log('[ProductController] ⚠️  Including inactive products');
      }
      console.log('[ProductController] 📋 Final filters:', filters);
      const { data, total } = await product.findAllWithCount({
        filters,
        limit: parseInt(limit),
        offset,
        orderBy: req.query.orderBy || 'sort_order ASC, created_at DESC',
      });
      console.log('[ProductController] 📊 Query results:', {
        dataCount: Array.isArray(data) ? data.length : 0,
        total,
        hasData: Array.isArray(data) && data.length > 0,
      });
      if (Array.isArray(data) && data.length === 0 && total === 0) {
        console.log('[ProductController] ⚠️  No products found with current filters');
        console.log('[ProductController] 🔍 Debugging: Checking if products exist in database...');
        const stats = await product.getProductStatisticsCounts();
        console.log('[ProductController] 📊 Product statistics (single query):', stats);
        if (stats.totalAll === 0) {
          console.log('[ProductController] ⚠️  No products exist in database at all');
        }
      }
      console.log('[ProductController] 🖼️  Processing images for products...');
      console.log('[ProductController] Products count:', data?.length || 0);
      if (Array.isArray(data)) {
        let productsWithImages = 0;
        let productsWithParsedImages = 0;
        let productsWithPrimaryImage = 0;
        data.forEach((item, index) => {
          const productId = item.id || item.product_id;
          console.log(`[ProductController] Processing product ${index + 1}/${data.length} (ID: ${productId}):`, {
            name: item.name,
            hasImages: !!item.images,
            imagesType: typeof item.images,
            imagesValue: typeof item.images === 'string' 
              ? (item.images.length > 100 ? item.images.substring(0, 100) + '...' : item.images)
              : item.images,
            hasPrimaryImage: !!item.primary_image,
            primaryImage: item.primary_image,
          });
          if (item.images) {
            productsWithImages++;
            try {
              const parsedImages = product.parseImages(item.images);
              console.log(`[ProductController] Parsed images for product ${index + 1}:`, {
                count: parsedImages.length,
                images: parsedImages.map(img => ({
                  url: img.url ? (img.url.length > 50 ? img.url.substring(0, 50) + '...' : img.url) : 'no url',
                  alt: img.alt,
                  is_primary: img.is_primary,
                  order: img.order,
                })),
              });
              item.images = parsedImages;
              productsWithParsedImages++;
              if (!item.primary_image && parsedImages.length > 0) {
                const primaryImg = parsedImages.find(img => img.is_primary) || parsedImages[0];
                item.primary_image = primaryImg?.url;
                console.log(`[ProductController] Set primary_image for product ${index + 1}:`, {
                  url: item.primary_image ? (item.primary_image.length > 50 ? item.primary_image.substring(0, 50) + '...' : item.primary_image) : 'null',
                });
                productsWithPrimaryImage++;
              } else if (item.primary_image) {
                productsWithPrimaryImage++;
                console.log(`[ProductController] Product ${index + 1} already has primary_image:`, {
                  url: item.primary_image.length > 50 ? item.primary_image.substring(0, 50) + '...' : item.primary_image,
                });
              } else {
                console.log(`[ProductController] ⚠️  Product ${index + 1} has no primary_image and no images`);
              }
            } catch (parseError) {
              console.error(`[ProductController] ❌ Error parsing images for product ${index + 1}:`, parseError);
              item.images = [];
            }
          } else {
            console.log(`[ProductController] Product ${index + 1} has no images field`);
          }
        });
        console.log('[ProductController] 📊 Images processing summary:', {
          totalProducts: data.length,
          productsWithImages,
          productsWithParsedImages,
          productsWithPrimaryImage,
        });
      }
      return res.status(200).json({
        success: true,
        data,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          totalPages: Math.ceil(total / parseInt(limit)),
        },
      });
    } catch (error) {
      console.error('Error in getAll:', error);
      return res.status(500).json({
        success: false,
        message: 'Lỗi khi lấy dữ liệu',
        error: error.message,
      });
    }
  }
  /**
   * HTTP Handler: POST /products/:id/images
   * Thêm một image mới vào sản phẩm
   * 
   * URL Params:
   * - id: ID của sản phẩm (bắt buộc)
   * 
   * Request Body:
   * - url: URL của image (bắt buộc)
   * - alt: Alt text cho image (tùy chọn)
   * - is_primary: Có phải primary image không (tùy chọn)
   * - order: Thứ tự hiển thị (tùy chọn)
   * 
   * Response:
   * - 200: Success { success: true, message: "...", data: { images: [...] } }
   * - 400: Bad Request (thiếu URL, sản phẩm đã bị xóa)
   * - 404: Not Found (không tìm thấy sản phẩm)
   * 
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @returns {Promise<void>} JSON response
   */

  const addImage = async (req, res) => {
    try {
      const { id } = req.params;
      const { url, alt, is_primary, order } = req.body;
      if (!url || !url.trim()) {
        return res.status(400).json({
          success: false,
          message: 'URL hình ảnh là bắt buộc',
        });
      }
      const productData = await product.findById(id);
      if (!productData) {
        return res.status(404).json({
          success: false,
          message: 'Không tìm thấy sản phẩm',
        });
      }
      if (productData.deleted_at) {
        return res.status(400).json({
          success: false,
          message: 'Không thể thêm image cho sản phẩm đã bị xóa',
        });
      }
      const images = await product.addImage(id, {
        url,
        alt,
        is_primary,
        order,
      });
      return res.status(200).json({
        success: true,
        message: 'Thêm hình ảnh thành công',
        data: { images },
      });
    } catch (error) {
      return res.status(400).json({
        success: false,
        message: error.message || 'Lỗi khi thêm hình ảnh',
        error: error.message,
      });
    }
  }
  /**
   * HTTP Handler: DELETE /products/:id/images/:imageUrl
   * Xóa một image khỏi sản phẩm
   * 
   * URL Params:
   * - id: ID của sản phẩm (bắt buộc)
   * - imageUrl: URL của image cần xóa (bắt buộc)
   * 
   * Response:
   * - 200: Success { success: true, message: "...", data: { images: [...] } }
   * - 400: Bad Request (sản phẩm đã bị xóa)
   * - 404: Not Found (không tìm thấy sản phẩm)
   * 
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @returns {Promise<void>} JSON response
   */

  const removeImage = async (req, res) => {
    try {
      const { id, imageUrl } = req.params;
      const productData = await product.findById(id);
      if (!productData) {
        return res.status(404).json({
          success: false,
          message: 'Không tìm thấy sản phẩm',
        });
      }
      if (productData.deleted_at) {
        return res.status(400).json({
          success: false,
          message: 'Không thể xóa image của sản phẩm đã bị xóa',
        });
      }
      const images = await product.removeImage(id, imageUrl);
      return res.status(200).json({
        success: true,
        message: 'Xóa hình ảnh thành công',
        data: { images },
      });
    } catch (error) {
      return res.status(400).json({
        success: false,
        message: error.message || 'Lỗi khi xóa hình ảnh',
        error: error.message,
      });
    }
  }
  /**
   * HTTP Handler: PUT /products/:id/images/primary
   * Đặt một image làm primary image (hình ảnh chính)
   * 
   * URL Params:
   * - id: ID của sản phẩm (bắt buộc)
   * 
   * Request Body:
   * - imageUrl: URL của image cần đặt làm primary (bắt buộc)
   * 
   * Response:
   * - 200: Success { success: true, message: "...", data: { images: [...] } }
   * - 400: Bad Request (thiếu imageUrl, sản phẩm đã bị xóa)
   * - 404: Not Found (không tìm thấy sản phẩm)
   * 
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @returns {Promise<void>} JSON response
   */

  const setPrimaryImage = async (req, res) => {
    try {
      const { id } = req.params;
      const { imageUrl } = req.body;
      if (!imageUrl || !imageUrl.trim()) {
        return res.status(400).json({
          success: false,
          message: 'URL hình ảnh là bắt buộc',
        });
      }
      const productData = await product.findById(id);
      if (!productData) {
        return res.status(404).json({
          success: false,
          message: 'Không tìm thấy sản phẩm',
        });
      }
      if (productData.deleted_at) {
        return res.status(400).json({
          success: false,
          message: 'Không thể set primary image cho sản phẩm đã bị xóa',
        });
      }
      const images = await product.setPrimaryImage(id, imageUrl.trim());
      return res.status(200).json({
        success: true,
        message: 'Đặt hình ảnh chính thành công',
        data: { images },
      });
    } catch (error) {
      return res.status(400).json({
        success: false,
        message: error.message || 'Lỗi khi đặt hình ảnh chính',
        error: error.message,
      });
    }
  }
  /**
   * HTTP Handler: GET /products/:id/images/primary
   * Lấy primary image (hình ảnh chính) của sản phẩm
   * 
   * URL Params:
   * - id: ID của sản phẩm (bắt buộc)
   * 
   * Response:
   * - 200: Success { success: true, data: {...} }
   * - 404: Not Found (không tìm thấy sản phẩm)
   * 
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @returns {Promise<void>} JSON response
   */

  const getPrimaryImage = async (req, res) => {
    try {
      const { id } = req.params;
      const productData = await product.findById(id);
      if (!productData) {
        return res.status(404).json({
          success: false,
          message: 'Không tìm thấy sản phẩm',
        });
      }
      const primaryImage = await product.getPrimaryImage(id);
      return res.status(200).json({
        success: true,
        data: primaryImage,
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: 'Lỗi khi lấy hình ảnh chính',
        error: error.message,
      });
    }
  };
  /**
   * HTTP Handler: PUT /products/:id/images
   * Cập nhật toàn bộ danh sách images của sản phẩm (thay thế toàn bộ)
   * 
   * URL Params:
   * - id: ID của sản phẩm (bắt buộc)
   * 
   * Request Body:
   * - Có thể là array trực tiếp: [{ url, alt, is_primary, order }, ...]
   * - Hoặc object: { images: [{ url, alt, is_primary, order }, ...] }
   * 
   * Response:
   * - 200: Success { success: true, message: "...", data: { images: [...] } }
   * - 400: Bad Request (không phải array, sản phẩm đã bị xóa)
   * - 404: Not Found (không tìm thấy sản phẩm)
   * 
   * Đặc biệt:
   * - Validate, normalize, và serialize images
   * - Kiểm tra kích thước tổng không vượt quá 10MB
   * 
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @returns {Promise<void>} JSON response
   */

  const updateImages = async (req, res) => {
    console.log('========================================');
    console.log('[ProductController] 🖼️  updateImages function called');
    console.log('[ProductController] Request IP:', req.ip);
    console.log('[ProductController] Params:', req.params);
    console.log('[ProductController] Request body type:', typeof req.body);
    console.log('[ProductController] Request body is array:', Array.isArray(req.body));
    console.log('[ProductController] Request body keys:', Object.keys(req.body || {}));
    console.log('[ProductController] Request body preview:', JSON.stringify(
      Array.isArray(req.body) 
        ? req.body.map(img => ({
            url: img.url ? (img.url.length > 50 ? img.url.substring(0, 50) + '...' : img.url) : 'no url',
            alt: img.alt,
            is_primary: img.is_primary,
            order: img.order,
          }))
        : req.body,
      null,
      2
    ));
    try {
      const { id } = req.params;
      console.log('[ProductController] Product ID:', id);
      const images = Array.isArray(req.body) ? req.body : req.body.images;
      console.log('[ProductController] Extracted images:', {
        isArray: Array.isArray(images),
        count: Array.isArray(images) ? images.length : 0,
        images: Array.isArray(images) 
          ? images.map((img, idx) => ({
              index: idx,
              url: img.url ? (img.url.length > 50 ? img.url.substring(0, 50) + '...' : img.url) : 'no url',
              urlLength: img.url?.length || 0,
              alt: img.alt,
              is_primary: img.is_primary,
              order: img.order,
            }))
          : null,
      });
      if (!Array.isArray(images)) {
        console.log('[ProductController] ❌ Validation failed: Not an array');
        console.log('[ProductController] Images value:', images);
        return res.status(400).json({
          success: false,
          message: 'Images phải là một mảng',
        });
      }
      console.log('[ProductController] 🔍 Checking if product exists...');
      const productData = await product.findById(id);
      if (!productData) {
        console.log('[ProductController] ❌ Product not found');
        return res.status(404).json({
          success: false,
          message: 'Không tìm thấy sản phẩm',
        });
      }
      console.log('[ProductController] Product found:', {
        productId: productData.id || productData.product_id,
        name: productData.name,
        hasImages: !!productData.images,
        imagesType: typeof productData.images,
        isDeleted: !!productData.deleted_at,
      });
      if (productData.deleted_at) {
        console.log('[ProductController] ❌ Product is deleted');
        return res.status(400).json({
          success: false,
          message: 'Không thể cập nhật images cho sản phẩm đã bị xóa',
        });
      }
      console.log('[ProductController] 📝 Calling product.updateImages...');
      const updatedImages = await product.updateImages(id, images);
      console.log('[ProductController] ✅ Images updated successfully');
      console.log('[ProductController] Updated images:', {
        count: updatedImages?.length || 0,
        images: updatedImages?.map(img => ({
          url: img.url ? (img.url.length > 50 ? img.url.substring(0, 50) + '...' : img.url) : 'no url',
          alt: img.alt,
          is_primary: img.is_primary,
          order: img.order,
        })) || [],
      });
      console.log('========================================');
      return res.status(200).json({
        success: true,
        message: 'Cập nhật danh sách hình ảnh thành công',
        data: { images: updatedImages },
      });
    } catch (error) {
      console.error('[ProductController] ❌❌❌ ERROR IN updateImages ❌❌❌');
      console.error('[ProductController] Error message:', error.message);
      console.error('[ProductController] Error stack:', error.stack);
      console.error('[ProductController] Error details:', {
        name: error.name,
        message: error.message,
        code: error.code,
      });
      console.log('========================================');
      return res.status(400).json({
        success: false,
        message: error.message || 'Lỗi khi cập nhật hình ảnh',
        error: error.message,
      });
    }
  };
  return {
    ...baseController,
    create,                    
    update,                    
    delete: deleteProduct,    
    getById,                   
    getBySlug,                 
    getBySku,                  
    getByCategory,             
    getActive,                 
    search,                    
    softDelete,
    getDeleted,                
    restore,                   
    updateStock,               
    getAll,                    
    addImage,                  
    removeImage,               
    setPrimaryImage,           
    getPrimaryImage,           
    updateImages,              
  };
};
module.exports = createProductController();
