import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Row, Col, Card, Button, Typography, Tag, Image, Pagination, Empty } from 'antd';
import { ArrowRightOutlined, CalendarOutlined, EyeOutlined } from '@ant-design/icons';
import './Blog.scss';

// Import images from assets
import cosmeticCollectionImg from '../../assets/cosmetic_collection.png';
import cosmeticCollection2Img from '../../assets/cosmetic_collection_2.png';
import facialCleanserImg from '../../assets/facial_cleanser_full.png';
import tonerImg from '../../assets/toner.png';
import serumImg from '../../assets/melasma_treatment_serum.png';
import acneSerumImg from '../../assets/acne_serum.png';
import skinWhiteningSerumImg from '../../assets/skin_whitening_serum.png';
import moisturizerImg from '../../assets/moisturizer.png';
import suncreamImg from '../../assets/suncream.png';
import maskImg from '../../assets/payper_mask.png';
import payperMaskSuperImg from '../../assets/payper_mask_supper_hyrating.png';
import makeupRemoverImg from '../../assets/makeup_remover.png';
import cottonPadsImg from '../../assets/cotton_pads.png';
import lipBalmImg from '../../assets/moisturizing_lip_balm.png';
import youngFemaleImg from '../../assets/young_female_brand_ambassador.png';
import youngMaleImg from '../../assets/young_male_brand_ambassador.png';

const { Title, Paragraph, Text } = Typography;

