/**
 * MoMo Payment Gateway Configuration
 * Lưu trữ thông tin cấu hình MoMo
 */
module.exports = {
  // Test environment
  test: {
    accessKey: process.env.MOMO_ACCESS_KEY || 'F8BBA842ECF85',
    secretKey: process.env.MOMO_SECRET_KEY || 'K951B6PE1waDMi640xX08PD3vg6EkVlz',
    partnerCode: process.env.MOMO_PARTNER_CODE || 'MOMO',
    partnerName: process.env.MOMO_PARTNER_NAME || 'Test',
    storeId: process.env.MOMO_STORE_ID || 'MomoTestStore',
    apiEndpoint: 'https://test-payment.momo.vn/v2/gateway/api/create',
    redirectUrl: process.env.MOMO_REDIRECT_URL || 'https://webhook.site/b3088a6a-2d17-4f8d-a383-71389a6c600b',
    ipnUrl: process.env.MOMO_IPN_URL || 'https://webhook.site/b3088a6a-2d17-4f8d-a383-71389a6c600b',
    lang: 'vi',
    requestType: 'payWithMethod',
    autoCapture: true,
  },
  
  // Production environment
  production: {
    accessKey: process.env.MOMO_ACCESS_KEY_PROD || '',
    secretKey: process.env.MOMO_SECRET_KEY_PROD || '',
    partnerCode: process.env.MOMO_PARTNER_CODE_PROD || '',
    partnerName: process.env.MOMO_PARTNER_NAME_PROD || '',
    storeId: process.env.MOMO_STORE_ID_PROD || '',
    apiEndpoint: 'https://payment.momo.vn/v2/gateway/api/create',
    redirectUrl: process.env.MOMO_REDIRECT_URL_PROD || '',
    ipnUrl: process.env.MOMO_IPN_URL_PROD || '',
    lang: 'vi',
    requestType: 'payWithMethod',
    autoCapture: true,
  },
  
  // Get config based on environment
  getConfig: (env = 'test') => {
    return module.exports[env] || module.exports.test;
  },
};

