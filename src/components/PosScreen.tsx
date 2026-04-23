'use client';

import { useEffect, useState, useCallback } from 'react';
import { usePosStore } from '@/lib/store';
import type { ActiveView } from '@/app/page';
import PaymentModal from './PaymentModal';
import ReceiptModal from './ReceiptModal';

interface Category { id: number; name: string; name_ar: string; icon: string; color: string; }
interface Product { id: number; category_id: number; name: string; name_ar: string; price: number; track_stock: number; current_stock: number; }

export default function PosScreen({ setView }: { setView: (v: ActiveView) => void }) {
  const { currentUser, activePeriod, activeShift, cart, addToCart, removeFromCart, updateQuantity, clearCart, activeCategory, setActiveCategory } = usePosStore();
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [showPayment, setShowPayment] = useState(false);
  const [lastOrder, setLastOrder] = useState<any>(null);
  const [showReceipt, setShowReceipt] = useState(false);
  const [discount, setDiscount] = useState(0);
  const [search, setSearch] = useState('');

  const subtotal = cart.reduce((s, i) => s + i.price * i.quantity, 0);
  const total = Math.max(0, subtotal - discount);

  useEffect(() => {
    fetch('/api/categories').then(r => r.json()).then(setCategories);
    fetch('/api/products').then(r => r.json()).then(p => {
      setProducts(p);
      setFilteredProducts(p);
    });
  }, []);

  useEffect(() => {
    let filtered = products;
    if (activeCategory) filtered = filtered.filter(p => p.category_id === activeCategory);
    if (search) filtered = filtered.filter(p => (p.name_ar || p.name).toLowerCase().includes(search.toLowerCase()));
    setFilteredProducts(filtered);
  }, [activeCategory, products, search]);

  const handleOrderComplete = (order: any) => {
    setLastOrder(order);
    setShowPayment(false);
    setShowReceipt(true);
    clearCart();
    setDiscount(0);
  };

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {/* Top Bar */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: '12px',
        padding: '12px 20px',
        background: 'var(--bg-secondary)',
        borderBottom: '1px solid var(--border)',
        flexShrink: 0,
      }}>
        <button className="btn btn-ghost btn-sm" onClick={() => setView('dashboard')}>
          ← عودة
        </button>
        <div style={{ width: '1px', height: '24px', background: 'var(--border)' }} />
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '10px' }}>
          <img src="/logo.png" style={{ width: '32px', height: '32px', borderRadius: '8px' }} alt="" />
          <span style={{ fontSize: '16px', fontWeight: 900 }}>حلواني طلعت</span>
          <div style={{ width: '1px', height: '16px', background: 'var(--border)', margin: '0 4px' }} />
          {activeShift ? (
            <span className="badge badge-success">وردية نشطة</span>
          ) : (
            <span className="badge badge-danger">لا يوجد وردية</span>
          )}
          {activePeriod ? (
            <span className="badge badge-info">اليومية مفتوحة</span>
          ) : (
            <span className="badge badge-warning">اليومية مغلقة</span>
          )}
        </div>
        <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>👤 {currentUser?.name}</span>
      </div>

      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        {/* LEFT: Categories + Products */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', borderLeft: '1px solid var(--border)' }}>
          {/* Search */}
          <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)' }}>
            <input
              className="input"
              placeholder="🔍 ابحث عن المنتجات..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{ fontSize: '14px', padding: '10px 14px' }}
            />
          </div>

          {/* Categories */}
          <div style={{
            display: 'flex', gap: '8px', padding: '12px 16px',
            overflowX: 'auto', flexShrink: 0,
            borderBottom: '1px solid var(--border)',
          }}>
            <button
              onClick={() => { setActiveCategory(null); setSearch(''); }}
              style={{
                flexShrink: 0, padding: '8px 16px', borderRadius: '10px', border: 'none',
                cursor: 'pointer', fontWeight: 600, fontSize: '13px', transition: 'all 0.2s',
                background: !activeCategory ? 'linear-gradient(135deg, #8B5CF6, #7C3AED)' : 'rgba(255,255,255,0.06)',
                color: !activeCategory ? 'white' : 'var(--text-secondary)',
                boxShadow: !activeCategory ? '0 4px 16px rgba(139,92,246,0.4)' : 'none',
              }}
            >
              الكل
            </button>
            {categories.map(cat => (
              <button
                key={cat.id}
                onClick={() => { setActiveCategory(cat.id); setSearch(''); }}
                style={{
                  flexShrink: 0, padding: '8px 16px', borderRadius: '10px', border: 'none',
                  cursor: 'pointer', fontWeight: 600, fontSize: '13px', transition: 'all 0.2s',
                  background: activeCategory === cat.id ? `${cat.color}` : 'rgba(255,255,255,0.06)',
                  color: activeCategory === cat.id ? 'white' : 'var(--text-secondary)',
                  boxShadow: activeCategory === cat.id ? `0 4px 16px ${cat.color}60` : 'none',
                  display: 'flex', alignItems: 'center', gap: '6px',
                }}
              >
                <span>{cat.icon}</span>
                {cat.name_ar || cat.name}
              </button>
            ))}
          </div>

          {/* Products Grid */}
          <div style={{
            flex: 1, overflowY: 'auto', padding: '16px',
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))',
            gap: '12px',
            alignContent: 'start',
          }}>
            {filteredProducts.map(product => {
              const inCart = cart.find(c => c.productId === product.id);
              const productName = product.name_ar || product.name;
              return (
                <button
                  key={product.id}
                  onClick={() => addToCart({ productId: product.id, name: productName, price: product.price })}
                  style={{
                    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                    gap: '8px', padding: '16px 12px',
                    background: inCart ? 'rgba(139,92,246,0.15)' : 'var(--bg-card)',
                    border: `1px solid ${inCart ? 'rgba(139,92,246,0.5)' : 'var(--border)'}`,
                    borderRadius: '14px', cursor: 'pointer',
                    transition: 'all 0.18s ease', color: 'var(--text-primary)',
                    position: 'relative',
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.transform = 'scale(1.03)';
                    e.currentTarget.style.boxShadow = '0 8px 24px rgba(139,92,246,0.3)';
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.transform = 'scale(1)';
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                >
                  {inCart && (
                    <div style={{
                      position: 'absolute', top: '8px', right: '8px',
                      width: '22px', height: '22px', borderRadius: '50%',
                      background: 'var(--accent)', color: 'white',
                      fontSize: '11px', fontWeight: 700,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      {inCart.quantity}
                    </div>
                  )}
                  <div style={{ fontSize: '28px' }}>
                    {categories.find(c => c.id === product.category_id)?.icon || '🍽️'}
                  </div>
                  <p style={{ fontSize: '13px', fontWeight: 600, textAlign: 'center', lineHeight: 1.3 }}>{productName}</p>
                  <p style={{ fontSize: '15px', fontWeight: 800, color: '#a78bfa' }}>{product.price} ج.م</p>
                </button>
              );
            })}
            {filteredProducts.length === 0 && (
              <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                لا توجد منتجات
              </div>
            )}
          </div>
        </div>

        {/* RIGHT: Cart */}
        <div style={{
          width: '360px', flexShrink: 0, display: 'flex', flexDirection: 'column',
          background: 'var(--bg-secondary)',
        }}>
          {/* Cart Header */}
          <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <h2 style={{ fontSize: '15px', fontWeight: 700 }}>🛒 السلة ({cart.length} عناصر)</h2>
            {cart.length > 0 && (
              <button className="btn btn-ghost btn-sm" onClick={clearCart} style={{ fontSize: '12px', padding: '6px 10px' }}>مسح</button>
            )}
          </div>

          {/* Cart Items */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '12px' }}>
            {cart.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-muted)' }}>
                <div style={{ fontSize: '48px', marginBottom: '12px' }}>🛍️</div>
                <p style={{ fontSize: '14px' }}>السلة فارغة</p>
                <p style={{ fontSize: '12px', marginTop: '4px' }}>اضغط على المنتجات لإضافتها</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {cart.map(item => (
                  <div key={item.productId} style={{
                    display: 'flex', alignItems: 'center', gap: '10px',
                    padding: '12px', background: 'var(--bg-card)',
                    borderRadius: '12px', border: '1px solid var(--border)',
                  }}>
                    <div style={{ flex: 1 }}>
                      <p style={{ fontSize: '13px', fontWeight: 600 }}>{item.name}</p>
                      <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{item.price} ج.م للقطعة</p>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', direction: 'ltr' }}>
                      <button
                        onClick={() => updateQuantity(item.productId, item.quantity - 1)}
                        style={{
                          width: '28px', height: '28px', borderRadius: '8px', border: '1px solid var(--border)',
                          background: 'rgba(255,255,255,0.06)', color: 'var(--text-primary)',
                          cursor: 'pointer', fontWeight: 700, fontSize: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}
                      >−</button>
                      <span style={{ width: '28px', textAlign: 'center', fontWeight: 700 }}>{item.quantity}</span>
                      <button
                        onClick={() => updateQuantity(item.productId, item.quantity + 1)}
                        style={{
                          width: '28px', height: '28px', borderRadius: '8px', border: '1px solid rgba(139,92,246,0.4)',
                          background: 'rgba(139,92,246,0.15)', color: '#a78bfa',
                          cursor: 'pointer', fontWeight: 700, fontSize: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}
                      >+</button>
                    </div>
                    <div style={{ textAlign: 'left', minWidth: '60px' }}>
                      <p style={{ fontSize: '14px', fontWeight: 700 }}>{(item.price * item.quantity).toFixed(2)} ج.م</p>
                    </div>
                    <button
                      onClick={() => removeFromCart(item.productId)}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444', fontSize: '16px', padding: '2px' }}
                    >✕</button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Cart Summary */}
          {cart.length > 0 && (
            <div style={{ padding: '16px 20px', borderTop: '1px solid var(--border)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>الإجمالي الفرعي</span>
                <span style={{ fontWeight: 600 }}>{subtotal.toFixed(2)} ج.م</span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                <span style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>خصم</span>
                <input
                  type="number"
                  min="0"
                  value={discount || ''}
                  onChange={e => setDiscount(parseFloat(e.target.value) || 0)}
                  placeholder="0"
                  className="input"
                  style={{ flex: 1, padding: '6px 10px', fontSize: '13px', textAlign: 'left' }}
                />
              </div>

              <div style={{
                display: 'flex', justifyContent: 'space-between',
                padding: '12px', background: 'rgba(139,92,246,0.1)', borderRadius: '10px',
                border: '1px solid rgba(139,92,246,0.3)', marginBottom: '12px',
              }}>
                <span style={{ fontWeight: 700, fontSize: '16px' }}>الإجمالي</span>
                <span style={{ fontWeight: 900, fontSize: '20px', color: '#a78bfa', direction: 'ltr' }}>{total.toFixed(2)} ج.م</span>
              </div>

              <button
                className="btn btn-success btn-lg"
                onClick={() => setShowPayment(true)}
                disabled={!activePeriod || !activeShift}
                style={{ width: '100%', fontSize: '16px' }}
              >
                {!activePeriod ? '⚠️ افتح اليومية أولاً' : !activeShift ? '⚠️ افتح وردية أولاً' : '💳 ادفع الآن'}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Payment Modal */}
      {showPayment && (
        <PaymentModal
          total={total}
          subtotal={subtotal}
          discount={discount}
          cart={cart}
          onClose={() => setShowPayment(false)}
          onComplete={handleOrderComplete}
        />
      )}

      {/* Receipt Modal */}
      {showReceipt && lastOrder && (
        <ReceiptModal
          order={lastOrder}
          cashierName={currentUser?.name || ''}
          onClose={() => setShowReceipt(false)}
        />
      )}
    </div>
  );
}
