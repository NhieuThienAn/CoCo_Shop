# Frontend API Documentation

Tài liệu này mô tả cách sử dụng các API functions trong frontend project.

## Cài đặt

Tất cả API functions đã được tạo sẵn trong thư mục `src/api`. Không cần cài đặt thêm dependencies.

## Cấu hình

### Environment Variables

Tạo file `.env` trong thư mục `FE`:

```env
REACT_APP_API_URL=http://localhost:3000/api
```

Nếu không có, mặc định sẽ sử dụng `http://localhost:3000/api`.

## Cách sử dụng

### Import API functions

```javascript
// Import từng module
import { login, register, logout } from './api/auth';
import { getProducts, getProductById } from './api/product';
import { getCart, addToCart } from './api/cart';

// Hoặc import tất cả
import api from './api';

// Sử dụng
const products = await api.product.getProducts(1, 20);
```

### Ví dụ sử dụng

#### Authentication

```javascript
import { login, register, logout } from './api/auth';

// Login
try {
  const userData = await login('user@example.com', 'password123');
  console.log('User:', userData.user);
  // Token đã được tự động lưu vào localStorage
} catch (error) {
  console.error('Login failed:', error.message);
}

// Register
try {
  const userData = await register({
    email: 'newuser@example.com',
    username: 'newuser',
    password: 'password123',
    first_name: 'First',
    last_name: 'Last',
  });
  console.log('Registered:', userData.user);
} catch (error) {
  console.error('Registration failed:', error.message);
}

// Logout
await logout();
```

#### Products

```javascript
import { getProducts, getProductById, searchProducts } from './api/product';

// Get products list
const { data, pagination } = await getProducts(1, 20, {
  categoryId: 1,
  is_active: 1,
});

// Get product by ID
const product = await getProductById(1);

// Search products
const results = await searchProducts('laptop', 1, 20);
```

#### Cart

```javascript
import { getCart, addToCart, updateCartItem, removeFromCart, clearCart } from './api/cart';

// Get cart
const cart = await getCart();

// Add to cart
await addToCart(1, 2); // productId, quantity

// Update quantity
await updateCartItem(1, 5); // productId, newQuantity

// Remove item
await removeFromCart(1); // productId

// Clear cart
await clearCart();
```

#### Orders

```javascript
import { createOrder, createOrderFromCart, getMyOrders } from './api/order';

// Create order
const order = await createOrder({
  items: [
    {
      productId: 1,
      quantity: 2,
      unitPrice: 100000,
    },
  ],
  shippingAddressId: 1,
  paymentMethodId: 1,
  couponCode: 'DISCOUNT10',
});

// Create order from cart
const orderFromCart = await createOrderFromCart({
  shippingAddressId: 1,
  paymentMethodId: 1,
});

// Get my orders
const { data, pagination } = await getMyOrders(1, 10);
```

#### Payments

```javascript
import { createMoMoPayment, getMyPayments } from './api/payment';

// Create MoMo payment
const payment = await createMoMoPayment({
  orderId: 1,
  amount: 100000,
  returnUrl: 'https://your-frontend.com/payment/success',
  notifyUrl: 'https://your-backend.com/api/payments/momo/ipn',
});

// Redirect to payment URL
window.location.href = payment.data.payUrl;
```

#### Addresses

```javascript
import {
  getMyAddresses,
  createAddress,
  updateAddress,
  deleteAddress,
  setDefaultAddress,
} from './api/address';

// Get addresses
const addresses = await getMyAddresses();

// Create address
const newAddress = await createAddress({
  full_name: 'Nguyễn Văn A',
  phone: '0123456789',
  address_line1: '123 Đường ABC',
  city: 'Hà Nội',
  district: 'Quận 1',
  ward: 'Phường 1',
  province: 'Hà Nội',
  postal_code: '100000',
  country: 'Vietnam',
  is_default_shipping: true,
});

// Set default address
await setDefaultAddress(1); // addressId
```

#### Wishlist

```javascript
import { getWishlist, addToWishlist, removeFromWishlist, checkWishlist } from './api/wishlist';

// Get wishlist
const wishlist = await getWishlist();

// Add to wishlist
await addToWishlist(1); // productId

// Check if in wishlist
const isInWishlist = await checkWishlist(1); // productId

// Remove from wishlist
await removeFromWishlist(1); // productId
```

#### Reviews

```javascript
import {
  getReviewsByProduct,
  createReview,
  updateReview,
  deleteReview,
} from './api/review';

// Get reviews
const { data } = await getReviewsByProduct(1, 1, 10);

// Create review
await createReview({
  productId: 1,
  orderId: 1,
  rating: 5,
  comment: 'Sản phẩm rất tốt!',
  images: ['url1', 'url2'],
});
```

#### Coupons

```javascript
import { validateCoupon, getActiveCoupons } from './api/coupon';

// Validate coupon
const validation = await validateCoupon('DISCOUNT10', 100000);

if (validation.success) {
  console.log('Discount:', validation.data.discountAmount);
}

// Get active coupons
const coupons = await getActiveCoupons();
```

## React Hooks Example

```javascript
import { useState, useEffect } from 'react';
import { getProducts } from './api/product';

function useProducts(page = 1, limit = 10) {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [pagination, setPagination] = useState(null);

  useEffect(() => {
    async function fetchProducts() {
      try {
        setLoading(true);
        const response = await getProducts(page, limit);
        setProducts(response.data);
        setPagination(response.pagination);
        setError(null);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    fetchProducts();
  }, [page, limit]);

  return { products, loading, error, pagination };
}

// Usage
function ProductList() {
  const { products, loading, error, pagination } = useProducts(1, 20);

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <div>
      {products.map((product) => (
        <div key={product.id}>{product.name}</div>
      ))}
    </div>
  );
}
```

## Error Handling

Tất cả API functions sẽ throw error nếu request fails:

```javascript
import { getProducts } from './api/product';

try {
  const response = await getProducts(1, 20);
  console.log('Success:', response.data);
} catch (error) {
  console.error('Error:', error.message);
  // Handle error (show toast, redirect, etc.)
}
```

## Token Management

Token được tự động quản lý:
- Tự động thêm vào headers khi có token
- Tự động refresh khi token hết hạn
- Tự động clear và redirect khi refresh failed

## API Structure

```
src/api/
├── config.js          # Base configuration và helper functions
├── auth.js            # Authentication APIs
├── user.js            # User APIs
├── product.js         # Product APIs
├── category.js        # Category APIs
├── cart.js            # Cart APIs
├── order.js           # Order APIs
├── payment.js         # Payment APIs
├── address.js         # Address APIs
├── wishlist.js       # Wishlist APIs
├── review.js          # Review APIs
├── coupon.js          # Coupon APIs
├── support.js         # Support APIs (roles, brands, etc.)
├── index.js           # Export tất cả
└── README.md          # Documentation
```

## Notes

- Tất cả API functions đều return Promise
- Token được tự động quản lý qua localStorage
- Auto token refresh khi token hết hạn
- Error handling được xử lý tự động
- Pagination được hỗ trợ cho các list endpoints

