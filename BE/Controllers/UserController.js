const createBaseController = require('./BaseController');
const { user, emailOtp } = require('../Models');
const { verifyPassword, generateToken, generateRefreshToken, hashPassword, verifyToken, verifyRefreshToken } = require('../Utils/authUtils');
const EmailService = require('../Services/EmailService');

const createUserController = () => {
  const baseController = createBaseController(user);

  /**
   * Đăng nhập
   */
  const login = async (req, res) => {
    console.log('========================================');
    console.log('[UserController] 🚀🚀🚀 LOGIN FUNCTION CALLED 🚀🚀🚀');
    console.log('[UserController] ========================================');
    console.log('[UserController] 📅 Timestamp:', new Date().toISOString());
    console.log('[UserController] 🌐 Request IP:', req.ip);
    console.log('[UserController] 🔗 Request method:', req.method);
    console.log('[UserController] 📍 Request URL:', req.originalUrl);
    console.log('[UserController] 📋 Request path:', req.path);
    console.log('[UserController] 🔐 Request headers:', {
      'content-type': req.headers['content-type'],
      'user-agent': req.headers['user-agent'],
      'authorization': req.headers['authorization'] ? '[PRESENT]' : '[NOT PRESENT]',
      'x-forwarded-for': req.headers['x-forwarded-for']
    });
    console.log('[UserController] 📦 Request body keys:', Object.keys(req.body || {}));
    console.log('[UserController] 📦 Request body (sanitized):', JSON.stringify({ 
      email: req.body?.email ? `${req.body.email.substring(0, 3)}***` : undefined, 
      username: req.body?.username, 
      hasPassword: !!req.body?.password,
      passwordLength: req.body?.password?.length || 0
    }, null, 2));
    
    const startTime = Date.now();
    let userData = null;
    const { logger } = require('../Middlewares/errorHandler');
    
    try {
      console.log('[UserController] 🔍 Step 1: Extracting credentials from request body...');
      const { email, username, password } = req.body;
      console.log('[UserController] ✅ Credentials extracted:', { 
        hasEmail: !!email, 
        hasUsername: !!username, 
        hasPassword: !!password,
        emailLength: email?.length || 0,
        usernameLength: username?.length || 0,
        passwordLength: password?.length || 0,
        emailType: typeof email,
        usernameType: typeof username,
        passwordType: typeof password
      });

      // Validation: Phải có password
      console.log('[UserController] 🔍 Step 2: Validating password...');
      console.log('[UserController] Password check:', {
        exists: !!password,
        type: typeof password,
        isString: typeof password === 'string',
        trimmedLength: password?.trim?.()?.length || 0,
        isEmpty: !password || (typeof password === 'string' && password.trim().length === 0)
      });
      
      if (!password || typeof password !== 'string' || password.trim().length === 0) {
        console.log('[UserController] ❌❌❌ VALIDATION FAILED: Missing password ❌❌❌');
        console.log('[UserController] Password value:', password);
        console.log('[UserController] Password type:', typeof password);
        logger.warn(`Login attempt failed: Missing password from IP ${req.ip}`);
        const validationTime = Date.now() - startTime;
        console.log('[UserController] ⏱️ Validation time:', `${validationTime}ms`);
        console.log('========================================');
        return res.status(400).json({
          success: false,
          message: 'Vui lòng cung cấp mật khẩu',
        });
      }
      console.log('[UserController] ✅ Password validation passed');

      // Validation: Phải có email hoặc username
      console.log('[UserController] 🔍 Step 3: Validating email/username...');
      console.log('[UserController] Email check:', {
        exists: !!email,
        trimmed: email?.trim(),
        trimmedLength: email?.trim?.()?.length || 0,
        isEmpty: !email || email.trim().length === 0
      });
      console.log('[UserController] Username check:', {
        exists: !!username,
        trimmed: username?.trim(),
        trimmedLength: username?.trim?.()?.length || 0,
        isEmpty: !username || username.trim().length === 0
      });
      
      if ((!email || email.trim().length === 0) && (!username || username.trim().length === 0)) {
        console.log('[UserController] ❌❌❌ VALIDATION FAILED: Missing email/username ❌❌❌');
        console.log('[UserController] Email provided:', !!email);
        console.log('[UserController] Username provided:', !!username);
        logger.warn(`Login attempt failed: Missing email/username from IP ${req.ip}`);
        const validationTime = Date.now() - startTime;
        console.log('[UserController] ⏱️ Validation time:', `${validationTime}ms`);
        console.log('========================================');
        return res.status(400).json({
          success: false,
          message: 'Vui lòng cung cấp email hoặc username',
        });
      }
      console.log('[UserController] ✅ Email/Username validation passed');

      // Validation: Email format (nếu có email)
      if (email) {
        console.log('[UserController] 🔍 Step 4: Validating email format...');
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        const trimmedEmail = email.trim();
        const isValidFormat = emailRegex.test(trimmedEmail);
        console.log('[UserController] Email format check:', {
          email: trimmedEmail,
          isValidFormat,
          regexMatch: emailRegex.test(trimmedEmail)
        });
        
        if (!isValidFormat) {
          console.log('[UserController] ❌❌❌ VALIDATION FAILED: Invalid email format ❌❌❌');
          console.log('[UserController] Email provided:', trimmedEmail);
          logger.warn(`Login attempt failed: Invalid email format from IP ${req.ip}`);
          const validationTime = Date.now() - startTime;
          console.log('[UserController] ⏱️ Validation time:', `${validationTime}ms`);
          console.log('========================================');
          return res.status(400).json({
            success: false,
            message: 'Email không hợp lệ',
          });
        }
        console.log('[UserController] ✅ Email format validation passed');
      }

      // Tìm user theo email hoặc username
      console.log('[UserController] 🔍 Step 5: Searching for user in database...');
      const dbSearchStartTime = Date.now();
      try {
        if (email) {
          const searchEmail = email.trim().toLowerCase();
          console.log('[UserController] 📧 Searching by email:', searchEmail);
          console.log('[UserController] Email search details:', {
            original: email,
            trimmed: email.trim(),
            lowercased: searchEmail,
            length: searchEmail.length
          });
          
          const dbQueryStart = Date.now();
          userData = await user.findByEmail(searchEmail);
          const dbQueryTime = Date.now() - dbQueryStart;
          console.log('[UserController] ⏱️ Database query time (email):', `${dbQueryTime}ms`);
        } else if (username) {
          const searchUsername = username.trim();
          console.log('[UserController] 👤 Searching by username:', searchUsername);
          console.log('[UserController] Username search details:', {
            original: username,
            trimmed: searchUsername,
            length: searchUsername.length
          });
          
          const dbQueryStart = Date.now();
          userData = await user.findByUsername(searchUsername);
          const dbQueryTime = Date.now() - dbQueryStart;
          console.log('[UserController] ⏱️ Database query time (username):', `${dbQueryTime}ms`);
        }
        
        const dbSearchTime = Date.now() - dbSearchStartTime;
        console.log('[UserController] ⏱️ Total database search time:', `${dbSearchTime}ms`);
        console.log('[UserController] Database query result:', userData ? {
          found: true,
          userId: userData.user_id,
          username: userData.username,
          email: userData.email,
          roleId: userData.role_id,
          isActive: userData.is_active
        } : { found: false });
        
        if (userData) {
          console.log('[UserController] 📊 User data retrieved:', {
            userId: userData.user_id,
            username: userData.username,
            email: userData.email,
            roleId: userData.role_id,
            isActive: userData.is_active,
            emailVerified: userData.email_verified,
            failedLoginAttempts: userData.failed_login_attempts,
            lastFailedLogin: userData.last_failed_login,
            lastLogin: userData.last_login,
            hasPasswordHash: !!userData.password_hash,
            passwordHashLength: userData.password_hash?.length || 0,
            hasTokens: !!userData.tokens,
            tokensType: typeof userData.tokens,
            isTokensBuffer: Buffer.isBuffer(userData.tokens)
          });
        }
      } catch (dbError) {
        const dbSearchTime = Date.now() - dbSearchStartTime;
        console.error('[UserController] ❌❌❌ DATABASE ERROR DURING LOGIN LOOKUP ❌❌❌');
        console.error('[UserController] Error name:', dbError.name);
        console.error('[UserController] Error message:', dbError.message);
        console.error('[UserController] Error code:', dbError.code);
        console.error('[UserController] Error errno:', dbError.errno);
        console.error('[UserController] Error sqlState:', dbError.sqlState);
        console.error('[UserController] Error sqlMessage:', dbError.sqlMessage);
        console.error('[UserController] Error stack:', dbError.stack);
        console.error('[UserController] ⏱️ Database search time before error:', `${dbSearchTime}ms`);
        logger.error(`Database error during login lookup: ${dbError.message}`, {
          error: dbError,
          searchBy: email ? 'email' : 'username',
          searchValue: email || username
        });
        // Delay response để tránh timing attack
        console.log('[UserController] ⏳ Delaying response to prevent timing attack...');
        await new Promise(resolve => setTimeout(resolve, 1000));
        console.log('========================================');
        return res.status(500).json({
          success: false,
          message: 'Lỗi hệ thống. Vui lòng thử lại sau.',
        });
      }

      // Kiểm tra user tồn tại (luôn delay để tránh timing attack)
      console.log('[UserController] 🔍 Step 6: Checking if user exists...');
      if (!userData) {
        console.log('[UserController] ❌❌❌ USER NOT FOUND ❌❌❌');
        console.log('[UserController] Search criteria:', {
          email: email ? email.trim().toLowerCase() : null,
          username: username ? username.trim() : null
        });
        // Delay để tránh user enumeration attack
        console.log('[UserController] ⏳ Delaying response to prevent user enumeration attack...');
        const delayStart = Date.now();
        await new Promise(resolve => setTimeout(resolve, 500));
        const delayTime = Date.now() - delayStart;
        console.log('[UserController] ⏱️ Delay time:', `${delayTime}ms`);
        logger.warn(`Login attempt failed: User not found (${email || username}) from IP ${req.ip}`);
        const totalTime = Date.now() - startTime;
        console.log('[UserController] ⏱️ Total request time:', `${totalTime}ms`);
        console.log('========================================');
        return res.status(401).json({
          success: false,
          message: 'Email/Username hoặc mật khẩu không đúng',
        });
      }
      
      console.log('[UserController] ✅✅✅ USER FOUND ✅✅✅');
      console.log('[UserController] User details:', {
        userId: userData.user_id,
        username: userData.username,
        email: userData.email,
        roleId: userData.role_id,
        roleName: userData.role_name || 'N/A',
        isActive: userData.is_active,
        emailVerified: userData.email_verified,
        failedAttempts: userData.failed_login_attempts,
        lastFailedLogin: userData.last_failed_login,
        lastLogin: userData.last_login,
        createdAt: userData.created_at,
        updatedAt: userData.updated_at
      });

      // Kiểm tra account lockout (sau khi tìm thấy user)
      console.log('[UserController] 🔍 Step 7: Checking account lockout status...');
      const MAX_FAILED_ATTEMPTS = parseInt(process.env.MAX_FAILED_LOGIN_ATTEMPTS) || 5;
      const LOCKOUT_DURATION = parseInt(process.env.LOCKOUT_DURATION_MS) || 30 * 60 * 1000; // 30 minutes
      console.log('[UserController] Lockout configuration:', {
        failedAttempts: userData.failed_login_attempts || 0,
        maxAttempts: MAX_FAILED_ATTEMPTS,
        lockoutDurationMs: LOCKOUT_DURATION,
        lockoutDurationMinutes: LOCKOUT_DURATION / 60000,
        envMaxAttempts: process.env.MAX_FAILED_LOGIN_ATTEMPTS,
        envLockoutDuration: process.env.LOCKOUT_DURATION_MS
      });
      
      if (userData.failed_login_attempts >= MAX_FAILED_ATTEMPTS) {
        console.log('[UserController] ⚠️ Account has exceeded max failed attempts');
        // Kiểm tra xem lockout đã hết hạn chưa
        const lastFailedAttempt = userData.last_failed_login || userData.updated_at;
        const lockoutExpiry = new Date(lastFailedAttempt).getTime() + LOCKOUT_DURATION;
        const now = Date.now();
        const isExpired = now >= lockoutExpiry;
        const remainingMs = lockoutExpiry - now;
        const remainingMinutes = Math.ceil(remainingMs / 60000);
        
        console.log('[UserController] Lockout expiry check:', {
          lastFailedAttempt: lastFailedAttempt ? new Date(lastFailedAttempt).toISOString() : null,
          lockoutExpiry: new Date(lockoutExpiry).toISOString(),
          now: new Date(now).toISOString(),
          isExpired,
          remainingMs,
          remainingMinutes
        });
        
        if (!isExpired) {
          console.log('[UserController] ❌❌❌ ACCOUNT IS LOCKED ❌❌❌');
          console.log('[UserController] Remaining lockout time:', {
            milliseconds: remainingMs,
            minutes: remainingMinutes,
            hours: (remainingMinutes / 60).toFixed(2)
          });
          logger.warn(`Login attempt blocked: Account locked (${email || username}) from IP ${req.ip}, remaining: ${remainingMinutes} minutes`);
          const totalTime = Date.now() - startTime;
          console.log('[UserController] ⏱️ Total request time:', `${totalTime}ms`);
          console.log('========================================');
          return res.status(423).json({
            success: false,
            message: `Tài khoản đã bị khóa do đăng nhập sai quá nhiều lần. Vui lòng thử lại sau ${remainingMinutes} phút.`,
            lockoutExpiry: new Date(lockoutExpiry).toISOString(),
          });
        } else {
          // Lockout đã hết hạn, reset failed attempts
          console.log('[UserController] ✅ Lockout expired, resetting failed attempts...');
          const resetStart = Date.now();
          await user.resetFailedLoginAttempts(userData.user_id);
          const resetTime = Date.now() - resetStart;
          console.log('[UserController] ⏱️ Reset failed attempts time:', `${resetTime}ms`);
          userData.failed_login_attempts = 0;
          console.log('[UserController] ✅ Failed attempts reset to 0');
        }
      } else {
        console.log('[UserController] ✅ Account is not locked (failed attempts:', userData.failed_login_attempts || 0, '/', MAX_FAILED_ATTEMPTS, ')');
      }

      // Kiểm tra user đã bị vô hiệu hóa
      console.log('[UserController] 🔍 Step 8: Checking account active status...');
      console.log('[UserController] Account active check:', {
        isActive: userData.is_active,
        isActiveValue: userData.is_active,
        isActiveType: typeof userData.is_active,
        isActiveNumber: userData.is_active === 1,
        isActiveBoolean: userData.is_active === true
      });
      
      if (!userData.is_active) {
        console.log('[UserController] ❌❌❌ ACCOUNT IS INACTIVE ❌❌❌');
        console.log('[UserController] Account status:', {
          isActive: userData.is_active,
          userId: userData.user_id,
          username: userData.username,
          email: userData.email
        });
        logger.warn(`Login attempt blocked: Account inactive (${email || username}) from IP ${req.ip}`);
        const totalTime = Date.now() - startTime;
        console.log('[UserController] ⏱️ Total request time:', `${totalTime}ms`);
        console.log('========================================');
        return res.status(403).json({
          success: false,
          message: 'Tài khoản đã bị vô hiệu hóa. Vui lòng liên hệ quản trị viên.',
        });
      }
      console.log('[UserController] ✅ Account is active');

      // Kiểm tra email đã được xác thực chưa
      console.log('[UserController] 🔍 Step 8.5: Checking email verification status...');
      if (userData.email_verified !== 1) {
        console.log('[UserController] ❌❌❌ EMAIL NOT VERIFIED ❌❌❌');
        console.log('[UserController] Email verification status:', {
          emailVerified: userData.email_verified,
          email: userData.email,
          userId: userData.user_id
        });
        logger.warn(`Login attempt blocked: Email not verified (${email || username}) from IP ${req.ip}`);
        const totalTime = Date.now() - startTime;
        console.log('[UserController] ⏱️ Total request time:', `${totalTime}ms`);
        console.log('========================================');
        return res.status(403).json({
          success: false,
          message: 'Email chưa được xác thực. Vui lòng kiểm tra email và xác thực tài khoản trước khi đăng nhập.',
          requiresEmailVerification: true,
          email: userData.email,
        });
      }
      console.log('[UserController] ✅ Email is verified');

      // Verify password (luôn thực hiện để tránh timing attack)
      console.log('[UserController] 🔍 Step 9: Verifying password...');
      console.log('[UserController] Password verification details:', {
        passwordProvided: !!password,
        passwordLength: password?.length || 0,
        hasPasswordHash: !!userData.password_hash,
        passwordHashLength: userData.password_hash?.length || 0,
        passwordHashType: typeof userData.password_hash,
        passwordHashPrefix: userData.password_hash?.substring(0, 10) || 'N/A'
      });
      
      const passwordVerifyStart = Date.now();
      let isPasswordValid = false;
      try {
        console.log('[UserController] 🔐 Calling verifyPassword function...');
        isPasswordValid = await verifyPassword(password, userData.password_hash || '');
        const passwordVerifyTime = Date.now() - passwordVerifyStart;
        console.log('[UserController] ⏱️ Password verification time:', `${passwordVerifyTime}ms`);
        console.log('[UserController] Password verification result:', isPasswordValid);
      } catch (verifyError) {
        const passwordVerifyTime = Date.now() - passwordVerifyStart;
        console.error('[UserController] ❌❌❌ ERROR IN PASSWORD VERIFICATION ❌❌❌');
        console.error('[UserController] Error name:', verifyError.name);
        console.error('[UserController] Error message:', verifyError.message);
        console.error('[UserController] Error stack:', verifyError.stack);
        console.error('[UserController] ⏱️ Password verification time before error:', `${passwordVerifyTime}ms`);
        isPasswordValid = false;
      }
      
      if (!isPasswordValid) {
        console.log('[UserController] ❌❌❌ PASSWORD IS INVALID ❌❌❌');
        console.log('[UserController] Incrementing failed login attempts...');
        const incrementStart = Date.now();
        await user.incrementFailedLoginAttempts(userData.user_id);
        const incrementTime = Date.now() - incrementStart;
        console.log('[UserController] ⏱️ Increment failed attempts time:', `${incrementTime}ms`);
        
        const newAttempts = (userData.failed_login_attempts || 0) + 1;
        const remainingAttempts = MAX_FAILED_ATTEMPTS - newAttempts;
        
        console.log('[UserController] Failed login attempts status:', {
          previous: userData.failed_login_attempts || 0,
          current: newAttempts,
          max: MAX_FAILED_ATTEMPTS,
          remaining: remainingAttempts,
          willBeLocked: newAttempts >= MAX_FAILED_ATTEMPTS
        });
        
        logger.warn(`Login attempt failed: Invalid password (${email || username}, attempts: ${newAttempts}/${MAX_FAILED_ATTEMPTS}) from IP ${req.ip}`);
        
        // Delay để tránh brute force
        console.log('[UserController] ⏳ Delaying response to prevent brute force attack...');
        const delayStart = Date.now();
        await new Promise(resolve => setTimeout(resolve, 1000));
        const delayTime = Date.now() - delayStart;
        console.log('[UserController] ⏱️ Delay time:', `${delayTime}ms`);
        
        const totalTime = Date.now() - startTime;
        console.log('[UserController] ⏱️ Total request time:', `${totalTime}ms`);
        console.log('========================================');
        
        return res.status(401).json({
          success: false,
          message: 'Email/Username hoặc mật khẩu không đúng',
          remainingAttempts: remainingAttempts > 0 ? remainingAttempts : 0,
        });
      }
      
      console.log('[UserController] ✅✅✅ PASSWORD IS VALID ✅✅✅');

      // Đăng nhập thành công - Reset failed attempts
      console.log('[UserController] 🔍 Step 10: Processing successful login...');
      console.log('[UserController] ✅ Password is valid, proceeding with successful login');
      
      // Reset failed attempts
      console.log('[UserController] 🔄 Resetting failed login attempts...');
      const resetStart = Date.now();
      await user.resetFailedLoginAttempts(userData.user_id);
      const resetTime = Date.now() - resetStart;
      console.log('[UserController] ⏱️ Reset failed attempts time:', `${resetTime}ms`);
      console.log('[UserController] ✅ Reset failed login attempts');
      
      // Update last login
      console.log('[UserController] 🔄 Updating last login timestamp...');
      const updateLoginStart = Date.now();
      await user.updateLastLogin(userData.user_id);
      const updateLoginTime = Date.now() - updateLoginStart;
      console.log('[UserController] ⏱️ Update last login time:', `${updateLoginTime}ms`);
      console.log('[UserController] ✅ Updated last login timestamp');
      
      // Log successful login
      const loginDuration = Date.now() - startTime;
      console.log('[UserController] ✅✅✅ LOGIN SUCCESSFUL ✅✅✅');
      console.log('[UserController] Login summary:', {
        userId: userData.user_id,
        username: userData.username,
        email: userData.email,
        roleId: userData.role_id,
        roleName: userData.role_name || 'N/A',
        duration: `${loginDuration}ms`,
        timestamp: new Date().toISOString()
      });
      logger.info(`Login successful: ${email || username} (User ID: ${userData.user_id}) from IP ${req.ip} in ${loginDuration}ms`);

      // Tạo JWT token
      console.log('[UserController] 🔍 Step 11: Generating JWT tokens...');
      const tokenPayload = {
        userId: userData.user_id,
        username: userData.username,
        email: userData.email,
        roleId: userData.role_id,
      };
      console.log('[UserController] Token payload:', JSON.stringify(tokenPayload, null, 2));
      console.log('[UserController] Token payload details:', {
        userId: tokenPayload.userId,
        userIdType: typeof tokenPayload.userId,
        username: tokenPayload.username,
        email: tokenPayload.email,
        roleId: tokenPayload.roleId,
        roleIdType: typeof tokenPayload.roleId
      });

      console.log('[UserController] 🔑 Generating access token...');
      const accessTokenStart = Date.now();
      const accessToken = generateToken(tokenPayload);
      const accessTokenTime = Date.now() - accessTokenStart;
      console.log('[UserController] ⏱️ Access token generation time:', `${accessTokenTime}ms`);
      console.log('[UserController] Access token details:', {
        length: accessToken?.length || 0,
        prefix: accessToken?.substring(0, 20) || 'N/A',
        hasToken: !!accessToken
      });

      console.log('[UserController] 🔑 Generating refresh token...');
      const refreshTokenStart = Date.now();
      const refreshTokenPayload = { userId: userData.user_id };
      console.log('[UserController] Refresh token payload:', refreshTokenPayload);
      const refreshToken = generateRefreshToken(refreshTokenPayload);
      const refreshTokenTime = Date.now() - refreshTokenStart;
      console.log('[UserController] ⏱️ Refresh token generation time:', `${refreshTokenTime}ms`);
      console.log('[UserController] Refresh token details:', {
        length: refreshToken?.length || 0,
        prefix: refreshToken?.substring(0, 20) || 'N/A',
        hasToken: !!refreshToken
      });
      
      console.log('[UserController] ✅ Tokens generated successfully');
      console.log('[UserController] Tokens summary:', {
        accessTokenLength: accessToken?.length || 0,
        refreshTokenLength: refreshToken?.length || 0,
        totalGenerationTime: `${accessTokenTime + refreshTokenTime}ms`
      });

      // Cập nhật tokens vào database (lưu refresh token)
      console.log('[UserController] 🔍 Step 12: Saving tokens to database...');
      const saveTokensStart = Date.now();
      try {
        console.log('[UserController] Processing existing tokens...');
        let currentTokens = [];
        if (userData.tokens) {
          console.log('[UserController] Existing tokens found:', {
            type: typeof userData.tokens,
            isBuffer: Buffer.isBuffer(userData.tokens),
            length: userData.tokens?.length || 0
          });
          
          // Xử lý trường hợp tokens là Buffer hoặc string
          const tokensStr = Buffer.isBuffer(userData.tokens) 
            ? userData.tokens.toString('utf8') 
            : userData.tokens.toString();
          
          console.log('[UserController] Tokens string:', {
            length: tokensStr?.length || 0,
            isEmpty: !tokensStr || tokensStr.trim() === '',
            prefix: tokensStr?.substring(0, 50) || 'N/A'
          });
          
          if (tokensStr && tokensStr.trim() !== '') {
            try {
              currentTokens = JSON.parse(tokensStr);
              console.log('[UserController] ✅ Parsed existing tokens:', {
                count: currentTokens.length,
                types: currentTokens.map(t => t.type)
              });
            } catch (parseError) {
              console.error('[UserController] ⚠️ Error parsing existing tokens:', parseError.message);
              currentTokens = [];
            }
          }
        } else {
          console.log('[UserController] No existing tokens found');
        }
        
        console.log('[UserController] Current tokens count:', currentTokens.length);
        console.log('[UserController] Preparing new tokens array...');
        
        const newTokenEntry = {
          token: refreshToken,
          type: 'refresh',
          createdAt: new Date().toISOString(),
        };
        console.log('[UserController] New token entry:', {
          type: newTokenEntry.type,
          createdAt: newTokenEntry.createdAt,
          tokenLength: newTokenEntry.token.length
        });
        
        const newTokens = [
          ...currentTokens.filter(t => t.type !== 'refresh'),
          newTokenEntry,
        ].slice(-5); // Giữ tối đa 5 refresh tokens
        
        console.log('[UserController] New tokens array:', {
          totalCount: newTokens.length,
          refreshTokensCount: newTokens.filter(t => t.type === 'refresh').length
        });

        console.log('[UserController] 💾 Updating user tokens in database...');
        const updateStart = Date.now();
        await user.update(userData.user_id, {
          tokens: JSON.stringify(newTokens),
          updated_at: new Date(),
        });
        const updateTime = Date.now() - updateStart;
        console.log('[UserController] ⏱️ Database update time:', `${updateTime}ms`);
        console.log('[UserController] ✅ Tokens saved to database successfully');
        
        const saveTokensTime = Date.now() - saveTokensStart;
        console.log('[UserController] ⏱️ Total save tokens time:', `${saveTokensTime}ms`);
      } catch (tokenError) {
        // Nếu lỗi khi lưu tokens, vẫn cho phép đăng nhập thành công
        const saveTokensTime = Date.now() - saveTokensStart;
        console.error('[UserController] ⚠️⚠️⚠️ ERROR SAVING TOKENS ⚠️⚠️⚠️');
        console.error('[UserController] Error name:', tokenError.name);
        console.error('[UserController] Error message:', tokenError.message);
        console.error('[UserController] Error code:', tokenError.code);
        console.error('[UserController] Error stack:', tokenError.stack);
        console.error('[UserController] ⏱️ Save tokens time before error:', `${saveTokensTime}ms`);
        console.log('[UserController] ⚠️ Continuing login despite token save error...');
      }

      // Loại bỏ password_hash và sensitive data khỏi response
      console.log('[UserController] 🔍 Step 13: Preparing response data...');
      const { password_hash, tokens, sessions, ...userResponse } = userData;
      
      console.log('[UserController] User response data:', {
        userId: userResponse.user_id,
        username: userResponse.username,
        email: userResponse.email,
        roleId: userResponse.role_id,
        isActive: userResponse.is_active,
        emailVerified: userResponse.email_verified,
        excludedFields: ['password_hash', 'tokens', 'sessions']
      });

      const responseData = {
        user: userResponse,
        token: accessToken,
        refreshToken: refreshToken,
        expiresIn: '24h',
      };
      
      console.log('[UserController] 📤 Preparing success response...');
      console.log('[UserController] Response summary:', {
        success: true,
        userId: userResponse.user_id,
        username: userResponse.username,
        email: userResponse.email,
        roleId: userResponse.role_id,
        hasToken: !!accessToken,
        hasRefreshToken: !!refreshToken,
        tokenLength: accessToken?.length || 0,
        refreshTokenLength: refreshToken?.length || 0,
        expiresIn: '24h'
      });
      
      const totalTime = Date.now() - startTime;
      console.log('[UserController] ⏱️⏱️⏱️ TOTAL LOGIN PROCESS TIME:', `${totalTime}ms`);
      console.log('[UserController] ⏱️ Time breakdown:', {
        validation: '~' + Math.round(totalTime * 0.1) + 'ms',
        databaseSearch: '~' + Math.round(totalTime * 0.3) + 'ms',
        passwordVerify: '~' + Math.round(totalTime * 0.2) + 'ms',
        tokenGeneration: '~' + Math.round(totalTime * 0.2) + 'ms',
        tokenSave: '~' + Math.round(totalTime * 0.2) + 'ms'
      });
      console.log('[UserController] ✅✅✅ LOGIN COMPLETED SUCCESSFULLY ✅✅✅');
      console.log('========================================');
      
      return res.status(200).json({
        success: true,
        message: 'Đăng nhập thành công',
        data: responseData,
      });
    } catch (error) {
      const totalTime = Date.now() - startTime;
      console.error('[UserController] ❌❌❌❌❌ CRITICAL ERROR IN LOGIN FUNCTION ❌❌❌❌❌');
      console.error('[UserController] ========================================');
      console.error('[UserController] ⏱️ Time before error:', `${totalTime}ms`);
      console.error('[UserController] Error name:', error.name);
      console.error('[UserController] Error message:', error.message);
      console.error('[UserController] Error code:', error.code);
      console.error('[UserController] Error errno:', error.errno);
      console.error('[UserController] Error sqlState:', error.sqlState);
      console.error('[UserController] Error sqlMessage:', error.sqlMessage);
      console.error('[UserController] Error stack:', error.stack);
      console.error('[UserController] Error details:', {
        name: error.name,
        message: error.message,
        code: error.code,
        errno: error.errno,
        sqlState: error.sqlState,
        sqlMessage: error.sqlMessage
      });
      console.error('[UserController] Request context at error:', {
        ip: req.ip,
        method: req.method,
        url: req.originalUrl,
        hasEmail: !!req.body?.email,
        hasUsername: !!req.body?.username,
        hasPassword: !!req.body?.password,
        userDataFound: !!userData,
        userId: userData?.user_id || null
      });
      console.error('[UserController] ========================================');
      console.log('========================================');
      
      logger.error(`Error in login: ${error.message}`, {
        error: error,
        request: {
          ip: req.ip,
          method: req.method,
          url: req.originalUrl,
          body: {
            hasEmail: !!req.body?.email,
            hasUsername: !!req.body?.username,
            hasPassword: !!req.body?.password
          }
        },
        userData: userData ? {
          userId: userData.user_id,
          username: userData.username,
          email: userData.email
        } : null
      });
      
      return res.status(500).json({
        success: false,
        message: 'Lỗi khi đăng nhập',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Lỗi hệ thống',
      });
    }
  };

  /**
   * Đăng ký user mới
   */
  const register = async (req, res) => {
    console.log('========================================');
    console.log('[UserController] register function called');
    console.log('[UserController] Request IP:', req.ip);
    console.log('[UserController] Request URL:', req.originalUrl);
    console.log('[UserController] Request body:', JSON.stringify({
      ...req.body,
      password: req.body.password ? '[HIDDEN]' : undefined,
      password_hash: req.body.password_hash ? '[HIDDEN]' : undefined
    }, null, 2));
    
    try {
      const { email, username, password, password_hash, ...otherData } = req.body;
      console.log('[UserController] Extracted data:', {
        email,
        username,
        hasPassword: !!password,
        hasPasswordHash: !!password_hash,
        otherDataKeys: Object.keys(otherData)
      });

      // Validation
      if (!email || !username) {
        console.log('[UserController] ❌ Validation failed: Missing email or username');
        return res.status(400).json({
          success: false,
          message: 'Vui lòng cung cấp email và username',
        });
      }

      // Phải có password hoặc password_hash
      if (!password && !password_hash) {
        console.log('[UserController] ❌ Validation failed: Missing password');
        return res.status(400).json({
          success: false,
          message: 'Vui lòng cung cấp mật khẩu',
        });
      }

      // Kiểm tra email đã tồn tại
      console.log('[UserController] 🔍 Checking if email exists...');
      const existingEmail = await user.findByEmail(email);
      if (existingEmail) {
        console.log('[UserController] ❌ Email already exists');
        return res.status(400).json({
          success: false,
          message: 'Email đã được sử dụng',
        });
      }
      console.log('[UserController] ✅ Email is available');

      // Kiểm tra username đã tồn tại
      console.log('[UserController] 🔍 Checking if username exists...');
      const existingUsername = await user.findByUsername(username);
      if (existingUsername) {
        console.log('[UserController] ❌ Username already exists');
        return res.status(400).json({
          success: false,
          message: 'Username đã được sử dụng',
        });
      }
      console.log('[UserController] ✅ Username is available');

      // Hash password nếu có password (không có password_hash)
      let finalPasswordHash = password_hash;
      if (password && !password_hash) {
        console.log('[UserController] 🔐 Hashing password...');
        finalPasswordHash = await hashPassword(password);
        console.log('[UserController] ✅ Password hashed');
      }

      // ⚠️ WORKFLOW MỚI: KHÔNG tạo user ngay, chỉ tạo OTP với registration_data
      // User sẽ được tạo sau khi verify OTP thành công
      console.log('[UserController] 📝 Preparing registration data for OTP...');
      
      // ⚠️ BẢO MẬT: Loại bỏ role_id từ otherData nếu có (ngăn chặn privilege escalation)
      const { role_id: userProvidedRoleId, ...safeOtherData } = otherData;
      if (userProvidedRoleId !== undefined) {
        console.warn('[UserController] ⚠️  WARNING: User attempted to set role_id:', userProvidedRoleId);
        console.warn('[UserController] ⚠️  This is not allowed. Forcing role_id = 3 (Customer)');
      }
      
      const registrationData = {
        email,
        username,
        password_hash: finalPasswordHash,
        ...safeOtherData,
        role_id: 3, // BẮT BUỘC role khách hàng (role 3), không được là admin (1) hay shipper (2)
        is_active: 1,
        email_verified: 0,
      };
      console.log('[UserController] ✅ Registration data prepared with role_id = 3 (Customer)');

      // Gửi OTP email để xác thực
      let otpSent = false;
      let otpCode = null;
      let otpErrorDetails = null;
      
      try {
        console.log('[UserController] 📧 ========== SENDING OTP EMAIL ==========');
        console.log('[UserController] Email:', email);
        console.log('[UserController] Username:', username);
        console.log('[UserController] ⚠️  User will be created AFTER OTP verification');
        
        // Rate limiting: Tối đa 3 OTP trong 10 phút
        console.log('[UserController] 🔍 Checking rate limit...');
        let recentCount = 0;
        try {
          recentCount = await emailOtp.countRecentOTPs(email, 10);
          console.log('[UserController] Recent OTP count:', recentCount, '/ 3');
        } catch (rateLimitError) {
          console.error('[UserController] ❌ Error checking rate limit:', rateLimitError.message);
          throw rateLimitError;
        }
        
        // ⚠️ DEVELOPMENT MODE: Nếu rate limit đạt, vẫn cho phép tạo OTP và lưu vào DB (bỏ qua gửi email)
        const isDevelopment = process.env.NODE_ENV === 'development';
        const shouldCreateOTP = recentCount < 3 || isDevelopment;
        
        if (shouldCreateOTP) {
          // Tạo mã OTP 6 chữ số
          otpCode = Math.floor(100000 + Math.random() * 900000).toString();
          console.log('[UserController] ✅ Generated OTP code:', otpCode);
          
          // Thời gian hết hạn: 10 phút
          const expiresAt = new Date();
          expiresAt.setMinutes(expiresAt.getMinutes() + 10);
          console.log('[UserController] OTP expires at:', expiresAt.toISOString());
          
          // Lưu OTP vào database với registration_data (KHÔNG có user_id vì chưa tạo user)
          console.log('[UserController] 💾 Saving OTP to database with registration_data...');
          try {
            const otpResult = await emailOtp.create({
              email: email,
              otp_code: otpCode,
              user_id: null, // Chưa có user_id vì chưa tạo user
              purpose: 'email_verification',
              registration_data: registrationData, // Lưu thông tin đăng ký vào OTP record
              expires_at: expiresAt,
            });
            console.log('[UserController] ✅ OTP saved to database, ID:', otpResult.insertId);
            console.log('[UserController] ✅ Registration data stored in OTP record');
          } catch (dbError) {
            console.error('[UserController] ❌ Error saving OTP to database:', dbError.message);
            console.error('[UserController] Error stack:', dbError.stack);
            throw dbError;
          }
          
          // Gửi email (chỉ nếu chưa đạt rate limit hoặc trong production)
          if (recentCount < 3) {
            console.log('[UserController] 📨 Sending email via EmailService...');
            const emailResult = await EmailService.sendOTPEmail(email, otpCode, username);
            
            if (emailResult.success) {
              otpSent = true;
              console.log('[UserController] ✅✅✅ OTP EMAIL SENT SUCCESSFULLY ✅✅✅');
              console.log('[UserController] Email sent to:', email);
              console.log('[UserController] OTP code:', otpCode);
              console.log('[UserController] Message ID:', emailResult.messageId || 'N/A');
            } else {
              console.error('[UserController] ❌ Failed to send OTP email');
              console.error('[UserController] Error message:', emailResult.message);
              console.error('[UserController] Error code:', emailResult.errorCode || 'N/A');
              otpErrorDetails = emailResult.message;
              
              // Log specific error details
              if (emailResult.errorCode === 'EAUTH' || (emailResult.message && emailResult.message.includes('Invalid login')) || (emailResult.message && emailResult.message.includes('Application-specific password'))) {
                console.error('[UserController] ⚠️  GMAIL AUTHENTICATION ERROR');
                console.error('[UserController] ⚠️  Email service is not properly configured!');
                console.error('[UserController] ⚠️  Please check EMAIL_USERNAME and EMAIL_PASSWORD in .env');
                console.error('[UserController] ⚠️  For Gmail, you MUST use App Password (not regular password)');
                console.error('[UserController] ⚠️  Steps to fix:');
                console.error('[UserController]     1. Enable 2-Step Verification on Gmail');
                console.error('[UserController]     2. Generate App Password: https://myaccount.google.com/apppasswords');
                console.error('[UserController]     3. Use the 16-character App Password in EMAIL_PASSWORD');
                console.error('[UserController]     4. Restart the server');
              }
              
              // ⚠️ DEVELOPMENT MODE: Nếu email không gửi được nhưng OTP đã lưu vào DB, vẫn cho phép tiếp tục
              if (isDevelopment) {
                console.warn('[UserController] ⚠️  DEVELOPMENT MODE: Email failed but OTP saved to database');
                console.warn('[UserController] ⚠️  OTP can be retrieved via GET /api/auth/get-otp/:email');
                console.warn('[UserController] ⚠️  OTP Code:', otpCode);
                console.warn('[UserController] ⚠️  NOTE: In production, registration will FAIL if email cannot be sent!');
                otpSent = true; // Cho phép tiếp tục trong development mode
              } else {
                // PRODUCTION MODE: Không cho phép đăng ký nếu không gửi được email
                console.error('[UserController] ❌ PRODUCTION MODE: Cannot proceed without email verification');
              }
            }
          } else if (isDevelopment) {
            // Development mode: Rate limit đạt nhưng vẫn cho phép tiếp tục với OTP đã lưu
            console.warn('[UserController] ⚠️  DEVELOPMENT MODE: Rate limit reached but OTP saved to database');
            console.warn('[UserController] ⚠️  Rate limit:', recentCount, '/ 3 OTPs in last 10 minutes');
            console.warn('[UserController] ⚠️  OTP can be retrieved via GET /api/auth/get-otp/:email');
            console.warn('[UserController] ⚠️  OTP Code:', otpCode);
            otpSent = true; // Cho phép tiếp tục trong development mode
            otpErrorDetails = 'Rate limit reached, but OTP saved (development mode)';
          }
        } else {
          console.log('[UserController] ⚠️ Rate limit reached (', recentCount, 'OTPs in last 10 minutes), skipping OTP creation');
          otpErrorDetails = 'Rate limit reached. Please try again later.';
        }
      } catch (otpError) {
        console.error('[UserController] ❌❌❌ ERROR IN OTP SENDING PROCESS ❌❌❌');
        console.error('[UserController] Error name:', otpError.name);
        console.error('[UserController] Error message:', otpError.message);
        console.error('[UserController] Error code:', otpError.code);
        console.error('[UserController] Error stack:', otpError.stack);
        otpErrorDetails = otpError.message;
        // Nếu không gửi được OTP, không cho đăng ký
        return res.status(500).json({
          success: false,
          message: 'Không thể gửi mã OTP. Vui lòng thử lại sau.',
          error: process.env.NODE_ENV === 'development' ? otpError.message : undefined,
        });
      }
      
      console.log('[UserController] 📧 ========== OTP EMAIL PROCESS COMPLETED ==========');
      console.log('[UserController] OTP sent:', otpSent);
      console.log('[UserController] Error details:', otpErrorDetails || 'None');

      if (!otpSent) {
        console.error('[UserController] ❌ Cannot proceed without OTP email');
        return res.status(500).json({
          success: false,
          message: 'Không thể gửi mã OTP. Vui lòng thử lại sau.',
          error: otpErrorDetails || 'Unknown error',
        });
      }

      const responseMessage = 'Đăng ký thành công! Mã OTP đã được gửi đến email của bạn. Vui lòng kiểm tra hộp thư đến hoặc thư mục spam để xác thực tài khoản.';
      
      console.log('[UserController] ✅✅✅ REGISTRATION INITIATED (WAITING FOR OTP VERIFICATION) ✅✅✅');
      console.log('[UserController] Email:', email);
      console.log('[UserController] Username:', username);
      
      // ASSERTION: Đảm bảo không có user được tạo
      console.log('[UserController] 🔍 ASSERTION: Checking that NO user was created...');
      const userCheck = await user.findByEmail(email);
      if (userCheck) {
        console.error('[UserController] ❌❌❌ CRITICAL ERROR: User was created during registration! ❌❌❌');
        console.error('[UserController] User ID:', userCheck.user_id);
        console.error('[UserController] This should NOT happen! User should only be created after OTP verification.');
        // Không throw error, chỉ log để debug
      } else {
        console.log('[UserController] ✅ ASSERTION PASSED: No user exists (correct!)');
      }
      
      console.log('[UserController] 📤 Sending registration response...');
      
      // ASSERTION: Response không được có user data
      const responseData = {
        success: true,
        message: responseMessage,
        requiresEmailVerification: true,
        otpSent: otpSent,
        email: email,
      };
      
      // Đảm bảo không có user trong response
      if (responseData.user || responseData.data?.user) {
        console.error('[UserController] ❌❌❌ CRITICAL ERROR: Response contains user data! ❌❌❌');
        delete responseData.user;
        delete responseData.data;
      }
      
      return res.status(201).json(responseData);
    } catch (error) {
      console.error('[UserController] ❌❌❌ ERROR IN register ❌❌❌');
      console.error('[UserController] Error message:', error.message);
      console.error('[UserController] Error stack:', error.stack);
      console.error('[UserController] Error details:', {
        name: error.name,
        code: error.code
      });
      console.log('========================================');
      
      return res.status(400).json({
        success: false,
        message: 'Lỗi khi đăng ký',
        error: error.message,
      });
    }
  };

  /**
   * Lấy user theo email
   */
  const getByEmail = async (req, res) => {
    console.log('========================================');
    console.log('[UserController] getByEmail function called');
    console.log('[UserController] Request IP:', req.ip);
    console.log('[UserController] Params:', req.params);
    
    try {
      const { email } = req.params;
      console.log('[UserController] 🔍 Finding user by email:', email);
      
      const data = await user.findByEmail(email);

      if (!data) {
        console.log('[UserController] ❌ User not found');
        return res.status(404).json({
          success: false,
          message: 'Không tìm thấy user',
        });
      }

      console.log('[UserController] ✅ User found:', data.user_id);
      console.log('========================================');

      return res.status(200).json({
        success: true,
        data,
      });
    } catch (error) {
      console.error('[UserController] ❌❌❌ ERROR IN getByEmail ❌❌❌');
      console.error('[UserController] Error message:', error.message);
      console.error('[UserController] Error stack:', error.stack);
      console.log('========================================');
      
      return res.status(500).json({
        success: false,
        message: 'Lỗi khi lấy dữ liệu',
        error: error.message,
      });
    }
  };

  /**
   * Lấy user theo username
   */
  const getByUsername = async (req, res) => {
    console.log('========================================');
    console.log('[UserController] getByUsername function called');
    console.log('[UserController] Request IP:', req.ip);
    console.log('[UserController] Params:', req.params);
    
    try {
      const { username } = req.params;
      console.log('[UserController] 🔍 Finding user by username:', username);
      
      const data = await user.findByUsername(username);

      if (!data) {
        console.log('[UserController] ❌ User not found');
        return res.status(404).json({
          success: false,
          message: 'Không tìm thấy user',
        });
      }

      console.log('[UserController] ✅ User found:', data.user_id);
      console.log('========================================');

      return res.status(200).json({
        success: true,
        data,
      });
    } catch (error) {
      console.error('[UserController] ❌❌❌ ERROR IN getByUsername ❌❌❌');
      console.error('[UserController] Error message:', error.message);
      console.error('[UserController] Error stack:', error.stack);
      console.log('========================================');
      
      return res.status(500).json({
        success: false,
        message: 'Lỗi khi lấy dữ liệu',
        error: error.message,
      });
    }
  };

  /**
   * Lấy users theo role
   */
  const getByRole = async (req, res) => {
    console.log('========================================');
    console.log('[UserController] getByRole function called');
    console.log('[UserController] Request IP:', req.ip);
    console.log('[UserController] Params:', req.params);
    
    try {
      const { roleId } = req.params;
      console.log('[UserController] 🔍 Fetching users by roleId:', roleId);
      
      const data = await user.findByRole(roleId);
      console.log('[UserController] ✅ Users fetched:', data?.length || 0);
      console.log('========================================');

      return res.status(200).json({
        success: true,
        data,
      });
    } catch (error) {
      console.error('[UserController] ❌❌❌ ERROR IN getByRole ❌❌❌');
      console.error('[UserController] Error message:', error.message);
      console.error('[UserController] Error stack:', error.stack);
      console.log('========================================');
      
      return res.status(500).json({
        success: false,
        message: 'Lỗi khi lấy dữ liệu',
        error: error.message,
      });
    }
  };

  /**
   * Cập nhật last login
   */
  const updateLastLogin = async (req, res) => {
    console.log('========================================');
    console.log('[UserController] updateLastLogin function called');
    console.log('[UserController] Request IP:', req.ip);
    console.log('[UserController] Params:', req.params);
    
    try {
      const { id } = req.params;
      console.log('[UserController] 🔄 Updating last login for userId:', id);
      
      await user.updateLastLogin(id);
      console.log('[UserController] ✅✅✅ LAST LOGIN UPDATED SUCCESSFULLY ✅✅✅');
      console.log('========================================');

      return res.status(200).json({
        success: true,
        message: 'Cập nhật thành công',
      });
    } catch (error) {
      console.error('[UserController] ❌❌❌ ERROR IN updateLastLogin ❌❌❌');
      console.error('[UserController] Error message:', error.message);
      console.error('[UserController] Error stack:', error.stack);
      console.log('========================================');
      
      return res.status(400).json({
        success: false,
        message: 'Lỗi khi cập nhật',
        error: error.message,
      });
    }
  };

  /**
   * Tăng số lần đăng nhập sai
   */
  const incrementFailedAttempts = async (req, res) => {
    console.log('========================================');
    console.log('[UserController] incrementFailedAttempts function called');
    console.log('[UserController] Request IP:', req.ip);
    console.log('[UserController] Params:', req.params);
    
    try {
      const { id } = req.params;
      console.log('[UserController] ⚠️ Incrementing failed login attempts for userId:', id);
      
      await user.incrementFailedLoginAttempts(id);
      console.log('[UserController] ✅ Failed attempts incremented');
      console.log('========================================');

      return res.status(200).json({
        success: true,
        message: 'Cập nhật thành công',
      });
    } catch (error) {
      console.error('[UserController] ❌❌❌ ERROR IN incrementFailedAttempts ❌❌❌');
      console.error('[UserController] Error message:', error.message);
      console.error('[UserController] Error stack:', error.stack);
      console.log('========================================');
      
      return res.status(400).json({
        success: false,
        message: 'Lỗi khi cập nhật',
        error: error.message,
      });
    }
  };

  /**
   * Reset số lần đăng nhập sai
   */
  const resetFailedAttempts = async (req, res) => {
    console.log('========================================');
    console.log('[UserController] resetFailedAttempts function called');
    console.log('[UserController] Request IP:', req.ip);
    console.log('[UserController] Params:', req.params);
    
    try {
      const { id } = req.params;
      console.log('[UserController] 🔄 Resetting failed login attempts for userId:', id);
      
      await user.resetFailedLoginAttempts(id);
      console.log('[UserController] ✅✅✅ FAILED ATTEMPTS RESET SUCCESSFULLY ✅✅✅');
      console.log('========================================');

      return res.status(200).json({
        success: true,
        message: 'Reset thành công',
      });
    } catch (error) {
      console.error('[UserController] ❌❌❌ ERROR IN resetFailedAttempts ❌❌❌');
      console.error('[UserController] Error message:', error.message);
      console.error('[UserController] Error stack:', error.stack);
      console.log('========================================');
      
      return res.status(400).json({
        success: false,
        message: 'Lỗi khi reset',
        error: error.message,
      });
    }
  };

  /**
   * Cập nhật thông tin user
   */
  const updateProfile = async (req, res) => {
    console.log('========================================');
    console.log('[UserController] updateProfile function called');
    console.log('[UserController] Request IP:', req.ip);
    console.log('[UserController] Params:', req.params);
    console.log('[UserController] Request body:', JSON.stringify({
      ...req.body,
      password_hash: req.body.password_hash ? '[HIDDEN]' : undefined
    }, null, 2));
    
    try {
      const { id } = req.params;
      const { password_hash, email, username, ...updateData } = req.body;
      console.log('[UserController] Updating profile for userId:', id);
      console.log('[UserController] Update data:', {
        hasEmail: !!email,
        hasUsername: !!username,
        hasPasswordHash: !!password_hash,
        otherFields: Object.keys(updateData)
      });

      console.log('[UserController] 🔍 Checking if user exists...');
      const existing = await user.findById(id);
      if (!existing) {
        console.log('[UserController] ❌ User not found');
        return res.status(404).json({
          success: false,
          message: 'Không tìm thấy user',
        });
      }

      // Kiểm tra email/username đã tồn tại chưa (nếu thay đổi)
      if (email && email !== existing.email) {
        console.log('[UserController] 🔍 Checking if email exists...');
        const emailExists = await user.findByEmail(email);
        if (emailExists) {
          console.log('[UserController] ❌ Email already exists');
          return res.status(400).json({
            success: false,
            message: 'Email đã được sử dụng',
          });
        }
        console.log('[UserController] ✅ Email is available');
      }

      if (username && username !== existing.username) {
        console.log('[UserController] 🔍 Checking if username exists...');
        const usernameExists = await user.findByUsername(username);
        if (usernameExists) {
          console.log('[UserController] ❌ Username already exists');
          return res.status(400).json({
            success: false,
            message: 'Username đã được sử dụng',
          });
        }
        console.log('[UserController] ✅ Username is available');
      }

      console.log('[UserController] 💾 Updating user profile...');
      await user.update(id, {
        ...updateData,
        email: email || existing.email,
        username: username || existing.username,
        password_hash: password_hash || existing.password_hash,
        updated_at: new Date(),
      });

      const updated = await user.findById(id);
      console.log('[UserController] ✅✅✅ PROFILE UPDATED SUCCESSFULLY ✅✅✅');
      console.log('========================================');

      return res.status(200).json({
        success: true,
        message: 'Cập nhật thông tin thành công',
        data: updated,
      });
    } catch (error) {
      console.error('[UserController] ❌❌❌ ERROR IN updateProfile ❌❌❌');
      console.error('[UserController] Error message:', error.message);
      console.error('[UserController] Error stack:', error.stack);
      console.log('========================================');
      
      return res.status(400).json({
        success: false,
        message: 'Lỗi khi cập nhật',
        error: error.message,
      });
    }
  };

  /**
   * Refresh token
   */
  const refreshToken = async (req, res) => {
    console.log('========================================');
    console.log('[UserController] refreshToken function called');
    console.log('[UserController] Request IP:', req.ip);
    console.log('[UserController] Request URL:', req.originalUrl);
    console.log('[UserController] Request body:', JSON.stringify({
      ...req.body,
      refreshToken: req.body.refreshToken ? '[HIDDEN]' : undefined
    }, null, 2));
    
    const { logger } = require('../Middlewares/errorHandler');
    
    try {
      const { refreshToken: refreshTokenInput } = req.body;

      if (!refreshTokenInput || typeof refreshTokenInput !== 'string') {
        logger.warn(`Refresh token attempt failed: Missing token from IP ${req.ip}`);
        return res.status(400).json({
          success: false,
          message: 'Vui lòng cung cấp refresh token',
        });
      }

      // Verify refresh token
      const decoded = verifyRefreshToken(refreshTokenInput);
      if (!decoded || !decoded.userId) {
        logger.warn(`Refresh token attempt failed: Invalid token from IP ${req.ip}`);
        return res.status(401).json({
          success: false,
          message: 'Refresh token không hợp lệ hoặc đã hết hạn',
        });
      }

      // Tìm user
      const userData = await user.findById(decoded.userId);
      if (!userData) {
        logger.warn(`Refresh token attempt failed: User not found (ID: ${decoded.userId}) from IP ${req.ip}`);
        return res.status(401).json({
          success: false,
          message: 'Tài khoản không tồn tại',
        });
      }

      if (!userData.is_active) {
        logger.warn(`Refresh token attempt blocked: Account inactive (User ID: ${decoded.userId}) from IP ${req.ip}`);
        return res.status(403).json({
          success: false,
          message: 'Tài khoản đã bị vô hiệu hóa',
        });
      }

      // Kiểm tra refresh token có trong database không
      let tokens = [];
      if (userData.tokens) {
        try {
          const tokensStr = Buffer.isBuffer(userData.tokens)
            ? userData.tokens.toString('utf8')
            : userData.tokens.toString();
          if (tokensStr && tokensStr.trim() !== '') {
            tokens = JSON.parse(tokensStr);
          }
        } catch (e) {
          logger.error(`Error parsing tokens for user ${decoded.userId}: ${e.message}`);
        }
      }

      const tokenExists = tokens.some(t => t.token === refreshTokenInput && t.type === 'refresh');
      if (!tokenExists) {
        logger.warn(`Refresh token attempt failed: Token not found in database (User ID: ${decoded.userId}) from IP ${req.ip}`);
        return res.status(401).json({
          success: false,
          message: 'Refresh token không hợp lệ',
        });
      }

      // Tạo access token mới
      const tokenPayload = {
        userId: userData.user_id,
        username: userData.username,
        email: userData.email,
        roleId: userData.role_id,
      };

      const newAccessToken = generateToken(tokenPayload);

      logger.info(`Token refreshed successfully for user ${userData.user_id} from IP ${req.ip}`);

      return res.status(200).json({
        success: true,
        message: 'Refresh token thành công',
        data: {
          token: newAccessToken,
          expiresIn: '24h',
        },
      });
    } catch (error) {
      logger.error(`Error in refreshToken: ${error.message}`);
      return res.status(500).json({
        success: false,
        message: 'Lỗi khi refresh token',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined,
      });
    }
  };

  /**
   * Đăng xuất
   */
  const logout = async (req, res) => {
    console.log('========================================');
    console.log('[UserController] logout function called');
    console.log('[UserController] Request IP:', req.ip);
    console.log('[UserController] Request URL:', req.originalUrl);
    console.log('[UserController] User from token:', req.user);
    console.log('[UserController] Request body:', JSON.stringify({
      ...req.body,
      refreshToken: req.body.refreshToken ? '[HIDDEN]' : undefined
    }, null, 2));
    
    const { logger } = require('../Middlewares/errorHandler');
    
    try {
      const { refreshToken: refreshTokenInput } = req.body;
      const userId = req.user?.userId || req.body.userId;
      console.log('[UserController] Logging out userId:', userId);

      if (!userId) {
        console.log('[UserController] ❌ Missing user ID');
        logger.warn(`Logout attempt failed: Missing user ID from IP ${req.ip}`);
        return res.status(400).json({
          success: false,
          message: 'Không tìm thấy thông tin user',
        });
      }

      // Xóa refresh token khỏi database nếu có
      if (refreshTokenInput) {
        try {
          const userData = await user.findById(userId);
          if (userData && userData.tokens) {
            let tokens = [];
            try {
              const tokensStr = Buffer.isBuffer(userData.tokens)
                ? userData.tokens.toString('utf8')
                : userData.tokens.toString();
              if (tokensStr && tokensStr.trim() !== '') {
                tokens = JSON.parse(tokensStr);
              }
            } catch (e) {
              logger.error(`Error parsing tokens during logout for user ${userId}: ${e.message}`);
            }

            // Xóa refresh token
            const filteredTokens = tokens.filter(t => t.token !== refreshTokenInput);
            await user.update(userId, {
              tokens: JSON.stringify(filteredTokens),
              updated_at: new Date(),
            });
            
            logger.info(`Refresh token removed for user ${userId} from IP ${req.ip}`);
          }
        } catch (error) {
          logger.error(`Error removing refresh token for user ${userId}: ${error.message}`);
          // Không fail logout nếu lỗi xóa token
        }
      }

      logger.info(`Logout successful for user ${userId} from IP ${req.ip}`);

      return res.status(200).json({
        success: true,
        message: 'Đăng xuất thành công',
      });
    } catch (error) {
      logger.error(`Error in logout: ${error.message}`);
      return res.status(500).json({
        success: false,
        message: 'Lỗi khi đăng xuất',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined,
      });
    }
  };

  /**
   * Override getAll để filter active users
   */
  const getAll = async (req, res) => {
    try {
      const { page = 1, limit = 10, includeInactive = false, ...filters } = req.query;
      const offset = (parseInt(page) - 1) * parseInt(limit);

      if (!includeInactive) {
        filters.is_active = 1;
      }

      // Use single SQL query with window function COUNT(*) OVER() to get data and total count
      // This replaces Promise.all with 2 separate queries (findAll + count)
      const { data, total } = await user.findAllWithCount({
        filters,
        limit: parseInt(limit),
        offset,
        orderBy: req.query.orderBy || 'created_at DESC',
      });

      return res.status(200).json({
        success: true,
        data,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          totalPages: Math.ceil(total / parseInt(limit)),
        },
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: 'Lỗi khi lấy dữ liệu',
        error: error.message,
      });
    }
  };

  /**
   * Get current user profile (from token)
   */
  const getCurrentUser = async (req, res) => {
    console.log('========================================');
    console.log('[UserController] getCurrentUser function called');
    console.log('[UserController] Request IP:', req.ip);
    console.log('[UserController] Request URL:', req.originalUrl);
    console.log('[UserController] User from token:', req.user);
    
    try {
      if (!req.user || !req.user.userId) {
        console.log('[UserController] ❌ User not authenticated');
        return res.status(401).json({
          success: false,
          message: 'Vui lòng đăng nhập',
        });
      }

      console.log('[UserController] 🔍 Fetching user data for userId:', req.user.userId);
      const userData = await user.findById(req.user.userId);
      if (!userData) {
        console.log('[UserController] ❌ User not found');
        return res.status(404).json({
          success: false,
          message: 'Không tìm thấy user',
        });
      }

      // Loại bỏ sensitive data
      const { password_hash, tokens, sessions, ...userResponse } = userData;

      console.log('[UserController] ✅ User data fetched successfully');
      console.log('[UserController] User info:', {
        userId: userResponse.user_id,
        username: userResponse.username,
        email: userResponse.email,
        roleId: userResponse.role_id
      });
      console.log('========================================');

      return res.status(200).json({
        success: true,
        data: userResponse,
      });
    } catch (error) {
      console.error('[UserController] ❌❌❌ ERROR IN getCurrentUser ❌❌❌');
      console.error('[UserController] Error message:', error.message);
      console.error('[UserController] Error stack:', error.stack);
      console.log('========================================');
      
      const { logger } = require('../Middlewares/errorHandler');
      logger.error(`Error in getCurrentUser: ${error.message}`);
      return res.status(500).json({
        success: false,
        message: 'Lỗi khi lấy thông tin user',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined,
      });
    }
  };

  /**
   * Update current user profile (from token)
   */
  const updateCurrentUser = async (req, res) => {
    try {
      if (!req.user || !req.user.userId) {
        return res.status(401).json({
          success: false,
          message: 'Vui lòng đăng nhập',
        });
      }

      const { password_hash, email, username, role_id, is_active, ...updateData } = req.body;

      // Không cho phép thay đổi một số fields quan trọng
      if (email || username || role_id !== undefined || is_active !== undefined) {
        return res.status(403).json({
          success: false,
          message: 'Không thể thay đổi email, username, role hoặc trạng thái tài khoản từ đây',
        });
      }

      const result = await user.update(req.user.userId, updateData);
      const updatedUser = await user.findById(req.user.userId);

      // Loại bỏ sensitive data
      const { password_hash: _, tokens, sessions, ...userResponse } = updatedUser;

      return res.status(200).json({
        success: true,
        message: 'Cập nhật thành công',
        data: userResponse,
      });
    } catch (error) {
      const { logger } = require('../Middlewares/errorHandler');
      logger.error(`Error in updateCurrentUser: ${error.message}`);
      return res.status(500).json({
        success: false,
        message: 'Lỗi khi cập nhật thông tin',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined,
      });
    }
  };

  /**
   * Gửi OTP qua email
   * POST /api/auth/send-otp
   */
  const sendOTP = async (req, res) => {
    console.log('========================================');
    console.log('[UserController] sendOTP function called');
    console.log('[UserController] Request body:', JSON.stringify({
      ...req.body,
      email: req.body.email ? `${req.body.email.substring(0, 3)}***` : undefined
    }, null, 2));

    try {
      const { email, purpose = 'email_verification' } = req.body;

      if (!email) {
        return res.status(400).json({
          success: false,
          message: 'Vui lòng cung cấp email',
        });
      }

      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email.trim())) {
        return res.status(400).json({
          success: false,
          message: 'Email không hợp lệ',
        });
      }

      // Kiểm tra user có tồn tại không (cho email_verification)
      let userId = null;
      let userName = null;
      let registrationData = null;
      
      if (purpose === 'email_verification') {
        const userData = await user.findByEmail(email.trim());
        
        if (userData) {
          // User đã tồn tại
          userId = userData.user_id;
          userName = userData.username;

          // Kiểm tra email đã verify chưa
          if (userData.email_verified === 1) {
            return res.status(400).json({
              success: false,
              message: 'Email đã được xác thực rồi',
            });
          }
        } else {
          // User chưa tồn tại - tìm OTP record gần đây nhất có registration_data
          console.log('[UserController] 🔍 User not found, looking for recent OTP with registration_data...');
          const latestOTP = await emailOtp.findLatestOTP(email.trim(), purpose);
          
          if (latestOTP && latestOTP.registration_data) {
            // Parse registration_data
            try {
              registrationData = typeof latestOTP.registration_data === 'string' 
                ? JSON.parse(latestOTP.registration_data) 
                : latestOTP.registration_data;
              userName = registrationData.username;
              console.log('[UserController] ✅ Found registration_data from previous OTP');
            } catch (parseError) {
              console.error('[UserController] ❌ Error parsing registration_data:', parseError.message);
            }
          } else {
            // Không có OTP record với registration_data - có thể là resend OTP cho user chưa đăng ký
            console.log('[UserController] ⚠️  No registration_data found. This might be a resend request.');
            return res.status(404).json({
              success: false,
              message: 'Không tìm thấy thông tin đăng ký. Vui lòng đăng ký lại.',
            });
          }
        }
      }

      // Rate limiting: Tối đa 3 OTP trong 10 phút
      const recentCount = await emailOtp.countRecentOTPs(email.trim(), 10);
      if (recentCount >= 3) {
        return res.status(429).json({
          success: false,
          message: 'Bạn đã gửi quá nhiều mã OTP. Vui lòng đợi 10 phút trước khi thử lại.',
        });
      }

      // Tạo mã OTP 6 chữ số
      const otpCode = Math.floor(100000 + Math.random() * 900000).toString();

      // Thời gian hết hạn: 10 phút
      const expiresAt = new Date();
      expiresAt.setMinutes(expiresAt.getMinutes() + 10);

      // Lưu OTP vào database
      await emailOtp.create({
        email: email.trim(),
        otp_code: otpCode,
        user_id: userId,
        purpose,
        registration_data: registrationData, // Giữ lại registration_data nếu có
        expires_at: expiresAt,
      });

      // Gửi email
      if (!userName && userId) {
        const userData = await user.findById(userId);
        userName = userData?.username;
      }
      const emailResult = await EmailService.sendOTPEmail(email.trim(), otpCode, userName);

      if (!emailResult.success) {
        console.error('[UserController] ❌ Error sending OTP email:', emailResult.message);
        return res.status(500).json({
          success: false,
          message: emailResult.message || 'Lỗi khi gửi email. Vui lòng thử lại sau.',
        });
      }

      console.log('[UserController] ✅ OTP sent successfully to:', email.trim());
      console.log('========================================');

      return res.status(200).json({
        success: true,
        message: 'Mã OTP đã được gửi đến email của bạn. Vui lòng kiểm tra hộp thư.',
      });
    } catch (error) {
      console.error('[UserController] ❌❌❌ ERROR IN sendOTP ❌❌❌');
      console.error('[UserController] Error message:', error.message);
      console.error('[UserController] Error stack:', error.stack);
      console.log('========================================');

      return res.status(500).json({
        success: false,
        message: 'Lỗi khi gửi mã OTP',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined,
      });
    }
  };

  /**
   * Xác thực OTP
   * POST /api/auth/verify-otp
   */
  const verifyOTP = async (req, res) => {
    console.log('========================================');
    console.log('[UserController] verifyOTP function called');
    console.log('[UserController] Request body:', JSON.stringify({
      ...req.body,
      email: req.body.email ? `${req.body.email.substring(0, 3)}***` : undefined,
      otp: req.body.otp ? '***' : undefined
    }, null, 2));

    try {
      const { email, otp, purpose = 'email_verification' } = req.body;

      if (!email || !otp) {
        return res.status(400).json({
          success: false,
          message: 'Vui lòng cung cấp email và mã OTP',
        });
      }

      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email.trim())) {
        return res.status(400).json({
          success: false,
          message: 'Email không hợp lệ',
        });
      }

      // Validate OTP format (6 chữ số)
      const otpRegex = /^\d{6}$/;
      if (!otpRegex.test(otp.trim())) {
        return res.status(400).json({
          success: false,
          message: 'Mã OTP phải là 6 chữ số',
        });
      }

      // Tìm OTP hợp lệ
      console.log('[UserController] 🔍 Searching for valid OTP...');
      const otpRecord = await emailOtp.findValidOTP(email.trim(), otp.trim(), purpose);

      if (!otpRecord) {
        console.log('[UserController] ❌ Valid OTP not found');
        // Tăng số lần thử sai nếu có OTP record gần đây
        const latestOTP = await emailOtp.findLatestOTP(email.trim(), purpose);
        if (latestOTP) {
          console.log('[UserController] ⚠️  Incrementing attempts for latest OTP');
          await emailOtp.incrementAttempts(latestOTP.otp_id);
        }

        return res.status(400).json({
          success: false,
          message: 'Mã OTP không đúng hoặc đã hết hạn. Vui lòng thử lại.',
        });
      }

      console.log('[UserController] ✅ Valid OTP found');
      console.log('[UserController] OTP Record:', {
        otp_id: otpRecord.otp_id,
        email: otpRecord.email,
        user_id: otpRecord.user_id,
        has_registration_data: !!otpRecord.registration_data,
        purpose: otpRecord.purpose,
        attempts: otpRecord.attempts,
      });

      // Kiểm tra số lần thử sai (tối đa 5 lần)
      if (otpRecord.attempts >= 5) {
        return res.status(400).json({
          success: false,
          message: 'Bạn đã nhập sai quá nhiều lần. Vui lòng yêu cầu mã OTP mới.',
        });
      }

      // Đánh dấu OTP đã được verify
      await emailOtp.markAsVerified(otpRecord.otp_id);
      console.log('[UserController] ✅ OTP marked as verified');

      // Nếu là email verification
      if (purpose === 'email_verification') {
        // Nếu có user_id, chỉ cập nhật email_verified = 1 (trường hợp đã có user)
        if (otpRecord.user_id) {
          console.log('[UserController] 🔄 Updating existing user email_verified status...');
          await user.update(otpRecord.user_id, {
            email_verified: 1,
          });
          console.log('[UserController] ✅ Email verified for existing user:', otpRecord.user_id);
        } 
        // Nếu không có user_id nhưng có registration_data, tạo user mới
        else if (otpRecord.registration_data) {
          console.log('[UserController] 🆕 Creating new user from registration_data...');
          console.log('[UserController] 📦 Raw registration_data type:', typeof otpRecord.registration_data);
          console.log('[UserController] 📦 Raw registration_data (first 200 chars):', 
            typeof otpRecord.registration_data === 'string' 
              ? otpRecord.registration_data.substring(0, 200) 
              : JSON.stringify(otpRecord.registration_data).substring(0, 200));
          
          try {
            // Parse registration_data từ JSON string
            let registrationData;
            try {
              if (typeof otpRecord.registration_data === 'string') {
                console.log('[UserController] 🔄 Parsing registration_data from JSON string...');
                registrationData = JSON.parse(otpRecord.registration_data);
              } else {
                console.log('[UserController] ℹ️  registration_data is already an object');
                registrationData = otpRecord.registration_data;
              }
              console.log('[UserController] ✅ registration_data parsed successfully');
            } catch (parseError) {
              console.error('[UserController] ❌ Error parsing registration_data:', parseError.message);
              console.error('[UserController] Parse error stack:', parseError.stack);
              throw new Error('Dữ liệu đăng ký không hợp lệ');
            }

            console.log('[UserController] 📝 Registration data parsed:', {
              email: registrationData.email,
              username: registrationData.username,
              hasPasswordHash: !!registrationData.password_hash,
              role_id: registrationData.role_id,
              otherFields: Object.keys(registrationData).filter(k => !['email', 'username', 'password_hash', 'role_id', 'is_active', 'email_verified'].includes(k))
            });

            // ⚠️ BẢO MẬT: Đảm bảo role_id = 3 (khách hàng), không được là admin (1) hay shipper (2)
            if (registrationData.role_id !== 3) {
              console.warn('[UserController] ⚠️  WARNING: Invalid role_id detected:', registrationData.role_id);
              console.warn('[UserController] ⚠️  Forcing role_id = 3 (Customer)');
            }
            registrationData.role_id = 3; // BẮT BUỘC role khách hàng (role 3)
            registrationData.is_active = 1;
            registrationData.email_verified = 1; // Đã verify qua OTP

            // Tạo user mới
            console.log('[UserController] 💾 Creating user in database...');
            const createResult = await user.create(registrationData);
            console.log('[UserController] ✅ User created with ID:', createResult.insertId);

            // Lấy thông tin user vừa tạo
            const newUser = await user.findById(createResult.insertId);
            const { password_hash: _, ...userResponse } = newUser;

            console.log('[UserController] ✅✅✅ USER ACCOUNT CREATED SUCCESSFULLY ✅✅✅');
            console.log('[UserController] User ID:', userResponse.user_id);
            console.log('[UserController] Username:', userResponse.username);
            console.log('[UserController] Email:', userResponse.email);
            console.log('[UserController] Role ID:', userResponse.role_id);
            console.log('[UserController] Email Verified:', userResponse.email_verified);

            console.log('[UserController] ✅ OTP verified and user account created successfully');
            console.log('========================================');

            return res.status(200).json({
              success: true,
              message: 'Xác thực email thành công! Tài khoản của bạn đã được tạo.',
              data: {
                email: email.trim(),
                verified: true,
                user: userResponse,
              },
            });
          } catch (createError) {
            console.error('[UserController] ❌❌❌ ERROR CREATING USER ❌❌❌');
            console.error('[UserController] Error message:', createError.message);
            console.error('[UserController] Error stack:', createError.stack);
            console.log('========================================');

            return res.status(500).json({
              success: false,
              message: 'Lỗi khi tạo tài khoản. Vui lòng thử lại.',
              error: process.env.NODE_ENV === 'development' ? createError.message : undefined,
            });
          }
        } else {
          console.log('[UserController] ⚠️  No user_id and no registration_data found');
        }
      }

      console.log('[UserController] ✅ OTP verified successfully');
      console.log('========================================');

      return res.status(200).json({
        success: true,
        message: 'Xác thực email thành công',
        data: {
          email: email.trim(),
          verified: true,
        },
      });
    } catch (error) {
      console.error('[UserController] ❌❌❌ ERROR IN verifyOTP ❌❌❌');
      console.error('[UserController] Error message:', error.message);
      console.error('[UserController] Error stack:', error.stack);
      console.log('========================================');

      return res.status(500).json({
        success: false,
        message: 'Lỗi khi xác thực OTP',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined,
      });
    }
  };

  /**
   * Lấy OTP mới nhất từ database (chỉ cho development/testing)
   * GET /api/auth/get-otp/:email
   */
  const getLatestOTP = async (req, res) => {
    // Chỉ cho phép trong development
    if (process.env.NODE_ENV === 'production') {
      return res.status(403).json({
        success: false,
        message: 'Endpoint này chỉ khả dụng trong môi trường development',
      });
    }

    try {
      const { email } = req.params;
      const { purpose = 'email_verification' } = req.query;

      if (!email) {
        return res.status(400).json({
          success: false,
          message: 'Vui lòng cung cấp email',
        });
      }

      const otpRecord = await emailOtp.findLatestOTP(email, purpose);

      if (!otpRecord) {
        return res.status(404).json({
          success: false,
          message: 'Không tìm thấy OTP cho email này',
        });
      }

      return res.status(200).json({
        success: true,
        data: {
          otp_code: otpRecord.otp_code,
          email: otpRecord.email,
          expires_at: otpRecord.expires_at,
          verified: otpRecord.verified,
          attempts: otpRecord.attempts,
          has_registration_data: !!otpRecord.registration_data,
          user_id: otpRecord.user_id,
        },
      });
    } catch (error) {
      console.error('[UserController] ❌ Error in getLatestOTP:', error);
      return res.status(500).json({
        success: false,
        message: 'Lỗi khi lấy OTP',
        error: error.message,
      });
    }
  };

  return {
    ...baseController,
    login,
    register,
    refreshToken,
    logout,
    getCurrentUser,
    updateCurrentUser,
    getByEmail,
    getByUsername,
    getByRole,
    updateLastLogin,
    incrementFailedAttempts,
    resetFailedAttempts,
    updateProfile,
    getAll,
    sendOTP,
    verifyOTP,
    getLatestOTP,
  };
};

module.exports = createUserController();
