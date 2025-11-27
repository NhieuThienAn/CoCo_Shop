# API Check Report

## ✅ Đã Kiểm Tra và So Sánh

### 1. AUTH ROUTES (`/api/auth`)
- ✅ POST /auth/login
- ✅ POST /auth/register
- ✅ POST /auth/refresh-token
- ✅ POST /auth/logout
- ❌ POST /auth/token/check (Token Blacklist - Admin)
- ❌ POST /auth/token/blacklist (Token Blacklist - Admin)
- ❌ POST /auth/token/cleanup (Token Blacklist - Admin)
- ❌ GET /auth/tokens (Token Blacklist - Admin)
- ❌ GET /auth/tokens/:id (Token Blacklist - Admin)
- ❌ DELETE /auth/tokens/:id (Token Blacklist - Admin)

### 2. USER ROUTES (`/api/users`)
- ✅ GET /users/email/:email
- ✅ GET /users/username/:username
- ✅ GET /users/me
- ✅ PUT /users/me
- ✅ PUT /users/me/profile
- ✅ GET /users (admin)
- ✅ GET /users/:id
- ✅ PUT /users/:id (admin)
- ✅ DELETE /users/:id (admin)
- ✅ GET /users/role/:roleId (admin)
- ❌ PUT /users/:id/profile (admin - update user profile by ID)
- ❌ PUT /users/:id/last-login (admin)
- ❌ PUT /users/:id/increment-attempts (admin)
- ❌ PUT /users/:id/reset-attempts (admin)

### 3. ORDER ROUTES (`/api/orders`)
- ✅ GET /orders/me
- ✅ GET /orders/me/:id
- ✅ POST /orders/me/create
- ✅ POST /orders/me/cart/create
- ✅ PUT /orders/me/:id/cancel
- ✅ PUT /orders/me/:id/return
- ✅ GET /orders (admin)
- ✅ GET /orders/:id
- ✅ POST /orders (admin)
- ✅ PUT /orders/:id (admin)
- ✅ DELETE /orders/:id (admin)
- ✅ GET /orders/number/:orderNumber
- ✅ GET /orders/statuses/list
- ✅ PUT /orders/:id/status (admin)
- ✅ PUT /orders/:id/confirm (admin)
- ✅ PUT /orders/:id/shipping (admin)
- ✅ PUT /orders/:id/delivered (admin)
- ✅ PUT /orders/:id/cancel (admin)
- ✅ PUT /orders/:id/return (admin)
- ❌ GET /orders/user/:userId (admin)
- ❌ GET /orders/status/:statusId (admin)

### 4. PAYMENT ROUTES (`/api/payments`)
- ✅ GET /payments/me
- ✅ GET /payments/me/order/:orderId
- ✅ POST /payments/momo/create
- ✅ POST /payments/momo/query
- ✅ GET /payments (admin)
- ✅ GET /payments/:id (admin)
- ✅ POST /payments (admin)
- ✅ PUT /payments/:id (admin)
- ✅ DELETE /payments/:id (admin)
- ✅ GET /payments/order/:orderId (admin)
- ✅ GET /payments/gateway/:gateway (admin)
- ✅ GET /payments/status/:statusId (admin)
- ✅ POST /payments/:id/capture (admin)
- ✅ POST /payments/:id/refund (admin)
- ❌ POST /payments/momo/ipn (Webhook - không cần frontend)

### 5. CART ROUTES (`/api/cart`)
- ✅ GET /cart/me
- ✅ GET /cart/me/total
- ✅ POST /cart/me/add
- ✅ PUT /cart/me/product/:productId
- ✅ DELETE /cart/me/product/:productId
- ✅ DELETE /cart/me/clear
- ❌ GET /cart/user/:userId (admin)
- ❌ GET /cart/user/:userId/total (admin)
- ❌ GET /cart (admin)
- ❌ GET /cart/:id (admin)
- ❌ POST /cart (admin)
- ❌ PUT /cart/:id (admin)
- ❌ DELETE /cart/:id (admin)

