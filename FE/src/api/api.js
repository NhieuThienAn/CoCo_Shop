/**
 * Main API Export File
 * Import tất cả API modules và export dưới dạng namespace
 * 
 * Usage:
 *   import api from './api/api';
 *   await api.auth.login(email, password);
 *   await api.product.getProducts(1, 20);
 */

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
import { apiCall, getToken, clearTokens, setTokens, getRefreshToken } from './config';

/**
 * Main API object với tất cả modules
 */
const api = {
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
  // Utility functions
  utils: {
    apiCall,
    getToken,
    clearTokens,
    setTokens,
    getRefreshToken,
  },
};

export default api;

