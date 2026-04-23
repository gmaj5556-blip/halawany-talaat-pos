'use client';

import { usePosStore } from '@/lib/store';
import type { ActiveView } from '@/app/page';

interface SettingsModalProps {
  setView: (v: ActiveView) => void;
}

export default function SettingsModal({ setView }: SettingsModalProps) {
  const { currentUser } = usePosStore();

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setView('dashboard')}>
      <div className="modal-content" style={{ maxWidth: '500px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <h2 style={{ fontSize: '24px', fontWeight: 800 }}>⚙️ الإعدادات</h2>
          <button onClick={() => setView('dashboard')} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '24px' }}>✕</button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          
          <div className="card" style={{ padding: '20px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '12px' }}>الحساب الحالي</h3>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <div style={{ 
                width: '60px', height: '60px', borderRadius: '50%', 
                background: 'linear-gradient(135deg, #8B5CF6, #06b6d4)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '24px', fontWeight: 700 
              }}>
                {currentUser?.name?.[0]?.toUpperCase()}
              </div>
              <div>
                <p style={{ fontSize: '18px', fontWeight: 700 }}>{currentUser?.name}</p>
                <p style={{ fontSize: '14px', color: 'var(--text-muted)' }}>@{currentUser?.username}</p>
                <div style={{ marginTop: '8px' }}>
                  <span className="badge badge-purple">{currentUser?.role === 'admin' ? 'مدير النظام' : 'كاشير'}</span>
                </div>
              </div>
            </div>
          </div>

          {currentUser?.role === 'admin' ? (
             <div className="card" style={{ padding: '20px' }}>
               <h3 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '12px', color: 'var(--warning)' }}>لوحة تحكم الإدارة</h3>
               <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '16px' }}>
                 إدارة المستخدمين، الأقسام، المنتجات، وإعدادات النظام.
               </p>
               <button className="btn btn-warning" onClick={() => setView('admin-users')} style={{ width: '100%', marginBottom: '12px' }}>
                 إدارة المستخدمين
               </button>
               <button className="btn btn-warning" onClick={() => setView('admin-products')} style={{ width: '100%' }}>
                 إدارة المنتجات والتسعير
               </button>
             </div>
          ) : (
             <div className="card" style={{ padding: '20px', background: 'rgba(245,158,11,0.05)', border: '1px solid rgba(245,158,11,0.2)' }}>
               <p style={{ fontSize: '14px', color: 'var(--warning)' }}>
                 ⚠️ تحتاج إلى صلاحيات الإدارة للوصول إلى إعدادات النظام.
               </p>
             </div>
          )}

          <div className="card" style={{ padding: '20px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '12px' }}>حول النظام</h3>
            <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
              <p style={{ marginBottom: '8px' }}><strong>الإصدار:</strong> 1.0.0</p>
              <p style={{ marginBottom: '8px' }}><strong>البيئة:</strong> Production</p>
              <p><strong>قاعدة البيانات:</strong> SQLite (Local)</p>
            </div>
          </div>

        </div>
        
        <button className="btn btn-ghost" onClick={() => setView('dashboard')} style={{ width: '100%', marginTop: '24px' }}>إغلاق</button>
      </div>
    </div>
  );
}
