-- Script tạo bảng email_otps để lưu trữ mã OTP xác thực email
-- Chạy script này để tạo bảng trong database

CREATE TABLE IF NOT EXISTS `email_otps` (
  `otp_id` int(11) NOT NULL AUTO_INCREMENT,
  `email` varchar(255) NOT NULL,
  `otp_code` varchar(10) NOT NULL COMMENT 'Mã OTP (6 chữ số)',
  `user_id` int(11) DEFAULT NULL COMMENT 'ID của user (nếu có)',
  `purpose` varchar(50) NOT NULL DEFAULT 'email_verification' COMMENT 'Mục đích: email_verification, password_reset, etc.',
  `registration_data` longtext DEFAULT NULL COMMENT 'JSON chứa thông tin đăng ký tạm thời (chỉ dùng khi user_id = NULL)',
  `expires_at` datetime NOT NULL COMMENT 'Thời gian hết hạn',
  `verified` tinyint(1) NOT NULL DEFAULT 0 COMMENT 'Đã verify chưa',
  `attempts` int(11) NOT NULL DEFAULT 0 COMMENT 'Số lần thử sai',
  `created_at` datetime DEFAULT current_timestamp(),
  `verified_at` datetime DEFAULT NULL COMMENT 'Thời gian verify',
  PRIMARY KEY (`otp_id`),
  KEY `idx_email_otp` (`email`, `otp_code`, `verified`),
  KEY `idx_email_purpose` (`email`, `purpose`),
  KEY `idx_expires_at` (`expires_at`),
  KEY `idx_user_id` (`user_id`),
  CONSTRAINT `email_otps_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci COMMENT='Bảng lưu trữ mã OTP xác thực email';

-- Tạo index để tối ưu query
CREATE INDEX IF NOT EXISTS `idx_email_verified_expires` ON `email_otps` (`email`, `verified`, `expires_at`);

