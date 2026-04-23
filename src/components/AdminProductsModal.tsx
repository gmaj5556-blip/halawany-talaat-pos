'use client';

import { useState, useEffect } from 'react';
import type { ActiveView } from '@/app/page';

interface AdminProductsModalProps {
  setView: (v: ActiveView) => void;
}

export default function AdminProductsModal({ setView }: AdminProductsModalProps) {
  const [products, setProducts] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState({ 
    name: '', name_ar: '', category_id: 1, price: 0, cost: 0, track_stock: false, active: true 
  });

  const fetchData = async () => {
    try {
      const [resP, resC] = await Promise.all([
        fetch('/api/products'),
        fetch('/api/categories')
      ]);
      setProducts(await resP.json());
      setCategories(await resC.json());
    } catch (e: any) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleEdit = (product: any) => {
    setEditingId(product.id);
    setFormData({
      name: product.name,
      name_ar: product.name_ar || product.name,
      category_id: product.category_id,
      price: product.price,
      cost: product.cost || 0,
      track_stock: product.track_stock === 1,
      active: product.active === 1
    });
  };

  const handleCreateNew = () => {
    setEditingId(-1);
    setFormData({ 
      name: '', name_ar: '', category_id: categories[0]?.id || 1, price: 0, cost: 0, track_stock: false, active: true 
    });
  };

  const handleSave = async () => {
    if (!formData.name_ar || formData.price <= 0) {
      setError('يرجى إدخال اسم المنتج والسعر الصحيح');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const isNew = editingId === -1;
      const res = await fetch('/api/products', {
        method: isNew ? 'POST' : 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          id: isNew ? undefined : editingId,
          name: formData.name || formData.name_ar, // fallback for english name
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setEditingId(null);
      fetchData();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setView('settings')}>
      <div className="modal-content" style={{ maxWidth: '900px', height: '85vh', display: 'flex', flexDirection: 'column' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h2 style={{ fontSize: '24px', fontWeight: 800 }}>🍔 إدارة المنتجات</h2>
          <button onClick={() => setView('settings')} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '24px' }}>✕</button>
        </div>

        {error && <div style={{ padding: '12px', background: 'rgba(239,68,68,0.1)', color: '#ef4444', borderRadius: '8px', marginBottom: '16px' }}>{error}</div>}

        {editingId !== null ? (
          <div className="card" style={{ padding: '20px', marginBottom: '20px' }}>
            <h3 style={{ marginBottom: '16px', fontSize: '18px' }}>{editingId === -1 ? 'إضافة منتج جديد' : 'تعديل منتج'}</h3>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px', marginBottom: '16px' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', color: 'var(--text-secondary)' }}>اسم المنتج (عربي) *</label>
                <input 
                  type="text" className="input" 
                  value={formData.name_ar} onChange={e => setFormData({...formData, name_ar: e.target.value})} 
                />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', color: 'var(--text-secondary)' }}>اسم المنتج (انجليزي)</label>
                <input 
                  type="text" className="input" dir="ltr"
                  value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} 
                />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', color: 'var(--text-secondary)' }}>التصنيف *</label>
                <select className="input" value={formData.category_id} onChange={e => setFormData({...formData, category_id: parseInt(e.target.value)})}>
                  {categories.map(c => (
                    <option key={c.id} value={c.id}>{c.name_ar || c.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', color: 'var(--text-secondary)' }}>سعر البيع (ج.م) *</label>
                <input 
                  type="number" className="input" dir="ltr" min="0" step="0.5"
                  value={formData.price} onChange={e => setFormData({...formData, price: parseFloat(e.target.value) || 0})} 
                />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', color: 'var(--text-secondary)' }}>التكلفة / سعر الشراء (ج.م)</label>
                <input 
                  type="number" className="input" dir="ltr" min="0" step="0.5"
                  value={formData.cost} onChange={e => setFormData({...formData, cost: parseFloat(e.target.value) || 0})} 
                />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: '8px', marginTop: '24px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <input 
                    type="checkbox" 
                    id="trackStock"
                    checked={formData.track_stock}
                    onChange={e => setFormData({...formData, track_stock: e.target.checked})}
                    style={{ width: '18px', height: '18px' }}
                  />
                  <label htmlFor="trackStock" style={{ fontSize: '14px', cursor: 'pointer' }}>تتبع المخزون (ينقص بالبيع)</label>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <input 
                    type="checkbox" 
                    id="activeProduct"
                    checked={formData.active}
                    onChange={e => setFormData({...formData, active: e.target.checked})}
                    style={{ width: '18px', height: '18px' }}
                  />
                  <label htmlFor="activeProduct" style={{ fontSize: '14px', cursor: 'pointer' }}>منتج مفعل (يظهر في المنيو)</label>
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '12px' }}>
              <button className="btn btn-primary" onClick={handleSave} disabled={loading} style={{ flex: 1 }}>
                {loading ? 'جاري الحفظ...' : 'حفظ'}
              </button>
              <button className="btn btn-ghost" onClick={() => { setEditingId(null); setError(''); }} style={{ flex: 1 }}>
                إلغاء
              </button>
            </div>
          </div>
        ) : (
          <div style={{ marginBottom: '16px' }}>
            <button className="btn btn-success" onClick={handleCreateNew}>+ منتج جديد</button>
          </div>
        )}

        <div style={{ flex: 1, overflowY: 'auto', background: 'var(--bg-card)', borderRadius: '12px', border: '1px solid var(--border)' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
            <thead style={{ position: 'sticky', top: 0, background: 'var(--bg-secondary)', zIndex: 1, boxShadow: '0 1px 0 var(--border)' }}>
              <tr style={{ textAlign: 'right' }}>
                <th style={{ padding: '12px 16px', color: 'var(--text-secondary)' }}>المنتج</th>
                <th style={{ padding: '12px 16px', color: 'var(--text-secondary)' }}>التصنيف</th>
                <th style={{ padding: '12px 16px', color: 'var(--text-secondary)' }}>السعر</th>
                <th style={{ padding: '12px 16px', color: 'var(--text-secondary)' }}>المخزون</th>
                <th style={{ padding: '12px 16px', color: 'var(--text-secondary)' }}>إجراء</th>
              </tr>
            </thead>
            <tbody>
              {products.map(p => {
                const cat = categories.find(c => c.id === p.category_id);
                return (
                  <tr key={p.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', opacity: p.active ? 1 : 0.5 }}>
                    <td style={{ padding: '12px 16px', fontWeight: 600 }}>{p.name_ar || p.name}</td>
                    <td style={{ padding: '12px 16px', color: 'var(--text-muted)' }}>{cat?.name_ar || cat?.name || '---'}</td>
                    <td style={{ padding: '12px 16px', fontWeight: 700 }} dir="ltr">{p.price} EGP</td>
                    <td style={{ padding: '12px 16px' }}>
                      {p.track_stock ? (
                        <span style={{ color: p.current_stock <= 0 ? '#ef4444' : '#10b981', fontWeight: 600 }} dir="ltr">
                          {p.current_stock}
                        </span>
                      ) : (
                        <span style={{ color: 'var(--text-muted)' }}>غير متتبع</span>
                      )}
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <button 
                        onClick={() => handleEdit(p)}
                        style={{ background: 'rgba(59,130,246,0.1)', color: '#3b82f6', border: 'none', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', fontWeight: 600 }}
                      >
                        تعديل
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
