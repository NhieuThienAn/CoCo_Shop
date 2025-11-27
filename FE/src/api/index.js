/**
 * API Index
 * Export tất cả API functions
 * 
 * Có 2 cách sử dụng:
 * 1. Import từng module:
 *    import { login, register } from './api/auth';
 *    import { getProducts } from './api/product';
 * 
 * 2. Import tất cả:
 *    import api from './api';
 *    await api.auth.login(email, password);
 *    await api.product.getProducts(1, 20);
 */

// Export config utilities
export * from './config';
export { default as config } from './config';

// Export individual modules
export { default as auth } from './auth';
export { default as user } from './user';
export { default as product } from './product';
export { default as category } from './category';
export { default as cart } from './cart';
export { default as order } from './order';
export { default as payment } from './payment';
export { default as address } from './address';
export { default as wishlist } from './wishlist';
export { default as review } from './review';
export { default as coupon } from './coupon';
export { default as support } from './support';
export { default as bank } from './bank';
export { default as statistics } from './statistics';

// Named exports for convenience
import * as authAPI from './auth';
import * as userAPI from './user';
import * as productAPI from './product';
import * as categoryAPI from './category';
import * as cartAPI from './cart';
import * as orderAPI from './order';
import * as paymentAPI from './payment';
import * as addressAPI from './address';
import * as wishlistAPI from './wishlist';
import * as reviewAPI from './review';
import * as couponAPI from './coupon';
import * as supportAPI from './support';
import * as bankAPI from './bank';
import * as statisticsAPI from './statistics';
import { apiCall, getToken, clearTokens, setTokens, getRefreshToken } from './config';

export {
  authAPI,
  userAPI,
  productAPI,
  categoryAPI,
  cartAPI,
  orderAPI,
  paymentAPI,
  addressAPI,
  wishlistAPI,
  reviewAPI,
  couponAPI,
  supportAPI,
  bankAPI,
  statisticsAPI,
};

// Default export với tất cả APIs (recommended)
export default {
  auth: authAPI,
  user: userAPI,
  product: productAPI,
  category: categoryAPI,
  cart: cartAPI,
  order: orderAPI,
  payment: paymentAPI,
  address: addressAPI,
  wishlist: wishlistAPI,
  review: reviewAPI,
  coupon: couponAPI,
  support: supportAPI,
  bank: bankAPI,
  statistics: statisticsAPI,
  // Utility functions
  utils: {
    apiCall,
    getToken,
    clearTokens,
    setTokens,
    getRefreshToken,
  },
};

