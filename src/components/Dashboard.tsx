'use client';

import { useEffect, useState } from 'react';
import { usePosStore } from '@/lib/store';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import type { ActiveView } from '@/app/page';

interface DashboardProps {
  setView: (v: ActiveView) => void;
}

const NAV_BUTTONS = [
  { id: 'pos', label: 'الطلبات (Take Away)', icon: '🛍️', color: '#8B5CF6', desc: 'تسجيل طلب جديد', glow: 'rgba(139,92,246,0.4)' },
  { id: 'period', label: 'فترة العمل (اليومية)', icon: '📅', color: '#06b6d4', desc: 'فتح / إغلاق اليوم', glow: 'rgba(6,182,212,0.4)' },
  { id: 'shift', label: 'فتح وردية', icon: '🕐', color: '#10b981', desc: 'بدء وردية جديدة', glow: 'rgba(16,182,212,0.4)' },
  { id: 'close-shift', label: 'إغلاق وردية', icon: '🔒', color: '#f59e0b', desc: 'إنهاء الوردية وتقفيل الدرج', glow: 'rgba(245,158,11,0.4)' },
  { id: 'reports', label: 'التقارير', icon: '📊', color: '#6366f1', desc: 'عرض تقارير المبيعات', glow: 'rgba(99,102,241,0.4)' },
  { id: 'settings', label: 'الإعدادات', icon: '⚙️', color: '#64748b', desc: 'إدارة النظام', glow: 'rgba(100,116,139,0.4)' },
];

