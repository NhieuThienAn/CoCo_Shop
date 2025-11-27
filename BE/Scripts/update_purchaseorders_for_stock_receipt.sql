-- Update purchaseorders table to allow NULL supplier_id for internal stock receipts
-- This allows using PurchaseOrder for both supplier orders and internal stock receipts

ALTER TABLE `purchaseorders` 
MODIFY COLUMN `supplier_id` int(11) NULL COMMENT 'NULL = nhập kho nội bộ, NOT NULL = đơn mua hàng từ supplier';

-- Add a type field to distinguish between purchase orders and stock receipts (optional)
-- ALTER TABLE `purchaseorders` 
-- ADD COLUMN `type` enum('purchase_order','stock_receipt') DEFAULT 'purchase_order' COMMENT 'Loại: purchase_order = đơn mua hàng, stock_receipt = phiếu nhập kho';

