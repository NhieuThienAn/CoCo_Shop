import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Row, Col, Card, Button, Spin, Typography, Empty, Input, Space } from 'antd';
import { ShoppingOutlined, FireOutlined, ArrowRightOutlined, MailOutlined } from '@ant-design/icons';
import { product, category, review } from '../../api/index.js';
import ProductCard from '../../components/ProductCard.js';
import './Home.scss';

const { Title, Paragraph, Text } = Typography;
const { Meta } = Card;
const { Search } = Input;

const Home = () => {
  const [featuredProducts, setFeaturedProducts] = useState([]);
  const [newProducts, setNewProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newsletterEmail, setNewsletterEmail] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [productsRes, newProductsRes] = await Promise.all([
        product.getActiveProducts(1, 8),
        product.getActiveProducts(1, 4, 'created_at', 'DESC'), // New products
      ]);

      if (productsRes.success) {
        const products = productsRes.data || [];
        const productsWithRatings = await Promise.all(
          products.map(async (prod) => {
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
        setFeaturedProducts(productsWithRatings);
      }

      if (newProductsRes.success) {
        const products = newProductsRes.data || [];
        const productsWithRatings = await Promise.all(
          products.map(async (prod) => {
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
        setNewProducts(productsWithRatings);
      }
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleNewsletterSubmit = () => {
    if (newsletterEmail) {
      // TODO: Implement newsletter subscription
      console.log('Newsletter subscription:', newsletterEmail);
      setNewsletterEmail('');
    }
  };

  if (loading) {
    return (
      <div className="home-loading">
        <Spin size="large" />
      </div>
    );
  }

  return (
    <div className="home-page">
      {/* Hero Banner - Promotion */}
      <section className="hero-banner">
        <div className="container">
          <div className="banner-content">
            <div className="banner-badge">COMBO SIÊU ƯU ĐÃI 43%</div>
            <Title level={1} className="banner-title">
              Đại tiệc black friday
            </Title>
            <Paragraph className="banner-description">
              Mừng Đại tiệc sale Black Friday, Cocoon mời bạn thưởng thức "bữa tiệc" làm đẹp thuần chay dành riêng cho làn da và mái tóc. 
              Đừng bỏ lỡ chương trình ưu đãi đặc biệt và khám phá ngay "thực đơn" mà Cocoon dành riêng cho bạn.
            </Paragraph>
            <Link to="/products">
              <Button type="primary" size="large" className="banner-button">
                XEM NGAY <ArrowRightOutlined />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* New Products Section */}
      {newProducts.length > 0 && (
        <section className="new-products-section">
          <div className="container">
            <div className="section-header">
              <Title level={2} className="section-title">
                Sản phẩm mới
              </Title>
            </div>
            <Row gutter={[24, 32]}>
              {newProducts.map((item) => {
                const productId = item.product_id || item.id;
                return (
                  <Col xs={12} sm={8} md={6} key={productId}>
                    <ProductCard product={item} showActions={true} />
                  </Col>
                );
              })}
            </Row>
            <div className="section-footer">
              <Link to="/products?sort=new">
                <Button type="link" size="large" icon={<ArrowRightOutlined />}>
                  Xem tất cả sản phẩm mới
                </Button>
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* Featured Products */}
      <section className="products-section">
        <div className="container">
          <div className="section-header">
            <Title level={2} className="section-title">
              Sản phẩm nổi bật
            </Title>
          </div>
          {featuredProducts.length === 0 ? (
            <Empty description="Chưa có sản phẩm nào" />
          ) : (
            <>
              <Row gutter={[24, 32]}>
                {featuredProducts.map((item) => {
                  const productId = item.product_id || item.id;
                  return (
                    <Col xs={12} sm={8} md={6} key={productId}>
                      <ProductCard product={item} showActions={true} />
                    </Col>
                  );
                })}
              </Row>
              <div className="section-footer">
                <Link to="/products">
                  <Button type="link" size="large" icon={<ArrowRightOutlined />}>
                    Xem tất cả sản phẩm
                  </Button>
                </Link>
              </div>
            </>
          )}
        </div>
      </section>

      {/* Newsletter Section */}
      <section className="newsletter-section">
        <div className="container">
          <div className="newsletter-content">
            <Title level={2} className="newsletter-title">
              Đăng ký để nhận thông tin khuyến mãi sớm nhất từ Cocoon
            </Title>
            <Paragraph className="newsletter-description">
              Đăng ký để nhận thông tin liên lạc về các sản phẩm, dịch vụ, cửa hàng, sự kiện và các vấn đề đáng quan tâm của Cocoon.
            </Paragraph>
            <Space.Compact style={{ width: '100%', maxWidth: '500px' }}>
              <Input
                placeholder="Nhập email của bạn"
                size="large"
                prefix={<MailOutlined />}
                value={newsletterEmail}
                onChange={(e) => setNewsletterEmail(e.target.value)}
                onPressEnter={handleNewsletterSubmit}
              />
              <Button type="primary" size="large" onClick={handleNewsletterSubmit}>
                Đăng Ký
              </Button>
            </Space.Compact>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Home;
