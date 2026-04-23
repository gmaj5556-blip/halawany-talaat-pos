'use client';

import { useState } from 'react';
import { usePosStore, CartItem } from '@/lib/store';

interface PaymentModalProps {
  total: number;
  subtotal: number;
  discount: number;
  cart: CartItem[];
  onClose: () => void;
  onComplete: (order: any) => void;
}

type PaymentMethod = 'cash' | 'card' | 'instapay' | 'vodafone' | 'delivery';

interface PaymentEntry {
  method: PaymentMethod;
  amount: number;
  received_amount?: number;
  change_amount?: number;
}

const PAYMENT_METHODS: { id: PaymentMethod; label: string; icon: string; color: string }[] = [
  { id: 'cash', label: 'كاش (نقدي)', icon: '💵', color: '#10b981' },
  { id: 'card', label: 'بطاقة ائتمان', icon: '💳', color: '#6366f1' },
  { id: 'instapay', label: 'إنستاباي', icon: '📱', color: '#8B5CF6' },
  { id: 'vodafone', label: 'فودافون كاش', icon: '🔴', color: '#ef4444' },
  { id: 'delivery', label: 'تطبيقات التوصيل', icon: '🛵', color: '#f59e0b' },
];

export default function PaymentModal({ total, subtotal, discount, cart, onClose, onComplete }: PaymentModalProps) {
  const { currentUser, activePeriod, activeShift } = usePosStore();
  const [payments, setPayments] = useState<PaymentEntry[]>([{ method: 'cash', amount: total }]);
  const [cashReceived, setCashReceived] = useState<number>(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const totalPaid = payments.reduce((s, p) => s + (p.amount || 0), 0);
  const remaining = total - totalPaid;
  const cashPayment = payments.find(p => p.method === 'cash');
  const change = cashPayment && cashReceived > cashPayment.amount ? cashReceived - cashPayment.amount : 0;

  const addPaymentMethod = (method: PaymentMethod) => {
    const existing = payments.find(p => p.method === method);
    
    // If method already exists, make it the full amount and zero others (Quick Switch)
    if (existing) {
      setPayments(payments.map(p => ({
        ...p,
        amount: p.method === method ? total : 0
      })));
      if (method !== 'cash') setCashReceived(0);
      return;
    }

    // If only one method exists and it has the full amount, replace it (Simple Swap)
    if (payments.length === 1 && Math.abs(payments[0].amount - total) < 0.01) {
      setPayments([{ method, amount: total }]);
      if (method !== 'cash') setCashReceived(0);
    } else {
      // Otherwise add with remaining balance (Split Payment)
      const currentPaid = payments.reduce((s, p) => s + (p.amount || 0), 0);
      const remainingToPay = Math.max(0, total - currentPaid);
      setPayments([...payments, { method, amount: remainingToPay }]);
    }
  };

  const updateAmount = (method: PaymentMethod, amount: number) => {
    setPayments(payments.map(p => p.method === method ? { ...p, amount } : p));
  };

  const removePayment = (method: PaymentMethod) => {
    const newPayments = payments.filter(p => p.method !== method);
    // If only one payment method remains, automatically set it to the full total
    if (newPayments.length === 1) {
      newPayments[0].amount = total;
    }
    if (method === 'cash') setCashReceived(0);
    setPayments(newPayments);
  };

  const handleQuickCash = (amount: number) => {
    setCashReceived(amount);
  };

  const handleSubmit = async () => {
    if (Math.abs(remaining) > 0.01 && remaining > 0) {
      setError('المبلغ المدفوع لا يطابق الإجمالي');
      return;
    }
    if (cashPayment && cashReceived > 0 && cashReceived < cashPayment.amount) {
      setError('المبلغ المستلم أقل من قيمة الدفع النقدي');
      return;
    }
    setLoading(true);
    setError('');

    try {
      const paymentData = payments.map(p => ({
        method: p.method,
        amount: p.amount,
        received_amount: p.method === 'cash' ? cashReceived || p.amount : p.amount,
        change_amount: p.method === 'cash' ? change : 0,
      }));

      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: cart.map(c => ({
            product_id: c.productId,
            name: c.name,
            quantity: c.quantity,
            unit_price: c.price,
          })),
          payments: paymentData,
          shiftId: activeShift?.id,
          periodId: activePeriod?.id,
          userId: currentUser?.id,
          discount,
        }),
      });

      const order = await res.json();
      if (!res.ok) throw new Error(order.error);

      // Get full order with items
      const detailRes = await fetch(`/api/orders/${order.id}`);
      const detail = await detailRes.json();
      onComplete({ ...detail, payments: paymentData, change });
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const quickAmounts = [50, 100, 200, 500];

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal-content" style={{ maxWidth: '600px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <h2 style={{ fontSize: '20px', fontWeight: 800 }}>💳 الدفع</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '20px' }}>✕</button>
        </div>

        {/* Order Total */}
        <div style={{
          padding: '16px 20px', background: 'rgba(139,92,246,0.1)',
          borderRadius: '12px', border: '1px solid rgba(139,92,246,0.3)', marginBottom: '20px',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        }}>
          <div>
            <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>العناصر: {cart.reduce((s, i) => s + i.quantity, 0)}</p>
            {discount > 0 && <p style={{ fontSize: '12px', color: '#f59e0b' }}>الخصم: -{discount.toFixed(2)} ج.م</p>}
          </div>
          <div style={{ textAlign: 'left' }}>
            <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>الإجمالي المستحق</p>
            <p style={{ fontSize: '28px', fontWeight: 900, color: '#a78bfa', direction: 'ltr' }}>{total.toFixed(2)} ج.م</p>
          </div>
        </div>

        {/* Payment Methods Selector */}
        <div style={{ marginBottom: '16px' }}>
          <p style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '8px' }}>
            طرق الدفع
          </p>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {PAYMENT_METHODS.map(m => (
              <button
                key={m.id}
                onClick={() => addPaymentMethod(m.id)}
                style={{
                  padding: '8px 14px', borderRadius: '10px', border: `1px solid ${payments.find(p => p.method === m.id) ? m.color + '60' : 'var(--border)'}`,
                  background: payments.find(p => p.method === m.id) ? `${m.color}20` : 'rgba(255,255,255,0.04)',
                  color: payments.find(p => p.method === m.id) ? m.color : 'var(--text-secondary)',
                  cursor: 'pointer', fontSize: '13px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px',
                }}
              >
                {m.icon} {m.label}
              </button>
            ))}
          </div>
        </div>

        {/* Payment Entries */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '16px' }}>
          {payments.map(payment => {
            const methodInfo = PAYMENT_METHODS.find(m => m.id === payment.method)!;
            return (
              <div key={payment.method} style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{
                  display: 'flex', alignItems: 'center', gap: '10px',
                  padding: '12px 16px', background: 'var(--bg-card)',
                  borderRadius: '12px', border: `1px solid ${methodInfo.color}30`,
                }}>
                  <span style={{ fontSize: '20px' }}>{methodInfo.icon}</span>
                  <span style={{ fontWeight: 600, flex: 1, color: methodInfo.color }}>{methodInfo.label}</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', direction: 'ltr' }}>
                    <input
                      type="number"
                      value={payment.amount || ''}
                      onChange={e => updateAmount(payment.method, parseFloat(e.target.value) || 0)}
                      className="input"
                      style={{ width: '120px', padding: '8px 12px', fontSize: '16px', fontWeight: 700, textAlign: 'left' }}
                    />
                    <span style={{ color: 'var(--text-muted)', fontSize: '13px' }}>ج.م</span>
                  </div>
                  {payments.length > 1 && (
                    <button
                      onClick={() => removePayment(payment.method)}
                      style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '16px' }}
                    >✕</button>
                  )}
                </div>

                {/* Cash received input */}
                {payment.method === 'cash' && (
                  <div style={{ padding: '12px 16px', background: 'rgba(16,185,129,0.08)', borderRadius: '10px', border: '1px solid rgba(16,185,129,0.2)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
                      <span style={{ fontSize: '13px', color: 'var(--text-secondary)', flex: 1 }}>المبلغ المستلم من العميل</span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px', direction: 'ltr' }}>
                        <input
                          type="number"
                          value={cashReceived || ''}
                          onChange={e => setCashReceived(parseFloat(e.target.value) || 0)}
                          placeholder={payment.amount.toString()}
                          className="input"
                          style={{ width: '140px', padding: '8px 12px', fontSize: '16px', fontWeight: 700, textAlign: 'left' }}
                        />
                      </div>
                    </div>
                    {/* Quick amounts */}
                    <div style={{ display: 'flex', gap: '6px', direction: 'ltr' }}>
                      {quickAmounts.map(a => (
                        <button
                          key={a}
                          onClick={() => handleQuickCash(a)}
                          style={{
                            flex: 1, padding: '6px', borderRadius: '8px',
                            border: `1px solid ${cashReceived === a ? 'rgba(16,185,129,0.5)' : 'var(--border)'}`,
                            background: cashReceived === a ? 'rgba(16,185,129,0.2)' : 'rgba(255,255,255,0.04)',
                            color: cashReceived === a ? '#10b981' : 'var(--text-secondary)',
                            cursor: 'pointer', fontWeight: 600, fontSize: '13px',
                          }}
                        >{a}</button>
                      ))}
                    </div>
                    {cashReceived > 0 && cashReceived >= payment.amount && (
                      <div style={{ marginTop: '10px', display: 'flex', justifyContent: 'space-between', padding: '8px 12px', background: 'rgba(16,185,129,0.15)', borderRadius: '8px' }}>
                        <span style={{ fontSize: '14px', fontWeight: 600, color: '#10b981' }}>الباقي للعميل</span>
                        <span style={{ fontSize: '18px', fontWeight: 900, color: '#10b981', direction: 'ltr' }}>{change.toFixed(2)} ج.م</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Balance indicator */}
        {Math.abs(remaining) > 0.01 && (
          <div style={{
            padding: '10px 16px', borderRadius: '10px', marginBottom: '12px',
            background: remaining > 0 ? 'rgba(245,158,11,0.1)' : 'rgba(16,185,129,0.1)',
            border: `1px solid ${remaining > 0 ? 'rgba(245,158,11,0.3)' : 'rgba(16,185,129,0.3)'}`,
            display: 'flex', justifyContent: 'space-between',
          }}>
            <span style={{ fontSize: '13px', color: remaining > 0 ? '#f59e0b' : '#10b981' }}>
              {remaining > 0 ? `المتبقي للدفع: ${remaining.toFixed(2)} ج.م` : `تم دفع بزيادة: ${Math.abs(remaining).toFixed(2)} ج.م`}
            </span>
          </div>
        )}

        {error && (
          <div style={{ padding: '10px 16px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '10px', color: '#ef4444', fontSize: '13px', marginBottom: '12px' }}>
            ⚠️ {error}
          </div>
        )}

        <div style={{ display: 'flex', gap: '12px' }}>
          <button className="btn btn-ghost" onClick={onClose} style={{ flex: 1 }}>إلغاء</button>
          <button
            className="btn btn-success"
            onClick={handleSubmit}
            disabled={loading || remaining > 0.01}
            style={{ flex: 2, fontSize: '16px' }}
          >
            {loading ? '⏳ جاري المعالجة...' : '✓ تأكيد الدفع'}
          </button>
        </div>
      </div>
    </div>
  );
}
