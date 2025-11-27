# CoCo Store - Frontend

Frontend application cho hệ thống bán hàng mỹ phẩm trực tuyến CoCo Store.

## Công Nghệ Sử Dụng

- **React 18.3.1** - UI Framework
- **React Router DOM 7.1.1** - Routing
- **Ant Design 5.23.0** - UI Component Library
- **Axios** - HTTP Client
- **SCSS** - Styling

## Cài Đặt

### 1. Cài đặt dependencies

```bash
npm install
```

### 2. Cấu hình môi trường

Tạo file `.env` từ `.env.example`:

```bash
cp .env.example .env
```

Hoặc tạo file `.env` với nội dung:

```
REACT_APP_API_URL=http://localhost:3000/api
REACT_APP_ENV=development
```

### 3. Chạy ứng dụng

```bash
npm start
```

Ứng dụng sẽ chạy tại `http://localhost:3001` (hoặc port khác nếu 3001 đã được sử dụng).

## Cấu Trúc Thư Mục

```
src/
├── api/              # API client modules
├── components/       # Reusable components
├── contexts/        # React contexts (AuthContext)
├── layouts/         # Layout components (Admin, Customer, Shipper)
├── pages/           # Page components
│   ├── admin/      # Admin pages
│   ├── customer/   # Customer pages
│   └── shipper/    # Shipper pages
├── routes/          # Route configuration
├── styles/          # Global styles
├── App.js          # Main App component
└── index.js        # Entry point
```

## Tính Năng

### Customer Interface
- Trang chủ với sản phẩm nổi bật
- Danh sách sản phẩm và tìm kiếm
- Chi tiết sản phẩm
- Giỏ hàng
- Thanh toán
- Quản lý đơn hàng
- Quản lý tài khoản
- Danh sách yêu thích

### Admin Interface
- Dashboard với thống kê
- Quản lý sản phẩm
- Quản lý đơn hàng
- Quản lý người dùng
- Quản lý danh mục
- Quản lý thanh toán
- Quản lý mã giảm giá
- Quản lý đánh giá
- Quản lý vận chuyển
- Quản lý đơn vị vận chuyển
- Quản lý nhà cung cấp
- Quản lý đơn mua hàng
- Quản lý yêu cầu đổi trả
- Quản lý tồn kho

### Shipper Interface
- Dashboard
- Quản lý đơn hàng cần giao
- Thông tin cá nhân

## API Configuration

API base URL được cấu hình trong `src/api/config.js` và có thể thay đổi qua biến môi trường `REACT_APP_API_URL`.

Mặc định: `http://localhost:3000/api`

## Authentication

Hệ thống sử dụng JWT tokens:
- Access token được lưu trong `localStorage` với key `token`
- Refresh token được lưu trong `localStorage` với key `refreshToken`
- Token tự động được thêm vào headers của mọi API request
- Token tự động được refresh khi hết hạn

## Build Production

```bash
npm run build
```

Build files sẽ được tạo trong thư mục `build/`.

## Lưu Ý

- Đảm bảo backend server đang chạy tại `http://localhost:3000` (hoặc URL đã cấu hình)
- CORS phải được cấu hình đúng trên backend để cho phép frontend kết nối

## Troubleshooting

### Lỗi kết nối API
- Kiểm tra backend server đã chạy chưa
- Kiểm tra `REACT_APP_API_URL` trong `.env`
- Kiểm tra CORS configuration trên backend

### Lỗi import
- Chạy `npm install` lại
- Xóa `node_modules` và `package-lock.json`, sau đó chạy `npm install` lại

### Port đã được sử dụng
- Thay đổi port bằng cách set `PORT=3002` trong `.env` hoặc kill process đang sử dụng port

