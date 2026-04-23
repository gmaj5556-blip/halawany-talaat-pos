'use client';

import { useState, useEffect } from 'react';
import { usePosStore } from '@/lib/store';
import type { ActiveView } from '@/app/page';

interface ReportsModalProps {
  setView: (v: ActiveView) => void;
}

export default function ReportsModal({ setView }: ReportsModalProps) {
  const { activePeriod } = usePosStore();
  const [reportData, setReportData] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (activePeriod) {
      setLoading(true);
      fetch(`/api/reports?type=period&periodId=${activePeriod.id}`)
        .then(r => r.json())
        .then(setReportData)
        .finally(() => setLoading(false));
    }
  }, [activePeriod]);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setView('dashboard')}>
      <div className="modal-content" style={{ maxWidth: '800px', width: '90%' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <h2 style={{ fontSize: '24px', fontWeight: 800 }}>📊 تقارير المبيعات</h2>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
             <button 
               className="btn btn-primary btn-sm" 
               onClick={handlePrint}
               style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
             >
               🖨️ طباعة التقرير
             </button>
             <button onClick={() => setView('dashboard')} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '24px' }}>✕</button>
          </div>
        </div>

        {!activePeriod ? (
          <div style={{ textAlign: 'center', padding: '40px' }}>
            <p style={{ color: 'var(--text-muted)' }}>لا توجد يومية نشطة لعرض تقاريرها.</p>
          </div>
        ) : loading ? (
          <div style={{ textAlign: 'center', padding: '40px' }}>
            <p>جاري تحميل التقارير...</p>
          </div>
        ) : reportData ? (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', maxHeight: '60vh', overflowY: 'auto', paddingLeft: '10px' }}>
            
            {/* Overview */}
            <div className="card" style={{ padding: '20px' }}>
              <h3 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '16px', color: 'var(--accent-light)' }}>ملخص اليومية</h3>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                <span style={{ color: 'var(--text-secondary)' }}>التاريخ</span>
                <span style={{ fontWeight: 600 }}>{reportData.period.date}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                <span style={{ color: 'var(--text-secondary)' }}>إجمالي المبيعات</span>
                <span style={{ fontWeight: 800, color: '#10b981', fontSize: '18px', direction: 'ltr' }}>{(reportData.period.total_sales || 0).toFixed(2)} ج.م</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                <span style={{ color: 'var(--text-secondary)' }}>إجمالي الطلبات</span>
                <span style={{ fontWeight: 600 }}>{reportData.period.total_orders}</span>
              </div>
            </div>

            {/* Payment Breakdown */}
            <div className="card" style={{ padding: '20px' }}>
              <h3 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '16px', color: 'var(--accent-light)' }}>تفاصيل طرق الدفع</h3>
              {reportData.paymentBreakdown.length === 0 ? (
                <p style={{ color: 'var(--text-muted)', fontSize: '14px' }}>لا توجد مدفوعات حتى الآن.</p>
              ) : (
                reportData.paymentBreakdown.map((p: any) => {
                  const paymentName = p.method === 'cash' ? 'كاش' : p.method === 'card' ? 'بطاقة ائتمان' : p.method === 'instapay' ? 'إنستاباي' : p.method === 'vodafone' ? 'فودافون كاش' : 'تطبيق توصيل';
                  return (
                    <div key={p.method} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px', paddingBottom: '8px', borderBottom: '1px solid var(--border)' }}>
                      <span style={{ color: 'var(--text-secondary)' }}>{paymentName}</span>
                      <span style={{ fontWeight: 600, direction: 'ltr' }}>{(p.total || 0).toFixed(2)} ج.م</span>
                    </div>
                  );
                })
              )}
            </div>

            {/* Sold Items Summary */}
            <div className="card" style={{ padding: '20px', gridColumn: '1 / -1' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <h3 style={{ fontSize: '18px', fontWeight: 800, color: 'var(--accent-light)' }}>📋 ملخص الكميات المباعة</h3>
                <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>إجمالي عدد الأصناف المباعة: {reportData.topProducts.length}</span>
              </div>
              {reportData.topProducts.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '30px', background: 'rgba(255,255,255,0.02)', borderRadius: '12px' }}>
                   <p style={{ color: 'var(--text-muted)', fontSize: '14px' }}>لم يتم بيع أي منتجات في هذه اليومية بعد.</p>
                </div>
              ) : (
                <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '15px' }}>
                    <thead style={{ position: 'sticky', top: 0, background: 'var(--bg-secondary)', zIndex: 1 }}>
                      <tr style={{ textAlign: 'right', color: 'var(--text-secondary)' }}>
                        <th style={{ padding: '12px 16px', borderBottom: '2px solid var(--border)' }}>المنتج</th>
                        <th style={{ padding: '12px 16px', borderBottom: '2px solid var(--border)', textAlign: 'center' }}>الكمية المباعة</th>
                        <th style={{ padding: '12px 16px', borderBottom: '2px solid var(--border)', textAlign: 'left' }}>إجمالي الإيراد</th>
                      </tr>
                    </thead>
                    <tbody>
                      {reportData.topProducts.map((p: any, i: number) => (
                        <tr key={i} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', transition: 'background 0.2s' }} onMouseEnter={e => e.currentTarget.style.background = 'rgba(139,92,246,0.05)'} onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                          <td style={{ padding: '14px 16px', fontWeight: 600 }}>{p.product_name}</td>
                          <td style={{ padding: '14px 16px', textAlign: 'center' }}>
                            <span style={{ 
                              padding: '4px 12px', 
                              background: 'rgba(139,92,246,0.15)', 
                              borderRadius: '20px', 
                              fontWeight: 800, 
                              color: '#a78bfa',
                              fontSize: '16px'
                            }}>
                              {p.total_qty || 0}
                            </span>
                          </td>
                          <td style={{ padding: '14px 16px', textAlign: 'left', fontWeight: 700, color: '#10b981', direction: 'ltr' }}>{(p.total_sales || 0).toFixed(2)} ج.م</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Shifts Overview */}
            <div className="card" style={{ padding: '20px', gridColumn: '1 / -1' }}>
              <h3 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '16px', color: 'var(--accent-light)' }}>ورديات اليومية</h3>
              {reportData.shifts.length === 0 ? (
                <p style={{ color: 'var(--text-muted)', fontSize: '14px' }}>لم يتم تسجيل أي ورديات.</p>
              ) : (
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
                  <thead>
                    <tr style={{ textAlign: 'right', color: 'var(--text-secondary)' }}>
                      <th style={{ paddingBottom: '12px', borderBottom: '1px solid var(--border)' }}>الكاشير</th>
                      <th style={{ paddingBottom: '12px', borderBottom: '1px solid var(--border)' }}>الحالة</th>
                      <th style={{ paddingBottom: '12px', borderBottom: '1px solid var(--border)' }}>المبيعات</th>
                      <th style={{ paddingBottom: '12px', borderBottom: '1px solid var(--border)' }}>الطلبات</th>
                      <th style={{ paddingBottom: '12px', borderBottom: '1px solid var(--border)', textAlign: 'left' }}>عجز/زيادة الكاش</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reportData.shifts.map((s: any) => (
                      <tr key={s.id}>
                        <td style={{ padding: '12px 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>{s.user_name}</td>
                        <td style={{ padding: '12px 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                          <span className={s.status === 'open' ? 'badge badge-success' : 'badge badge-warning'}>{s.status === 'open' ? 'مفتوحة' : 'مغلقة'}</span>
                        </td>
                        <td style={{ padding: '12px 0', borderBottom: '1px solid rgba(255,255,255,0.05)', direction: 'ltr', textAlign: 'right' }}>{(s.total_sales || 0).toFixed(2)} ج.م</td>
                        <td style={{ padding: '12px 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>{s.total_orders || 0}</td>
                        <td style={{ padding: '12px 0', borderBottom: '1px solid rgba(255,255,255,0.05)', textAlign: 'left', direction: 'ltr' }}>
                          {s.cash_difference !== null && s.cash_difference !== undefined ? (
                            <span style={{ color: s.cash_difference < 0 ? '#ef4444' : s.cash_difference > 0 ? '#10b981' : 'inherit' }}>
                              {s.cash_difference > 0 ? '+' : ''}{(s.cash_difference || 0).toFixed(2)}
                            </span>
                          ) : '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

          </div>
        ) : null}
      </div>
    </div>
  );
}
