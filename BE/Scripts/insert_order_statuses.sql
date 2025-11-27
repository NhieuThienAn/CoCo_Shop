-- Script để insert các trạng thái đơn hàng vào database
-- Chạy script này để đảm bảo database có đầy đủ các trạng thái

-- Xóa các trạng thái cũ nếu có (optional)
-- DELETE FROM orderstatus;

-- Insert các trạng thái đơn hàng
INSERT INTO `orderstatus` (`status_id`, `status_name`, `sort_order`) VALUES
(1, 'Chờ xác nhận', 1),
(2, 'Đã xác nhận', 2),
(3, 'Đang giao hàng', 3),
(4, 'Đã giao hàng', 4),
(5, 'Đã hủy', 5),
(6, 'Trả hàng', 6)
ON DUPLICATE KEY UPDATE 
  `status_name` = VALUES(`status_name`),
  `sort_order` = VALUES(`sort_order`);

-- Kiểm tra kết quả
SELECT * FROM `orderstatus` ORDER BY `sort_order`;

