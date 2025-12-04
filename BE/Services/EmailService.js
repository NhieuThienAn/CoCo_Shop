const nodemailer = require('nodemailer');
const { logger } = require('../Middlewares/errorHandler');
class EmailService {
  constructor() {
    this.transporter = null;
    this.initializeTransporter();
  }
  initializeTransporter() {
    console.log('[EmailService] ========== INITIALIZING EMAIL SERVICE ==========');
    try {
      const emailUser = process.env.EMAIL_USERNAME || process.env.EMAIL_USER;
      console.log('[EmailService] 📋 Configuration check:');
      console.log('[EmailService]   - EMAIL_USERNAME:', emailUser ? `${emailUser.substring(0, 3)}***` : 'NOT SET');
      console.log('[EmailService]   - EMAIL_USER:', process.env.EMAIL_USER ? `${process.env.EMAIL_USER.substring(0, 3)}***` : 'NOT SET');
      console.log('[EmailService]   - EMAIL_PASSWORD:', process.env.EMAIL_PASSWORD ? '***SET***' : 'NOT SET');
      console.log('[EmailService]   - EMAIL_HOST:', process.env.EMAIL_HOST || 'smtp.gmail.com (default)');
      console.log('[EmailService]   - EMAIL_PORT:', process.env.EMAIL_PORT || '587 (default)');
      console.log('[EmailService]   - EMAIL_SECURE:', process.env.EMAIL_SECURE || 'false (default)');
      console.log('[EmailService]   - EMAIL_FROM:', process.env.EMAIL_FROM || 'NOT SET');
      const emailConfig = {
        host: process.env.EMAIL_HOST || 'smtp.gmail.com',
        port: parseInt(process.env.EMAIL_PORT) || 587,
        secure: process.env.EMAIL_SECURE === 'true' || false,
        auth: {
          user: emailUser,
          pass: process.env.EMAIL_PASSWORD,
        },
      };
      if (!emailConfig.auth.user || !emailConfig.auth.pass) {
        const errorMsg = 'Email service not configured: EMAIL_USERNAME (or EMAIL_USER) or EMAIL_PASSWORD missing in .env';
        console.error('[EmailService] ❌', errorMsg);
        console.error('[EmailService] ❌ Email service will NOT work until configuration is fixed!');
        logger.warn(errorMsg);
        this.transporter = null;
        return;
      }
      console.log('[EmailService] ✅ Configuration validated');
      console.log('[EmailService] 🔧 Creating nodemailer transporter...');
      this.transporter = nodemailer.createTransport({
        host: emailConfig.host,
        port: emailConfig.port,
        secure: emailConfig.secure,
        auth: emailConfig.auth,
        tls: {
          rejectUnauthorized: false, 
        },
      });
      console.log('[EmailService] ✅ Transporter created');
      console.log('[EmailService] 🔍 Verifying connection...');
      this.transporter.verify((error, success) => {
        if (error) {
          console.error('[EmailService] ❌❌❌ EMAIL SERVICE VERIFICATION FAILED ❌❌❌');
          console.error('[EmailService] Error name:', error.name);
          console.error('[EmailService] Error message:', error.message);
          console.error('[EmailService] Error code:', error.code);
          console.error('[EmailService] Error command:', error.command);
          console.error('[EmailService] Error response:', error.response);
          console.error('[EmailService] Error responseCode:', error.responseCode);
          logger.error('Email service verification failed:', error);
          if (error.message && error.message.includes('Invalid login')) {
            console.error('[EmailService] ⚠️  This usually means:');
            console.error('[EmailService]   1. Gmail username/password is incorrect');
            console.error('[EmailService]   2. Gmail account needs App Password (not regular password)');
            console.error('[EmailService]   3. 2-Step Verification must be enabled on Gmail account');
            console.error('[EmailService]   How to fix:');
            console.error('[EmailService]   - Go to Google Account > Security > 2-Step Verification');
            console.error('[EmailService]   - Generate App Password for "Mail"');
            console.error('[EmailService]   - Use the App Password (16 characters) in EMAIL_PASSWORD');
          }
        } else {
          console.log('[EmailService] ✅✅✅ EMAIL SERVICE VERIFIED SUCCESSFULLY ✅✅✅');
          console.log('[EmailService] Server ready to send emails');
          logger.info('Email service initialized and verified successfully');
        }
      });
      console.log('[EmailService] ========== INITIALIZATION COMPLETED ==========');
    } catch (error) {
      console.error('[EmailService] ❌❌❌ ERROR INITIALIZING EMAIL SERVICE ❌❌❌');
      console.error('[EmailService] Error name:', error.name);
      console.error('[EmailService] Error message:', error.message);
      console.error('[EmailService] Error stack:', error.stack);
      logger.error('Error initializing email service:', error);
      this.transporter = null;
    }
  }
  async verifyConnection() {
    if (!this.transporter) {
      return { success: false, message: 'Email service not configured' };
    }
    try {
      await this.transporter.verify();
      return { success: true, message: 'Email service is ready' };
    } catch (error) {
      logger.error('Email service verification failed:', error);
      return { success: false, message: error.message };
    }
  }
  /**
   * Gửi email OTP
   * @param {string} to - Email người nhận
   * @param {string} otpCode - Mã OTP (6 chữ số)
   * @param {string} userName - Tên người dùng (optional)
   * @returns {Promise<{success: boolean, message: string}>}
   */