// Hardcoded blog articles data
const blogArticles = [
  {
    id: 1,
    title: 'Quy trình chăm sóc da mặt đúng cách cho từng loại da',
    excerpt: 'Mỗi loại da đều có những đặc điểm riêng và cần một quy trình chăm sóc phù hợp. Hãy cùng coco khám phá cách xây dựng routine chăm sóc da hiệu quả cho da dầu, da khô, da hỗn hợp và da nhạy cảm.',
    content: `Chăm sóc da mặt đúng cách là bước đầu tiên và quan trọng nhất để có một làn da khỏe mạnh, rạng rỡ. Tuy nhiên, không phải ai cũng biết cách chăm sóc da phù hợp với loại da của mình.

**1. Xác định loại da của bạn**

Trước tiên, bạn cần xác định loại da của mình:
- **Da dầu**: Da bóng, lỗ chân lông to, dễ nổi mụn
- **Da khô**: Da căng, bong tróc, thiếu độ ẩm
- **Da hỗn hợp**: Vùng chữ T dầu, vùng má khô
- **Da nhạy cảm**: Dễ kích ứng, đỏ, ngứa

**2. Quy trình chăm sóc da cơ bản**

**Bước 1: Làm sạch (Cleansing)**
Sử dụng sữa rửa mặt phù hợp với loại da của bạn. Với da dầu, nên chọn sản phẩm có khả năng kiểm soát dầu. Với da khô, chọn sản phẩm dịu nhẹ, không làm mất độ ẩm.

**Bước 2: Cân bằng (Toning)**
Toner giúp cân bằng độ pH của da, làm sạch sâu và chuẩn bị da cho các bước tiếp theo.

**Bước 3: Điều trị (Treatment)**
Sử dụng serum hoặc tinh chất phù hợp với nhu cầu của da: dưỡng ẩm, làm sáng, chống lão hóa, trị mụn...

**Bước 4: Dưỡng ẩm (Moisturizing)**
Kem dưỡng ẩm giúp khóa ẩm và bảo vệ da. Chọn sản phẩm phù hợp với loại da của bạn.

**Bước 5: Chống nắng (Sunscreen)**
Bước quan trọng nhất vào ban ngày. Chống nắng giúp bảo vệ da khỏi tia UV và ngăn ngừa lão hóa sớm.

**3. Lưu ý quan trọng**

- Thực hiện đều đặn mỗi ngày, sáng và tối
- Kiên nhẫn, kết quả không đến ngay lập tức
- Uống đủ nước và có chế độ ăn uống lành mạnh
- Ngủ đủ giấc và quản lý căng thẳng

Hãy bắt đầu hành trình chăm sóc da của bạn ngay hôm nay với các sản phẩm từ coco!`,
    image: cosmeticCollectionImg,
    category: 'Chăm sóc da',
    date: '2025-01-15',
    views: 1250,
    featured: true,
  },
  {
    id: 2,
    title: '5 lợi ích tuyệt vời của Sen Hậu Giang trong chăm sóc da',
    excerpt: 'Sen Hậu Giang không chỉ là biểu tượng văn hóa mà còn là nguyên liệu vàng trong chăm sóc da. Khám phá những lợi ích bất ngờ mà loài hoa này mang lại cho làn da của bạn.',
    content: `Sen Hậu Giang từ lâu đã được biết đến với những giá trị văn hóa và tinh thần. Nhưng ít ai biết rằng, loài hoa này còn mang lại những lợi ích tuyệt vời cho làn da.

**1. Dưỡng ẩm sâu**

Sen Hậu Giang chứa nhiều chất dưỡng ẩm tự nhiên, giúp da luôn mềm mại và mịn màng. Các phân tử nước trong sen có khả năng thẩm thấu sâu vào các lớp da, cung cấp độ ẩm lâu dài.

**2. Làm sáng da**

Chiết xuất sen có khả năng làm sáng da tự nhiên, giảm các vết thâm và đốm nâu. Sử dụng thường xuyên sẽ giúp da đều màu và rạng rỡ hơn.

**3. Chống oxy hóa**

Sen Hậu Giang giàu chất chống oxy hóa, giúp bảo vệ da khỏi các gốc tự do và ngăn ngừa lão hóa sớm. Da sẽ trẻ trung và tươi tắn hơn.

**4. Kháng khuẩn tự nhiên**

Tính kháng khuẩn của sen giúp ngăn ngừa mụn và các vấn đề về da. Đặc biệt phù hợp với da dầu và da dễ nổi mụn.

**5. Dịu nhẹ cho da nhạy cảm**

Sen Hậu Giang rất dịu nhẹ, phù hợp cho mọi loại da, kể cả da nhạy cảm. Sản phẩm từ sen không gây kích ứng và an toàn khi sử dụng lâu dài.

Các sản phẩm từ Sen Hậu Giang của coco được chiết xuất từ những bông sen tươi nhất, đảm bảo chất lượng và hiệu quả tối đa.`,
    image: facialCleanserImg,
    category: 'Nguyên liệu',
    date: '2025-01-12',
    views: 980,
    featured: true,
  },
  {
    id: 3,
    title: 'Serum trị mụn: Bí quyết chọn đúng sản phẩm cho da mụn',
    excerpt: 'Da mụn cần được chăm sóc đặc biệt với các sản phẩm phù hợp. Tìm hiểu cách chọn serum trị mụn hiệu quả và an toàn cho làn da của bạn.',
    content: `Mụn là vấn đề da liễu phổ biến, đặc biệt ở lứa tuổi thanh thiếu niên. Việc chọn đúng serum trị mụn sẽ giúp bạn kiểm soát và điều trị mụn hiệu quả.

**1. Hiểu về các loại mụn**

- **Mụn đầu đen**: Do bã nhờn và tế bào chết tích tụ
- **Mụn đầu trắng**: Mụn kín, không có lỗ mở
- **Mụn viêm**: Mụn đỏ, sưng, có thể đau
- **Mụn nang**: Mụn sâu, lớn, có thể để lại sẹo

**2. Thành phần quan trọng trong serum trị mụn**

- **Salicylic Acid**: Làm sạch lỗ chân lông, giảm viêm
- **Niacinamide**: Kiểm soát dầu, làm dịu da
- **Retinol**: Tăng tốc độ tái tạo tế bào, giảm mụn
- **Tea Tree Oil**: Kháng khuẩn tự nhiên

**3. Cách sử dụng serum trị mụn**

1. Làm sạch da mặt
2. Thoa toner để cân bằng da
3. Thoa serum trị mụn lên vùng da mụn
4. Đợi 5-10 phút để serum thấm
5. Thoa kem dưỡng ẩm
6. Chống nắng vào ban ngày

**4. Lưu ý khi sử dụng**

- Bắt đầu với nồng độ thấp
- Sử dụng vào buổi tối
- Luôn chống nắng vào ban ngày
- Kiên nhẫn, kết quả cần thời gian
- Nếu kích ứng, ngừng sử dụng ngay

Serum trị mụn của coco với công thức dịu nhẹ, hiệu quả sẽ giúp bạn có làn da sạch mụn, mịn màng.`,
    image: acneSerumImg,
    category: 'Điều trị mụn',
    date: '2025-01-10',
    views: 1520,
    featured: false,
  },
  {
    id: 4,
    title: 'Toner là gì? Vai trò quan trọng trong quy trình skincare',
    excerpt: 'Toner thường bị bỏ qua trong quy trình chăm sóc da, nhưng thực tế đây là bước quan trọng giúp cân bằng da và tăng hiệu quả của các sản phẩm tiếp theo.',
    content: `Nhiều người nghĩ rằng toner là bước không cần thiết trong quy trình skincare. Tuy nhiên, toner đóng vai trò quan trọng trong việc chăm sóc da.

**1. Toner là gì?**

Toner là sản phẩm dạng lỏng, được sử dụng sau bước làm sạch và trước các bước điều trị. Toner giúp:
- Cân bằng độ pH của da
- Làm sạch sâu các bụi bẩn còn sót lại
- Chuẩn bị da cho các bước tiếp theo
- Cung cấp độ ẩm nhẹ

**2. Các loại toner phổ biến**

- **Toner cân bằng**: Phù hợp cho mọi loại da
- **Toner dưỡng ẩm**: Cho da khô
- **Toner kiểm soát dầu**: Cho da dầu
- **Toner làm sáng**: Cho da có vấn đề về sắc tố

**3. Cách sử dụng toner đúng cách**

1. Sau khi rửa mặt, dùng khăn mềm thấm khô
2. Đổ toner ra bông tẩy trang hoặc lòng bàn tay
3. Thoa đều lên mặt, tránh vùng mắt
4. Vỗ nhẹ để toner thấm vào da
5. Đợi 1-2 phút trước khi thoa serum

**4. Lưu ý quan trọng**

- Chọn toner phù hợp với loại da
- Không chà xát mạnh
- Sử dụng 2 lần/ngày (sáng và tối)
- Kết hợp với các sản phẩm khác trong routine

Toner Sen Hậu Giang của coco với chiết xuất tự nhiên, dịu nhẹ sẽ là bước hoàn hảo trong quy trình chăm sóc da của bạn.`,
    image: tonerImg,
    category: 'Kiến thức',
    date: '2025-01-08',
    views: 890,
    featured: false,
  },
  {
    id: 5,
    title: 'Chống nắng mỗi ngày: Bảo vệ da khỏi tia UV',
    excerpt: 'Chống nắng không chỉ dành cho những ngày nắng. Tia UV có thể xuyên qua mây và cửa kính, gây hại cho da mỗi ngày. Tìm hiểu cách bảo vệ da đúng cách.',
    content: `Nhiều người chỉ chống nắng khi đi biển hoặc ra ngoài trời nắng. Tuy nhiên, tia UV có thể gây hại cho da mỗi ngày, kể cả khi trời nhiều mây.

**1. Tại sao cần chống nắng mỗi ngày?**

- **Tia UVA**: Xuyên qua mây và cửa kính, gây lão hóa da
- **Tia UVB**: Gây cháy nắng và tăng nguy cơ ung thư da
- **Ánh sáng xanh**: Từ màn hình điện tử, gây hại cho da

**2. Các loại kem chống nắng**

- **Kem chống nắng vật lý**: Phản xạ tia UV, phù hợp da nhạy cảm
- **Kem chống nắng hóa học**: Hấp thụ tia UV, mỏng nhẹ hơn
- **Kem chống nắng lai**: Kết hợp cả hai loại

**3. Chỉ số SPF và PA**

- **SPF**: Bảo vệ khỏi tia UVB (SPF 30-50 là đủ)
- **PA**: Bảo vệ khỏi tia UVA (PA+++ hoặc PA++++)

**4. Cách sử dụng kem chống nắng đúng cách**

1. Thoa 15-30 phút trước khi ra ngoài
2. Thoa đủ lượng: khoảng 1/4 thìa cà phê cho mặt
3. Thoa lại sau 2-3 giờ hoặc sau khi đổ mồ hôi
4. Thoa cả vùng cổ và tai
5. Kết hợp với mũ, kính râm, quần áo chống nắng

**5. Lưu ý quan trọng**

- Chống nắng cả khi ở trong nhà
- Chống nắng cả khi trời nhiều mây
- Chọn sản phẩm phù hợp với loại da
- Không quên chống nắng cho môi

Sữa chống nắng bí đao của coco với SPF 50+ và PA++++ sẽ bảo vệ da bạn toàn diện khỏi tia UV mỗi ngày.`,
    image: suncreamImg,
    category: 'Bảo vệ da',
    date: '2025-01-05',
    views: 2100,
    featured: false,
  },
  {
    id: 6,
    title: 'Mặt nạ giấy: Công cụ dưỡng ẩm nhanh chóng và hiệu quả',
    excerpt: 'Mặt nạ giấy là giải pháp dưỡng ẩm nhanh chóng, mang lại làn da căng mịn chỉ sau 15 phút. Tìm hiểu cách sử dụng mặt nạ giấy đúng cách để đạt hiệu quả tối đa.',
    content: `Mặt nạ giấy đã trở thành một phần không thể thiếu trong quy trình chăm sóc da của nhiều người. Với khả năng dưỡng ẩm nhanh chóng và tiện lợi, mặt nạ giấy là lựa chọn hoàn hảo cho những người bận rộn.

**1. Lợi ích của mặt nạ giấy**

- **Dưỡng ẩm sâu**: Cung cấp độ ẩm tức thì cho da
- **Tiện lợi**: Dễ sử dụng, không cần rửa
- **Hiệu quả nhanh**: Kết quả thấy rõ sau 15 phút
- **Đa dạng**: Nhiều loại cho các nhu cầu khác nhau

**2. Các loại mặt nạ giấy**

- **Mặt nạ dưỡng ẩm**: Cho da khô, thiếu nước
- **Mặt nạ làm sáng**: Cho da xỉn màu, có đốm nâu
- **Mặt nạ chống lão hóa**: Cho da có dấu hiệu lão hóa
- **Mặt nạ kiểm soát dầu**: Cho da dầu, dễ nổi mụn

**3. Cách sử dụng mặt nạ giấy đúng cách**

1. Làm sạch da mặt
2. Thoa toner để cân bằng da
3. Mở gói mặt nạ, đặt lên mặt
4. Điều chỉnh cho vừa vặn
5. Để 15-20 phút
6. Tháo mặt nạ, vỗ nhẹ để tinh chất thấm vào da
7. Không cần rửa lại, thoa kem dưỡng ẩm

**4. Tần suất sử dụng**

- **Da khô**: 2-3 lần/tuần
- **Da dầu**: 1-2 lần/tuần
- **Da hỗn hợp**: 2 lần/tuần
- **Da nhạy cảm**: 1 lần/tuần

**5. Lưu ý quan trọng**

- Không để mặt nạ quá 30 phút
- Vứt bỏ mặt nạ sau một lần sử dụng
- Bảo quản nơi khô ráo, tránh ánh nắng
- Chọn mặt nạ phù hợp với loại da

Mặt nạ giấy dưỡng ẩm của coco với chiết xuất tự nhiên sẽ mang lại làn da căng mịn, rạng rỡ cho bạn.`,
    image: payperMaskSuperImg,
    category: 'Chăm sóc da',
    date: '2025-01-03',
    views: 750,
    featured: false,
  },
  {
    id: 7,
    title: 'Serum làm sáng da: Giải pháp cho làn da không đều màu',
    excerpt: 'Da không đều màu, có đốm nâu là vấn đề phổ biến. Serum làm sáng da với các thành phần như Niacinamide và Vitamin C sẽ giúp bạn có làn da đều màu, rạng rỡ.',
    content: `Da không đều màu, có đốm nâu và thâm là vấn đề khiến nhiều người lo lắng. Serum làm sáng da là giải pháp hiệu quả để giải quyết vấn đề này.

**1. Nguyên nhân da không đều màu**

- **Ánh nắng mặt trời**: Tia UV kích thích sản xuất melanin
- **Thay đổi nội tiết**: Mang thai, dùng thuốc tránh thai
- **Mụn**: Để lại vết thâm sau khi lành
- **Lão hóa**: Da sản xuất melanin không đều

**2. Thành phần làm sáng da hiệu quả**

- **Niacinamide**: Ức chế sản xuất melanin, làm sáng da
- **Vitamin C**: Chống oxy hóa, làm sáng và đều màu da
- **Arbutin**: Làm sáng tự nhiên, an toàn
- **Kojic Acid**: Ức chế tyrosinase, giảm sắc tố

**3. Cách sử dụng serum làm sáng da**

1. Làm sạch da mặt
2. Thoa toner
3. Thoa serum làm sáng da (2-3 giọt)
4. Massage nhẹ nhàng
5. Đợi 5-10 phút
6. Thoa kem dưỡng ẩm
7. **Quan trọng**: Luôn chống nắng vào ban ngày

**4. Thời gian thấy kết quả**

- **2-4 tuần**: Da bắt đầu sáng hơn
- **2-3 tháng**: Đốm nâu mờ dần
- **4-6 tháng**: Da đều màu rõ rệt

**5. Lưu ý quan trọng**

- Kiên nhẫn, kết quả cần thời gian
- Luôn chống nắng khi sử dụng serum làm sáng
- Bắt đầu với nồng độ thấp
- Sử dụng vào buổi tối
- Nếu kích ứng, ngừng sử dụng

Serum làm sáng da của coco với Niacinamide 15% sẽ giúp bạn có làn da đều màu, rạng rỡ như mong muốn.`,
    image: skinWhiteningSerumImg,
    category: 'Làm sáng da',
    date: '2025-01-01',
    views: 1680,
    featured: false,
  },
  {
    id: 8,
    title: 'Quy trình chăm sóc da buổi tối: Tái tạo và phục hồi',
    excerpt: 'Buổi tối là thời gian vàng để da tái tạo và phục hồi. Xây dựng quy trình chăm sóc da buổi tối đúng cách sẽ giúp bạn có làn da khỏe mạnh, trẻ trung.',
    content: `Trong khi ban ngày da cần được bảo vệ, ban đêm là thời gian để da tái tạo và phục hồi. Quy trình chăm sóc da buổi tối đúng cách sẽ tối đa hóa khả năng tự phục hồi của da.

**1. Tại sao chăm sóc da buổi tối quan trọng?**

- **Tái tạo tế bào**: Da tái tạo nhanh hơn vào ban đêm
- **Hấp thụ tốt hơn**: Sản phẩm thấm sâu hơn khi ngủ
- **Không có tia UV**: An toàn sử dụng các thành phần nhạy cảm ánh sáng
- **Phục hồi**: Da phục hồi sau một ngày tiếp xúc với môi trường

**2. Quy trình chăm sóc da buổi tối**

**Bước 1: Tẩy trang (nếu có trang điểm)**
Sử dụng nước tẩy trang để loại bỏ lớp trang điểm và bụi bẩn.

**Bước 2: Làm sạch**
Rửa mặt với sữa rửa mặt phù hợp để làm sạch sâu.

**Bước 3: Toner**
Cân bằng độ pH và chuẩn bị da.

**Bước 4: Serum/Tinh chất**
Sử dụng serum phù hợp với nhu cầu: dưỡng ẩm, chống lão hóa, trị mụn...

**Bước 5: Kem dưỡng mắt**
Chăm sóc vùng mắt, nơi dễ xuất hiện nếp nhăn.

**Bước 6: Kem dưỡng ẩm**
Khóa ẩm và bảo vệ da suốt đêm.

**3. Sản phẩm nên dùng vào buổi tối**

- **Retinol**: Tăng tốc độ tái tạo tế bào
- **Peptide**: Kích thích sản xuất collagen
- **AHA/BHA**: Tẩy tế bào chết, làm sáng da
- **Kem dưỡng ẩm đậm đặc**: Phục hồi và dưỡng ẩm sâu

**4. Lưu ý quan trọng**

- Thực hiện ít nhất 1 giờ trước khi ngủ
- Không quên vùng cổ và ngực
- Sử dụng gối satin để giảm ma sát
- Ngủ đủ 7-8 giờ mỗi đêm

**5. Mẹo tăng hiệu quả**

- Massage nhẹ nhàng khi thoa sản phẩm
- Sử dụng máy tạo độ ẩm trong phòng ngủ
- Tránh ánh sáng xanh trước khi ngủ
- Có chế độ ăn uống lành mạnh

Hãy xây dựng quy trình chăm sóc da buổi tối phù hợp với làn da của bạn để có kết quả tốt nhất!`,
    image: cosmeticCollection2Img,
    category: 'Quy trình',
    date: '2024-12-28',
    views: 1340,
    featured: false,
  },
  {
    id: 9,
    title: 'Kem dưỡng ẩm: Lựa chọn phù hợp cho từng loại da',
    excerpt: 'Kem dưỡng ẩm là bước không thể thiếu trong quy trình skincare. Tìm hiểu cách chọn kem dưỡng ẩm phù hợp với loại da và nhu cầu của bạn.',
    content: `Kem dưỡng ẩm là bước cuối cùng trong quy trình skincare, giúp khóa ẩm và bảo vệ da. Chọn đúng kem dưỡng ẩm sẽ quyết định hiệu quả của toàn bộ quy trình.

**1. Vai trò của kem dưỡng ẩm**

- **Khóa ẩm**: Giữ nước trong da
- **Bảo vệ**: Tạo lớp màng bảo vệ da
- **Phục hồi**: Hỗ trợ da phục hồi sau tổn thương
- **Làm mềm**: Giúp da mềm mại, mịn màng

**2. Chọn kem dưỡng ẩm theo loại da**

**Da dầu:**
- Kết cấu gel hoặc lotion nhẹ
- Không chứa dầu (oil-free)
- Có khả năng kiểm soát dầu
- Non-comedogenic (không gây bít tắc lỗ chân lông)

**Da khô:**
- Kết cấu cream đậm đặc
- Chứa dầu và ceramides
- Có khả năng dưỡng ẩm sâu
- Phục hồi hàng rào bảo vệ da

**Da hỗn hợp:**
- Kết cấu lotion vừa phải
- Cân bằng dưỡng ẩm và kiểm soát dầu
- Phù hợp cho cả vùng dầu và khô

**Da nhạy cảm:**
- Thành phần dịu nhẹ, ít hương liệu
- Không chứa cồn và chất tẩy rửa mạnh
- Có chiết xuất tự nhiên làm dịu da

**3. Thành phần quan trọng**

- **Hyaluronic Acid**: Dưỡng ẩm sâu
- **Ceramides**: Phục hồi hàng rào bảo vệ da
- **Glycerin**: Hút ẩm từ không khí
- **Niacinamide**: Cân bằng dầu và dưỡng ẩm

**4. Cách sử dụng**

1. Thoa sau serum/tinh chất
2. Lấy lượng vừa đủ (khoảng hạt đậu)
3. Thoa đều lên mặt và cổ
4. Massage nhẹ nhàng
5. Đợi 5 phút trước khi trang điểm

**5. Tần suất sử dụng**

- **Sáng**: Sau serum, trước chống nắng
- **Tối**: Sau serum, trước khi ngủ
- **Khi cần**: Bất cứ lúc nào da cảm thấy khô

Kem Dưỡng Ẩm Sen Hậu Giang của coco với chiết xuất tự nhiên sẽ mang lại làn da mềm mại, mịn màng cho bạn.`,
    image: moisturizerImg,
    category: 'Sản phẩm',
    date: '2024-12-25',
    views: 1120,
    featured: false,
  },
  {
    id: 10,
    title: 'Tẩy trang đúng cách: Bước đầu tiên quan trọng trong skincare',
    excerpt: 'Tẩy trang là bước đầu tiên và quan trọng nhất trong quy trình chăm sóc da. Tìm hiểu cách tẩy trang đúng cách để có làn da sạch sẽ, khỏe mạnh.',
    content: `Nhiều người bỏ qua bước tẩy trang, nhưng đây là bước quan trọng nhất trong quy trình skincare. Tẩy trang đúng cách sẽ giúp da sạch sẽ và hấp thụ tốt hơn các sản phẩm tiếp theo.

**1. Tại sao cần tẩy trang?**

- **Loại bỏ trang điểm**: Mỹ phẩm không thể rửa sạch bằng nước
- **Làm sạch bụi bẩn**: Bụi bẩn tích tụ trong ngày
- **Loại bỏ dầu thừa**: Dầu nhờn và bã nhờn
- **Chuẩn bị da**: Sẵn sàng cho các bước tiếp theo

**2. Các loại sản phẩm tẩy trang**

- **Nước tẩy trang**: Dạng lỏng, phù hợp mọi loại da
- **Dầu tẩy trang**: Hiệu quả với trang điểm đậm
- **Sữa tẩy trang**: Dịu nhẹ, cho da nhạy cảm
- **Micellar Water**: Tiện lợi, không cần rửa lại

**3. Cách tẩy trang đúng cách**

1. Làm ướt bông tẩy trang
2. Đổ nước tẩy trang ra bông
3. Thoa nhẹ nhàng lên mặt theo chuyển động tròn
4. Đặc biệt chú ý vùng mắt và môi
5. Lặp lại với bông sạch cho đến khi sạch
6. Rửa mặt với sữa rửa mặt (nếu cần)

**4. Lưu ý quan trọng**

- Tẩy trang cả khi không trang điểm
- Không chà xát mạnh, đặc biệt vùng mắt
- Sử dụng bông tẩy trang sạch
- Tẩy trang cả vùng cổ nếu có trang điểm

**5. Thời điểm tẩy trang**

- **Buổi tối**: Bắt buộc, trước khi đi ngủ
- **Sau khi tập thể dục**: Loại bỏ mồ hôi và bụi bẩn
- **Sau khi bơi**: Loại bỏ clo và hóa chất

Nước Tẩy Trang Sen Hậu Giang của coco với công nghệ NatraGem™ S150 sẽ làm sạch sâu mà không làm khô da.`,
    image: makeupRemoverImg,
    category: 'Quy trình',
    date: '2024-12-22',
    views: 960,
    featured: false,
  },
];

