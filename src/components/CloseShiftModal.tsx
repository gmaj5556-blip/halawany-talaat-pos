'use client';

import { useState } from 'react';
import { usePosStore } from '@/lib/store';
import type { ActiveView } from '@/app/page';
import { format } from 'date-fns';

interface CloseShiftModalProps {
  setView: (v: ActiveView) => void;
}

export default function CloseShiftModal({ setView }: CloseShiftModalProps) {
  const { activeShift, setActiveShift, currentUser } = usePosStore();
  const [actualCash, setActualCash] = useState('');
  const [actualCard, setActualCard] = useState('');
  const [actualWallet, setActualWallet] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [report, setReport] = useState<any>(null);

  const handlePrint = () => {
    const printContent = document.getElementById('report-content');
    if (!printContent) return;
    
    const windowPrint = window.open('', '', 'width=350,height=600');
    if (!windowPrint) return;

    windowPrint.document.write(`
      <html dir="rtl" lang="ar">
        <head>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;800;900&display=swap');
            body { font-family: 'Cairo', sans-serif; padding: 20px; font-size: 14px; margin: 0; color: #000; }
            .bold { font-weight: 800; }
            .line { border-bottom: 2px dashed #aaa; margin: 15px 0; }
            .flex-between { display: flex; justify-content: space-between; align-items: center; direction: rtl; margin-bottom: 6px; }
            h2 { text-align: center; font-size: 22px; font-weight: 900; margin-bottom: 5px; }
            h3 { text-align: center; font-size: 14px; font-weight: 600; margin-bottom: 20px; color: #555; }
          </style>
        </head>
        <body>
          <h2>تقرير إغلاق الوردية</h2>
          <h3>الكاشير: ${currentUser?.name || ''} - التاريخ: ${format(new Date(), 'dd/MM/yyyy')}</h3>
          <div class="line"></div>
          ${printContent.innerHTML}
        </body>
      </html>
    `);
    
    windowPrint.document.close();
    windowPrint.focus();
    setTimeout(() => {
      windowPrint.print();
      windowPrint.close();
    }, 250);
  };

  if (report) {
    return (
      <div className="modal-overlay" onClick={() => setView('dashboard')}>
        <div className="modal-content" style={{ maxWidth: '500px' }}>
          <div style={{ textAlign: 'center', marginBottom: '20px' }}>
            <div style={{ fontSize: '48px', marginBottom: '10px' }}>📊</div>
            <h2 style={{ fontSize: '20px', fontWeight: 800 }}>تم إغلاق الوردية بنجاح</h2>
          </div>

          <div id="report-content" style={{ background: 'var(--bg-elevated)', padding: '20px', borderRadius: '12px', border: '1px solid var(--border)', marginBottom: '20px' }}>
            <div className="flex-between" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
              <span style={{ color: 'var(--text-secondary)' }}>إجمالي الطلبات:</span>
              <span style={{ fontWeight: 'bold' }}>{report.total_orders}</span>
            </div>
            <div className="flex-between" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
              <span style={{ color: 'var(--text-secondary)' }}>إجمالي المبيعات:</span>
              <span style={{ fontWeight: 'bold' }} dir="ltr">{(report.total_sales || 0).toFixed(2)} ج.م</span>
            </div>
            
            <div className="line" style={{ borderBottom: '1px dashed var(--border)', margin: '15px 0' }}></div>
            
            <div className="flex-between" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
              <span style={{ color: 'var(--text-secondary)' }}>المبيعات الكاش:</span>
              <span dir="ltr">{(report.cash_sales || 0).toFixed(2)} ج.م</span>
            </div>
            <div className="flex-between" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
              <span style={{ color: 'var(--text-secondary)' }}>مبيعات فيزا (كريديت):</span>
              <span dir="ltr">{(report.card_sales || 0).toFixed(2)} ج.م</span>
            </div>
            <div className="flex-between" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
              <span style={{ color: 'var(--text-secondary)' }}>مبيعات إنستاباي:</span>
              <span dir="ltr">{(report.instapay_sales || 0).toFixed(2)} ج.م</span>
            </div>
            <div className="flex-between" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
              <span style={{ color: 'var(--text-secondary)' }}>مبيعات فودافون كاش:</span>
              <span dir="ltr">{(report.vodafone_sales || 0).toFixed(2)} ج.م</span>
            </div>
            <div className="flex-between" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
              <span style={{ color: 'var(--text-secondary)' }}>مبيعات توصيل:</span>
              <span dir="ltr">{(report.delivery_sales || 0).toFixed(2)} ج.م</span>
            </div>

            <div className="line" style={{ borderBottom: '1px dashed var(--border)', margin: '15px 0' }}></div>

            <div className="flex-between" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
              <span style={{ color: 'var(--text-secondary)' }}>النقدية الافتتاحية للدرج:</span>
              <span dir="ltr">{(report.opening_cash || 0).toFixed(2)} ج.م</span>
            </div>
            <div className="flex-between" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', background: 'rgba(255,255,255,0.05)', padding: '4px', borderRadius: '4px' }}>
              <span style={{ fontWeight: 'bold' }}>إجمالي النقدية المتوقعة:</span>
              <span style={{ fontWeight: 'bold' }} dir="ltr">{(report.expected_cash || 0).toFixed(2)} ج.م</span>
            </div>
            <div className="flex-between" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
              <span style={{ color: 'var(--text-secondary)' }}>النقدية الفعلية (من الجرد):</span>
              <span dir="ltr">{(report.actual_cash || 0).toFixed(2)} ج.م</span>
            </div>
            
            <div className="line" style={{ borderBottom: '1px dashed var(--border)', margin: '15px 0' }}></div>

            <div className="flex-between" style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', fontSize: '16px', color: report.cash_difference < 0 ? '#ef4444' : report.cash_difference > 0 ? '#10b981' : 'var(--text-primary)' }}>
              <span>الفرق (العجز/الزيادة):</span>
              <span dir="ltr">
                {report.cash_difference > 0 ? '+' : ''}{(report.cash_difference || 0).toFixed(2)} 
                {report.cash_difference < 0 ? ' (عجز)' : report.cash_difference > 0 ? ' (زيادة)' : ' (مضبوط)'}
              </span>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '12px' }}>
            <button className="btn btn-ghost" onClick={() => setView('dashboard')} style={{ flex: 1 }}>تم</button>
            <button className="btn btn-primary" onClick={handlePrint} style={{ flex: 2, fontSize: '16px' }}>
              🖨️ طباعة التقرير
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!activeShift) {
    return (
      <div className="modal-overlay" onClick={() => setView('dashboard')}>
        <div className="modal-content" style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>⚠️</div>
          <h2 style={{ fontSize: '20px', fontWeight: 700, color: '#f59e0b' }}>لا يوجد وردية نشطة</h2>
          <p style={{ color: 'var(--text-muted)', marginTop: '8px', marginBottom: '24px' }}>
            ليس لديك أي وردية مفتوحة لتقوم بإغلاقها وتقفيلها.
          </p>
          <button className="btn btn-primary" onClick={() => setView('dashboard')} style={{ width: '100%' }}>العودة للوحة التحكم</button>
        </div>
      </div>
    );
  }

  const handleCloseShift = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/shifts', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          shiftId: activeShift.id,
          actualCash: parseFloat(actualCash) || 0,
          actualCard: parseFloat(actualCard) || 0,
          actualWallet: parseFloat(actualWallet) || 0
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      
      setReport(data.report);
      setActiveShift(null);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setView('dashboard')}>
      <div className="modal-content">
        <h2 style={{ fontSize: '24px', fontWeight: 800, marginBottom: '24px' }}>🔒 تقفيل الوردية</h2>
        
        <p style={{ color: 'var(--text-muted)', marginBottom: '20px', fontSize: '14px' }}>
          يرجى عد النقدية الموجودة في الدرج وإدخال المبالغ الفعلية بدقة.
        </p>

        <div style={{ marginBottom: '16px' }}>
          <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '8px' }}>
            النقدية الفعلية في الدرج (ج.م) *
          </label>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', direction: 'ltr' }}>
            <input 
              type="number" 
              className="input" 
              placeholder="0.00" 
              value={actualCash}
              onChange={e => setActualCash(e.target.value)}
              style={{ fontSize: '20px', padding: '12px', fontWeight: 'bold', textAlign: 'right' }}
              autoFocus
            />
            <span style={{ fontSize: '18px', fontWeight: 'bold', color: 'var(--text-secondary)' }}>EGP</span>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '16px', marginBottom: '24px' }}>
          <div style={{ flex: 1 }}>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '8px' }}>
              إجمالي مبيعات الفيزا (اختياري)
            </label>
            <input 
              type="number" 
              className="input" 
              placeholder="0.00" 
              value={actualCard}
              onChange={e => setActualCard(e.target.value)}
              style={{ textAlign: 'left', direction: 'ltr' }}
            />
          </div>
          <div style={{ flex: 1 }}>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '8px' }}>
              إجمالي المحافظ/إنستاباي
            </label>
            <input 
              type="number" 
              className="input" 
              placeholder="0.00" 
              value={actualWallet}
              onChange={e => setActualWallet(e.target.value)}
              style={{ textAlign: 'left', direction: 'ltr' }}
            />
          </div>
        </div>

        {error && <p style={{ color: '#ef4444', marginBottom: '16px', fontSize: '14px' }}>⚠️ {error}</p>}
        
        <div style={{ display: 'flex', gap: '12px' }}>
          <button className="btn btn-ghost" onClick={() => setView('dashboard')} style={{ flex: 1 }}>إلغاء</button>
          <button 
            className="btn btn-danger" 
            onClick={handleCloseShift} 
            disabled={loading || actualCash === ''}
            style={{ flex: 2, fontSize: '16px' }}
          >
            {loading ? 'جاري الإغلاق...' : 'إغلاق وتسجيل التقرير'}
          </button>
        </div>
      </div>
    </div>
  );
}