### 6. ADDRESS ROUTES (`/api/addresses`)
- ✅ GET /addresses/me
- ✅ GET /addresses/me/default
- ✅ POST /addresses/me
- ✅ PUT /addresses/me/:id
- ✅ DELETE /addresses/me/:id
- ✅ PUT /addresses/me/:id/default
- ❌ GET /addresses (admin)
- ❌ GET /addresses/:id (admin)
- ❌ POST /addresses (admin)
- ❌ PUT /addresses/:id (admin)
- ❌ DELETE /addresses/:id (admin)
- ❌ GET /addresses/user/:userId (admin)
- ❌ GET /addresses/user/:userId/default (admin)
- ❌ PUT /addresses/default/set (admin)

### 7. WISHLIST ROUTES (`/api/wishlist`)
- ✅ GET /wishlist/me
- ✅ POST /wishlist/me/add
- ✅ DELETE /wishlist/me/product/:productId
- ✅ GET /wishlist/me/product/:productId/check
- ❌ GET /wishlist (admin)
- ❌ GET /wishlist/:id (admin)
- ❌ POST /wishlist (admin)
- ❌ PUT /wishlist/:id (admin)
- ❌ DELETE /wishlist/:id (admin)
- ❌ GET /wishlist/user/:userId (admin)
- ❌ POST /wishlist/add (admin)
- ❌ DELETE /wishlist/user/:userId/product/:productId (admin)
- ❌ GET /wishlist/user/:userId/product/:productId/check (admin)

### 8. REVIEW ROUTES (`/api/reviews`)
- ✅ GET /reviews/product/:productId
- ✅ GET /reviews/product/:productId/rating
- ✅ GET /reviews/me
- ✅ POST /reviews/me
- ✅ PUT /reviews/me/:id
- ✅ DELETE /reviews/me/:id
- ✅ POST /reviews/me/create-or-update
- ❌ GET /reviews (admin)
- ❌ GET /reviews/:id
- ❌ POST /reviews (admin)
- ❌ PUT /reviews/:id (admin)
- ❌ DELETE /reviews/:id (admin)
- ❌ GET /reviews/user/:userId (admin)
- ❌ POST /reviews/create-or-update (admin)

### 9. COUPON ROUTES (`/api/coupons`)
- ✅ GET /coupons/active/list
- ✅ GET /coupons/code/:code
- ✅ POST /coupons/validate
- ❌ GET /coupons (admin)
- ❌ GET /coupons/:id (admin)
- ❌ POST /coupons (admin)
- ❌ PUT /coupons/:id (admin)
- ❌ DELETE /coupons/:id (admin)

