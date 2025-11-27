# API Summary - Frontend

## 📋 Tổng Quan

Tất cả API functions đã được tạo dựa trên router endpoints của backend.

## 📁 Cấu Trúc Files

```
src/api/
├── config.js          ✅ Base configuration & helpers
├── auth.js            ✅ Authentication APIs (4 functions)
├── user.js            ✅ User APIs (10 functions)
├── product.js         ✅ Product APIs (20 functions)
├── category.js        ✅ Category APIs (8 functions)
├── cart.js            ✅ Cart APIs (5 functions)
├── order.js           ✅ Order APIs (15 functions)
├── payment.js         ✅ Payment APIs (11 functions)
├── address.js         ✅ Address APIs (6 functions)
├── wishlist.js        ✅ Wishlist APIs (4 functions)
├── review.js          ✅ Review APIs (7 functions)
├── coupon.js          ✅ Coupon APIs (3 functions)
├── support.js         ✅ Support APIs (13 functions)
├── index.js           ✅ Main export file
├── api.js             ✅ Alternative export (namespace)
├── types.js           ✅ TypeScript types (JSDoc)
└── README.md          ✅ Documentation
```

## ✅ API Functions Coverage

### Authentication (`/api/auth`)
- ✅ `login(email, password)`
- ✅ `register(userData)`
- ✅ `refreshToken(refreshToken)`
- ✅ `logout()`

### Users (`/api/users`)
- ✅ `getCurrentUser()`
- ✅ `updateCurrentUser(userData)`
- ✅ `updateProfile(profileData)`
- ✅ `checkEmail(email)`
- ✅ `checkUsername(username)`
- ✅ `getUserById(id)`
- ✅ `getAllUsers(page, limit, filters)` - Admin
- ✅ `updateUser(id, userData)` - Admin
- ✅ `deleteUser(id)` - Admin
- ✅ `getUsersByRole(roleId)` - Admin

### Products (`/api/products`)
- ✅ `getProducts(page, limit, filters)`
- ✅ `getProductById(id)`
- ✅ `getProductBySlug(slug)`
- ✅ `getProductBySku(sku)`
- ✅ `getProductsByCategory(categoryId, page, limit)`
- ✅ `getActiveProducts(page, limit)`
- ✅ `searchProducts(keyword, page, limit, filters)`
- ✅ `getPrimaryImage(id)`
- ✅ `createProduct(productData)` - Admin
- ✅ `updateProduct(id, productData)` - Admin
- ✅ `deleteProduct(id)` - Admin
- ✅ `getDeletedProducts(page, limit)` - Admin
- ✅ `restoreProduct(id)` - Admin
- ✅ `updateStock(id, stockData)` - Admin
- ✅ `addImage(id, imageData)` - Admin
- ✅ `removeImage(id, imageUrl)` - Admin
- ✅ `setPrimaryImage(id, imageData)` - Admin
- ✅ `updateImages(id, imagesData)` - Admin

### Categories (`/api/categories`)
- ✅ `getCategories(page, limit)`
- ✅ `getCategoryById(id)`
- ✅ `getCategoryBySlug(slug)`
- ✅ `getCategoriesByParent(parentId)`
- ✅ `getCategoryTree()`
- ✅ `createCategory(categoryData)` - Admin
- ✅ `updateCategory(id, categoryData)` - Admin
- ✅ `deleteCategory(id)` - Admin

### Cart (`/api/cart`)
- ✅ `getCart()`
- ✅ `getCartTotal()`
- ✅ `addToCart(productId, quantity)`
- ✅ `updateCartItem(productId, quantity)`
- ✅ `removeFromCart(productId)`
- ✅ `clearCart()`

### Orders (`/api/orders`)
- ✅ `getMyOrders(page, limit, filters)`
- ✅ `getMyOrderById(id)`
- ✅ `createOrder(orderData)`
- ✅ `createOrderFromCart(orderData)`
- ✅ `cancelMyOrder(id)`
- ✅ `returnMyOrder(id, returnData)`
- ✅ `getOrderStatuses()`
- ✅ `getOrderByNumber(orderNumber)`
- ✅ `getAllOrders(page, limit, filters)` - Admin
- ✅ `getOrderById(id)` - Admin
- ✅ `updateOrderStatus(id, statusData)` - Admin
- ✅ `confirmOrder(id)` - Admin
- ✅ `startShipping(id)` - Admin
- ✅ `markAsDelivered(id)` - Admin
- ✅ `cancelOrder(id)` - Admin
- ✅ `returnOrder(id, returnData)` - Admin

