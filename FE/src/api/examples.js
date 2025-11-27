/**
 * API Usage Examples
 * Các ví dụ sử dụng API functions
 */

import api from './api';

// ============================================
// AUTHENTICATION EXAMPLES
// ============================================

export const authExamples = {
  /**
   * Login example
   */
  async loginExample() {
    try {
      const userData = await api.auth.login('user@example.com', 'password123');
      console.log('User:', userData.user);
      console.log('Token:', userData.token);
      // Token đã được tự động lưu vào localStorage
    } catch (error) {
      console.error('Login failed:', error.message);
    }
  },

  /**
   * Register example
   */
  async registerExample() {
    try {
      const userData = await api.auth.register({
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
  },

  /**
   * Logout example
   */
  async logoutExample() {
    await api.auth.logout();
    // Tokens đã được tự động clear
  },
};

// ============================================
// PRODUCT EXAMPLES
// ============================================

export const productExamples = {
  /**
   * Get products list
   */
  async getProductsExample() {
    try {
      const response = await api.product.getProducts(1, 20, {
        categoryId: 1,
        is_active: 1,
      });
      console.log('Products:', response.data);
      console.log('Pagination:', response.pagination);
    } catch (error) {
      console.error('Error:', error.message);
    }
  },

  /**
   * Search products
   */
  async searchProductsExample() {
    try {
      const response = await api.product.searchProducts('laptop', 1, 20);
      console.log('Search results:', response.data);
    } catch (error) {
      console.error('Error:', error.message);
    }
  },

  /**
   * Get product by slug
   */
  async getProductBySlugExample() {
    try {
      const product = await api.product.getProductBySlug('laptop-dell-xps-15');
      console.log('Product:', product.data);
    } catch (error) {
      console.error('Error:', error.message);
    }
  },
};

// ============================================
// CART EXAMPLES
// ============================================

export const cartExamples = {
  /**
   * Get cart
   */
  async getCartExample() {
    try {
      const cart = await api.cart.getCart();
      console.log('Cart items:', cart.data.items);
      console.log('Total:', cart.data.total);
    } catch (error) {
      console.error('Error:', error.message);
    }
  },

  /**
   * Add to cart
   */
  async addToCartExample() {
    try {
      await api.cart.addToCart(1, 2); // productId, quantity
      console.log('Added to cart');
    } catch (error) {
      console.error('Error:', error.message);
    }
  },

  /**
   * Update cart item
   */
  async updateCartItemExample() {
    try {
      await api.cart.updateCartItem(1, 5); // productId, newQuantity
      console.log('Cart updated');
    } catch (error) {
      console.error('Error:', error.message);
    }
  },
};

// ============================================
// ORDER EXAMPLES
// ============================================

export const orderExamples = {
  /**
   * Create order from cart
   */
  async createOrderFromCartExample() {
    try {
      const order = await api.order.createOrderFromCart({
        shippingAddressId: 1,
        paymentMethodId: 1,
        couponCode: 'DISCOUNT10',
      });
      console.log('Order created:', order.data);
    } catch (error) {
      console.error('Error:', error.message);
    }
  },

  /**
   * Get my orders
   */
  async getMyOrdersExample() {
    try {
      const response = await api.order.getMyOrders(1, 10);
      console.log('Orders:', response.data);
      console.log('Pagination:', response.pagination);
    } catch (error) {
      console.error('Error:', error.message);
    }
  },
};

// ============================================
// PAYMENT EXAMPLES
// ============================================

export const paymentExamples = {
  /**
   * Create MoMo payment
   */
  async createMoMoPaymentExample() {
    try {
      const payment = await api.payment.createMoMoPayment({
        orderId: 1,
        amount: 100000,
        returnUrl: 'https://your-frontend.com/payment/success',
        notifyUrl: 'https://your-backend.com/api/payments/momo/ipn',
      });
      console.log('Payment URL:', payment.data.payUrl);
      // Redirect to payment URL
      window.location.href = payment.data.payUrl;
    } catch (error) {
      console.error('Error:', error.message);
    }
  },
};

// ============================================
// ADDRESS EXAMPLES
// ============================================

export const addressExamples = {
  /**
   * Create address
   */
  async createAddressExample() {
    try {
      const address = await api.address.createAddress({
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
      console.log('Address created:', address.data);
    } catch (error) {
      console.error('Error:', error.message);
    }
  },
};

// ============================================
// WISHLIST EXAMPLES
// ============================================

export const wishlistExamples = {
  /**
   * Add to wishlist
   */
  async addToWishlistExample() {
    try {
      await api.wishlist.addToWishlist(1); // productId
      console.log('Added to wishlist');
    } catch (error) {
      console.error('Error:', error.message);
    }
  },

  /**
   * Check wishlist
   */
  async checkWishlistExample() {
    try {
      const result = await api.wishlist.checkWishlist(1); // productId
      console.log('Is in wishlist:', result.data);
    } catch (error) {
      console.error('Error:', error.message);
    }
  },
};

// ============================================
// REVIEW EXAMPLES
// ============================================

export const reviewExamples = {
  /**
   * Create review
   */
  async createReviewExample() {
    try {
      const review = await api.review.createReview({
        productId: 1,
        orderId: 1,
        rating: 5,
        comment: 'Sản phẩm rất tốt!',
        images: ['url1', 'url2'],
      });
      console.log('Review created:', review.data);
    } catch (error) {
      console.error('Error:', error.message);
    }
  },
};

// ============================================
// COUPON EXAMPLES
// ============================================

export const couponExamples = {
  /**
   * Validate coupon
   */
  async validateCouponExample() {
    try {
      const validation = await api.coupon.validateCoupon('DISCOUNT10', 100000);
      if (validation.success) {
        console.log('Discount:', validation.data.discountAmount);
        console.log('Final amount:', validation.data.finalAmount);
      }
    } catch (error) {
      console.error('Error:', error.message);
    }
  },
};

export default {
  auth: authExamples,
  product: productExamples,
  cart: cartExamples,
  order: orderExamples,
  payment: paymentExamples,
  address: addressExamples,
  wishlist: wishlistExamples,
  review: reviewExamples,
  coupon: couponExamples,
};