### 10. SUPPORT ROUTES (`/api/support`)
- ✅ GET /support/roles
- ✅ GET /support/roles/:id
- ✅ GET /support/brands
- ✅ GET /support/brands/:id
- ✅ GET /support/order-statuses
- ✅ GET /support/order-statuses/:id
- ✅ GET /support/order-statuses/name/:name
- ✅ GET /support/order-statuses/ordered/list
- ✅ GET /support/payment-methods
- ✅ GET /support/payment-methods/:id
- ✅ GET /support/payment-methods/name/:name
- ✅ GET /support/payment-statuses
- ✅ GET /support/payment-statuses/:id
- ✅ GET /support/payment-statuses/name/:name
- ❌ POST /support/roles (admin)
- ❌ PUT /support/roles/:id (admin)
- ❌ DELETE /support/roles/:id (admin)
- ❌ POST /support/brands (admin)
- ❌ PUT /support/brands/:id (admin)
- ❌ DELETE /support/brands/:id (admin)
- ❌ GET /support/suppliers (admin)
- ❌ GET /support/suppliers/:id (admin)
- ❌ POST /support/suppliers (admin)
- ❌ PUT /support/suppliers/:id (admin)
- ❌ DELETE /support/suppliers/:id (admin)
- ❌ GET /support/suppliers/search/name (admin)
- ❌ GET /support/order-items (admin)
- ❌ GET /support/order-items/:id (admin)
- ❌ GET /support/order-items/order/:orderId (admin)
- ❌ POST /support/order-items (admin)
- ❌ PUT /support/order-items/:id (admin)
- ❌ DELETE /support/order-items/:id (admin)
- ❌ POST /support/order-statuses (admin)
- ❌ PUT /support/order-statuses/:id (admin)
- ❌ DELETE /support/order-statuses/:id (admin)
- ❌ POST /support/payment-methods (admin)
- ❌ PUT /support/payment-methods/:id (admin)
- ❌ DELETE /support/payment-methods/:id (admin)
- ❌ POST /support/payment-statuses (admin)
- ❌ PUT /support/payment-statuses/:id (admin)
- ❌ DELETE /support/payment-statuses/:id (admin)
- ❌ GET /support/shipments (admin)
- ❌ GET /support/shipments/:id (admin)
- ❌ GET /support/shipments/order/:orderId (admin)
- ❌ POST /support/shipments (admin)
- ❌ PUT /support/shipments/:id (admin)
- ❌ DELETE /support/shipments/:id (admin)
- ❌ GET /support/shippers (admin)
- ❌ GET /support/shippers/:id (admin)
- ❌ GET /support/shippers/search/name (admin)
- ❌ POST /support/shippers (admin)
- ❌ PUT /support/shippers/:id (admin)
- ❌ DELETE /support/shippers/:id (admin)
- ❌ GET /support/purchase-orders (admin)
- ❌ GET /support/purchase-orders/:id (admin)
- ❌ GET /support/purchase-orders/po/:poNumber (admin)
- ❌ GET /support/purchase-orders/supplier/:supplierId (admin)
- ❌ GET /support/purchase-orders/approval/:status (admin)
- ❌ POST /support/purchase-orders (admin)
- ❌ PUT /support/purchase-orders/:id (admin)
- ❌ DELETE /support/purchase-orders/:id (admin)
- ❌ PUT /support/purchase-orders/:id/approve (admin)
- ❌ PUT /support/purchase-orders/:id/reject (admin)
- ❌ GET /support/return-requests (admin)
- ❌ GET /support/return-requests/:id (admin)
- ❌ GET /support/return-requests/order/:orderId (admin)
- ❌ GET /support/return-requests/user/:userId (admin)
- ❌ GET /support/return-requests/status/:status (admin)
- ❌ POST /support/return-requests (admin)
- ❌ PUT /support/return-requests/:id (admin)
- ❌ DELETE /support/return-requests/:id (admin)
- ❌ PUT /support/return-requests/:id/process (admin)
- ❌ GET /support/inventory-transactions (admin)
- ❌ GET /support/inventory-transactions/:id (admin)
- ❌ GET /support/inventory-transactions/product/:productId (admin)
- ❌ GET /support/inventory-transactions/type/:changeType (admin)
- ❌ POST /support/inventory-transactions (admin)
- ❌ POST /support/inventory-transactions/record (admin)
- ❌ PUT /support/inventory-transactions/:id (admin)
- ❌ DELETE /support/inventory-transactions/:id (admin)

### 11. BANK ROUTES (`/api/bank`)
- ❌ Tất cả bank routes chưa được implement trong frontend API

## 📊 Tổng Kết

- **Endpoints đã implement**: ~70
- **Endpoints còn thiếu**: ~100+ (chủ yếu là admin endpoints)
- **Tỷ lệ hoàn thành**: ~40%

## 💡 Ghi Chú

- Các endpoints admin thường không cần thiết cho frontend user-facing
- Các endpoints token blacklist thường chỉ dùng cho admin panel
- Các endpoints support CRUD (admin) có thể cần cho admin dashboard
- Bank routes có thể không cần cho frontend user-facing

