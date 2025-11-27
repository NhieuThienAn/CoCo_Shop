import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Card,
  Button,
  Space,
  Tag,
  Image as AntdImage,
  Popconfirm,
  message,
  Typography,
  Input,
  Modal,
  Form,
  InputNumber,
  Row,
  Col,
  Pagination,
  Empty,
  Spin,
  Upload,
  Select,
  Collapse,
} from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, SearchOutlined, CopyOutlined, FilterOutlined, ClearOutlined } from '@ant-design/icons';
import { product, category, support } from '../../api/index.js';
import { numberFormatter, numberParser, integerFormatter, integerParser } from '../../utils/numberFormatter.js';
import './Products.scss';

const { Title } = Typography;
const { Search } = Input;

const AdminProducts = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0 });
  const [searchText, setSearchText] = useState('');
  const [duplicateModalVisible, setDuplicateModalVisible] = useState(false);
  const [duplicateProduct, setDuplicateProduct] = useState(null);
  const [duplicateForm] = Form.useForm();
  const [duplicating, setDuplicating] = useState(false);
  const [duplicateImages, setDuplicateImages] = useState([]);
  const [duplicateImagePreviewUrls, setDuplicateImagePreviewUrls] = useState({});
  
  // Filter states
  const [filters, setFilters] = useState({
    category_id: undefined,
    brand: undefined,
    is_active: undefined,
  });
  const [categories, setCategories] = useState([]);
  const [brands, setBrands] = useState([]);
  const [filterLoading, setFilterLoading] = useState(false);
  const [filterPanelOpen, setFilterPanelOpen] = useState(false);

  useEffect(() => {
    loadFilterData();
  }, []);

  useEffect(() => {
    loadProducts();
  }, [pagination.page, searchText, filters]);

  // Reset to page 1 when filters change
  useEffect(() => {
    if (pagination.page !== 1) {
      setPagination((prev) => ({ ...prev, page: 1 }));
    }
  }, [filters.category_id, filters.brand, filters.is_active]);

  const loadFilterData = async () => {
    setFilterLoading(true);
    try {
      const [categoriesRes, brandsRes] = await Promise.all([
        category.getCategoryTree(),
        support.getBrands(),
      ]);

      if (categoriesRes.success) {
        // Flatten category tree for select
        const flattenCategories = (cats) => {
          let result = [];
          cats.forEach(cat => {
            result.push({ value: cat.category_id, label: cat.name });
            if (cat.children && cat.children.length > 0) {
              result = result.concat(flattenCategories(cat.children));
            }
          });
          return result;
        };
        setCategories(flattenCategories(categoriesRes.data || []));
      }

      if (brandsRes.success) {
        const brandsList = (brandsRes.data || []).map(b => ({
          value: b,
          label: b,
        }));
        setBrands(brandsList);
      }
    } catch (error) {
      console.error('Error loading filter data:', error);
    } finally {
      setFilterLoading(false);
    }
  };

  const loadProducts = async () => {
    console.log('[AdminProducts] 🔍 loadProducts called:', {
      page: pagination.page,
      limit: pagination.limit,
      searchText,
    });
    
    setLoading(true);
    try {
      let response;
      if (searchText) {
        console.log('[AdminProducts] Searching products with text:', searchText);
        response = await product.searchProducts(searchText, pagination.page, pagination.limit);
      } else {
        // For admin, we need to see ALL products including inactive and deleted
        console.log('[AdminProducts] Loading all products (admin mode)');
        const filterParams = {
          includeDeleted: true,
          includeInactive: true,
          ...filters,
        };
        // Remove undefined values
        Object.keys(filterParams).forEach(key => {
          if (filterParams[key] === undefined || filterParams[key] === null || filterParams[key] === '') {
            delete filterParams[key];
          }
        });
        response = await product.getProducts(pagination.page, pagination.limit, filterParams);
      }
      
      console.log('[AdminProducts] API response:', {
        success: response.success,
        dataCount: response.data?.length || 0,
        pagination: response.pagination,
      });
      
      if (response.success) {
        const productsData = response.data || [];
        console.log('[AdminProducts] Products loaded:', {
          count: productsData.length,
          products: productsData.map((p, idx) => ({
            index: idx,
            productId: p.id || p.product_id,
            name: p.name,
            hasImages: !!p.images,
            imagesType: typeof p.images,
            imagesIsArray: Array.isArray(p.images),
            imagesLength: Array.isArray(p.images) ? p.images.length : 0,
            hasPrimaryImage: !!p.primary_image,
            primaryImage: p.primary_image,
          })),
        });
        
        setProducts(productsData);
        setPagination((prev) => ({
          ...prev,
          total: response.pagination?.total || 0,
        }));
        console.log('[AdminProducts] ✅ Products set to state');
      } else {
        console.error('[AdminProducts] ❌ Failed to load products:', response.message);
        message.error(response.message || 'Có lỗi xảy ra khi tải sản phẩm');
      }
    } catch (error) {
      console.error('[AdminProducts] ❌❌❌ ERROR IN loadProducts ❌❌❌');
      console.error('[AdminProducts] Error message:', error.message);
      console.error('[AdminProducts] Error stack:', error.stack);
      const errorMessage = error.message || 'Có lỗi xảy ra khi tải sản phẩm';
      message.error(errorMessage);
    } finally {
      setLoading(false);
      console.log('[AdminProducts] loadProducts completed');
    }
  };

  const handleDelete = async (id) => {
    try {
      const response = await product.deleteProduct(id);
      if (response.success) {
        message.success('Xóa sản phẩm thành công');
        loadProducts();
      } else {
        message.error(response.message || 'Có lỗi xảy ra khi xóa sản phẩm');
      }
    } catch (error) {
      console.error('Error deleting product:', error);
      const errorMessage = error.message || 'Có lỗi xảy ra khi xóa sản phẩm';
      message.error(errorMessage);
    }
  };

  const handleDuplicate = (record) => {
    setDuplicateProduct(record);
    duplicateForm.setFieldsValue({
      price: record.price || 0,
      volume_ml: record.volume_ml || null,
    });
    // Reset images when opening duplicate modal
    setDuplicateImages([]);
    setDuplicateImagePreviewUrls({});
    setDuplicateModalVisible(true);
  };

  // Compress image for duplicate modal
  const compressImageForDuplicate = (file, maxWidth = 1280, maxHeight = 1280, quality = 0.6) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > maxWidth) {
              height = (height * maxWidth) / width;
              width = maxWidth;
            }
          } else {
            if (height > maxHeight) {
              width = (width * maxHeight) / height;
              height = maxHeight;
            }
          }

          canvas.width = width;
          canvas.height = height;

          const ctx = canvas.getContext('2d');
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'high';
          ctx.drawImage(img, 0, 0, width, height);

          const mimeType = 'image/jpeg';
          const compressedBase64 = canvas.toDataURL(mimeType, quality);
          resolve(compressedBase64);
        };
        img.onerror = reject;
        img.src = e.target.result;
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  // Handle file upload for duplicate
  const handleDuplicateFileUpload = (file) => {
    return new Promise((resolve, reject) => {
      if (!file.type.startsWith('image/')) {
        message.error('Chỉ chấp nhận file hình ảnh!');
        reject(new Error('Invalid file type'));
        return;
      }

      const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
      if (file.size > MAX_FILE_SIZE) {
        message.error(`Kích thước file không được vượt quá ${(MAX_FILE_SIZE / (1024 * 1024)).toFixed(0)}MB!`);
        reject(new Error('File too large'));
        return;
      }

      compressImageForDuplicate(file)
        .then((compressedBase64) => {
          const MAX_COMPRESSED_SIZE = 1.5 * 1024 * 1024; // 1.5MB per image
          if (compressedBase64.length > MAX_COMPRESSED_SIZE) {
            const sizeMB = (compressedBase64.length / (1024 * 1024)).toFixed(2);
            const maxSizeMB = (MAX_COMPRESSED_SIZE / (1024 * 1024)).toFixed(2);
            message.error(`Hình ảnh vẫn còn quá lớn sau khi nén (${sizeMB}MB). Vui lòng chọn hình ảnh nhỏ hơn. Tối đa: ${maxSizeMB}MB`);
            reject(new Error('Image too large'));
            return;
          }

          const newImage = {
            url: compressedBase64,
            alt: file.name || '',
            is_primary: duplicateImages.length === 0,
            order: duplicateImages.length,
          };

          setDuplicateImages([...duplicateImages, newImage]);
          message.success('Upload hình ảnh thành công!');
          resolve(compressedBase64);
        })
        .catch((error) => {
          message.error('Lỗi khi xử lý file!');
          reject(error);
        });
    });
  };

  // Handle remove image from duplicate
  const handleRemoveDuplicateImage = (index) => {
    const newImages = duplicateImages.filter((_, i) => i !== index);
    // Reassign order and primary
    newImages.forEach((img, i) => {
      img.order = i;
      img.is_primary = i === 0;
    });
    setDuplicateImages(newImages);
    message.success('Đã xóa hình ảnh');
  };

  // Handle set primary image for duplicate
  const handleSetPrimaryDuplicateImage = (index) => {
    const newImages = duplicateImages.map((img, i) => ({
      ...img,
      is_primary: i === index,
    }));
    setDuplicateImages(newImages);
    message.success('Đã đặt làm hình ảnh chính');
  };

  const handleDuplicateSubmit = async (values) => {
    if (!duplicateProduct) return;
    
    setDuplicating(true);
    
    try {
      // Get full product data
      const productId = duplicateProduct.id || duplicateProduct.product_id;
      const productRes = await product.getProductById(productId);
      
      if (!productRes.success) {
        message.error('Không thể tải thông tin sản phẩm');
        return;
      }
      
      const originalData = productRes.data;
      
      // Create new product with modified price and volume
      const newProductData = {
        name: originalData.name || '',
        slug: `${originalData.slug || originalData.name?.toLowerCase().replace(/\s+/g, '-')}-copy-${Date.now()}`,
        sku: `${originalData.sku || 'SKU'}-COPY-${Date.now()}`,
        description: originalData.description || null,
        short_description: originalData.short_description || null,
        price: parseFloat(values.price) || 0,
        msrp: originalData.msrp || null,
        stock_quantity: originalData.stock_quantity || 0,
        category_id: originalData.category_id || null,
        brand: originalData.brand || null,
        is_active: originalData.is_active !== undefined ? originalData.is_active : 1,
        origin: originalData.origin || null,
        manufacturer: originalData.manufacturer || null,
        volume_ml: values.volume_ml ? parseInt(values.volume_ml) : null,
        barcode: originalData.barcode || null,
      };
      
      // Prepare images: use new images if provided, otherwise copy from original
      let imagesToUse = [];
      if (duplicateImages.length > 0) {
        // Use new images uploaded by admin
        imagesToUse = duplicateImages;
        console.log('[AdminProducts] Using new images for duplicate:', imagesToUse.length);
      } else if (originalData.images && Array.isArray(originalData.images) && originalData.images.length > 0) {
        // Copy images from original product
        imagesToUse = originalData.images;
        console.log('[AdminProducts] Copying images from original product:', imagesToUse.length);
      }

      // Add images to product data if any
      if (imagesToUse.length > 0) {
        newProductData.images = imagesToUse;
      }

      const createResponse = await product.createProduct(newProductData);
      
      if (createResponse.success) {
        message.success('Nhân đôi sản phẩm thành công');
        setDuplicateModalVisible(false);
        setDuplicateProduct(null);
        duplicateForm.resetFields();
        setDuplicateImages([]);
        setDuplicateImagePreviewUrls({});
        loadProducts();
      } else {
        message.error(createResponse.message || 'Có lỗi xảy ra khi nhân đôi sản phẩm');
      }
    } catch (error) {
      console.error('Error duplicating product:', error);
      const errorMessage = error.message || 'Có lỗi xảy ra khi nhân đôi sản phẩm';
      message.error(errorMessage);
    } finally {
      setDuplicating(false);
    }
  };

  const getProductImage = (record) => {
    const productId = record.id || record.product_id;
    console.log('[AdminProducts] 🖼️  getProductImage called for product:', {
      productId,
      productName: record.name,
      hasPrimaryImage: !!record.primary_image,
      primaryImage: record.primary_image ? (record.primary_image.length > 50 ? record.primary_image.substring(0, 50) + '...' : record.primary_image) : null,
      hasImages: !!record.images,
      imagesType: typeof record.images,
      imagesIsArray: Array.isArray(record.images),
      imagesLength: Array.isArray(record.images) ? record.images.length : 0,
    });
    
    let imageUrl = record.primary_image;
    console.log('[AdminProducts] Initial imageUrl from primary_image:', imageUrl ? (imageUrl.length > 50 ? imageUrl.substring(0, 50) + '...' : imageUrl) : 'null');
    
    // If no primary_image, try to get from images array
    if (!imageUrl && record.images) {
      console.log('[AdminProducts] No primary_image, trying to get from images array...');
      try {
        // Images should already be parsed by backend, but handle both cases
        const images = Array.isArray(record.images) 
          ? record.images 
          : typeof record.images === 'string' 
            ? JSON.parse(record.images) 
            : [];
        
        console.log('[AdminProducts] Parsed images:', {
          count: images.length,
          images: images.map((img, idx) => ({
            index: idx,
            url: img.url ? (img.url.length > 50 ? img.url.substring(0, 50) + '...' : img.url) : 'no url',
            is_primary: img.is_primary,
            order: img.order,
          })),
        });
        
        if (Array.isArray(images) && images.length > 0) {
          // Find primary image or use first image
          // Support both formats: url/image_url
          const primaryImg = images.find(img => img.is_primary === true || img.is_primary === 1) || images[0];
          imageUrl = primaryImg?.url || primaryImg?.image_url || primaryImg;
          
          // If imageUrl is still an object, try to get the URL from it
          if (typeof imageUrl === 'object' && imageUrl !== null) {
            imageUrl = imageUrl.url || imageUrl.image_url || null;
          }
          
          console.log('[AdminProducts] Found image from array:', {
            url: imageUrl ? (typeof imageUrl === 'string' && imageUrl.length > 50 ? imageUrl.substring(0, 50) + '...' : imageUrl) : 'null',
            isPrimary: primaryImg?.is_primary,
            primaryImgStructure: {
              hasUrl: !!primaryImg?.url,
              hasImageUrl: !!primaryImg?.image_url,
              urlType: typeof primaryImg?.url,
              imageUrlType: typeof primaryImg?.image_url,
            },
          });
        } else {
          console.log('[AdminProducts] Images array is empty');
        }
      } catch (e) {
        console.error('[AdminProducts] ❌ Error parsing images:', e);
        console.error('[AdminProducts] Images data that failed:', record.images);
      }
    } else if (!imageUrl) {
      console.log('[AdminProducts] No primary_image and no images field');
    }
    
    // Ensure imageUrl is a string
    let finalUrl = '/placeholder.jpg';
    if (imageUrl) {
      if (typeof imageUrl === 'string') {
        finalUrl = imageUrl;
      } else if (typeof imageUrl === 'object' && imageUrl !== null) {
        // If it's an object, try to extract URL
        finalUrl = imageUrl.url || imageUrl.image_url || '/placeholder.jpg';
      }
    }
    
    console.log('[AdminProducts] Final image URL:', {
      finalUrl: finalUrl.length > 50 ? finalUrl.substring(0, 50) + '...' : finalUrl,
      finalUrlType: typeof finalUrl,
      finalUrlLength: finalUrl.length,
    });
    
    return finalUrl;
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <Title level={2} style={{ margin: 0 }}>Quản Lý Sản Phẩm</Title>
        <Link to="/admin/products/new">
          <Button type="primary" icon={<PlusOutlined />}>
            Thêm Sản Phẩm
          </Button>
        </Link>
      </div>

      <div className="admin-products-header">
        <div className="admin-products-search">
          <Search
            placeholder="Tìm kiếm sản phẩm..."
            allowClear
            enterButton={<SearchOutlined />}
            size="large"
            onSearch={(value) => {
              setSearchText(value);
              setPagination((prev) => ({ ...prev, page: 1 }));
            }}
            style={{ maxWidth: '400px' }}
          />
        </div>
        <Button
          icon={<FilterOutlined />}
          onClick={() => setFilterPanelOpen(!filterPanelOpen)}
          className="filter-toggle-btn"
        >
          Bộ lọc
        </Button>
      </div>

      <Collapse
        activeKey={filterPanelOpen ? ['filters'] : []}
        onChange={(keys) => setFilterPanelOpen(keys.includes('filters'))}
        className="admin-products-filters"
        ghost
      >
        <Collapse.Panel header="" key="filters">
          <div className="filter-content">
            <Row gutter={[16, 16]}>
              <Col xs={24} sm={12} md={8} lg={6}>
                <div className="filter-item">
                  <label>Danh mục</label>
                  <Select
                    placeholder="Tất cả danh mục"
                    allowClear
                    style={{ width: '100%' }}
                    value={filters.category_id}
                    onChange={(value) => setFilters({ ...filters, category_id: value })}
                    options={categories}
                    loading={filterLoading}
                  />
                </div>
              </Col>
              <Col xs={24} sm={12} md={8} lg={6}>
                <div className="filter-item">
                  <label>Thương hiệu</label>
                  <Select
                    placeholder="Tất cả thương hiệu"
                    allowClear
                    style={{ width: '100%' }}
                    value={filters.brand}
                    onChange={(value) => setFilters({ ...filters, brand: value })}
                    options={brands}
                    loading={filterLoading}
                    showSearch
                    filterOption={(input, option) =>
                      (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
                    }
                  />
                </div>
              </Col>
              <Col xs={24} sm={12} md={8} lg={6}>
                <div className="filter-item">
                  <label>Trạng thái</label>
                  <Select
                    placeholder="Tất cả trạng thái"
                    allowClear
                    style={{ width: '100%' }}
                    value={filters.is_active}
                    onChange={(value) => setFilters({ ...filters, is_active: value })}
                    options={[
                      { value: 1, label: 'Đang hoạt động' },
                      { value: 0, label: 'Ngừng hoạt động' },
                    ]}
                  />
                </div>
              </Col>
              <Col xs={24} sm={24} md={24} lg={6}>
                <div className="filter-actions">
                  <Button
                    icon={<ClearOutlined />}
                    onClick={() => {
                      setFilters({
                        category_id: undefined,
                        brand: undefined,
                        is_active: undefined,
                      });
                      setPagination((prev) => ({ ...prev, page: 1 }));
                    }}
                  >
                    Xóa bộ lọc
                  </Button>
                </div>
              </Col>
            </Row>
          </div>
        </Collapse.Panel>
      </Collapse>

      <Spin spinning={loading}>
        {products.length === 0 ? (
          <Empty description="Chưa có sản phẩm nào" />
        ) : (
          <>
            <Row gutter={[16, 16]} className="admin-products-grid">
              {products.map((record) => {
                const productId = record.id || record.product_id;
                const imageUrl = getProductImage(record);
                const formattedPrice = new Intl.NumberFormat('vi-VN', {
                  style: 'currency',
                  currency: 'VND',
                }).format(record.price || 0);

                return (
                  <Col xs={24} sm={12} md={8} lg={6} xl={4} key={productId}>
                    <Card
                      hoverable
                      className="admin-product-card"
                      cover={
                        <div className="admin-product-image-wrapper">
                          <AntdImage
                            src={imageUrl}
                            alt={record.name}
                            preview={false}
                            className="admin-product-image"
                            onError={(e) => {
                              e.target.src = '/placeholder.jpg';
                            }}
                          />
                          {record.is_active === 0 && (
                            <Tag color="red" className="status-badge">
                              Ngừng
                            </Tag>
                          )}
                          {record.deleted_at && (
                            <Tag color="orange" className="status-badge">
                              Đã xóa
                            </Tag>
                          )}
                        </div>
                      }
                      actions={[
                        <Link key="edit" to={`/admin/products/${productId}`}>
                          <Button type="link" icon={<EditOutlined />} size="small">
                            Sửa
                          </Button>
                        </Link>,
                        <Button
                          key="duplicate"
                          type="link"
                          icon={<CopyOutlined />}
                          size="small"
                          onClick={() => handleDuplicate(record)}
                        >
                          Nhân đôi
                        </Button>,
                        <Popconfirm
                          key="delete"
                          title="Bạn có chắc muốn xóa sản phẩm này?"
                          onConfirm={() => handleDelete(productId)}
                          okText="Xóa"
                          cancelText="Hủy"
                        >
                          <Button type="link" danger icon={<DeleteOutlined />} size="small">
                            Xóa
                          </Button>
                        </Popconfirm>,
                      ]}
                    >
                      <div className="admin-product-info">
                        <div className="admin-product-id">ID: {productId}</div>
                        <Link to={`/admin/products/${productId}`}>
                          <Typography.Title level={5} className="admin-product-name" ellipsis={{ rows: 2 }}>
                            {record.name}
                          </Typography.Title>
                        </Link>
                        <div className="admin-product-price">{formattedPrice}</div>
                        <div className="admin-product-meta">
                          <Space size="small">
                            <Tag color={record.is_active ? 'green' : 'red'}>
                              {record.is_active ? 'Hoạt động' : 'Ngừng'}
                            </Tag>
                            <span className="admin-product-stock">
                              Tồn: {record.stock_quantity || 0}
                            </span>
                          </Space>
                        </div>
                        {record.volume_ml && (
                          <div className="admin-product-volume">
                            Thể tích: {record.volume_ml} ml
                          </div>
                        )}
                      </div>
                    </Card>
                  </Col>
                );
              })}
            </Row>
            
            <div style={{ marginTop: '24px', textAlign: 'center' }}>
              <Pagination
                current={pagination.page}
                pageSize={pagination.limit}
                total={pagination.total}
                showSizeChanger
                showQuickJumper
                showTotal={(total) => `Tổng ${total} sản phẩm`}
                onChange={(page, pageSize) => {
                  setPagination((prev) => ({ ...prev, page, limit: pageSize }));
                }}
                onShowSizeChange={(current, size) => {
                  setPagination((prev) => ({ ...prev, page: 1, limit: size }));
                }}
                pageSizeOptions={['12', '24', '48', '96']}
              />
            </div>
          </>
        )}
      </Spin>

      <Modal
        title="Nhân đôi Sản Phẩm"
        open={duplicateModalVisible}
        onCancel={() => {
          setDuplicateModalVisible(false);
          setDuplicateProduct(null);
          duplicateForm.resetFields();
          setDuplicateImages([]);
          setDuplicateImagePreviewUrls({});
        }}
        footer={null}
        width={500}
      >
        {duplicateProduct && (
          <div style={{ marginBottom: '16px' }}>
            <p><strong>Sản phẩm gốc:</strong> {duplicateProduct.name}</p>
            <p><strong>Giá hiện tại:</strong> {new Intl.NumberFormat('vi-VN', {
              style: 'currency',
              currency: 'VND',
            }).format(duplicateProduct.price || 0)}</p>
            {duplicateProduct.volume_ml && (
              <p><strong>Thể tích hiện tại:</strong> {duplicateProduct.volume_ml} ml</p>
            )}
          </div>
        )}
        
        <Form
          form={duplicateForm}
          layout="vertical"
          onFinish={handleDuplicateSubmit}
        >
          <Form.Item
            name="price"
            label="Giá mới"
            rules={[{ required: true, message: 'Vui lòng nhập giá' }]}
          >
            <InputNumber
              min={0}
              style={{ width: '100%' }}
              placeholder="Nhập giá mới"
              formatter={numberFormatter}
              parser={numberParser}
            />
          </Form.Item>
          
          <Form.Item
            name="volume_ml"
            label="Thể tích mới (ml)"
          >
            <InputNumber
              min={0}
              style={{ width: '100%' }}
              placeholder="Nhập thể tích mới"
              formatter={integerFormatter}
              parser={integerParser}
            />
          </Form.Item>

          <Form.Item label="Hình ảnh mới (tùy chọn)">
            <div style={{ marginBottom: '16px' }}>
              <Upload
                accept="image/*"
                beforeUpload={(file) => {
                  handleDuplicateFileUpload(file);
                  return false; // Prevent auto upload
                }}
                showUploadList={false}
              >
                <Button icon={<PlusOutlined />} type="dashed" style={{ width: '100%' }}>
                  Thêm hình ảnh mới
                </Button>
              </Upload>
              <div style={{ marginTop: '8px', fontSize: '12px', color: '#666' }}>
                {duplicateImages.length > 0 ? (
                  <span>Đã thêm {duplicateImages.length} hình ảnh mới. Hình ảnh mới sẽ thay thế hình ảnh gốc.</span>
                ) : (
                  <span>Nếu không thêm hình ảnh mới, hệ thống sẽ sao chép hình ảnh từ sản phẩm gốc.</span>
                )}
              </div>
            </div>

            {duplicateImages.length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {duplicateImages.map((img, index) => (
                  <div
                    key={index}
                    style={{
                      position: 'relative',
                      width: '100px',
                      height: '100px',
                      border: img.is_primary ? '2px solid #1890ff' : '1px solid #d9d9d9',
                      borderRadius: '4px',
                      overflow: 'hidden',
                      cursor: 'pointer',
                    }}
                  >
                    <AntdImage
                      src={img.url}
                      alt={img.alt || `Image ${index + 1}`}
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      preview={false}
                    />
                    {img.is_primary && (
                      <div
                        style={{
                          position: 'absolute',
                          top: '4px',
                          left: '4px',
                          background: '#1890ff',
                          color: '#fff',
                          padding: '2px 6px',
                          borderRadius: '2px',
                          fontSize: '10px',
                        }}
                      >
                        Chính
                      </div>
                    )}
                    <Button
                      type="text"
                      danger
                      size="small"
                      icon={<DeleteOutlined />}
                      style={{
                        position: 'absolute',
                        top: '4px',
                        right: '4px',
                        background: 'rgba(255, 255, 255, 0.8)',
                      }}
                      onClick={() => handleRemoveDuplicateImage(index)}
                    />
                    {!img.is_primary && (
                      <Button
                        type="text"
                        size="small"
                        style={{
                          position: 'absolute',
                          bottom: '4px',
                          left: '4px',
                          right: '4px',
                          background: 'rgba(255, 255, 255, 0.8)',
                          fontSize: '10px',
                        }}
                        onClick={() => handleSetPrimaryDuplicateImage(index)}
                      >
                        Đặt làm chính
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </Form.Item>
          
          <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
            <Space>
              <Button onClick={() => {
                setDuplicateModalVisible(false);
                setDuplicateProduct(null);
                duplicateForm.resetFields();
              }}>
                Hủy
              </Button>
              <Button type="primary" htmlType="submit" loading={duplicating}>
                Nhân đôi
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default AdminProducts;
