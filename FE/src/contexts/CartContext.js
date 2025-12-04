import React, { createContext, useContext, useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { flushSync } from 'react-dom';
import { cart as cartAPI } from '../api/index.js';
import { useAuth } from './AuthContext.js';

const CartContext = createContext(null);

const CART_STORAGE_KEY = 'coco_cart';
const CART_SYNC_TIMESTAMP_KEY = 'coco_cart_sync_timestamp';
const CART_SYNC_INTERVAL = 5 * 60 * 1000; // 5 minutes

export const CartProvider = ({ children }) => {
  const { user } = useAuth();
  const [cartItems, setCartItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const syncingRef = useRef(false); // Use ref to track syncing state without causing re-renders
  const hasSyncedRef = useRef(false); // Track if we've synced at least once to prevent infinite loops

  // Load cart from sessionStorage
  const loadCartFromStorage = useCallback(() => {
    try {
      const stored = sessionStorage.getItem(CART_STORAGE_KEY);
      if (stored) {
        const cartData = JSON.parse(stored);
        setCartItems(cartData.items || []);
        setTotal(cartData.total || 0);
        console.log('[CartContext] ✅ Loaded cart from sessionStorage:', {
          itemsCount: cartData.items?.length || 0,
          total: cartData.total || 0,
        });
      }
    } catch (error) {
      console.error('[CartContext] ❌ Error loading cart from storage:', error);
    }
  }, []);

  // Save cart to sessionStorage
  const saveCartToStorage = useCallback((items, cartTotal) => {
    try {
      const cartData = {
        items: items || [],
        total: cartTotal || 0,
        timestamp: Date.now(),
      };
      sessionStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cartData));
      sessionStorage.setItem(CART_SYNC_TIMESTAMP_KEY, Date.now().toString());
      console.log('[CartContext] 💾 Saved cart to sessionStorage:', {
        itemsCount: items?.length || 0,
        total: cartTotal || 0,
      });
    } catch (error) {
      console.error('[CartContext] ❌ Error saving cart to storage:', error);
    }
  }, []);

  // Clear cart from sessionStorage
  const clearCartFromStorage = useCallback(() => {
    try {
      sessionStorage.removeItem(CART_STORAGE_KEY);
      sessionStorage.removeItem(CART_SYNC_TIMESTAMP_KEY);
      console.log('[CartContext] 🗑️ Cleared cart from sessionStorage');
    } catch (error) {
      console.error('[CartContext] ❌ Error clearing cart from storage:', error);
    }
  }, []);

  // Sync cart with backend
  const syncCartWithBackend = useCallback(async (silent = false) => {
    if (!user || syncingRef.current) {
      if (!silent) {
        console.log('[CartContext] ⏭️ Skipping sync:', { user: !!user, syncing: syncingRef.current });
      }
      return;
    }

    try {
      syncingRef.current = true;
      setSyncing(true);
      if (!silent) {
        setLoading(true);
      }

      const response = await cartAPI.getCart();
      
      if (response.success && response.data) {
        const items = response.data.items || [];
        const cartTotal = response.data.total || 0;
        
        // CRITICAL: Always update state and session storage with data from database
        // This ensures session storage always matches database exactly
        // Database is the source of truth - we sync session storage to match it
        
        // Step 1: Update React state
        setCartItems(items);
        setTotal(cartTotal);
        
        // Step 2: Immediately save to session storage to keep it in sync with database
        // This is critical - session storage must match database after every sync
        saveCartToStorage(items, cartTotal);
        
        // Step 3: Verify the save was successful by reading it back
        const verifyData = JSON.parse(sessionStorage.getItem(CART_STORAGE_KEY) || '{}');
        const verifyItems = verifyData.items || [];
        const verifyTotal = verifyData.total || 0;
        const dataMatches = verifyItems.length === items.length && verifyTotal === cartTotal;
        
        // Step 4: If verification fails, try saving again
        if (!dataMatches) {
          console.warn('[CartContext] ⚠️ Session storage verification failed, retrying save...');
          saveCartToStorage(items, cartTotal);
        }
        
        if (!silent) {
          console.log('[CartContext] ✅ Synced cart with backend:', {
            itemsCount: items.length,
            total: cartTotal,
          });
          console.log('[CartContext] 💾 Session storage updated with database data:', {
            savedItemsCount: verifyItems.length,
            savedTotal: verifyTotal,
            match: dataMatches,
            verified: true
          });
        }
      }
    } catch (error) {
      console.error('[CartContext] ❌ Error syncing cart with backend:', error);
      if (!silent) {
        // If sync fails, try to use cached data
        loadCartFromStorage();
      }
    } finally {
      syncingRef.current = false;
      setSyncing(false);
      if (!silent) {
        setLoading(false);
      }
    }
  }, [user, saveCartToStorage, loadCartFromStorage]); // Remove cartItems and total from deps to prevent infinite loop

  // Load cart from sessionStorage on mount
  useEffect(() => {
    if (user) {
      loadCartFromStorage();
      // Sync with backend on mount if needed (only once per user)
      if (!hasSyncedRef.current) {
        syncCartWithBackend();
        hasSyncedRef.current = true;
      }
    } else {
      // Clear cart when user logs out
      clearCartFromStorage();
      setCartItems([]);
      setTotal(0);
      hasSyncedRef.current = false; // Reset sync flag on logout
    }
  }, [user, loadCartFromStorage, clearCartFromStorage, syncCartWithBackend]);

  // Auto-sync cart with backend periodically
  useEffect(() => {
    if (!user) return;

    const syncInterval = setInterval(() => {
      syncCartWithBackend(true); // Silent sync
    }, CART_SYNC_INTERVAL);

    return () => clearInterval(syncInterval);
  }, [user, syncCartWithBackend]);

  // Get cart (from cache or backend)
  const getCart = useCallback(async (forceRefresh = false) => {
    if (!user) {
      return { success: false, message: 'Vui lòng đăng nhập' };
    }

    // Only sync if force refresh or if we haven't synced yet and cart is empty
    // Don't sync every time cart is empty - it might actually be empty
    if (forceRefresh || (!hasSyncedRef.current && cartItems.length === 0)) {
      await syncCartWithBackend();
      hasSyncedRef.current = true;
    }

    return {
      success: true,
      data: {
        items: cartItems,
        total: total,
      },
    };
  }, [user, cartItems, total, syncCartWithBackend]);

  // Add to cart
  const addToCart = useCallback(async (productId, quantity = 1) => {
    if (!user) {
      return { success: false, message: 'Vui lòng đăng nhập' };
    }

    try {
      setLoading(true);
      
      // Optimistically update local state first for immediate UI feedback
      const existingItemIndex = cartItems.findIndex(item => {
        const itemProductId = item.product_id || item.id;
        return itemProductId === productId;
      });

      let updatedItems;
      if (existingItemIndex >= 0) {
        // Item already exists, increase quantity
        updatedItems = cartItems.map((item, index) => {
          if (index === existingItemIndex) {
            return { ...item, quantity: (item.quantity || 0) + quantity };
          }
          return item;
        });
      } else {
        // New item, add to cart (we'll get full product data from backend sync)
        // For now, create a temporary item structure
        updatedItems = [
          ...cartItems,
          {
            product_id: productId,
            id: productId,
            quantity: quantity,
            unit_price: 0, // Will be updated from backend
          }
        ];
      }

      // Tính tổng từ giá hiện tại của sản phẩm (product.price)
      // Nếu chưa có product data, dùng unit_price từ backend (đã được đồng bộ từ products)
      const updatedTotal = updatedItems.reduce((sum, item) => {
        const price = item.product?.price || item.unit_price || 0;
        return sum + (price * (item.quantity || 0));
      }, 0);

      // Update state first - this will trigger re-render immediately
      const newCount = updatedItems.reduce((sum, item) => sum + (item.quantity || 0), 0);
      console.log('[CartContext] Updating cart items optimistically:', {
        before: cartItems.length,
        after: updatedItems.length,
        beforeCount: cartItems.reduce((sum, item) => sum + (item.quantity || 0), 0),
        afterCount: newCount,
        newItem: { productId, quantity }
      });
      
      // Update state with flushSync to force immediate DOM update
      // This ensures the state update is processed synchronously
      flushSync(() => {
        setCartItems(updatedItems);
        setTotal(updatedTotal);
      });
      saveCartToStorage(updatedItems, updatedTotal);
      
      // Dispatch event immediately for instant UI update
      // Event is dispatched after state is flushed, so components will see the new state
      window.dispatchEvent(new CustomEvent('cartUpdated', { 
        detail: { 
          action: 'add', 
          productId, 
          quantity,
          newCount: newCount
        } 
      }));
      console.log('[CartContext] Cart updated event dispatched with count:', newCount);

      // Call API to add item to cart in database
      const response = await cartAPI.addToCart(productId, quantity);
      
      if (response.success) {
        // CRITICAL: Immediately sync with backend to get updated cart with full product data from database
        // This ensures session storage matches database exactly after adding item
        await syncCartWithBackend();
        
        // Wait a tiny bit to ensure state and session storage are fully updated
        // Then verify session storage contains the correct data from database
        await new Promise(resolve => setTimeout(resolve, 10)); // Small delay to ensure state update
        
        // Read session storage to verify it matches database
        const storedCartData = JSON.parse(sessionStorage.getItem(CART_STORAGE_KEY) || '{}');
        const storedItems = storedCartData.items || [];
        const storedTotal = storedCartData.total || 0;
        const finalCount = storedItems.reduce((sum, item) => sum + (item.quantity || 0), 0);
        
        // Double-check: if session storage doesn't match expected, force another sync
        const expectedItem = storedItems.find(item => {
          const itemProductId = item.product_id || item.id;
          return itemProductId === productId;
        });
        
        if (!expectedItem) {
          console.warn('[CartContext] ⚠️ Item not found in session storage after sync, re-syncing...');
          await syncCartWithBackend();
        }
        
        console.log('[CartContext] ✅ Cart synced with database after add:', {
          itemsCount: storedItems.length,
          total: storedTotal,
          count: finalCount,
          sessionStorageUpdated: true,
          productId: productId,
          itemFound: !!expectedItem
        });
        
        // Dispatch event for other components with accurate count from database
        window.dispatchEvent(new CustomEvent('cartUpdated', {
          detail: {
            action: 'sync',
            count: finalCount,
            source: 'database',
            productId: productId
          }
        }));
        return { success: true, message: 'Đã thêm vào giỏ hàng' };
      } else {
        // If API call failed, revert to backend state
        await syncCartWithBackend();
        return { success: false, message: response.message || 'Có lỗi xảy ra' };
      }
    } catch (error) {
      console.error('[CartContext] ❌ Error adding to cart:', error);
      // Revert to backend state on error
      await syncCartWithBackend();
      return { 
        success: false, 
        message: error.message || 'Có lỗi xảy ra khi thêm vào giỏ hàng' 
      };
    } finally {
      setLoading(false);
    }
  }, [user, cartItems, saveCartToStorage, syncCartWithBackend]);

  // Update cart item quantity
  const updateCartItem = useCallback(async (productId, quantity) => {
    if (!user) {
      return { success: false, message: 'Vui lòng đăng nhập' };
    }

    if (quantity <= 0) {
      return await removeFromCart(productId);
    }

    try {
      setLoading(true);
      const response = await cartAPI.updateCartItem(productId, quantity);
      
      if (response.success) {
        // Optimistically update local state
        const updatedItems = cartItems.map(item => {
          const itemProductId = item.product_id || item.id;
          if (itemProductId === productId) {
            return { ...item, quantity };
          }
          return item;
        });
        
        const updatedTotal = updatedItems.reduce((sum, item) => {
          return sum + ((item.unit_price || 0) * (item.quantity || 0));
        }, 0);
        
        setCartItems(updatedItems);
        setTotal(updatedTotal);
        saveCartToStorage(updatedItems, updatedTotal);
        
        // Calculate new count
        const newCount = updatedItems.reduce((sum, item) => sum + (item.quantity || 0), 0);
        
        // Sync with backend in background
        syncCartWithBackend(true);
        
        // Dispatch event for other components
        window.dispatchEvent(new CustomEvent('cartUpdated', {
          detail: {
            action: 'update',
            productId,
            quantity,
            count: newCount
          }
        }));
        
        return { success: true, message: 'Cập nhật số lượng thành công' };
      }
      
      return { success: false, message: response.message || 'Có lỗi xảy ra' };
    } catch (error) {
      console.error('[CartContext] ❌ Error updating cart item:', error);
      // Revert to backend state on error
      await syncCartWithBackend();
      return { 
        success: false, 
        message: error.message || 'Có lỗi xảy ra khi cập nhật' 
      };
    } finally {
      setLoading(false);
    }
  }, [user, cartItems, saveCartToStorage, syncCartWithBackend]);

  // Remove from cart
  const removeFromCart = useCallback(async (productId) => {
    if (!user) {
      return { success: false, message: 'Vui lòng đăng nhập' };
    }

    try {
      setLoading(true);
      const response = await cartAPI.removeFromCart(productId);
      
      if (response.success) {
        // Optimistically update local state
        const updatedItems = cartItems.filter(item => {
          const itemProductId = item.product_id || item.id;
          return itemProductId !== productId;
        });
        
        const updatedTotal = updatedItems.reduce((sum, item) => {
          return sum + ((item.unit_price || 0) * (item.quantity || 0));
        }, 0);
        
        setCartItems(updatedItems);
        setTotal(updatedTotal);
        saveCartToStorage(updatedItems, updatedTotal);
        
        // Calculate new count
        const newCount = updatedItems.reduce((sum, item) => sum + (item.quantity || 0), 0);
        
        // Sync with backend in background
        syncCartWithBackend(true);
        
        // Dispatch event for other components
        window.dispatchEvent(new CustomEvent('cartUpdated', {
          detail: {
            action: 'remove',
            productId,
            count: newCount
          }
        }));
        
        return { success: true, message: 'Đã xóa sản phẩm khỏi giỏ hàng' };
      }
      
      return { success: false, message: response.message || 'Có lỗi xảy ra' };
    } catch (error) {
      console.error('[CartContext] ❌ Error removing from cart:', error);
      // Revert to backend state on error
      await syncCartWithBackend();
      return { 
        success: false, 
        message: error.message || 'Có lỗi xảy ra khi xóa' 
      };
    } finally {
      setLoading(false);
    }
  }, [user, cartItems, saveCartToStorage, syncCartWithBackend]);

  // Clear cart
  const clearCart = useCallback(async () => {
    if (!user) {
      return { success: false, message: 'Vui lòng đăng nhập' };
    }

    try {
      setLoading(true);
      const response = await cartAPI.clearCart();
      
      if (response.success) {
        setCartItems([]);
        setTotal(0);
        clearCartFromStorage();
        
        // Dispatch event for other components
        window.dispatchEvent(new CustomEvent('cartUpdated', {
          detail: {
            action: 'clear',
            count: 0
          }
        }));
        
        return { success: true, message: 'Đã xóa tất cả sản phẩm' };
      }
      
      return { success: false, message: response.message || 'Có lỗi xảy ra' };
    } catch (error) {
      console.error('[CartContext] ❌ Error clearing cart:', error);
      return { 
        success: false, 
        message: error.message || 'Có lỗi xảy ra khi xóa' 
      };
    } finally {
      setLoading(false);
    }
  }, [user, clearCartFromStorage]);

  // Buy now (clear cart and add single product)
  const buyNow = useCallback(async (productId, quantity = 1) => {
    if (!user) {
      return { success: false, message: 'Vui lòng đăng nhập' };
    }

    try {
      setLoading(true);
      const response = await cartAPI.buyNow(productId, quantity);
      
      if (response.success) {
        // Sync with backend to get updated cart
        await syncCartWithBackend();
        // Get updated count from state after sync
        // The syncCartWithBackend will update cartItems state, so we can calculate from there
        // But we need to wait a bit for state to update, so we'll use the response data if available
        const count = response.data?.items 
          ? response.data.items.reduce((sum, item) => sum + (item.quantity || 0), 0)
          : 0;
        // Dispatch event for other components
        window.dispatchEvent(new CustomEvent('cartUpdated', {
          detail: {
            action: 'buyNow',
            productId,
            quantity,
            count: count
          }
        }));
        return { success: true, message: 'Đã thêm vào giỏ hàng' };
      }
      
      return { success: false, message: response.message || 'Có lỗi xảy ra' };
    } catch (error) {
      console.error('[CartContext] ❌ Error in buy now:', error);
      return { 
        success: false, 
        message: error.message || 'Có lỗi xảy ra' 
      };
    } finally {
      setLoading(false);
    }
  }, [user, syncCartWithBackend]);

  // Get cart count (total quantity of items)
  const getCartCount = useMemo(() => {
    return cartItems.reduce((sum, item) => sum + (item.quantity || 0), 0);
  }, [cartItems]);

  // Get cart total
  const getCartTotal = useMemo(() => {
    return total;
  }, [total]);

  const value = useMemo(() => ({
    cartItems,
    total,
    loading,
    syncing,
    getCart,
    addToCart,
    updateCartItem,
    removeFromCart,
    clearCart,
    buyNow,
    syncCartWithBackend,
    getCartCount,
    getCartTotal,
  }), [
    cartItems,
    total,
    loading,
    syncing,
    getCart,
    addToCart,
    updateCartItem,
    removeFromCart,
    clearCart,
    buyNow,
    syncCartWithBackend,
    getCartCount,
    getCartTotal,
  ]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
};

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within CartProvider');
  }
  return context;
};