const Blog = () => {
  const [selectedArticle, setSelectedArticle] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 6;

  const featuredArticles = blogArticles.filter(article => article.featured);
  const regularArticles = blogArticles.filter(article => !article.featured);

  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const currentArticles = regularArticles.slice(startIndex, endIndex);
  const totalPages = Math.ceil(regularArticles.length / pageSize);

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('vi-VN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  if (selectedArticle) {
    return (
      <div className="blog-page">
        <div className="container">
          <Button
            type="link"
            onClick={() => setSelectedArticle(null)}
            className="back-button"
          >
            ← Quay lại danh sách
          </Button>
          <article className="blog-article-detail">
            <div className="article-header">
              <Tag className="article-category">{selectedArticle.category}</Tag>
              <Title level={1} className="article-title">{selectedArticle.title}</Title>
              <div className="article-meta">
                <Text type="secondary">
                  <CalendarOutlined /> {formatDate(selectedArticle.date)}
                </Text>
                <Text type="secondary">
                  <EyeOutlined /> {selectedArticle.views} lượt xem
                </Text>
              </div>
            </div>
            <div className="article-image">
              <Image src={selectedArticle.image} alt={selectedArticle.title} />
            </div>
            <div className="article-content">
              {selectedArticle.content.split('\n\n').map((paragraph, index) => {
                if (paragraph.trim().startsWith('**') && paragraph.trim().endsWith('**')) {
                  const title = paragraph.trim().replace(/\*\*/g, '');
                  return <Title key={index} level={3}>{title}</Title>;
                }
                // Handle bold text within paragraphs
                const parts = paragraph.split(/(\*\*.*?\*\*)/g);
                if (parts.length > 1) {
                  return (
                    <Paragraph key={index}>
                      {parts.map((part, i) => {
                        if (part.startsWith('**') && part.endsWith('**')) {
                          return <strong key={i}>{part.replace(/\*\*/g, '')}</strong>;
                        }
                        return <span key={i}>{part}</span>;
                      })}
                    </Paragraph>
                  );
                }
                return <Paragraph key={index}>{paragraph}</Paragraph>;
              })}
            </div>
            <div className="article-footer">
              <Link to="/products">
                <Button type="primary" size="large">
                  Khám phá sản phẩm <ArrowRightOutlined />
                </Button>
              </Link>
            </div>
          </article>
        </div>
      </div>
    );
  }

  return (
    <div className="blog-page">
      {/* Featured Articles */}
      {featuredArticles.length > 0 && (
        <section className="featured-articles">
          <div className="container">
            <div className="section-header">
              <Title level={2} className="section-title">
                Bài viết nổi bật
              </Title>
            </div>
            <Row gutter={[32, 32]}>
              {featuredArticles.map((article) => (
                <Col xs={24} md={12} key={article.id}>
                  <Card
                    className="featured-article-card"
                    hoverable
                    cover={
                      <div className="article-card-image">
                        <Image src={article.image} alt={article.title} preview={false} />
                      </div>
                    }
                    onClick={() => setSelectedArticle(article)}
                  >
                    <div className="article-card-content">
                      <Tag className="article-card-category">{article.category}</Tag>
                      <Title level={3} className="article-card-title">
                        {article.title}
                      </Title>
                      <Paragraph className="article-card-excerpt" ellipsis={{ rows: 3 }}>
                        {article.excerpt}
                      </Paragraph>
                      <div className="article-card-meta">
                        <Text type="secondary">
                          <CalendarOutlined /> {formatDate(article.date)}
                        </Text>
                        <Text type="secondary">
                          <EyeOutlined /> {article.views}
                        </Text>
                      </div>
                      <Button type="link" className="article-card-link">
                        Đọc thêm <ArrowRightOutlined />
                      </Button>
                    </div>
                  </Card>
                </Col>
              ))}
            </Row>
          </div>
        </section>
      )}

      {/* Regular Articles Grid */}
      <section className="articles-grid">
        <div className="container">
          <div className="section-header">
            <Title level={2} className="section-title">
              Tất cả bài viết
            </Title>
          </div>
          {currentArticles.length > 0 ? (
            <>
              <Row gutter={[32, 48]}>
                {currentArticles.map((article) => (
                  <Col xs={24} sm={12} lg={8} key={article.id}>
                    <Card
                      className="article-card"
                      hoverable
                      cover={
                        <div className="article-card-image">
                          <Image src={article.image} alt={article.title} preview={false} />
                        </div>
                      }
                      onClick={() => setSelectedArticle(article)}
                    >
                      <div className="article-card-content">
                        <Tag className="article-card-category">{article.category}</Tag>
                        <Title level={4} className="article-card-title">
                          {article.title}
                        </Title>
                        <Paragraph className="article-card-excerpt" ellipsis={{ rows: 2 }}>
                          {article.excerpt}
                        </Paragraph>
                        <div className="article-card-meta">
                          <Text type="secondary">
                            <CalendarOutlined /> {formatDate(article.date)}
                          </Text>
                          <Text type="secondary">
                            <EyeOutlined /> {article.views}
                          </Text>
                        </div>
                        <Button type="link" className="article-card-link">
                          Đọc thêm <ArrowRightOutlined />
                        </Button>
                      </div>
                    </Card>
                  </Col>
                ))}
              </Row>
              {totalPages > 1 && (
                <div className="pagination-wrapper">
                  <Pagination
                    current={currentPage}
                    total={regularArticles.length}
                    pageSize={pageSize}
                    onChange={setCurrentPage}
                    showSizeChanger={false}
                  />
                </div>
              )}
            </>
          ) : (
            <Empty description="Không có bài viết nào" />
          )}
        </div>
      </section>
    </div>
  );
};

export default Blog;

