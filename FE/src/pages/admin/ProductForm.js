import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Card,
  Form,
  Input,
  InputNumber,
  Select,
  Switch,
  Button,
  Space,
  Typography,
  Spin,
  message,
  Row,
  Col,
  Upload,
  Image as AntdImage,
  Modal,
} from 'antd';
import { ArrowLeftOutlined, SaveOutlined, PlusOutlined, DeleteOutlined, EyeOutlined, UploadOutlined } from '@ant-design/icons';
import { product, category, support } from '../../api/index.js';

const { Title } = Typography;
const { TextArea } = Input;

/**
 * Generate slug from Vietnamese text
 */
const generateSlug = (text) => {
  if (!text) return '';
  
  // Vietnamese character mapping
  const vietnameseMap = {
    'à': 'a', 'á': 'a', 'ạ': 'a', 'ả': 'a', 'ã': 'a', 'â': 'a', 'ầ': 'a', 'ấ': 'a', 'ậ': 'a', 'ẩ': 'a', 'ẫ': 'a',
    'ă': 'a', 'ằ': 'a', 'ắ': 'a', 'ặ': 'a', 'ẳ': 'a', 'ẵ': 'a',
    'è': 'e', 'é': 'e', 'ẹ': 'e', 'ẻ': 'e', 'ẽ': 'e', 'ê': 'e', 'ề': 'e', 'ế': 'e', 'ệ': 'e', 'ể': 'e', 'ễ': 'e',
    'ì': 'i', 'í': 'i', 'ị': 'i', 'ỉ': 'i', 'ĩ': 'i',
    'ò': 'o', 'ó': 'o', 'ọ': 'o', 'ỏ': 'o', 'õ': 'o', 'ô': 'o', 'ồ': 'o', 'ố': 'o', 'ộ': 'o', 'ổ': 'o', 'ỗ': 'o',
    'ơ': 'o', 'ờ': 'o', 'ớ': 'o', 'ợ': 'o', 'ở': 'o', 'ỡ': 'o',
    'ù': 'u', 'ú': 'u', 'ụ': 'u', 'ủ': 'u', 'ũ': 'u', 'ư': 'u', 'ừ': 'u', 'ứ': 'u', 'ự': 'u', 'ử': 'u', 'ữ': 'u',
    'ỳ': 'y', 'ý': 'y', 'ỵ': 'y', 'ỷ': 'y', 'ỹ': 'y',
    'đ': 'd',
    'À': 'A', 'Á': 'A', 'Ạ': 'A', 'Ả': 'A', 'Ã': 'A', 'Â': 'A', 'Ầ': 'A', 'Ấ': 'A', 'Ậ': 'A', 'Ẩ': 'A', 'Ẫ': 'A',
    'Ă': 'A', 'Ằ': 'A', 'Ắ': 'A', 'Ặ': 'A', 'Ẳ': 'A', 'Ẵ': 'A',
    'È': 'E', 'É': 'E', 'Ẹ': 'E', 'Ẻ': 'E', 'Ẽ': 'E', 'Ê': 'E', 'Ề': 'E', 'Ế': 'E', 'Ệ': 'E', 'Ể': 'E', 'Ễ': 'E',
    'Ì': 'I', 'Í': 'I', 'Ị': 'I', 'Ỉ': 'I', 'Ĩ': 'I',
    'Ò': 'O', 'Ó': 'O', 'Ọ': 'O', 'Ỏ': 'O', 'Õ': 'O', 'Ô': 'O', 'Ồ': 'O', 'Ố': 'O', 'Ộ': 'O', 'Ổ': 'O', 'Ỗ': 'O',
    'Ơ': 'O', 'Ờ': 'O', 'Ớ': 'O', 'Ợ': 'O', 'Ở': 'O', 'Ỡ': 'O',
    'Ù': 'U', 'Ú': 'U', 'Ụ': 'U', 'Ủ': 'U', 'Ũ': 'U', 'Ư': 'U', 'Ừ': 'U', 'Ứ': 'U', 'Ự': 'U', 'Ử': 'U', 'Ữ': 'U',
    'Ỳ': 'Y', 'Ý': 'Y', 'Ỵ': 'Y', 'Ỷ': 'Y', 'Ỹ': 'Y',
    'Đ': 'D',
  };
  
  let slug = text.toLowerCase();
  
  // Replace Vietnamese characters
  Object.keys(vietnameseMap).forEach(char => {
    slug = slug.replace(new RegExp(char, 'g'), vietnameseMap[char]);
  });
  
  // Replace spaces and special characters with hyphens
  slug = slug
    .replace(/[^\w\s-]/g, '') // Remove special characters
    .replace(/\s+/g, '-')     // Replace spaces with hyphens
    .replace(/-+/g, '-')       // Replace multiple hyphens with single hyphen
    .replace(/^-+|-+$/g, '');  // Remove leading/trailing hyphens
  
  return slug;
};

/**
 * Generate SKU from product name
 */
