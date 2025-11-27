-- Create stockreceipts table for stock receipt management
CREATE TABLE IF NOT EXISTS `stockreceipts` (
  `receipt_id` int(11) NOT NULL AUTO_INCREMENT,
  `receipt_number` varchar(100) NOT NULL,
  `status` enum('pending','approved','rejected') DEFAULT 'pending' COMMENT 'Trạng thái: pending = chờ xác nhận, approved = đã duyệt, rejected = từ chối',
  `items` longtext DEFAULT NULL COMMENT 'Mảng JSON chứa các items của phiếu nhập kho: [{"product_id": 1, "quantity": 10}, ...]',
  `notes` text DEFAULT NULL COMMENT 'Ghi chú',
  `created_by` int(11) DEFAULT NULL COMMENT 'Người tạo (user_id)',
  `approved_by` int(11) DEFAULT NULL COMMENT 'Người duyệt (user_id)',
  `approved_at` datetime DEFAULT NULL COMMENT 'Thời gian duyệt',
  `rejection_reason` text DEFAULT NULL COMMENT 'Lý do từ chối (nếu bị rejected)',
  `created_at` datetime DEFAULT current_timestamp(),
  `updated_at` datetime DEFAULT NULL ON UPDATE current_timestamp(),
  PRIMARY KEY (`receipt_id`),
  UNIQUE KEY `receipt_number` (`receipt_number`),
  KEY `idx_stockreceipts_status` (`status`),
  KEY `idx_stockreceipts_created_by` (`created_by`),
  KEY `idx_stockreceipts_approved_by` (`approved_by`),
  CONSTRAINT `stockreceipts_ibfk_1` FOREIGN KEY (`created_by`) REFERENCES `users` (`user_id`) ON DELETE SET NULL,
  CONSTRAINT `stockreceipts_ibfk_2` FOREIGN KEY (`approved_by`) REFERENCES `users` (`user_id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