### Payments (`/api/payments`)
- ✅ `getMyPayments(page, limit)`
- ✅ `getPaymentByOrder(orderId)`
- ✅ `createMoMoPayment(paymentData)`
- ✅ `queryMoMoStatus(orderId)`
- ✅ `getAllPayments(page, limit, filters)` - Admin
- ✅ `getPaymentById(id)` - Admin
- ✅ `capturePayment(id)` - Admin
- ✅ `refundPayment(id, refundData)` - Admin
- ✅ `getPaymentsByOrder(orderId)` - Admin
- ✅ `getPaymentsByGateway(gateway, page, limit)` - Admin
- ✅ `getPaymentsByStatus(statusId, page, limit)` - Admin

### Addresses (`/api/addresses`)
- ✅ `getMyAddresses()`
- ✅ `getDefaultAddress()`
- ✅ `createAddress(addressData)`
- ✅ `updateAddress(id, addressData)`
- ✅ `deleteAddress(id)`
- ✅ `setDefaultAddress(id)`

### Wishlist (`/api/wishlist`)
- ✅ `getWishlist()`
- ✅ `addToWishlist(productId)`
- ✅ `removeFromWishlist(productId)`
- ✅ `checkWishlist(productId)`

### Reviews (`/api/reviews`)
- ✅ `getReviewsByProduct(productId, page, limit)`
- ✅ `getProductRating(productId)`
- ✅ `getMyReviews()`
- ✅ `createReview(reviewData)`
- ✅ `updateReview(id, reviewData)`
- ✅ `deleteReview(id)`
- ✅ `createOrUpdateReview(reviewData)`

### Coupons (`/api/coupons`)
- ✅ `getActiveCoupons()`
- ✅ `getCouponByCode(code)`
- ✅ `validateCoupon(code, cartValue)`

### Support (`/api/support`)
- ✅ `getRoles()`
- ✅ `getRoleById(id)`
- ✅ `getBrands()`
- ✅ `getBrandById(id)`
- ✅ `getOrderStatuses()`
- ✅ `getOrderStatusById(id)`
- ✅ `getOrderStatusByName(name)`
- ✅ `getOrderedOrderStatuses()`
- ✅ `getPaymentMethods()`
- ✅ `getPaymentMethodById(id)`
- ✅ `getPaymentMethodByName(name)`
- ✅ `getPaymentStatuses()`
- ✅ `getPaymentStatusById(id)`
- ✅ `getPaymentStatusByName(name)`

## 📊 Thống Kê

- **Tổng số API modules**: 13
- **Tổng số API functions**: ~110+
- **Public endpoints**: ~40
- **Protected endpoints**: ~50
- **Admin endpoints**: ~20

## 🎯 Usage Examples

### Cách 1: Import từng module
```javascript
import { login, register } from './api/auth';
import { getProducts, getProductById } from './api/product';
import { getCart, addToCart } from './api/cart';

// Sử dụng
const user = await login('user@example.com', 'password');
const products = await getProducts(1, 20);
await addToCart(1, 2);
```

### Cách 2: Import tất cả (Recommended)
```javascript
import api from './api';

// Sử dụng
const user = await api.auth.login('user@example.com', 'password');
const products = await api.product.getProducts(1, 20);
await api.cart.addToCart(1, 2);
const orders = await api.order.getMyOrders(1, 10);
```

### Cách 3: Import từ index
```javascript
import { auth, product, cart } from './api';

// Sử dụng
const user = await auth.login('user@example.com', 'password');
const products = await product.getProducts(1, 20);
await cart.addToCart(1, 2);
```

## 🔧 Features

- ✅ Auto token refresh
- ✅ Error handling
- ✅ Token management
- ✅ Modular structure
- ✅ TypeScript ready (JSDoc types)
- ✅ Production ready

## 📝 Notes

- Tất cả functions đều return Promise
- Token được tự động quản lý qua localStorage
- Auto token refresh khi token hết hạn
- Error handling được xử lý tự động
- Pagination được hỗ trợ cho các list endpoints

