'use client';

import { useState } from 'react';
import { usePosStore } from '@/lib/store';
import type { ActiveView } from '@/app/page';

interface PeriodModalProps {
  setView: (v: ActiveView) => void;
}

export default function PeriodModal({ setView }: PeriodModalProps) {
  const { currentUser, activePeriod, setActivePeriod } = usePosStore();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleOpenPeriod = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/periods', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: currentUser?.id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setActivePeriod({ id: data.id, date: data.date, startTime: data.start_time });
      setView('dashboard');
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleClosePeriod = async () => {
    if (!activePeriod) return;
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/periods', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ periodId: activePeriod.id, userId: currentUser?.id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setActivePeriod(null);
      setView('dashboard');
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setView('dashboard')}>
      <div className="modal-content">
        <h2 style={{ fontSize: '24px', fontWeight: 800, marginBottom: '24px' }}>📅 إدارة فترة العمل (اليومية)</h2>
        
        <div style={{ padding: '20px', background: 'var(--bg-elevated)', borderRadius: '16px', border: '1px solid var(--border)' }}>
          {activePeriod ? (
            <div style={{ textAlign: 'center' }}>
              <div style={{ width: '64px', height: '64px', background: 'rgba(16,185,129,0.1)', color: '#10b981', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '32px', margin: '0 auto 16px' }}>
                ✓
              </div>
              <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#10b981' }}>اليومية مفتوحة حالياً</h3>
              <p style={{ color: 'var(--text-muted)', marginTop: '8px', marginBottom: '24px', direction: 'ltr' }}>
                التاريخ: {activePeriod.date} <br/>
                بدأت في: {new Date(activePeriod.startTime).toLocaleTimeString('ar-EG')}
              </p>
              
              {error && <p style={{ color: '#ef4444', marginBottom: '16px', fontSize: '14px' }}>⚠️ {error === 'Close all open shifts before closing the period' ? 'يجب إغلاق جميع الورديات المفتوحة قبل إغلاق اليومية' : error}</p>}
              
              <button 
                className="btn btn-danger btn-lg" 
                onClick={handleClosePeriod} 
                disabled={loading}
                style={{ width: '100%' }}
              >
                {loading ? 'جاري الإغلاق...' : 'إغلاق اليومية الحالية'}
              </button>
            </div>
          ) : (
            <div style={{ textAlign: 'center' }}>
              <div style={{ width: '64px', height: '64px', background: 'rgba(239,68,68,0.1)', color: '#ef4444', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '32px', margin: '0 auto 16px' }}>
                !
              </div>
              <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#ef4444' }}>اليومية مغلقة</h3>
              <p style={{ color: 'var(--text-muted)', marginTop: '8px', marginBottom: '24px' }}>
                يجب عليك فتح اليومية قبل أن تتمكن من فتح أي وردية أو تسجيل المبيعات.
              </p>
              
              {error && <p style={{ color: '#ef4444', marginBottom: '16px', fontSize: '14px' }}>⚠️ {error === 'A period is already open for today' ? 'هناك يومية مفتوحة بالفعل لهذا اليوم' : error}</p>}
              
              <button 
                className="btn btn-success btn-lg" 
                onClick={handleOpenPeriod} 
                disabled={loading}
                style={{ width: '100%' }}
              >
                {loading ? 'جاري الفتح...' : 'فتح يومية جديدة'}
              </button>
            </div>
          )}
        </div>
        
        <button className="btn btn-ghost mt-4" onClick={() => setView('dashboard')} style={{ width: '100%', marginTop: '16px' }}>إلغاء</button>
      </div>
    </div>
  );
}