export default function Dashboard({ setView }: DashboardProps) {
  const { currentUser, setCurrentUser, activePeriod, setActivePeriod, activeShift, setActiveShift } = usePosStore();
  const [time, setTime] = useState(new Date());
  const [isOnline, setIsOnline] = useState(typeof navigator !== 'undefined' ? navigator.onLine : true);
  const [todayStats, setTodayStats] = useState({ orders: 0, sales: 0 });

  useEffect(() => {
    const interval = setInterval(() => setTime(new Date()), 1000);
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      clearInterval(interval);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  useEffect(() => {
    // Check active period
    fetch('/api/periods')
      .then(r => r.json())
      .then(data => {
        if (data && !data.error) setActivePeriod({ id: data.id, date: data.date, startTime: data.start_time });
      });

    // Check active shift for current user
    if (currentUser) {
      fetch(`/api/shifts?userId=${currentUser.id}`)
        .then(r => r.json())
        .then(data => {
          if (data && !data.error) setActiveShift({
            id: data.id,
            periodId: data.period_id,
            userId: data.user_id,
            cashDrawerId: data.cash_drawer_id,
            openingCash: data.opening_cash,
            startTime: data.start_time,
          });
        });
    }
  }, []);

  useEffect(() => {
    if (activePeriod) {
      fetch(`/api/orders?periodId=${activePeriod.id}&limit=1000`)
        .then(r => r.json())
        .then((orders: any[]) => {
          if (Array.isArray(orders)) {
            const sales = orders.filter(o => o.status === 'paid').reduce((sum, o) => sum + o.total, 0);
            setTodayStats({ orders: orders.filter(o => o.status === 'paid').length, sales });
          }
        });
    }
  }, [activePeriod]);

  return (
    <div style={{
      height: '100vh', display: 'flex', flexDirection: 'column',
      background: 'radial-gradient(ellipse at 20% 20%, rgba(139,92,246,0.12) 0%, transparent 50%), radial-gradient(ellipse at 80% 80%, rgba(6,182,212,0.08) 0%, transparent 50%), var(--bg-primary)',
    }}>
      {/* Top Bar */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '16px 28px',
        background: 'rgba(26,26,46,0.5)', backdropFilter: 'blur(20px)',
        borderBottom: '1px solid var(--border)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <img 
            src="/logo.png" 
            alt="حلواني طلعت" 
            style={{ 
              width: '44px', height: '44px',
              borderRadius: '12px',
              objectFit: 'cover',
              boxShadow: '0 4px 12px rgba(139,92,246,0.3)',
            }} 
          />
          <div>
            <h1 style={{ fontSize: '18px', fontWeight: 900 }}>حلواني طلعت</h1>
            <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{format(time, 'EEEE, d MMMM, yyyy', { locale: ar })}</p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          {/* Clock */}
          <div style={{
            fontFamily: 'monospace', fontSize: '22px', fontWeight: 700,
            color: 'var(--accent-light)', letterSpacing: '2px',
          }}>
            {format(time, 'HH:mm:ss')}
          </div>

          {/* User info */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: '10px',
            padding: '8px 14px', background: 'rgba(139,92,246,0.1)',
            borderRadius: '10px', border: '1px solid rgba(139,92,246,0.25)',
          }}>
            <div style={{
              width: '32px', height: '32px', borderRadius: '50%',
              background: 'linear-gradient(135deg, #8B5CF6, #06b6d4)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '14px', fontWeight: 700,
            }}>
              {currentUser?.name?.[0]?.toUpperCase()}
            </div>
            <div>
              <p style={{ fontSize: '13px', fontWeight: 600 }}>{currentUser?.name}</p>
              <p style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'capitalize' }}>
                {currentUser?.role === 'admin' ? 'مدير النظام' : 'كاشير'}
              </p>
            </div>
          </div>

          <div style={{ 
            display: 'flex', alignItems: 'center', gap: '6px', 
            padding: '6px 12px', background: isOnline ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)', 
            borderRadius: '10px', border: `1px solid ${isOnline ? 'rgba(16,185,129,0.2)' : 'rgba(239,68,68,0.2)'}`,
            transition: 'all 0.3s ease'
          }}>
             <div style={{ 
               width: '8px', height: '8px', borderRadius: '50%', 
               background: isOnline ? '#10b981' : '#ef4444',
               boxShadow: `0 0 8px ${isOnline ? '#10b981' : '#ef4444'}`
             }}></div>
             <span style={{ fontSize: '11px', fontWeight: 700, color: isOnline ? '#10b981' : '#ef4444' }}>
               {isOnline ? 'متصل' : 'غير متصل'}
             </span>
          </div>

          <button
            className="btn btn-ghost btn-sm"
            onClick={() => setCurrentUser(null)}
          >
            تسجيل الخروج
          </button>
        </div>
      </div>

      {/* Status Bar */}
      <div style={{
        display: 'flex', gap: '12px', padding: '12px 28px',
        background: 'rgba(10,10,15,0.5)',
        borderBottom: '1px solid var(--border)',
      }}>
        {/* Period Status */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: '8px',
          padding: '8px 16px', borderRadius: '10px',
          background: activePeriod ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)',
          border: `1px solid ${activePeriod ? 'rgba(16,185,129,0.3)' : 'rgba(239,68,68,0.3)'}`,
        }}>
          <div className={activePeriod ? 'dot-green' : 'dot-red'} />
          <span style={{ fontSize: '13px', fontWeight: 500 }}>
            {activePeriod ? `اليومية مفتوحة · ${format(new Date(activePeriod.startTime), 'HH:mm')}` : 'اليومية مغلقة'}
          </span>
        </div>

        {/* Shift Status */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: '8px',
          padding: '8px 16px', borderRadius: '10px',
          background: activeShift ? 'rgba(139,92,246,0.1)' : 'rgba(100,116,139,0.1)',
          border: `1px solid ${activeShift ? 'rgba(139,92,246,0.3)' : 'rgba(100,116,139,0.3)'}`,
        }}>
          <div className={activeShift ? 'dot-green' : 'dot-yellow'} />
          <span style={{ fontSize: '13px', fontWeight: 500 }}>
            {activeShift ? `وردية نشطة · ${format(new Date(activeShift.startTime), 'HH:mm')}` : 'لا يوجد وردية مفتوحة'}
          </span>
        </div>

        {/* Today Stats */}
        {activePeriod && (
          <>
            <div style={{
              display: 'flex', alignItems: 'center', gap: '8px',
              padding: '8px 16px', borderRadius: '10px',
              background: 'rgba(251,191,36,0.1)', border: '1px solid rgba(251,191,36,0.2)',
            }}>
              <span style={{ fontSize: '13px', color: '#fbbf24' }}>🧾 {todayStats.orders} طلبات</span>
            </div>
            <div style={{
              display: 'flex', alignItems: 'center', gap: '8px',
              padding: '8px 16px', borderRadius: '10px',
              background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.2)',
            }}>
              <span style={{ fontSize: '13px', color: '#10b981' }}>💰 {todayStats.sales.toFixed(2)} ج.م</span>
            </div>
          </>
        )}
      </div>

      {/* Main Grid */}
      <div style={{
        flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '32px 28px',
        overflow: 'auto',
      }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '20px',
          width: '100%',
          maxWidth: '1000px',
        }}>
          {NAV_BUTTONS.map((btn) => (
            <button
              key={btn.id}
              onClick={() => setView(btn.id as ActiveView)}
              style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                gap: '12px',
                padding: '32px 20px',
                background: 'var(--bg-card)',
                border: '1px solid var(--border)',
                borderRadius: '20px',
                cursor: 'pointer',
                transition: 'all 0.25s ease',
                color: 'var(--text-primary)',
                position: 'relative',
                overflow: 'hidden',
              }}
              onMouseEnter={(e) => {
                const el = e.currentTarget;
                el.style.transform = 'translateY(-4px)';
                el.style.borderColor = btn.color + '60';
                el.style.boxShadow = `0 12px 40px ${btn.glow}`;
                el.style.background = `linear-gradient(135deg, rgba(26,26,46,1), ${btn.color}18)`;
              }}
              onMouseLeave={(e) => {
                const el = e.currentTarget;
                el.style.transform = 'translateY(0)';
                el.style.borderColor = 'var(--border)';
                el.style.boxShadow = 'none';
                el.style.background = 'var(--bg-card)';
              }}
            >
              <div style={{
                width: '64px', height: '64px',
                borderRadius: '18px',
                background: `linear-gradient(135deg, ${btn.color}30, ${btn.color}15)`,
                border: `1px solid ${btn.color}40`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '28px',
              }}>
                {btn.icon}
              </div>
              <div style={{ textAlign: 'center' }}>
                <p style={{ fontSize: '15px', fontWeight: 700 }}>{btn.label}</p>
                <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>{btn.desc}</p>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
