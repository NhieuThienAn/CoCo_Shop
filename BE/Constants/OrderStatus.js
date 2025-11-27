/**
 * Order Status Constants
 * Định nghĩa các trạng thái đơn hàng
 */
module.exports = {
  // Trạng thái đơn hàng
  PENDING: {
    id: 1,
    name: 'Chờ xác nhận',
    code: 'PENDING',
    sortOrder: 1,
  },
  
  CONFIRMED: {
    id: 2,
    name: 'Đã xác nhận',
    code: 'CONFIRMED',
    sortOrder: 2,
  },
  
  SHIPPING: {
    id: 3,
    name: 'Đang giao hàng',
    code: 'SHIPPING',
    sortOrder: 3,
  },
  
  DELIVERED: {
    id: 4,
    name: 'Đã giao hàng',
    code: 'DELIVERED',
    sortOrder: 4,
  },
  
  CANCELLED: {
    id: 5,
    name: 'Đã hủy',
    code: 'CANCELLED',
    sortOrder: 5,
  },
  
  RETURNED: {
    id: 6,
    name: 'Trả hàng',
    code: 'RETURNED',
    sortOrder: 6,
  },
  
  COMPLETED: {
    id: 8,
    name: 'Hoàn thành',
    code: 'COMPLETED',
    sortOrder: 7,
  },

  // Helper functions
  getById: (id) => {
    const statuses = Object.values(module.exports).filter(s => s.id);
    return statuses.find(s => s.id === parseInt(id)) || null;
  },

  getByCode: (code) => {
    const statuses = Object.values(module.exports).filter(s => s.code);
    return statuses.find(s => s.code === code) || null;
  },

  getAll: () => {
    return Object.values(module.exports)
      .filter(s => s.id)
      .sort((a, b) => a.sortOrder - b.sortOrder);
  },

  /**
   * Kiểm tra transition hợp lệ dựa trên payment method
   * @param {number} fromStatusId - Trạng thái hiện tại
   * @param {number} toStatusId - Trạng thái muốn chuyển
   * @param {string} paymentMethod - 'COD' hoặc 'MOMO' hoặc null
   * @param {boolean} isPaid - Đã thanh toán chưa (cho MoMo)
   */
  isValidTransition: (fromStatusId, toStatusId, paymentMethod = null, isPaid = false) => {
    const fromId = parseInt(fromStatusId);
    const toId = parseInt(toStatusId);

    // CANCELLED và RETURNED không thể chuyển sang trạng thái khác
    if (fromId === 5 || fromId === 6) {
      return false;
    }

    // Không thể chuyển về PENDING
    if (toId === 1) {
      return false;
    }

    // Workflow cơ bản cho tất cả payment methods
    // [NEW REQUIREMENT] Workflow bắt buộc: không được nhảy bước, chỉ cho phép transition tuần tự
    const baseTransitions = {
      1: [2, 5], // PENDING -> CONFIRMED, CANCELLED
      2: [3, 5], // CONFIRMED -> SHIPPING, CANCELLED
      3: [4, 6], // SHIPPING -> DELIVERED, RETURNED
      4: [6, 8], // DELIVERED -> RETURNED, COMPLETED (sau khi admin confirm payment cho COD)
      8: [6], // COMPLETED -> RETURNED (chỉ có thể trả hàng)
    };

    // Kiểm tra base transition
    const allowed = baseTransitions[fromId] || [];
    if (!allowed.includes(toId)) {
      return false;
    }

    // Validation đặc biệt cho MoMo
    if (paymentMethod === 'MOMO' || paymentMethod === 'momo') {
      // PENDING -> CONFIRMED: Chỉ khi đã thanh toán MoMo thành công
      if (fromId === 1 && toId === 2) {
        return isPaid === true;
      }
      // Các transition khác cho MOMO: CONFIRMED -> SHIPPING, SHIPPING -> DELIVERED
      return true;
    }

    // Validation đặc biệt cho COD
    if (paymentMethod === 'COD' || paymentMethod === 'cod') {
      // COD: PENDING -> CONFIRMED luôn được phép (chưa cần thanh toán)
      // CONFIRMED -> SHIPPING: Được phép
      // SHIPPING -> DELIVERED: Thanh toán khi nhận hàng
      return true; // Base transitions đã đủ
    }

    // Nếu không có payment method info, chỉ kiểm tra base transitions
    return allowed.includes(toId);
  },

  /**
   * Kiểm tra có thể hủy không
   * [REQUIREMENT] Order CONFIRMED không thể hủy (cả customer và admin)
   * @param {number} statusId - Trạng thái hiện tại
   * @param {boolean} isCustomer - Có phải customer không (false = admin)
   */
  canCancel: (statusId, isCustomer = false) => {
    const status = parseInt(statusId);
    
    // [REQUIREMENT] Order CONFIRMED (status = 2) không thể hủy
    if (status === 2) {
      return false;
    }
    
    // Customer chỉ có thể hủy khi PENDING
    if (isCustomer) {
      return status === 1; // Chỉ PENDING
    }
    
    // Admin chỉ có thể hủy khi PENDING (không thể hủy CONFIRMED)
    return status === 1;
  },

  /**
   * Kiểm tra có thể trả hàng không
   */
  canReturn: (statusId) => {
    const returnableStatuses = [3, 4]; // SHIPPING, DELIVERED
    return returnableStatuses.includes(parseInt(statusId));
  },

  /**
   * Kiểm tra có thể xác nhận đơn hàng không (dựa trên payment method)
   */
  canConfirm: (statusId, paymentMethod = null, isPaid = false) => {
    if (parseInt(statusId) !== 1) {
      return false; // Chỉ có thể confirm từ PENDING
    }

    // MoMo: Phải đã thanh toán
    if (paymentMethod === 'MOMO' || paymentMethod === 'momo') {
      return isPaid === true;
    }

    // COD: Luôn được phép confirm
    return true;
  },

  /**
   * Kiểm tra có thể bắt đầu giao hàng không
   */
  canStartShipping: (statusId, paymentMethod = null, isPaid = false) => {
    if (parseInt(statusId) !== 2) {
      return false; // Chỉ có thể từ CONFIRMED
    }

    // MoMo: Phải đã thanh toán
    if (paymentMethod === 'MOMO' || paymentMethod === 'momo') {
      return isPaid === true;
    }

    // COD: Luôn được phép
    return true;
  },
};