  async sendOTPEmail(to, otpCode, userName = null) {
    console.log('[EmailService] ========== sendOTPEmail CALLED ==========');
    console.log('[EmailService] To:', to);
    console.log('[EmailService] OTP Code:', otpCode);
    console.log('[EmailService] User Name:', userName || 'N/A');
    console.log('[EmailService] Transporter exists:', !!this.transporter);
    if (!this.transporter) {
      const errorMsg = 'Email service không được cấu hình. Vui lòng liên hệ quản trị viên.';
      console.error('[EmailService] ❌', errorMsg);
      logger.error('Email service not configured');
      return {
        success: false,
        message: errorMsg,
      };
    }
    try {
      const emailUser = process.env.EMAIL_USERNAME || process.env.EMAIL_USER;
      const fromEmail = process.env.EMAIL_FROM || emailUser;
      const appName = process.env.APP_NAME || 'CoCo Store';
      console.log('[EmailService] Email config:', {
        emailUser: emailUser ? `${emailUser.substring(0, 3)}***` : 'NOT SET',
        fromEmail: fromEmail ? `${fromEmail.substring(0, 3)}***` : 'NOT SET',
        appName,
        hasEmailUser: !!emailUser,
        hasFromEmail: !!fromEmail,
      });
      if (!emailUser || !fromEmail) {
        const errorMsg = 'Email configuration incomplete. EMAIL_USERNAME or EMAIL_FROM missing.';
        console.error('[EmailService] ❌', errorMsg);
        return {
          success: false,
          message: errorMsg,
        };
      }
      const mailOptions = {
        from: `"${appName}" <${fromEmail}>`,
        to: to,
        subject: `[${appName}] Mã xác thực email của bạn`,
        html: this.getOTPEmailTemplate(otpCode, userName, appName),
        text: this.getOTPEmailText(otpCode, userName, appName),
      };
      console.log('[EmailService] 📨 Sending email...');
      console.log('[EmailService] Mail options:', {
        from: mailOptions.from,
        to: mailOptions.to,
        subject: mailOptions.subject,
        hasHtml: !!mailOptions.html,
        hasText: !!mailOptions.text,
      });
      const info = await this.transporter.sendMail(mailOptions);
      console.log('[EmailService] ✅✅✅ EMAIL SENT SUCCESSFULLY ✅✅✅');
      console.log('[EmailService] Message ID:', info.messageId);
      console.log('[EmailService] Response:', info.response || 'N/A');
      logger.info(`OTP email sent successfully to ${to}. MessageId: ${info.messageId}`);
      return {
        success: true,
        message: 'Email đã được gửi thành công',
        messageId: info.messageId,
      };
    } catch (error) {
      console.error('[EmailService] ❌❌❌ ERROR SENDING EMAIL ❌❌❌');
      console.error('[EmailService] Error name:', error.name);
      console.error('[EmailService] Error message:', error.message);
      console.error('[EmailService] Error code:', error.code);
      console.error('[EmailService] Error command:', error.command);
      console.error('[EmailService] Error response:', error.response);
      console.error('[EmailService] Error responseCode:', error.responseCode);
      console.error('[EmailService] Error stack:', error.stack);
      let userFriendlyMessage = `Lỗi khi gửi email: ${error.message}`;
      if (error.code === 'EAUTH' || (error.message && error.message.includes('Invalid login'))) {
        userFriendlyMessage = 'Lỗi xác thực email. Vui lòng kiểm tra cấu hình EMAIL_USERNAME và EMAIL_PASSWORD trong file .env.';
        console.error('[EmailService] ⚠️  GMAIL AUTHENTICATION ERROR DETECTED');
        console.error('[EmailService] ⚠️  This usually means:');
        console.error('[EmailService]     1. EMAIL_PASSWORD is not a Gmail App Password');
        console.error('[EmailService]     2. Gmail account does not have 2-Step Verification enabled');
        console.error('[EmailService]     3. App Password was not generated correctly');
        console.error('[EmailService] ⚠️  How to fix:');
        console.error('[EmailService]     1. Go to: https://github.com/cocoshop-vn/Do-An-Tot-Nghiep-2025/blob/main/SO_DO_TONG_QUAN_HE_THONG_NGAN_GON.md#2-generate-app-password',)
        console.error('[EmailService]     2. Enable 2-Step Verification');
        console.error('[EmailService]     3. Go to: https://github.com/cocoshop-vn/Do-An-Tot-Nghiep-2025/blob/main/SO_DO_TONG_QUAN_HE_THONG_NGAN_GON.md#2-generate-app-password',)
        console.error('[EmailService]     4. Generate App Password for "Mail"');
        console.error('[EmailService]     5. Use the 16-character App Password in EMAIL_PASSWORD');
        console.error('[EmailService]     6. Restart the server after updating .env');
      } else if (error.code === 'ECONNECTION' || error.code === 'ETIMEDOUT') {
        userFriendlyMessage = 'Không thể kết nối đến máy chủ email. Vui lòng kiểm tra kết nối mạng và cấu hình EMAIL_HOST.';
        console.error('[EmailService] ⚠️  CONNECTION ERROR DETECTED');
      } else if (error.code === 'EMESSAGE') {
        userFriendlyMessage = 'Lỗi định dạng email. Vui lòng kiểm tra địa chỉ email người nhận.';
        console.error('[EmailService] ⚠️  MESSAGE FORMAT ERROR DETECTED');
      }
      logger.error(`Error sending OTP email to ${to}:`, error);
      return {
        success: false,
        message: userFriendlyMessage,
        error: error.message,
        errorCode: error.code,
      };
    }
  }
  getOTPEmailTemplate(otpCode, userName, appName) {
    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Mã xác thực email</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
    <h1 style="color: white; margin: 0; font-size: 28px;">${appName}</h1>
  </div>
  <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; border: 1px solid #e0e0e0;">
    <h2 style="color: #333; margin-top: 0;">Xác thực email của bạn</h2>
    ${userName ? `<p>Xin chào <strong>${userName}</strong>,</p>` : '<p>Xin chào,</p>'}
    <p>Cảm ơn bạn đã đăng ký tài khoản tại ${appName}. Để hoàn tất quá trình đăng ký, vui lòng sử dụng mã xác thực sau:</p>
    <div style="background: white; border: 2px dashed #667eea; border-radius: 8px; padding: 20px; margin: 30px 0; text-align: center;">
      <div style="font-size: 36px; font-weight: bold; color: #667eea; letter-spacing: 8px; font-family: 'Courier New', monospace;">
        ${otpCode}
      </div>
    </div>
    <p style="color: #666; font-size: 14px;">
      <strong>Lưu ý:</strong>
      <ul style="color: #666; padding-left: 20px;">
        <li>Mã OTP có hiệu lực trong <strong>10 phút</strong></li>
        <li>Không chia sẻ mã này với bất kỳ ai</li>
        <li>Nếu bạn không yêu cầu mã này, vui lòng bỏ qua email này</li>
      </ul>
    </p>
    <p style="color: #999; font-size: 12px; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e0e0e0;">
      Email này được gửi tự động từ hệ thống ${appName}. Vui lòng không trả lời email này.
    </p>
  </div>
</body>
</html>
    `;
  }
  getOTPEmailText(otpCode, userName, appName) {
    return `
${appName} - Xác thực email
${userName ? `Xin chào ${userName},` : 'Xin chào,'}
Cảm ơn bạn đã đăng ký tài khoản tại ${appName}. 
Mã xác thực của bạn là: ${otpCode}
Mã OTP có hiệu lực trong 10 phút.
Lưu ý: Không chia sẻ mã này với bất kỳ ai.
Email này được gửi tự động từ hệ thống ${appName}.
    `.trim();
  }

  /**
   * Gửi email OTP cho quên mật khẩu
   * @param {string} to - Email người nhận
   * @param {string} otpCode - Mã OTP (6 chữ số)
   * @param {string} userName - Tên người dùng (optional)
   * @returns {Promise<{success: boolean, message: string}>}
   */
  async sendForgotPasswordOTPEmail(to, otpCode, userName = null) {
    console.log('[EmailService] ========== sendForgotPasswordOTPEmail CALLED ==========');
    console.log('[EmailService] To:', to);
    console.log('[EmailService] OTP Code:', otpCode);
    console.log('[EmailService] User Name:', userName || 'N/A');
    console.log('[EmailService] Transporter exists:', !!this.transporter);
    
    if (!this.transporter) {
      const errorMsg = 'Email service không được cấu hình. Vui lòng liên hệ quản trị viên.';
      console.error('[EmailService] ❌', errorMsg);
      logger.error('Email service not configured');
      return {
        success: false,
        message: errorMsg,
      };
    }
    
    try {
      const emailUser = process.env.EMAIL_USERNAME || process.env.EMAIL_USER;
      const fromEmail = process.env.EMAIL_FROM || emailUser;
      const appName = process.env.APP_NAME || 'CoCo Store';
      
      if (!emailUser || !fromEmail) {
        const errorMsg = 'Email configuration incomplete. EMAIL_USERNAME or EMAIL_FROM missing.';
        console.error('[EmailService] ❌', errorMsg);
        return {
          success: false,
          message: errorMsg,
        };
      }
      
      const mailOptions = {
        from: `"${appName}" <${fromEmail}>`,
        to: to,
        subject: `[${appName}] Mã xác thực đặt lại mật khẩu`,
        html: this.getForgotPasswordOTPEmailTemplate(otpCode, userName, appName),
        text: this.getForgotPasswordOTPEmailText(otpCode, userName, appName),
      };
      
      console.log('[EmailService] 📨 Sending forgot password OTP email...');
      const info = await this.transporter.sendMail(mailOptions);
      console.log('[EmailService] ✅✅✅ FORGOT PASSWORD OTP EMAIL SENT SUCCESSFULLY ✅✅✅');
      console.log('[EmailService] Message ID:', info.messageId);
      logger.info(`Forgot password OTP email sent successfully to ${to}. MessageId: ${info.messageId}`);
      
      return {
        success: true,
        message: 'Email đã được gửi thành công',
        messageId: info.messageId,
      };
    } catch (error) {
      console.error('[EmailService] ❌❌❌ ERROR SENDING FORGOT PASSWORD OTP EMAIL ❌❌❌');
      console.error('[EmailService] Error:', error.message);
      logger.error(`Error sending forgot password OTP email to ${to}:`, error);
      
      return {
        success: false,
        message: `Lỗi khi gửi email: ${error.message}`,
        error: error.message,
        errorCode: error.code,
      };
    }
  }

  getForgotPasswordOTPEmailTemplate(otpCode, userName, appName) {
    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Mã xác thực đặt lại mật khẩu</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
    <h1 style="color: white; margin: 0; font-size: 28px;">${appName}</h1>
  </div>
  <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; border: 1px solid #e0e0e0;">
    <h2 style="color: #333; margin-top: 0;">Đặt lại mật khẩu</h2>
    ${userName ? `<p>Xin chào <strong>${userName}</strong>,</p>` : '<p>Xin chào,</p>'}
    <p>Chúng tôi nhận được yêu cầu đặt lại mật khẩu cho tài khoản của bạn tại ${appName}. Để tiếp tục, vui lòng sử dụng mã xác thực sau:</p>
    <div style="background: white; border: 2px dashed #667eea; border-radius: 8px; padding: 20px; margin: 30px 0; text-align: center;">
      <div style="font-size: 36px; font-weight: bold; color: #667eea; letter-spacing: 8px; font-family: 'Courier New', monospace;">
        ${otpCode}
      </div>
    </div>
    <p style="color: #666; font-size: 14px;">
      <strong>Lưu ý:</strong>
      <ul style="color: #666; padding-left: 20px;">
        <li>Mã OTP có hiệu lực trong <strong>10 phút</strong></li>
        <li>Không chia sẻ mã này với bất kỳ ai</li>
        <li>Nếu bạn không yêu cầu đặt lại mật khẩu, vui lòng bỏ qua email này và đảm bảo tài khoản của bạn được bảo mật</li>
      </ul>
    </p>
    <p style="color: #999; font-size: 12px; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e0e0e0;">
      Email này được gửi tự động từ hệ thống ${appName}. Vui lòng không trả lời email này.
    </p>
  </div>
</body>
</html>
    `;
  }

  getForgotPasswordOTPEmailText(otpCode, userName, appName) {
    return `
${appName} - Đặt lại mật khẩu
${userName ? `Xin chào ${userName},` : 'Xin chào,'}
Chúng tôi nhận được yêu cầu đặt lại mật khẩu cho tài khoản của bạn tại ${appName}. 
Mã xác thực của bạn là: ${otpCode}
Mã OTP có hiệu lực trong 10 phút.
Lưu ý: Không chia sẻ mã này với bất kỳ ai.
Nếu bạn không yêu cầu đặt lại mật khẩu, vui lòng bỏ qua email này.
Email này được gửi tự động từ hệ thống ${appName}.
    `.trim();
  }
}
module.exports = new EmailService();