const generateSKU = (name) => {
  if (!name) return '';
  
  // Vietnamese character mapping for SKU
  const vietnameseMap = {
    'à': 'a', 'á': 'a', 'ạ': 'a', 'ả': 'a', 'ã': 'a', 'â': 'a', 'ầ': 'a', 'ấ': 'a', 'ậ': 'a', 'ẩ': 'a', 'ẫ': 'a',
    'ă': 'a', 'ằ': 'a', 'ắ': 'a', 'ặ': 'a', 'ẳ': 'a', 'ẵ': 'a',
    'è': 'e', 'é': 'e', 'ẹ': 'e', 'ẻ': 'e', 'ẽ': 'e', 'ê': 'e', 'ề': 'e', 'ế': 'e', 'ệ': 'e', 'ể': 'e', 'ễ': 'e',
    'ì': 'i', 'í': 'i', 'ị': 'i', 'ỉ': 'i', 'ĩ': 'i',
    'ò': 'o', 'ó': 'o', 'ọ': 'o', 'ỏ': 'o', 'õ': 'o', 'ô': 'o', 'ồ': 'o', 'ố': 'o', 'ộ': 'o', 'ổ': 'o', 'ỗ': 'o',
    'ơ': 'o', 'ờ': 'o', 'ớ': 'o', 'ợ': 'o', 'ở': 'o', 'ỡ': 'o',
    'ù': 'u', 'ú': 'u', 'ụ': 'u', 'ủ': 'u', 'ũ': 'u', 'ư': 'u', 'ừ': 'u', 'ứ': 'u', 'ự': 'u', 'ử': 'u', 'ữ': 'u',
    'ỳ': 'y', 'ý': 'y', 'ỵ': 'y', 'ỷ': 'y', 'ỹ': 'y',
    'đ': 'd',
    'À': 'A', 'Á': 'A', 'Ạ': 'A', 'Ả': 'A', 'Ã': 'A', 'Â': 'A', 'Ầ': 'A', 'Ấ': 'A', 'Ậ': 'A', 'Ẩ': 'A', 'Ẫ': 'A',
    'Ă': 'A', 'Ằ': 'A', 'Ắ': 'A', 'Ặ': 'A', 'Ẳ': 'A', 'Ẵ': 'A',
    'È': 'E', 'É': 'E', 'Ẹ': 'E', 'Ẻ': 'E', 'Ẽ': 'E', 'Ê': 'E', 'Ề': 'E', 'Ế': 'E', 'Ệ': 'E', 'Ể': 'E', 'Ễ': 'E',
    'Ì': 'I', 'Í': 'I', 'Ị': 'I', 'Ỉ': 'I', 'Ĩ': 'I',
    'Ò': 'O', 'Ó': 'O', 'Ọ': 'O', 'Ỏ': 'O', 'Õ': 'O', 'Ô': 'O', 'Ồ': 'O', 'Ố': 'O', 'Ộ': 'O', 'Ổ': 'O', 'Ỗ': 'O',
    'Ơ': 'O', 'Ờ': 'O', 'Ớ': 'O', 'Ợ': 'O', 'Ở': 'O', 'Ỡ': 'O',
    'Ù': 'U', 'Ú': 'U', 'Ụ': 'U', 'Ủ': 'U', 'Ũ': 'U', 'Ư': 'U', 'Ừ': 'U', 'Ứ': 'U', 'Ự': 'U', 'Ử': 'U', 'Ữ': 'U',
    'Ỳ': 'Y', 'Ý': 'Y', 'Ỵ': 'Y', 'Ỷ': 'Y', 'Ỹ': 'Y',
    'Đ': 'D',
  };
  
  // Get first letters of words, uppercase
  const words = name.trim().split(/\s+/);
  let sku = '';
  
  if (words.length >= 2) {
    // Use first 2-3 words
    const wordsToUse = words.slice(0, Math.min(3, words.length));
    sku = wordsToUse.map(word => {
      // Get first letter, handle Vietnamese
      const firstChar = word.charAt(0);
      return (vietnameseMap[firstChar] || firstChar).toUpperCase();
    }).join('');
  } else {
    // Use first 3-4 characters
    let nameUpper = name.toUpperCase();
    Object.keys(vietnameseMap).forEach(char => {
      nameUpper = nameUpper.replace(new RegExp(char, 'g'), vietnameseMap[char]);
    });
    sku = nameUpper.substring(0, Math.min(4, nameUpper.length)).replace(/\s/g, '');
  }
  
  // Add timestamp suffix to make it unique
  const timestamp = Date.now().toString().slice(-6);
  return `${sku}-${timestamp}`;
};

/**
 * Generate barcode (EAN-13 format: 13 digits)
 */
const generateBarcode = () => {
  // Generate 12 random digits
  let barcode = '';
  for (let i = 0; i < 12; i++) {
    barcode += Math.floor(Math.random() * 10).toString();
  }
  
  // Calculate check digit (EAN-13 algorithm)
  let sum = 0;
  for (let i = 0; i < 12; i++) {
    const digit = parseInt(barcode[i]);
    sum += (i % 2 === 0) ? digit : digit * 3;
  }
  const checkDigit = (10 - (sum % 10)) % 10;
  
  return barcode + checkDigit.toString();
};

