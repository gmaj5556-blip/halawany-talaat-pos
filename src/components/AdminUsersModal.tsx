'use client';

import { useState, useEffect } from 'react';
import type { ActiveView } from '@/app/page';

interface AdminUsersModalProps {
  setView: (v: ActiveView) => void;
}

export default function AdminUsersModal({ setView }: AdminUsersModalProps) {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState({ name: '', username: '', pin: '', role: 'cashier', active: true });

  const fetchUsers = async () => {
    try {
      const res = await fetch('/api/users');
      const data = await res.json();
      setUsers(data);
    } catch (e: any) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleEdit = (user: any) => {
    setEditingId(user.id);
    setFormData({
      name: user.name,
      username: user.username,
      pin: user.pin || '',
      role: user.role,
      active: user.active === 1
    });
  };

  const handleCreateNew = () => {
    setEditingId(-1); // -1 means new user
    setFormData({ name: '', username: '', pin: '', role: 'cashier', active: true });
  };

  const handleSave = async () => {
    if (!formData.name || !formData.username || !formData.pin) {
      setError('يرجى ملء جميع الحقول المطلوبة');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const isNew = editingId === -1;
      const res = await fetch('/api/users', {
        method: isNew ? 'POST' : 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: isNew ? undefined : editingId,
          ...formData
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setEditingId(null);
      fetchUsers();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setView('settings')}>
      <div className="modal-content" style={{ maxWidth: '800px', height: '80vh', display: 'flex', flexDirection: 'column' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h2 style={{ fontSize: '24px', fontWeight: 800 }}>👥 إدارة المستخدمين</h2>
          <button onClick={() => setView('settings')} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '24px' }}>✕</button>
        </div>

        {error && <div style={{ padding: '12px', background: 'rgba(239,68,68,0.1)', color: '#ef4444', borderRadius: '8px', marginBottom: '16px' }}>{error}</div>}

        {editingId !== null ? (
          <div className="card" style={{ padding: '20px', marginBottom: '20px' }}>
            <h3 style={{ marginBottom: '16px', fontSize: '18px' }}>{editingId === -1 ? 'إضافة مستخدم جديد' : 'تعديل مستخدم'}</h3>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', color: 'var(--text-secondary)' }}>الاسم بالكامل</label>
                <input 
                  type="text" className="input" 
                  value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} 
                />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', color: 'var(--text-secondary)' }}>اسم المستخدم (للدخول)</label>
                <input 
                  type="text" className="input" dir="ltr"
                  value={formData.username} onChange={e => setFormData({...formData, username: e.target.value})} 
                />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', color: 'var(--text-secondary)' }}>رمز الدخول (PIN)</label>
                <input 
                  type="password" className="input" dir="ltr"
                  value={formData.pin} onChange={e => setFormData({...formData, pin: e.target.value})} 
                />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', color: 'var(--text-secondary)' }}>الصلاحية</label>
                <select className="input" value={formData.role} onChange={e => setFormData({...formData, role: e.target.value})}>
                  <option value="cashier">كاشير</option>
                  <option value="admin">مدير نظام</option>
                </select>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '16px' }}>
                <input 
                  type="checkbox" 
                  id="activeUser"
                  checked={formData.active}
                  onChange={e => setFormData({...formData, active: e.target.checked})}
                  style={{ width: '20px', height: '20px' }}
                />
                <label htmlFor="activeUser" style={{ fontSize: '16px', cursor: 'pointer' }}>حساب نشط (يمكنه تسجيل الدخول)</label>
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
            <button className="btn btn-success" onClick={handleCreateNew}>+ مستخدم جديد</button>
          </div>
        )}

        <div style={{ flex: 1, overflowY: 'auto', background: 'var(--bg-card)', borderRadius: '12px', border: '1px solid var(--border)' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
            <thead style={{ position: 'sticky', top: 0, background: 'var(--bg-secondary)', zIndex: 1, boxShadow: '0 1px 0 var(--border)' }}>
              <tr style={{ textAlign: 'right' }}>
                <th style={{ padding: '12px 16px', color: 'var(--text-secondary)' }}>الاسم</th>
                <th style={{ padding: '12px 16px', color: 'var(--text-secondary)' }}>اسم الدخول</th>
                <th style={{ padding: '12px 16px', color: 'var(--text-secondary)' }}>الصلاحية</th>
                <th style={{ padding: '12px 16px', color: 'var(--text-secondary)' }}>الحالة</th>
                <th style={{ padding: '12px 16px', color: 'var(--text-secondary)' }}>إجراء</th>
              </tr>
            </thead>
            <tbody>
              {users.map(u => (
                <tr key={u.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                  <td style={{ padding: '12px 16px', fontWeight: 600 }}>{u.name}</td>
                  <td style={{ padding: '12px 16px', color: 'var(--text-muted)' }} dir="ltr">{u.username}</td>
                  <td style={{ padding: '12px 16px' }}>
                    <span className={`badge ${u.role === 'admin' ? 'badge-purple' : 'badge-blue'}`}>
                      {u.role === 'admin' ? 'مدير' : 'كاشير'}
                    </span>
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    <span style={{ color: u.active ? '#10b981' : '#ef4444', fontWeight: 600 }}>
                      {u.active ? 'نشط' : 'موقوف'}
                    </span>
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    <button 
                      onClick={() => handleEdit(u)}
                      style={{ background: 'rgba(59,130,246,0.1)', color: '#3b82f6', border: 'none', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', fontWeight: 600 }}
                    >
                      تعديل
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
