import React, { useEffect, useState, useCallback, useRef } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  Row,
  Col,
  Card,
  Input,
  Button,
  Spin,
  Typography,
  Empty,
  Pagination,
  Select,
} from 'antd';
import { SearchOutlined, FilterOutlined, FireOutlined } from '@ant-design/icons';
import { product, category } from '../../api/index.js';
import { review } from '../../api/index.js';
import ProductCard from '../../components/ProductCard.js';
import './Products.scss';

const { Title, Paragraph } = Typography;
const { Search } = Input;
const { Option } = Select;

const Products = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 12,
    total: 0,
  });
  const [filters, setFilters] = useState({
    categoryId: searchParams.get('category') || '',
    keyword: searchParams.get('search') || '',
    sortBy: 'created_at',
    sortOrder: 'DESC',
  });
  const [searchInput, setSearchInput] = useState(filters.keyword);
  const debounceTimerRef = useRef(null);

  useEffect(() => {
    loadData();
  }, [filters, pagination.page]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [productsRes, categoriesRes] = await Promise.all([
        filters.keyword
          ? product.searchProducts(filters.keyword, pagination.page, pagination.limit)
          : filters.categoryId
          ? product.getProductsByCategory(filters.categoryId, pagination.page, pagination.limit)
          : product.getProducts(pagination.page, pagination.limit, {
              sortBy: filters.sortBy,
              sortOrder: filters.sortOrder,
            }),
        category.getCategoryTree(),
      ]);

      if (productsRes.success) {
        const productsData = productsRes.data || [];
        console.log('[Products] 📦 Received products from API:', {
          count: productsData.length,
          firstProduct: productsData[0] ? {
            id: productsData[0].product_id || productsData[0].id,
            name: productsData[0].name,
            hasPrimaryImage: !!productsData[0].primary_image,
            primaryImageType: typeof productsData[0].primary_image,
            primaryImagePreview: productsData[0].primary_image ? (productsData[0].primary_image.length > 100 ? productsData[0].primary_image.substring(0, 100) + '...' : productsData[0].primary_image) : 'null',
            hasImages: !!productsData[0].images,
            imagesType: typeof productsData[0].images,
            imagesIsArray: Array.isArray(productsData[0].images),
            imagesLength: Array.isArray(productsData[0].images) ? productsData[0].images.length : 'N/A',
          } : 'no products',
        });
        // Load ratings for each product
        const productsWithRatings = await Promise.all(
          productsData.map(async (prod) => {
            try {
              const ratingRes = await review.getProductRating(prod.product_id || prod.id);
              return {
                ...prod,
                rating: ratingRes.success ? ratingRes.data : null,
              };
            } catch (error) {
              return { ...prod, rating: null };
            }
          })
        );
        console.log('[Products] ✅ Products with ratings prepared:', {
          count: productsWithRatings.length,
        });
        setProducts(productsWithRatings);
        setPagination((prev) => ({
          ...prev,
          total: productsRes.pagination?.total || productsRes.total || productsWithRatings.length,
        }));
      }
      if (categoriesRes.success) {
        setCategories(categoriesRes.data || []);
      }
    } catch (error) {
      console.error('Error loading products:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = useCallback((key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
    setPagination((prev) => ({ ...prev, page: 1 }));
    // Update URL params
    const newParams = new URLSearchParams(searchParams);
    if (key === 'categoryId') {
      if (value) {
        newParams.set('category', value);
      } else {
        newParams.delete('category');
      }
    }
    if (key === 'keyword') {
      if (value) {
        newParams.set('search', value);
      } else {
        newParams.delete('search');
      }
    }
    setSearchParams(newParams);
  }, [searchParams, setSearchParams]);

  // Debounced search handler
  const handleSearchChange = useCallback((value) => {
    setSearchInput(value);
    
    // Clear existing timer
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    
    // Set new timer for debounce (500ms delay)
    debounceTimerRef.current = setTimeout(() => {
      handleFilterChange('keyword', value);
    }, 500);
  }, [handleFilterChange]);

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  const handlePageChange = (page) => {
    setPagination((prev) => ({ ...prev, page }));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="products-page">
      <div className="container">
        {/* Page Header */}
        <div className="page-header">
          <Title level={2} className="page-title">
            Sản phẩm
          </Title>
        </div>

        {/* Search and Sort Bar */}
        <div className="products-toolbar">
          <Search
            placeholder="Tìm kiếm sản phẩm..."
            allowClear
            enterButton={<SearchOutlined />}
            size="large"
            value={searchInput}
            onChange={(e) => handleSearchChange(e.target.value)}
            onSearch={(value) => {
              // Clear debounce timer and search immediately on Enter
              if (debounceTimerRef.current) {
                clearTimeout(debounceTimerRef.current);
              }
              handleFilterChange('keyword', value);
              setSearchInput(value);
            }}
            className="search-input"
          />
          <Select
            value={`${filters.sortBy}_${filters.sortOrder}`}
            onChange={(value) => {
              const [sortBy, sortOrder] = value.split('_');
              setFilters((prev) => ({ ...prev, sortBy, sortOrder }));
            }}
            className="sort-select"
            placeholder="Sắp xếp"
            size="large"
          >
            <Option value="created_at_DESC">Mới nhất</Option>
            <Option value="price_ASC">Giá: Thấp → Cao</Option>
            <Option value="price_DESC">Giá: Cao → Thấp</Option>
            <Option value="name_ASC">Tên: A-Z</Option>
          </Select>
        </div>

        {/* Category Filter */}
        {categories.length > 0 && (
          <div className="category-filter">
            <Button
              type={!filters.categoryId ? 'primary' : 'default'}
              onClick={() => handleFilterChange('categoryId', '')}
              className="category-btn"
            >
              Tất cả
            </Button>
            {categories.map((cat) => (
              <Button
                key={cat.category_id}
                type={filters.categoryId == cat.category_id ? 'primary' : 'default'}
                onClick={() => handleFilterChange('categoryId', cat.category_id)}
                className="category-btn"
              >
                {cat.name}
              </Button>
            ))}
          </div>
        )}

        {/* Products Grid */}
        <div className="products-content">

          {loading ? (
            <div className="loading-container">
              <Spin size="large" />
            </div>
          ) : products.length === 0 ? (
            <div className="empty-container">
              <Empty description="Không tìm thấy sản phẩm nào" />
            </div>
          ) : (
            <>
              <Row gutter={[16, 24]} className="products-grid">
                {products.map((item, index) => {
                  const productId = item.product_id || item.id;
                  // Sử dụng index làm fallback để tránh duplicate keys
                  const uniqueKey = productId ? `product-${productId}-${index}` : `product-${index}-${Math.random()}`;
                  return (
                    <Col xs={12} sm={8} md={6} key={uniqueKey}>
                      <ProductCard product={item} showActions={true} />
                    </Col>
                  );
                })}
              </Row>
              {pagination.total > pagination.limit && (
                <div className="pagination-container">
                  <Pagination
                    current={pagination.page}
                    total={pagination.total}
                    pageSize={pagination.limit}
                    onChange={handlePageChange}
                    showSizeChanger={false}
                    showTotal={(total) => `Tổng ${total} sản phẩm`}
                  />
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default Products;