const AdminProductForm = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = !!id;
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [categories, setCategories] = useState([]);
  const [brands, setBrands] = useState([]);
  const [images, setImages] = useState([]);
  const [previewVisible, setPreviewVisible] = useState(false);
  const [previewImage, setPreviewImage] = useState('');
  const [imagePreviewUrls, setImagePreviewUrls] = useState({}); // Store preview URLs for files before upload

  useEffect(() => {
    loadFormData();
  }, [id]);

  // Cleanup preview URLs on unmount
  useEffect(() => {
    return () => {
      Object.values(imagePreviewUrls).forEach(url => {
        if (url && url.startsWith('blob:')) {
          URL.revokeObjectURL(url);
        }
      });
    };
  }, [imagePreviewUrls]);

  const loadFormData = async () => {
    console.log('[ProductForm] 🔍 loadFormData called:', {
      isEdit,
      productId: id,
    });
    setInitialLoading(true);
    try {
      const [categoriesRes, brandsRes] = await Promise.all([
        category.getCategoryTree(),
        support.getBrands(),
      ]);

      if (categoriesRes.success) {
        setCategories(categoriesRes.data || []);
        console.log('[ProductForm] Categories loaded:', categoriesRes.data?.length || 0);
      } else {
        console.error('[ProductForm] Failed to load categories:', categoriesRes.message);
        message.error(categoriesRes.message || 'Có lỗi xảy ra khi tải danh mục');
      }
      
      if (brandsRes.success) {
        setBrands(brandsRes.data || []);
        console.log('[ProductForm] Brands loaded:', brandsRes.data?.length || 0);
      } else {
        console.error('[ProductForm] Failed to load brands:', brandsRes.message);
        message.error(brandsRes.message || 'Có lỗi xảy ra khi tải thương hiệu');
      }

      if (isEdit) {
        console.log('[ProductForm] Loading product data for edit...');
        const productRes = await product.getProductById(id);
        console.log('[ProductForm] Product response:', {
          success: productRes.success,
          hasData: !!productRes.data,
          productId: productRes.data?.id || productRes.data?.product_id,
        });
        
        if (productRes.success) {
          const data = productRes.data;
          console.log('[ProductForm] Product data loaded:', {
            productId: data.id || data.product_id,
            name: data.name,
            hasImages: !!data.images,
            imagesType: typeof data.images,
            imagesValue: typeof data.images === 'string' 
              ? (data.images.length > 200 ? data.images.substring(0, 200) + '...' : data.images)
              : data.images,
            imagesIsArray: Array.isArray(data.images),
            imagesLength: Array.isArray(data.images) ? data.images.length : 0,
            hasPrimaryImage: !!data.primary_image,
            primaryImage: data.primary_image,
          });
          
          form.setFieldsValue({
            name: data.name || '',
            slug: data.slug || '',
            sku: data.sku || '',
            description: data.description || '',
            short_description: data.short_description || '',
            price: data.price || 0,
            msrp: data.msrp || null,
            stock_quantity: data.stock_quantity || 0,
            category_id: data.category_id || undefined,
            brand: data.brand || undefined,
            is_active: data.is_active !== undefined ? data.is_active : true,
            origin: data.origin || '',
            manufacturer: data.manufacturer || '',
            volume_ml: data.volume_ml || null,
            barcode: data.barcode || '',
          });
          
          // Load images
          console.log('[ProductForm] Processing images...');
          if (data.images) {
            try {
              console.log('[ProductForm] Parsing images...');
              const parsedImages = Array.isArray(data.images) 
                ? data.images 
                : typeof data.images === 'string' 
                  ? JSON.parse(data.images) 
                  : [];
              
              // Normalize images: support both formats (url/image_url, alt/alt_text, order/sort_order)
              const normalizedImages = parsedImages.map((img, idx) => ({
                url: img.url || img.image_url || '',
                alt: img.alt || img.alt_text || '',
                is_primary: img.is_primary === true || img.is_primary === 1 || (idx === 0 && parsedImages.length === 1),
                order: img.order !== undefined ? parseInt(img.order) : (img.sort_order !== undefined ? parseInt(img.sort_order) : idx),
              }));
              
              console.log('[ProductForm] Parsed and normalized images:', {
                count: normalizedImages.length,
                images: normalizedImages.map((img, idx) => ({
                  index: idx,
                  url: img.url ? (img.url.length > 50 ? img.url.substring(0, 50) + '...' : img.url) : 'no url',
                  urlLength: img.url?.length || 0,
                  alt: img.alt,
                  is_primary: img.is_primary,
                  order: img.order,
                })),
              });
              
              setImages(normalizedImages || []);
              console.log('[ProductForm] ✅ Images set to state');
            } catch (e) {
              console.error('[ProductForm] ❌ Error parsing images:', e);
              console.error('[ProductForm] Images data that failed:', data.images);
              setImages([]);
            }
          } else {
            console.log('[ProductForm] No images found, setting empty array');
            setImages([]);
          }
        } else {
          console.error('[ProductForm] Failed to load product:', productRes.message);
          message.error(productRes.message || 'Có lỗi xảy ra khi tải thông tin sản phẩm');
        }
      } else {
        console.log('[ProductForm] Creating new product, no data to load');
      }
    } catch (error) {
      console.error('[ProductForm] ❌ Error loading form data:', error);
      console.error('[ProductForm] Error details:', {
        message: error.message,
        stack: error.stack,
      });
      const errorMessage = error.message || 'Có lỗi xảy ra khi tải dữ liệu';
      message.error(errorMessage);
    } finally {
      setInitialLoading(false);
      console.log('[ProductForm] loadFormData completed');
    }
  };

  const handleSubmit = async (values) => {
    console.log('[ProductForm] 🚀 handleSubmit called:', {
      isEdit,
      productId: id,
      formValues: values,
      imagesCount: images.length,
      images: images.map((img, idx) => ({
        index: idx,
        url: img.url ? (img.url.length > 50 ? img.url.substring(0, 50) + '...' : img.url) : 'no url',
        urlLength: img.url?.length || 0,
        alt: img.alt,
        is_primary: img.is_primary,
        order: img.order,
      })),
    });
    
    setLoading(true);
    try {
      // Map form fields to backend model fields
      const productData = {
        name: values.name?.trim(),
        slug: values.slug?.trim() || values.name?.toLowerCase().replace(/\s+/g, '-'),
        sku: values.sku?.trim(),
        description: values.description || null,
        short_description: values.short_description || null,
        price: parseFloat(values.price) || 0,
        msrp: values.msrp ? parseFloat(values.msrp) : null,
        stock_quantity: parseInt(values.stock_quantity) || 0,
        category_id: values.category_id || null,
        brand: values.brand || values.brand_id || null,
        is_active: values.is_active !== undefined ? (values.is_active ? 1 : 0) : 1,
        origin: values.origin || null,
        manufacturer: values.manufacturer || null,
        volume_ml: values.volume_ml ? parseInt(values.volume_ml) : null,
        barcode: values.barcode || null,
        images: images.length > 0 ? images : undefined, // Include images if any
      };
      
      console.log('[ProductForm] Product data prepared:', {
        ...productData,
        images: productData.images ? `[${productData.images.length} images]` : undefined,
      });
      
      // Filter out images without URLs and normalize before sending
      console.log('[ProductForm] Processing images before sending...');
      const validImages = images
        .filter(img => {
          const hasUrl = img.url && img.url.trim().length > 0;
          if (!hasUrl) {
            console.log('[ProductForm] Filtering out image without URL:', img);
          }
          return hasUrl;
        })
        .map((img, index) => {
          const normalized = {
            url: img.url.trim(),
            alt: img.alt || '',
            is_primary: img.is_primary === true || (index === 0 && !images.some(i => i.is_primary === true)),
            order: img.order !== undefined ? parseInt(img.order) : index,
          };
          console.log(`[ProductForm] Normalized image ${index + 1}:`, {
            url: normalized.url.length > 50 ? normalized.url.substring(0, 50) + '...' : normalized.url,
            urlLength: normalized.url.length,
            alt: normalized.alt,
            is_primary: normalized.is_primary,
            order: normalized.order,
          });
          return normalized;
        });
      
      // Ensure at least one primary image
      if (validImages.length > 0 && !validImages.some(img => img.is_primary === true)) {
        console.log('[ProductForm] No primary image found, setting first image as primary');
        validImages[0].is_primary = true;
      }
      
      console.log('[ProductForm] Valid images to send:', {
        count: validImages.length,
        images: validImages.map(img => ({
          url: img.url.length > 50 ? img.url.substring(0, 50) + '...' : img.url,
          alt: img.alt,
          is_primary: img.is_primary,
          order: img.order,
        })),
      });
      
      // Validate total image size before sending
      if (validImages.length > 0) {
        let totalSize = 0;
        validImages.forEach((img, idx) => {
          const size = img.url ? img.url.length : 0;
          totalSize += size;
          console.log(`[ProductForm] Image ${idx + 1} size:`, {
            sizeBytes: size,
            sizeKB: (size / 1024).toFixed(2),
            sizeMB: (size / (1024 * 1024)).toFixed(2),
          });
        });
        
        const MAX_TOTAL_SIZE = 8 * 1024 * 1024; // 8MB total (leave room for serialization overhead)
        const totalSizeMB = (totalSize / (1024 * 1024)).toFixed(2);
        const maxSizeMB = (MAX_TOTAL_SIZE / (1024 * 1024)).toFixed(2);
        
        console.log('[ProductForm] 📊 Total images size:', {
          totalSizeBytes: totalSize,
          totalSizeKB: (totalSize / 1024).toFixed(2),
          totalSizeMB: totalSizeMB,
          maxSizeMB: maxSizeMB,
          imageCount: validImages.length,
        });
        
        if (totalSize > MAX_TOTAL_SIZE) {
          console.error('[ProductForm] ❌ Total images size too large:', {
            totalSizeMB: totalSizeMB,
            maxSizeMB: maxSizeMB,
          });
          message.error(`Tổng kích thước hình ảnh quá lớn (${totalSizeMB}MB). Vui lòng giảm kích thước hoặc sử dụng ít hình ảnh hơn. Tối đa: ${maxSizeMB}MB`);
          setLoading(false);
          return;
        }
      }
      
      let response;
      if (isEdit) {
        console.log('[ProductForm] Updating existing product...');
        response = await product.updateProduct(id, productData);
        console.log('[ProductForm] Update response:', {
          success: response.success,
          message: response.message,
          hasData: !!response.data,
        });
        
        // Update images separately
        if (validImages.length > 0) {
          console.log('[ProductForm] Updating images separately...');
          try {
            // Backend expects images array directly, not wrapped in object
            const imagesResponse = await product.updateImages(id, validImages);
            console.log('[ProductForm] Images update response:', {
              success: imagesResponse.success,
              message: imagesResponse.message,
              hasData: !!imagesResponse.data,
              dataImages: imagesResponse.data?.images?.length || 0,
            });
            if (!imagesResponse.success) {
              console.error('[ProductForm] Images update failed:', imagesResponse.message);
              message.warning('Sản phẩm đã được cập nhật nhưng có lỗi khi cập nhật hình ảnh');
            } else {
              console.log('[ProductForm] ✅ Images updated successfully');
            }
          } catch (imgError) {
            console.error('[ProductForm] ❌ Error updating images:', imgError);
            console.error('[ProductForm] Error details:', {
              message: imgError.message,
              stack: imgError.stack,
            });
            message.warning('Sản phẩm đã được cập nhật nhưng có lỗi khi cập nhật hình ảnh');
          }
        } else {
          console.log('[ProductForm] No valid images to update');
        }
      } else {
        console.log('[ProductForm] Creating new product...');
        response = await product.createProduct(productData);
        console.log('[ProductForm] Create response:', {
          success: response.success,
          message: response.message,
          hasData: !!response.data,
          productId: response.data?.id || response.data?.product_id,
        });
        
        // Add images after product is created
        if (response.success && response.data && validImages.length > 0) {
          const productId = response.data.id || response.data.product_id;
          console.log('[ProductForm] Adding images to new product:', productId);
          try {
            // Backend expects images array directly, not wrapped in object
            const imagesResponse = await product.updateImages(productId, validImages);
            console.log('[ProductForm] Images add response:', {
              success: imagesResponse.success,
              message: imagesResponse.message,
              hasData: !!imagesResponse.data,
              dataImages: imagesResponse.data?.images?.length || 0,
            });
            if (!imagesResponse.success) {
              console.error('[ProductForm] Images add failed:', imagesResponse.message);
              message.warning('Sản phẩm đã được tạo nhưng có lỗi khi thêm hình ảnh');
            } else {
              console.log('[ProductForm] ✅ Images added successfully');
            }
          } catch (imgError) {
            console.error('[ProductForm] ❌ Error adding images:', imgError);
            console.error('[ProductForm] Error details:', {
              message: imgError.message,
              stack: imgError.stack,
            });
            message.warning('Sản phẩm đã được tạo nhưng có lỗi khi thêm hình ảnh');
          }
        } else {
          console.log('[ProductForm] No valid images to add or product creation failed');
        }
      }
      
      if (response.success) {
        console.log('[ProductForm] ✅ Product saved successfully');
        message.success(isEdit ? 'Cập nhật sản phẩm thành công' : 'Tạo sản phẩm thành công');
        navigate('/admin/products');
      } else {
        console.error('[ProductForm] ❌ Product save failed:', response.message);
        message.error(response.message || 'Có lỗi xảy ra khi lưu sản phẩm');
      }
    } catch (error) {
      console.error('[ProductForm] ❌❌❌ ERROR IN handleSubmit ❌❌❌');
      console.error('[ProductForm] Error message:', error.message);
      console.error('[ProductForm] Error stack:', error.stack);
      console.error('[ProductForm] Error details:', {
        name: error.name,
        message: error.message,
      });
      const errorMessage = error.message || 'Có lỗi xảy ra khi lưu sản phẩm';
      message.error(errorMessage);
    } finally {
      setLoading(false);
      console.log('[ProductForm] handleSubmit completed');
    }
  };

  const handleAddImage = () => {
    console.log('[ProductForm] ➕ handleAddImage called:', {
      currentImagesCount: images.length,
    });
    
    const newImage = {
      url: '',
      alt: '',
      is_primary: images.length === 0,
      order: images.length,
    };
    
    console.log('[ProductForm] Adding new image:', newImage);
    setImages([...images, newImage]);
    console.log('[ProductForm] ✅ New image added, total images:', images.length + 1);
  };

  const handleRemoveImage = (index) => {
    console.log('[ProductForm] 🗑️  handleRemoveImage called:', {
      index,
      currentImagesCount: images.length,
      imageToRemove: images[index],
      wasPrimary: images[index]?.is_primary,
    });
    
    const newImages = images.filter((_, i) => i !== index);
    console.log('[ProductForm] Images after filter:', {
      count: newImages.length,
      images: newImages.map((img, i) => ({
        index: i,
        url: img.url ? (img.url.length > 50 ? img.url.substring(0, 50) + '...' : img.url) : 'no url',
        is_primary: img.is_primary,
      })),
    });
    
    // If removed image was primary, set first image as primary
    if (images[index].is_primary && newImages.length > 0) {
      console.log('[ProductForm] Removed image was primary, setting first image as primary');
      newImages[0].is_primary = true;
    }
    
    setImages(newImages);
    console.log('[ProductForm] ✅ Image removed, remaining images:', newImages.length);
  };

  const handleImageChange = (index, field, value) => {
    console.log('[ProductForm] 🔄 handleImageChange called:', {
      index,
      field,
      value: field === 'url' && typeof value === 'string' && value.length > 50 
        ? value.substring(0, 50) + '...' 
        : value,
      currentImagesCount: images.length,
      currentImage: images[index],
    });
    
    const newImages = [...images];
    if (field === 'is_primary' && value) {
      console.log('[ProductForm] Setting primary image, unsetting others...');
      // Unset other primaries
      newImages.forEach((img, i) => {
        img.is_primary = i === index;
      });
      console.log('[ProductForm] Primary images updated:', newImages.map((img, i) => ({
        index: i,
        is_primary: img.is_primary,
      })));
    } else {
      console.log(`[ProductForm] Updating image ${index} field ${field}`);
      newImages[index][field] = value;
      console.log('[ProductForm] Updated image:', {
        ...newImages[index],
        url: newImages[index].url && newImages[index].url.length > 50 
          ? newImages[index].url.substring(0, 50) + '...' 
          : newImages[index].url,
      });
    }
    setImages(newImages);
    console.log('[ProductForm] ✅ Images state updated');
  };

  const handlePreview = (imageUrl) => {
    setPreviewImage(imageUrl);
    setPreviewVisible(true);
  };

  // Compress image to reduce size
  const compressImage = (file, maxWidth = 1280, maxHeight = 1280, quality = 0.6) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;

          // Calculate new dimensions - more aggressive compression
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
          // Use better quality settings for compression
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'high';
          ctx.drawImage(img, 0, 0, width, height);

          // Convert to base64 with compression - always use JPEG for better compression
          const mimeType = 'image/jpeg'; // Force JPEG for better compression
          const compressedBase64 = canvas.toDataURL(mimeType, quality);
          
          console.log('[ProductForm] 🗜️  Image compressed:', {
            originalSize: file.size,
            originalSizeKB: (file.size / 1024).toFixed(2),
            originalSizeMB: (file.size / (1024 * 1024)).toFixed(2),
            compressedSize: compressedBase64.length,
            compressedSizeKB: (compressedBase64.length / 1024).toFixed(2),
            compressedSizeMB: (compressedBase64.length / (1024 * 1024)).toFixed(2),
            compressionRatio: ((1 - compressedBase64.length / file.size) * 100).toFixed(2) + '%',
            originalDimensions: `${img.width}x${img.height}`,
            compressedDimensions: `${width}x${height}`,
          });

          resolve(compressedBase64);
        };
        img.onerror = reject;
        img.src = e.target.result;
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const handleFileUpload = (file, index) => {
    console.log('[ProductForm] 📤 handleFileUpload called:', {
      fileName: file.name,
      fileSize: file.size,
      fileSizeKB: (file.size / 1024).toFixed(2),
      fileSizeMB: (file.size / (1024 * 1024)).toFixed(2),
      fileType: file.type,
      index,
    });
    
    return new Promise((resolve, reject) => {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        console.log('[ProductForm] ❌ Invalid file type:', file.type);
        message.error('Chỉ chấp nhận file hình ảnh!');
        reject(new Error('Invalid file type'));
        return;
      }

      // Validate file size (max 5MB)
      const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
      if (file.size > MAX_FILE_SIZE) {
        console.log('[ProductForm] ❌ File too large:', {
          fileSize: file.size,
          fileSizeMB: (file.size / (1024 * 1024)).toFixed(2),
          maxSizeMB: (MAX_FILE_SIZE / (1024 * 1024)).toFixed(2),
        });
        message.error(`Kích thước file không được vượt quá ${(MAX_FILE_SIZE / (1024 * 1024)).toFixed(0)}MB!`);
        reject(new Error('File too large'));
        return;
      }

      console.log('[ProductForm] 🗜️  Compressing image...');
      compressImage(file)
        .then((compressedBase64) => {
          console.log('[ProductForm] ✅ Image compressed successfully');
          
          // Check if compressed image is still too large (max 1.5MB per image to be safe)
          const MAX_COMPRESSED_SIZE = 1.5 * 1024 * 1024; // 1.5MB per image
          if (compressedBase64.length > MAX_COMPRESSED_SIZE) {
            const sizeMB = (compressedBase64.length / (1024 * 1024)).toFixed(2);
            const maxSizeMB = (MAX_COMPRESSED_SIZE / (1024 * 1024)).toFixed(2);
            console.error('[ProductForm] ❌ Compressed image still too large:', {
              sizeMB: sizeMB,
              maxSizeMB: maxSizeMB,
            });
            message.error(`Hình ảnh vẫn còn quá lớn sau khi nén (${sizeMB}MB). Vui lòng chọn hình ảnh nhỏ hơn. Tối đa: ${maxSizeMB}MB`);
            return; // Don't add the image
          }
          
          // Update image URL with compressed base64 data URL
          const newImages = [...images];
          console.log('[ProductForm] Current images before update:', {
            count: newImages.length,
            currentImage: newImages[index],
          });
          
          newImages[index].url = compressedBase64;
          setImages(newImages);
          
          // Remove preview URL as we now have the actual image
          setImagePreviewUrls(prev => {
            const newPreviews = { ...prev };
            delete newPreviews[index];
            return newPreviews;
          });
          
          console.log('[ProductForm] ✅ Image URL updated in state');
          message.success('Upload hình ảnh thành công!');
          resolve(compressedBase64);
        })
        .catch((error) => {
          console.error('[ProductForm] ❌ Error compressing/reading file:', error);
          console.error('[ProductForm] Error details:', {
            message: error.message,
            stack: error.stack,
          });
          message.error('Lỗi khi xử lý file!');
          reject(error);
        });
    });
  };

  // Handle file selection for preview (before upload)
  const handleFileSelect = (file, index) => {
    console.log('[ProductForm] 📎 handleFileSelect called:', {
      fileName: file.name,
      fileSize: file.size,
      fileType: file.type,
      index,
    });
    
    // Create preview URL
    const previewUrl = URL.createObjectURL(file);
    setImagePreviewUrls(prev => ({
      ...prev,
      [index]: previewUrl,
    }));
    
    // Auto-upload after preview
    setTimeout(() => {
      handleFileUpload(file, index).catch(err => {
        console.error('[ProductForm] Auto-upload failed:', err);
      });
    }, 100);
  };

  const beforeUpload = (file) => {
    console.log('[ProductForm] 🔍 beforeUpload called:', {
      fileName: file.name,
      fileSize: file.size,
      fileType: file.type,
    });
    // Prevent auto upload, we'll handle it manually
    return false;
  };

  if (initialLoading) {
    return (
      <div style={{ textAlign: 'center', padding: '100px' }}>
        <Spin size="large" />
      </div>
    );
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <Title level={2} style={{ margin: 0 }}>{isEdit ? 'Sửa Sản Phẩm' : 'Thêm Sản Phẩm'}</Title>
        <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/admin/products')}>
          Quay Lại
        </Button>
      </div>

      <Form
        form={form}
        layout="vertical"
        onFinish={handleSubmit}
        initialValues={{
          is_active: true,
          price: 0,
          stock_quantity: 0,
        }}
      >
        <Row gutter={[16, 16]}>
          <Col xs={24} lg={16}>
            <Card title="Thông Tin Cơ Bản" style={{ marginBottom: '16px' }}>
              <Form.Item
                name="name"
                label="Tên Sản Phẩm"
                rules={[{ required: true, message: 'Vui lòng nhập tên sản phẩm' }]}
                help="Ví dụ: Nước hoa Chanel No.5 100ml - Slug và SKU sẽ được tự động tạo"
              >
                <Input 
                  placeholder="Nhập tên sản phẩm (VD: Nước hoa Chanel No.5 100ml)" 
                  onChange={(e) => {
                    const name = e.target.value;
                    console.log('[ProductForm] 📝 Product name changed:', { name });
                    
                    // Auto-generate slug if empty
                    const currentSlug = form.getFieldValue('slug');
                    if (!currentSlug || currentSlug === '') {
                      const autoSlug = generateSlug(name);
                      console.log('[ProductForm] 🔗 Auto-generating slug:', autoSlug);
                      form.setFieldsValue({ slug: autoSlug });
                    }
                    
                    // Auto-generate SKU if empty
                    const currentSku = form.getFieldValue('sku');
                    if (!currentSku || currentSku === '') {
                      const autoSku = generateSKU(name);
                      console.log('[ProductForm] 🏷️  Auto-generating SKU:', autoSku);
                      form.setFieldsValue({ sku: autoSku });
                    }
                    
                    // Auto-generate barcode if empty
                    const currentBarcode = form.getFieldValue('barcode');
                    if (!currentBarcode || currentBarcode === '') {
                      const autoBarcode = generateBarcode();
                      console.log('[ProductForm] 📊 Auto-generating barcode:', autoBarcode);
                      form.setFieldsValue({ barcode: autoBarcode });
                    }
                  }}
                />
              </Form.Item>
              <Row gutter={16}>
                <Col xs={24} sm={12}>
                  <Form.Item 
                    name="slug" 
                    label="Slug"
                    help="URL thân thiện, tự động tạo từ tên sản phẩm. Có thể chỉnh sửa nếu cần."
                  >
                    <Input 
                      placeholder="Tự động tạo từ tên sản phẩm" 
                      suffix={
                        <Button 
                          type="link" 
                          size="small" 
                          onClick={() => {
                            const name = form.getFieldValue('name');
                            if (name) {
                              form.setFieldsValue({ slug: generateSlug(name) });
                            }
                          }}
                        >
                          Tạo lại
                        </Button>
                      }
                    />
                  </Form.Item>
                </Col>
                <Col xs={24} sm={12}>
                  <Form.Item
                    name="sku"
                    label="SKU"
                    rules={[{ required: true, message: 'Vui lòng nhập SKU' }]}
                    help="Mã sản phẩm duy nhất, tự động tạo từ tên sản phẩm. Có thể chỉnh sửa nếu cần."
                  >
                    <Input 
                      placeholder="Tự động tạo từ tên sản phẩm" 
                      suffix={
                        <Button 
                          type="link" 
                          size="small" 
                          onClick={() => {
                            const name = form.getFieldValue('name');
                            if (name) {
                              form.setFieldsValue({ sku: generateSKU(name) });
                            }
                          }}
                        >
                          Tạo lại
                        </Button>
                      }
                    />
                  </Form.Item>
                </Col>
              </Row>
              <Form.Item 
                name="short_description" 
                label="Mô Tả Ngắn"
                help="Mô tả ngắn gọn về sản phẩm (tối đa 255 ký tự), hiển thị trong danh sách sản phẩm"
              >
                <TextArea 
                  rows={3} 
                  placeholder="VD: Nước hoa cao cấp với hương thơm quyến rũ, sang trọng. Phù hợp cho phụ nữ hiện đại, tự tin. Hương thơm lưu giữ lâu, từ 6-8 giờ." 
                  maxLength={255} 
                  showCount
                />
              </Form.Item>
              <Form.Item 
                name="description" 
                label="Mô Tả Chi Tiết"
                help="Mô tả đầy đủ về sản phẩm. Nên bao gồm: Thành phần, đặc điểm, công dụng, cách sử dụng, lưu ý, đối tượng phù hợp"
              >
                <TextArea 
                  rows={6} 
                  placeholder="VD: THÀNH PHẦN: Nước, cồn, hương liệu...&#10;ĐẶC ĐIỂM: Hương thơm lưu giữ lâu, không gây kích ứng...&#10;CÔNG DỤNG: Tạo hương thơm quyến rũ, tăng sự tự tin...&#10;CÁCH SỬ DỤNG: Xịt lên cổ tay, sau tai, cổ...&#10;LƯU Ý: Tránh tiếp xúc với mắt, bảo quản nơi khô ráo..." 
                />
              </Form.Item>
            </Card>

            <Card title="Giá Và Tồn Kho" style={{ marginBottom: '16px' }}>
              <Row gutter={16}>
                <Col xs={24} sm={8}>
                  <Form.Item
                    name="price"
                    label="Giá Bán"
                    rules={[{ required: true, message: 'Vui lòng nhập giá' }]}
                    help="Giá bán hiện tại của sản phẩm (VNĐ)"
                  >
                    <InputNumber
                      min={0}
                      style={{ width: '100%' }}
                      placeholder="Nhập giá bán (VD: 2500000)"
                      controls={false}
                    />
                  </Form.Item>
                </Col>
                <Col xs={24} sm={8}>
                  <Form.Item 
                    name="msrp" 
                    label="Giá Niêm Yết (MSRP)"
                    help="Giá niêm yết ban đầu (nếu có), dùng để hiển thị giá gốc khi có giảm giá"
                  >
                    <InputNumber
                      min={0}
                      style={{ width: '100%' }}
                      placeholder="Nhập giá niêm yết (VD: 3000000)"
                      controls={false}
                    />
                  </Form.Item>
                </Col>
                <Col xs={24} sm={8}>
                  <Form.Item
                    name="stock_quantity"
                    label="Số Lượng Tồn Kho"
                    rules={[{ required: true, message: 'Vui lòng nhập số lượng tồn kho' }]}
                    help="Số lượng sản phẩm hiện có trong kho"
                  >
                    <InputNumber 
                      min={0} 
                      style={{ width: '100%' }} 
                      placeholder="Nhập số lượng (VD: 50, 100, 200)"
                      controls={false}
                    />
                  </Form.Item>
                </Col>
              </Row>
            </Card>

            <Card title="Thông Tin Bổ Sung" style={{ marginBottom: '16px' }}>
              <Row gutter={16}>
                <Col xs={24} sm={12}>
                  <Form.Item 
                    name="origin" 
                    label="Xuất Xứ"
                    help="Quốc gia/nơi sản xuất sản phẩm. Gợi ý: Pháp, Mỹ, Hàn Quốc, Nhật Bản, Việt Nam, Thái Lan, Đức, Ý"
                  >
                    <Input 
                      placeholder="Nhập xuất xứ (VD: Pháp, Mỹ, Việt Nam)" 
                      list="origin-suggestions"
                    />
                    <datalist id="origin-suggestions">
                      <option value="Pháp" />
                      <option value="Mỹ" />
                      <option value="Hàn Quốc" />
                      <option value="Nhật Bản" />
                      <option value="Việt Nam" />
                      <option value="Thái Lan" />
                      <option value="Đức" />
                      <option value="Ý" />
                      <option value="Anh" />
                      <option value="Thụy Sĩ" />
                    </datalist>
                  </Form.Item>
                </Col>
                <Col xs={24} sm={12}>
                  <Form.Item 
                    name="manufacturer" 
                    label="Nhà Sản Xuất"
                    help="Tên công ty/nhà sản xuất. Gợi ý: Chanel, Dior, L'Oreal, Estee Lauder, Lancome, Clinique, MAC, Maybelline"
                  >
                    <Input 
                      placeholder="Nhập nhà sản xuất (VD: Chanel, Dior)" 
                      list="manufacturer-suggestions"
                    />
                    <datalist id="manufacturer-suggestions">
                      <option value="Chanel" />
                      <option value="Dior" />
                      <option value="L'Oreal" />
                      <option value="Estee Lauder" />
                      <option value="Lancome" />
                      <option value="Clinique" />
                      <option value="MAC" />
                      <option value="Maybelline" />
                      <option value="Revlon" />
                      <option value="NARS" />
                      <option value="Urban Decay" />
                      <option value="Too Faced" />
                    </datalist>
                  </Form.Item>
                </Col>
                <Col xs={24} sm={12}>
                  <Form.Item 
                    name="barcode" 
                    label="Mã Vạch"
                    help="Mã vạch sản phẩm (EAN-13: 13 chữ số). Tự động tạo nếu để trống"
                  >
                    <Input 
                      placeholder="Tự động tạo mã vạch EAN-13" 
                      maxLength={13}
                      suffix={
                        <Button 
                          type="link" 
                          size="small" 
                          onClick={() => {
                            form.setFieldsValue({ barcode: generateBarcode() });
                          }}
                        >
                          Tạo mới
                        </Button>
                      }
                    />
                  </Form.Item>
                </Col>
                <Col xs={24} sm={12}>
                  <Form.Item 
                    name="volume_ml" 
                    label="Dung Tích (ml)"
                    help="Dung tích sản phẩm tính bằng ml"
                  >
                    <InputNumber 
                      min={0} 
                      style={{ width: '100%' }} 
                      placeholder="Nhập dung tích (VD: 50ml, 100ml, 200ml, 500ml)"
                      controls={false}
                    />
                  </Form.Item>
                </Col>
              </Row>
            </Card>

            <Card title="Phân Loại">
              <Row gutter={16}>
                <Col xs={24} sm={12}>
                  <Form.Item 
                    name="category_id" 
                    label="Danh Mục"
                    help="Chọn danh mục sản phẩm phù hợp"
                  >
                    <Select placeholder="Chọn danh mục (VD: Nước hoa, Mỹ phẩm)" allowClear>
                      {categories.map((cat) => (
                        <Select.Option key={cat.category_id} value={cat.category_id}>
                          {cat.name}
                        </Select.Option>
                      ))}
                    </Select>
                  </Form.Item>
                </Col>
                <Col xs={24} sm={12}>
                  <Form.Item 
                    name="brand" 
                    label="Thương Hiệu"
                    help="Chọn thương hiệu của sản phẩm"
                  >
                    <Select 
                      placeholder="Chọn thương hiệu (VD: Chanel, Dior)" 
                      allowClear
                      showSearch
                      filterOption={(input, option) =>
                        (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
                      }
                    >
                      {brands.map((br) => (
                        <Select.Option key={br.brand_id || br.id} value={br.name || br.brand_id}>
                          {br.name}
                        </Select.Option>
                      ))}
                    </Select>
                  </Form.Item>
                </Col>
              </Row>
            </Card>
          </Col>

          <Col xs={24} lg={8}>
            <Card title="Hình Ảnh Sản Phẩm" style={{ marginBottom: '16px' }}>
              <div style={{ marginBottom: '16px' }}>
                <Button 
                  type="dashed" 
                  onClick={handleAddImage} 
                  icon={<PlusOutlined />} 
                  block
                >
                  Thêm Hình Ảnh
                </Button>
              </div>
              
              {images.map((img, index) => {
                const previewUrl = imagePreviewUrls[index] || img.url;
                const hasImage = !!previewUrl;
                
                return (
                  <div 
                    key={index} 
                    style={{ 
                      marginBottom: '16px', 
                      padding: '16px', 
                      border: '1px solid #d9d9d9', 
                      borderRadius: '8px',
                      backgroundColor: '#fafafa'
                    }}
                  >
                    <Row gutter={[12, 12]}>
                      {/* Image Preview Section */}
                      <Col span={24}>
                        {hasImage ? (
                          <div style={{ 
                            marginBottom: '12px', 
                            textAlign: 'center',
                            padding: '12px',
                            backgroundColor: '#fff',
                            borderRadius: '8px',
                            border: '1px solid #e8e8e8'
                          }}>
                            <AntdImage
                              src={previewUrl}
                              alt={img.alt || `Preview ${index + 1}`}
                              width={200}
                              height={200}
                              style={{ 
                                objectFit: 'contain', 
                                borderRadius: '8px',
                                maxWidth: '100%',
                                height: 'auto'
                              }}
                              preview={{
                                mask: <div style={{ padding: '8px' }}><EyeOutlined /> Xem lớn</div>,
                              }}
                            />
                            <div style={{ marginTop: '8px', fontSize: '12px', color: '#666' }}>
                              {imagePreviewUrls[index] ? 'Đang xử lý...' : 'Hình ảnh đã tải lên'}
                            </div>
                          </div>
                        ) : (
                          <div style={{ 
                            marginBottom: '12px',
                            padding: '40px 20px',
                            border: '2px dashed #d9d9d9',
                            borderRadius: '8px',
                            textAlign: 'center',
                            backgroundColor: '#fff'
                          }}>
                            <Upload
                              accept="image/*"
                              showUploadList={false}
                              beforeUpload={(file) => {
                                handleFileSelect(file, index);
                                return false;
                              }}
                              customRequest={(options) => {
                                console.log('[ProductForm] 📤 customRequest called:', {
                                  fileName: options.file.name,
                                  fileSize: options.file.size,
                                  fileType: options.file.type,
                                  index,
                                });
                                handleFileUpload(options.file, index)
                                  .then(() => {
                                    console.log('[ProductForm] ✅ File upload successful');
                                    options.onSuccess();
                                  })
                                  .catch((error) => {
                                    console.error('[ProductForm] ❌ File upload failed:', error);
                                    options.onError(error);
                                  });
                              }}
                            >
                              <div>
                                <UploadOutlined style={{ fontSize: '32px', color: '#1890ff', marginBottom: '8px' }} />
                                <div style={{ fontSize: '14px', color: '#666', marginBottom: '4px' }}>
                                  <strong>Nhấp để chọn hoặc kéo thả hình ảnh vào đây</strong>
                                </div>
                                <div style={{ fontSize: '12px', color: '#999' }}>
                                  JPG, PNG, GIF (tối đa 5MB)
                                </div>
                              </div>
                            </Upload>
                          </div>
                        )}
                      </Col>
                      
                      {/* URL Input */}
                      <Col span={24}>
                        <Input
                          placeholder="Hoặc nhập URL hình ảnh (VD: https://example.com/image.jpg)"
                          value={img.url}
                          onChange={(e) => {
                            handleImageChange(index, 'url', e.target.value);
                            // Clear preview if URL is manually entered
                            if (e.target.value && imagePreviewUrls[index]) {
                              setImagePreviewUrls(prev => {
                                const newPreviews = { ...prev };
                                delete newPreviews[index];
                                return newPreviews;
                              });
                            }
                          }}
                          style={{ marginBottom: '8px' }}
                          addonAfter={
                            img.url && (
                              <Button
                                type="link"
                                size="small"
                                onClick={() => {
                                  console.log('[ProductForm] Clearing image URL at index:', index);
                                  const newImages = [...images];
                                  newImages[index].url = '';
                                  setImages(newImages);
                                  setImagePreviewUrls(prev => {
                                    const newPreviews = { ...prev };
                                    delete newPreviews[index];
                                    return newPreviews;
                                  });
                                }}
                              >
                                Xóa
                              </Button>
                            )
                          }
                        />
                        <div style={{ fontSize: '12px', color: '#999', marginBottom: '8px' }}>
                          Hỗ trợ URL đầy đủ (https://) hoặc đường dẫn tương đối (/images/...)
                        </div>
                      </Col>
                      
                      {/* Alt Text Input */}
                      <Col span={24}>
                        <Input
                          placeholder="Mô tả hình ảnh (alt text) - VD: Nước hoa Chanel No.5 chai 100ml"
                          value={img.alt}
                          onChange={(e) => handleImageChange(index, 'alt', e.target.value)}
                          style={{ marginBottom: '8px' }}
                        />
                        <div style={{ fontSize: '12px', color: '#999', marginBottom: '8px' }}>
                          Mô tả giúp SEO và hỗ trợ người dùng khiếm thị
                        </div>
                      </Col>
                      
                      {/* Action Buttons */}
                      <Col span={12}>
                        <Button
                          type={img.is_primary ? 'primary' : 'default'}
                          size="small"
                          block
                          onClick={() => handleImageChange(index, 'is_primary', true)}
                          icon={img.is_primary ? <EyeOutlined /> : null}
                        >
                          {img.is_primary ? 'Hình chính' : 'Đặt làm chính'}
                        </Button>
                      </Col>
                      <Col span={12}>
                        <Button
                          danger
                          size="small"
                          icon={<DeleteOutlined />}
                          block
                          onClick={() => {
                            handleRemoveImage(index);
                            // Clean up preview URL
                            setImagePreviewUrls(prev => {
                              const newPreviews = { ...prev };
                              delete newPreviews[index];
                              return newPreviews;
                            });
                          }}
                        >
                          Xóa
                        </Button>
                      </Col>
                    </Row>
                  </div>
                );
              })}
              
              {images.length === 0 && (
                <div style={{ textAlign: 'center', color: '#999', padding: '20px' }}>
                  Chưa có hình ảnh nào. Nhấn "Thêm Hình Ảnh" để thêm.
                </div>
              )}
            </Card>

            <Card title="Trạng Thái">
              <Form.Item 
                name="is_active" 
                valuePropName="checked" 
                label="Hoạt động"
                help="Bật/tắt để hiển thị hoặc ẩn sản phẩm trên website"
              >
                <Switch />
              </Form.Item>
            </Card>
          </Col>
        </Row>

        <Modal
          open={previewVisible}
          title="Xem trước hình ảnh"
          footer={null}
          onCancel={() => setPreviewVisible(false)}
        >
          <AntdImage src={previewImage} alt="Preview" style={{ width: '100%' }} />
        </Modal>

        <div style={{ marginTop: '24px', textAlign: 'right' }}>
          <Space>
            <Button onClick={() => navigate('/admin/products')}>
              Hủy
            </Button>
            <Button type="primary" htmlType="submit" loading={loading} icon={<SaveOutlined />}>
              Lưu
            </Button>
          </Space>
        </div>
      </Form>
    </div>
  );
};

export default AdminProductForm;
