const crypto = require('crypto');
const https = require('https');
const momoConfig = require('../Config/momoConfig');
class MoMoService {
  constructor(environment = 'test') {
    this.config = momoConfig.getConfig(environment);
    this.environment = environment;
  }
  createSignature(params) {
    const {
      accessKey,
      amount,
      extraData,
      ipnUrl,
      orderId,
      orderInfo,
      partnerCode,
      redirectUrl,
      requestId,
      requestType,
    } = params;
    const safeExtraData = extraData || '';
    const safeIpnUrl = ipnUrl || '';
    const safeOrderId = String(orderId || '');
    const safeOrderInfo = String(orderInfo || '');
    const safeRedirectUrl = redirectUrl || '';
    const safeRequestId = String(requestId || '');
    const safeAmount = String(Math.round(parseFloat(amount) || 0));
    const safeAccessKey = String(accessKey || '');
    const safePartnerCode = String(partnerCode || '');
    const safeRequestType = String(requestType || '');
    const rawSignature = `accessKey=${safeAccessKey}&amount=${safeAmount}&extraData=${safeExtraData}&ipnUrl=${safeIpnUrl}&orderId=${safeOrderId}&orderInfo=${safeOrderInfo}&partnerCode=${safePartnerCode}&redirectUrl=${safeRedirectUrl}&requestId=${safeRequestId}&requestType=${safeRequestType}`;
    const signature = crypto
      .createHmac('sha256', this.config.secretKey)
      .update(rawSignature)
      .digest('hex');
    return signature;
  }
  verifySignature(params, signature) {
    const {
      accessKey,
      amount,
      extraData,
      message,
      orderId,
      orderInfo,
      orderType,
      partnerCode,
      payType,
      requestId,
      responseTime,
      resultCode,
      transId,
    } = params;
    const rawSignature = `accessKey=${accessKey}&amount=${amount}&extraData=${extraData}&message=${message}&orderId=${orderId}&orderInfo=${orderInfo}&orderType=${orderType}&partnerCode=${partnerCode}&payType=${payType}&requestId=${requestId}&responseTime=${responseTime}&resultCode=${resultCode}&transId=${transId}`;
    const calculatedSignature = crypto
      .createHmac('sha256', this.config.secretKey)
      .update(rawSignature)
      .digest('hex');
    return calculatedSignature === signature;
  }
  async createPaymentRequest(options) {
    const {
      orderId,
      amount,
      orderInfo,
      extraData = '',
      redirectUrl = null,
      ipnUrl = null,
      requestId = null,
    } = options;
    const finalRequestId = requestId || `${this.config.partnerCode}${Date.now()}`;
    const finalRedirectUrl = redirectUrl || this.config.redirectUrl;
    const finalIpnUrl = ipnUrl || this.config.ipnUrl;
    const finalAmount = Math.round(parseFloat(amount));
    console.log('[MoMoService] 📋 Payment request parameters:', {
      orderId,
      amount: finalAmount,
      redirectUrl: finalRedirectUrl,
      ipnUrl: finalIpnUrl,
      requestId: finalRequestId,
      usingDefaultIpnUrl: !ipnUrl,
    });
    const signature = this.createSignature({
      accessKey: this.config.accessKey,
      amount: finalAmount,
      extraData,
      ipnUrl: finalIpnUrl,
      orderId,
      orderInfo,
      partnerCode: this.config.partnerCode,
      redirectUrl: finalRedirectUrl,
      requestId: finalRequestId,
      requestType: this.config.requestType,
    });
    const requestBody = JSON.stringify({
      partnerCode: this.config.partnerCode,
      partnerName: this.config.partnerName,
      storeId: this.config.storeId,
      requestId: finalRequestId,
      amount: finalAmount,
      orderId,
      orderInfo,
      redirectUrl: finalRedirectUrl,
      ipnUrl: finalIpnUrl,
      lang: this.config.lang,
      requestType: this.config.requestType,
      autoCapture: this.config.autoCapture,
      extraData,
      signature,
    });
    console.log('[MoMoService] 📤 Creating payment request:', {
      orderId,
      amount: finalAmount,
      requestId: finalRequestId,
    });
    return new Promise((resolve, reject) => {
      const url = new URL(this.config.apiEndpoint);
      const options = {
        hostname: url.hostname,
        port: 443,
        path: url.pathname,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(requestBody),
        },
      };
      const req = https.request(options, (res) => {
        let data = '';
        res.on('data', (chunk) => {
          data += chunk;
        });
        res.on('end', () => {
          try {
            const response = JSON.parse(data);
            if (response.resultCode === 0) {
              console.log('[MoMoService] ✅ Payment request created successfully');
              resolve({
                success: true,
                payUrl: response.payUrl,
                deeplink: response.deeplink,
                qrCodeUrl: response.qrCodeUrl,
                requestId: finalRequestId,
                orderId,
                amount: finalAmount,
                message: response.message,
                rawResponse: response,
              });
            } else {
              console.error('[MoMoService] ❌ Payment request failed:', {
                resultCode: response.resultCode,
                message: response.message,
              });
              resolve({
                success: false,
                message: response.message || 'Lỗi khi tạo payment request',
                resultCode: response.resultCode,
                rawResponse: response,
              });
            }
          } catch (error) {
            console.error('[MoMoService] ❌ Parse error:', error.message);
            reject(new Error(`Lỗi khi parse response: ${error.message}`));
          }
        });
      });
      req.on('error', (error) => {
        reject(new Error(`Lỗi khi gửi request: ${error.message}`));
      });
      req.write(requestBody);
      req.end();
    });
  }
  async queryPaymentStatus(orderId, requestId) {
    const finalRequestId = requestId || `${this.config.partnerCode}${Date.now()}`;
    const rawSignature = `accessKey=${this.config.accessKey}&orderId=${orderId}&partnerCode=${this.config.partnerCode}&requestId=${finalRequestId}`;
    const signature = crypto
      .createHmac('sha256', this.config.secretKey)
      .update(rawSignature)
      .digest('hex');
    const requestBody = JSON.stringify({
      partnerCode: this.config.partnerCode,
      requestId: finalRequestId,
      orderId,
      signature,
    });
    return new Promise((resolve, reject) => {
      const queryUrl = this.config.apiEndpoint.replace('/create', '/query');
      const url = new URL(queryUrl);
      const options = {
        hostname: url.hostname,
        port: 443,
        path: url.pathname,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(requestBody),
        },
      };
      const req = https.request(options, (res) => {
        let data = '';
        res.on('data', (chunk) => {
          data += chunk;
        });
        res.on('end', () => {
          try {
            const response = JSON.parse(data);
            resolve({
              success: response.resultCode === 0,
              resultCode: response.resultCode,
              message: response.message,
              amount: response.amount,
              transId: response.transId,
              orderId: response.orderId,
              payType: response.payType,
              responseTime: response.responseTime,
              rawResponse: response,
            });
          } catch (error) {
            reject(new Error(`Lỗi khi parse response: ${error.message}`));
          }
        });
      });
      req.on('error', (error) => {
        reject(new Error(`Lỗi khi gửi request: ${error.message}`));
      });
      req.write(requestBody);
      req.end();
    });
  }
  processCallback(callbackData) {
    try {
      const {
        partnerCode,
        orderId,
        requestId,
        amount,
        orderInfo,
        orderType,
        transId,
        resultCode,
        message,
        payType,
        responseTime,
        extraData,
        signature,
      } = callbackData;
      const isValid = this.verifySignature(
        {
          accessKey: this.config.accessKey,
          amount,
          extraData: extraData || '',
          message,
          orderId,
          orderInfo,
          orderType,
          partnerCode,
          payType,
          requestId,
          responseTime,
          resultCode,
          transId,
        },
        signature
      );
      if (!isValid) {
        return {
          success: false,
          verified: false,
          error: 'Signature không hợp lệ',
          rawData: callbackData,
        };
      }
      const isSuccess = resultCode === 0;
      return {
        success: isSuccess,
        verified: true,
        orderId,
        requestId,
        transId,
        amount: parseFloat(amount),
        resultCode,
        message,
        payType,
        responseTime,
        extraData,
        rawData: callbackData,
      };
    } catch (error) {
      return {
        success: false,
        error: 'Lỗi khi xử lý callback',
        rawError: error.message,
        verified: false,
      };
    }
  }
}
module.exports = MoMoService;
