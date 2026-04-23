'use client';

import { useState, useEffect } from 'react';
import { usePosStore } from '@/lib/store';
import type { ActiveView } from '@/app/page';

interface StockModalProps {
  setView: (v: ActiveView) => void;
}

export default function StockModal({ setView }: StockModalProps) {
  const { currentUser, activePeriod } = usePosStore();
  const [products, setProducts] = useState<any[]>([]);
  const [stockUpdates, setStockUpdates] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const fetchStock = () => {
    fetch('/api/stock').then(r => r.json()).then(setProducts);
  };

  useEffect(() => {
    fetchStock();
  }, []);

  const handleUpdateStock = (key: string, val: string) => {
    setStockUpdates(prev => ({
      ...prev,
      [key]: val
    }));
  };

  const handleSaveAll = async () => {
    const items = Object.entries(stockUpdates)
      .map(([key, qty]) => {
        const [type, id] = key.split('_');
        return {
          productId: type === 'product' ? parseInt(id) : null,
          ingredientId: type === 'ingredient' ? parseInt(id) : null,
          quantity: parseFloat(qty),
          periodId: activePeriod?.id,
          userId: currentUser?.id,
        };
      })
      .filter(item => item.quantity && item.quantity > 0);

    if (items.length === 0) {
      setError('يرجى إدخال كميات لمنتج واحد على الأقل قبل الحفظ');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');
    
    try {
      const res = await fetch('/api/stock', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items }),
      });
      
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error);
      }
      
      setSuccess('تم تحديث المخزون بنجاح');
      setStockUpdates({});
      fetchStock();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
      // clear success message after 3 seconds
      setTimeout(() => setSuccess(''), 3000);
    }
  };

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setView('dashboard')}>
      <div className="modal-content" style={{ maxWidth: '800px', height: '90vh', display: 'flex', flexDirection: 'column' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <h2 style={{ fontSize: '24px', fontWeight: 800 }}>📦 إدارة المخزون السريعة</h2>
          <button onClick={() => setView('dashboard')} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '24px' }}>✕</button>
        </div>
        
        <p style={{ color: 'var(--text-muted)', fontSize: '14px', marginBottom: '16px' }}>
          أدخل الكمية التي تريد إضافتها في الحقل المخصص أمام كل منتج، ثم اضغط على حفظ في الأسفل.
        </p>

        {error && <div style={{ padding: '12px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '8px', color: '#ef4444', marginBottom: '16px', fontSize: '14px' }}>⚠️ {error}</div>}
        {success && <div style={{ padding: '12px', background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.3)', borderRadius: '8px', color: '#10b981', marginBottom: '16px', fontSize: '14px' }}>✓ {success}</div>}

        <div style={{ flex: 1, overflowY: 'auto', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '12px', padding: '0' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
            <thead style={{ position: 'sticky', top: 0, background: 'var(--bg-secondary)', zIndex: 1, boxShadow: '0 1px 0 var(--border)' }}>
              <tr style={{ textAlign: 'right' }}>
                <th style={{ padding: '12px 16px', color: 'var(--text-secondary)' }}>المنتج</th>
                <th style={{ padding: '12px 16px', color: 'var(--text-secondary)' }}>التصنيف</th>
                <th style={{ padding: '12px 16px', color: 'var(--text-secondary)', textAlign: 'center' }}>المخزون الحالي</th>
                <th style={{ padding: '12px 16px', color: 'var(--text-secondary)' }}>الكمية المضافة (+)</th>
              </tr>
            </thead>
            <tbody>
              {products.map(p => {
                const key = `${p.type}_${p.id}`;
                return (
                <tr key={key} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', transition: 'background 0.2s', background: p.type === 'ingredient' ? 'rgba(236,72,153,0.05)' : 'transparent' }} onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.02)'} onMouseLeave={e => e.currentTarget.style.background = p.type === 'ingredient' ? 'rgba(236,72,153,0.05)' : 'transparent'}>
                  <td style={{ padding: '12px 16px', fontWeight: 600 }}>{p.name_ar || p.name}</td>
                  <td style={{ padding: '12px 16px', color: p.type === 'ingredient' ? '#ec4899' : 'var(--text-muted)' }}>{p.category_name_ar || p.category_name}</td>
                  <td style={{ padding: '12px 16px', textAlign: 'center', fontWeight: 700, color: 'var(--text-primary)', direction: 'ltr' }}>
                    {p.current_stock}
                  </td>
                  <td style={{ padding: '8px 16px' }}>
                    <input 
                      type="number" 
                      min="0"
                      className="input" 
                      placeholder="0" 
                      value={stockUpdates[key] || ''}
                      onChange={e => handleUpdateStock(key, e.target.value)}
                      style={{ 
                        width: '100px', 
                        padding: '8px', 
                        textAlign: 'center', 
                        direction: 'ltr',
                        background: stockUpdates[key] ? 'rgba(16,185,129,0.1)' : 'var(--bg-primary)',
                        borderColor: stockUpdates[key] ? 'rgba(16,185,129,0.4)' : 'var(--border)'
                      }}
                    />
                  </td>
                </tr>
              )})}
              {products.length === 0 && (
                <tr>
                  <td colSpan={4} style={{ padding: '30px', textAlign: 'center', color: 'var(--text-muted)' }}>جاري تحميل المنتجات...</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div style={{ marginTop: '20px', display: 'flex', gap: '12px', flexShrink: 0 }}>
          <button className="btn btn-ghost" onClick={() => setView('dashboard')} style={{ flex: 1 }}>إغلاق</button>
          <button 
            className="btn btn-success" 
            onClick={handleSaveAll} 
            disabled={loading || Object.keys(stockUpdates).length === 0}
            style={{ flex: 3, fontSize: '16px' }}
          >
            {loading ? 'جاري الحفظ...' : `حفظ التغييرات (${Object.keys(stockUpdates).filter(k => parseFloat(stockUpdates[parseInt(k)]) > 0).length} منتج)`}
          </button>
        </div>
      </div>
    </div>
  );
}
