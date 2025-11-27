import React from 'react';
import { Link } from 'react-router-dom';
import { Row, Col, Card, Button, Typography, Tag, Image } from 'antd';
import { ArrowRightOutlined } from '@ant-design/icons';
import './Promotions.scss';

// Import images from assets
import cosmeticCollectionImg from '../../assets/cosmetic_collection.png';
import facialCleanserImg from '../../assets/facial_cleanser_full.png';
import serumImg from '../../assets/melasma_treatment_serum.png';
import moisturizerImg from '../../assets/moisturizer.png';
import suncreamImg from '../../assets/suncream.png';
import maskImg from '../../assets/payper_mask.png';
import makeupRemoverImg from '../../assets/makeup_remover.png';

const { Title, Paragraph } = Typography;

// Hardcoded promotion data
const promotions = [
  {
    id: 1,
    badge: 'COMBO SIÊU ƯU ĐÃI 43%',
    title: 'Đại tiệc black friday',
    description: 'Mừng Đại tiệc sale Black Friday, coco mời bạn thưởng thức "bữa tiệc" làm đẹp thuần chay dành riêng cho làn da và mái tóc. Đừng bỏ lỡ chương trình ưu đãi đặc biệt và khám phá ngay "thực đơn" mà coco dành riêng cho bạn.',
    image: cosmeticCollectionImg,
    link: '/products',
    featured: true,
  },
  {
    id: 2,
    badge: 'Sản phẩm mới',
    title: 'Sữa Rửa Mặt Sen Hậu Giang 310ml',
    description: 'Sau nhiều tin yêu và mong chờ, coco chính thức ra mắt phiên bản Sữa Rửa Mặt Sen Hậu Giang dung tích 310ml. Không chỉ tăng dung tích, sản phẩm còn được khoác lên thiết kế mới hiện đại với vòi pump tiện lợi, giúp việc chăm sóc da hằng ngày trở nên dễ dàng và tinh tế hơn.',
    image: facialCleanserImg,
    link: '/products?category=cleanser',
    featured: false,
  },
  {
    id: 3,
    badge: 'Dung tích mới',
    title: 'Nước Tẩy Trang Sen Hậu Giang',
    description: 'coco x Phương Mỹ Chi ra mắt nước tẩy trang thế hệ mới: Nước Tẩy Trang Sen Hậu Giang - làm sạch sâu lớp trang điểm và bụi siêu mịn PM1.0 nhờ công nghệ độc quyền NatraGem™ S150, hỗ trợ cân bằng hệ vi sinh trên da với phức hợp prebiotics, phù hợp cho mọi loại da, kể cả da rất nhạy cảm.',
    image: makeupRemoverImg,
    link: '/products?category=toner',
    featured: false,
  },
  {
    id: 4,
    badge: 'Chống nắng phổ rộng',
    title: 'Sữa chống nắng bí đao',
    description: 'Bảo vệ da trước tia UVA, UVB và ánh sáng năng lượng cao nhìn thấy được. Với kết cấu không trọng lượng, thấm nhanh vào da mà không để lại vệt trắng và mang đến cảm giác thoải mái khi sử dụng.',
    image: suncreamImg,
    link: '/products?category=sunscreen',
    featured: false,
  },
  {
    id: 5,
    badge: 'Đột phá mới',
    title: 'Tinh chất bí đao N15',
    description: 'Một công thức mạnh mẽ với chiết xuất bí đao, 15% Niacinamide giúp làm sáng da, giảm thâm nám và kiểm soát dầu. Sản phẩm phù hợp cho mọi loại da, đặc biệt là da dầu và da có vấn đề về mụn.',
    image: serumImg,
    link: '/products?category=serum',
    featured: false,
  },
  {
    id: 6,
    badge: 'Dưỡng ẩm tối ưu',
    title: 'Kem Dưỡng Ẩm Sen Hậu Giang',
    description: 'Công thức dưỡng ẩm sâu với chiết xuất sen Hậu Giang, giúp da mềm mại, mịn màng suốt cả ngày. Sản phẩm không gây nhờn, phù hợp cho mọi loại da, đặc biệt là da khô và da nhạy cảm.',
    image: moisturizerImg,
    link: '/products?category=moisturizer',
    featured: false,
  },
  {
    id: 7,
    badge: 'Chương trình',
    title: 'Đổi vỏ chai cũ nhận sản phẩm mới',
    description: 'coco luôn sẵn sàng nhận vỏ chai cũ từ các bạn và trao đi các sản phẩm mới. Cứ 10 vỏ chai lọ rỗng bạn khi gửi về cho chúng tôi, bạn sẽ nhận lại một sản phẩm mới.',
    image: cosmeticCollectionImg,
    link: '/products',
    featured: false,
  },
  {
    id: 8,
    badge: 'Chăm sóc da',
    title: 'Mặt Nạ Giấy Dưỡng Ẩm',
    description: 'Mặt nạ giấy với công thức dưỡng ẩm sâu, giúp da căng mịn, sáng khỏe chỉ sau 15 phút sử dụng. Sản phẩm được làm từ nguyên liệu tự nhiên, an toàn cho mọi loại da.',
    image: maskImg,
    link: '/products?category=mask',
    featured: false,
  },
];

const Promotions = () => {
  const featuredPromotion = promotions.find(p => p.featured);
  const regularPromotions = promotions.filter(p => !p.featured);

  return (
    <div className="promotions-page">
      {/* Featured Promotion Banner */}
      {featuredPromotion && (
        <section className="featured-promotion">
          <div className="container">
            <div className="promotion-banner">
              <div className="promotion-content">
                <div className="promotion-badge">{featuredPromotion.badge}</div>
                <Title level={1} className="promotion-title">
                  {featuredPromotion.title}
                </Title>
                <Paragraph className="promotion-description">
                  {featuredPromotion.description}
                </Paragraph>
                <Link to={featuredPromotion.link}>
                  <Button type="primary" size="large" className="promotion-button">
                    XEM NGAY <ArrowRightOutlined />
                  </Button>
                </Link>
              </div>
              <div className="promotion-image">
                <Image
                  src={featuredPromotion.image}
                  alt={featuredPromotion.title}
                  preview={false}
                />
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Regular Promotions Grid */}
      <section className="promotions-grid">
        <div className="container">
          <div className="section-header">
            <Title level={2} className="section-title">
              Khuyến mãi
            </Title>
          </div>
          <Row gutter={[32, 48]}>
            {regularPromotions.map((promotion) => (
              <Col xs={24} md={12} key={promotion.id}>
                <Card
                  className="promotion-card"
                  hoverable
                  cover={
                    <div className="promotion-card-image">
                      <Image
                        src={promotion.image}
                        alt={promotion.title}
                        preview={false}
                      />
                    </div>
                  }
                >
                  <div className="promotion-card-content">
                    <Tag className="promotion-card-badge" color="black">
                      {promotion.badge}
                    </Tag>
                    <Title level={3} className="promotion-card-title">
                      {promotion.title}
                    </Title>
                    <Paragraph className="promotion-card-description" ellipsis={{ rows: 3 }}>
                      {promotion.description}
                    </Paragraph>
                    <Link to={promotion.link}>
                      <Button type="link" className="promotion-card-link">
                        Xem ngay <ArrowRightOutlined />
                      </Button>
                    </Link>
                  </div>
                </Card>
              </Col>
            ))}
          </Row>
        </div>
      </section>
    </div>
  );
};

export default Promotions;

