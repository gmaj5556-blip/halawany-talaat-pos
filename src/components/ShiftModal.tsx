'use client';

import { useState } from 'react';
import { usePosStore } from '@/lib/store';
import type { ActiveView } from '@/app/page';

interface ShiftModalProps {
  setView: (v: ActiveView) => void;
}

export default function ShiftModal({ setView }: ShiftModalProps) {
  const { currentUser, activePeriod, activeShift, setActiveShift } = usePosStore();
  const [openingCash, setOpeningCash] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!activePeriod) {
    return (
      <div className="modal-overlay" onClick={() => setView('dashboard')}>
        <div className="modal-content" style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>⚠️</div>
          <h2 style={{ fontSize: '20px', fontWeight: 700, color: '#ef4444' }}>اليومية مغلقة</h2>
          <p style={{ color: 'var(--text-muted)', marginTop: '8px', marginBottom: '24px' }}>
            يجب عليك فتح اليومية أولاً قبل أن تتمكن من بدء وردية.
          </p>
          <button className="btn btn-primary" onClick={() => setView('period')} style={{ width: '100%' }}>الذهاب لإدارة اليومية</button>
        </div>
      </div>
    );
  }

  if (activeShift) {
    return (
      <div className="modal-overlay" onClick={() => setView('dashboard')}>
        <div className="modal-content" style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>✅</div>
          <h2 style={{ fontSize: '20px', fontWeight: 700, color: '#10b981' }}>الوردية نشطة بالفعل</h2>
          <p style={{ color: 'var(--text-muted)', marginTop: '8px', marginBottom: '24px' }}>
            لديك وردية مفتوحة حالياً، لا يمكنك فتح وردية أخرى.
          </p>
          <button className="btn btn-primary" onClick={() => setView('dashboard')} style={{ width: '100%' }}>العودة للوحة التحكم</button>
        </div>
      </div>
    );
  }

  const handleStartShift = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/shifts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          periodId: activePeriod.id,
          userId: currentUser?.id,
          cashDrawerId: 1, // Defaulting to 1 for simplicity
          openingCash: parseFloat(openingCash) || 0
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      
      setActiveShift({
        id: data.id,
        periodId: data.period_id,
        userId: data.user_id,
        cashDrawerId: data.cash_drawer_id,
        openingCash: data.opening_cash,
        startTime: data.start_time
      });
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
        <h2 style={{ fontSize: '24px', fontWeight: 800, marginBottom: '24px' }}>🕐 بدء وردية جديدة</h2>
        
        <div style={{ marginBottom: '20px' }}>
          <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '8px' }}>
            درج النقدية (الكاشير)
          </label>
          <select className="select" disabled>
            <option>الدرج الرئيسي (#1)</option>
          </select>
        </div>

        <div style={{ marginBottom: '24px' }}>
          <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '8px' }}>
            النقدية الافتتاحية (المبلغ الموجود بالدرج حالياً)
          </label>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', direction: 'ltr' }}>
            <input 
              type="number" 
              className="input" 
              placeholder="0.00" 
              value={openingCash}
              onChange={e => setOpeningCash(e.target.value)}
              style={{ fontSize: '24px', padding: '16px', fontWeight: 'bold', textAlign: 'right' }}
              autoFocus
            />
            <span style={{ fontSize: '18px', fontWeight: 'bold', color: 'var(--text-secondary)' }}>EGP</span>
          </div>
        </div>

        {error && <p style={{ color: '#ef4444', marginBottom: '16px', fontSize: '14px' }}>⚠️ {error === 'You already have an open shift' ? 'لديك وردية مفتوحة بالفعل' : error}</p>}
        
        <div style={{ display: 'flex', gap: '12px' }}>
          <button className="btn btn-ghost" onClick={() => setView('dashboard')} style={{ flex: 1 }}>إلغاء</button>
          <button 
            className="btn btn-success" 
            onClick={handleStartShift} 
            disabled={loading}
            style={{ flex: 2, fontSize: '16px' }}
          >
            {loading ? 'جاري البدء...' : 'بدء الوردية'}
          </button>
        </div>
      </div>
    </div>
  );
}
