'use client';

import { useState } from 'react';
import { usePosStore } from '@/lib/store';

export default function LoginScreen() {
  const { setCurrentUser } = usePosStore();
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!pin) {
      setError('يرجى إدخال رمز الدخول');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error === 'Invalid PIN' ? 'رمز الدخول غير صحيح' : 'فشل تسجيل الدخول');
        setPin('');
      } else {
        setCurrentUser(data);
      }
    } catch {
      setError('خطأ في الاتصال بالشبكة');
      setPin('');
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (num: string) => {
    setError('');
    setPin(prev => prev + num);
  };

  const handleDelete = () => {
    setPin(prev => prev.slice(0, -1));
  };

  return (
    <div style={{
      height: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'radial-gradient(ellipse at 30% 40%, rgba(139,92,246,0.15) 0%, transparent 60%), radial-gradient(ellipse at 70% 60%, rgba(6,182,212,0.1) 0%, transparent 60%), var(--bg-primary)',
    }}>
      {/* Background grid */}
      <div style={{
        position: 'fixed', inset: 0, 
        backgroundImage: 'linear-gradient(rgba(139,92,246,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(139,92,246,0.05) 1px, transparent 1px)',
        backgroundSize: '40px 40px',
        pointerEvents: 'none',
      }} />

      <div className="animate-scale" style={{ width: '100%', maxWidth: '380px', padding: '0 24px' }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: '30px' }}>
          <img 
            src="/logo.png" 
            alt="حلواني طلعت" 
            style={{ 
              width: '120px', height: '120px', margin: '0 auto 10px',
              borderRadius: '24px',
              objectFit: 'cover',
              boxShadow: '0 8px 32px rgba(139,92,246,0.3)',
            }} 
          />
          <h1 style={{ fontSize: '28px', fontWeight: 900, color: 'var(--text-primary)', letterSpacing: '-0.5px' }}>حلواني طلعت</h1>
          <p style={{ color: 'var(--text-muted)', marginTop: '4px', fontSize: '14px', fontWeight: 500 }}>نظام الكاشير المطور</p>
        </div>

        {/* Login Card (Numpad) */}
        <div className="card-elevated" style={{ padding: '28px' }}>
          
          {/* PIN Display */}
          <div style={{
            background: 'rgba(0,0,0,0.3)',
            border: '1px solid var(--border)',
            borderRadius: '12px',
            padding: '16px',
            textAlign: 'center',
            marginBottom: '24px',
            minHeight: '60px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <span style={{ fontSize: '32px', letterSpacing: '8px', color: 'var(--accent-light)', fontWeight: 'bold' }}>
              {pin.replace(/./g, '●') || <span style={{ color: 'var(--text-muted)', fontSize: '16px', letterSpacing: 'normal' }}>رمز الدخول</span>}
            </span>
          </div>

          {error && (
            <div style={{
              background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)',
              borderRadius: '10px', padding: '12px 16px',
              color: '#ef4444', fontSize: '14px',
              marginBottom: '20px', textAlign: 'center'
            }}>
              ⚠️ {error}
            </div>
          )}

          {/* Keypad */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: '12px',
            marginBottom: '20px'
          }}>
            {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map(num => (
              <button
                key={num}
                onClick={() => handleKeyPress(num)}
                style={{
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid var(--border)',
                  borderRadius: '12px',
                  padding: '18px 0',
                  fontSize: '24px',
                  fontWeight: 600,
                  color: 'var(--text-primary)',
                  cursor: 'pointer',
                  transition: 'all 0.15s'
                }}
                onMouseOver={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.1)'; }}
                onMouseOut={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; }}
                onMouseDown={(e) => { e.currentTarget.style.transform = 'scale(0.95)'; }}
                onMouseUp={(e) => { e.currentTarget.style.transform = 'scale(1)'; }}
              >
                {num}
              </button>
            ))}
            
            <button
              onClick={handleDelete}
              style={{
                background: 'rgba(239,68,68,0.1)',
                border: '1px solid rgba(239,68,68,0.2)',
                borderRadius: '12px',
                padding: '18px 0',
                fontSize: '20px',
                color: '#ef4444',
                cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center'
              }}
            >
              ⌫
            </button>
            
            <button
              onClick={() => handleKeyPress('0')}
              style={{
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid var(--border)',
                borderRadius: '12px',
                padding: '18px 0',
                fontSize: '24px',
                fontWeight: 600,
                color: 'var(--text-primary)',
                cursor: 'pointer'
              }}
            >
              0
            </button>
            
            <button
              onClick={handleLogin}
              disabled={loading || pin.length === 0}
              style={{
                background: 'linear-gradient(135deg, #8B5CF6, #7C3AED)',
                border: 'none',
                borderRadius: '12px',
                padding: '18px 0',
                fontSize: '20px',
                fontWeight: 600,
                color: 'white',
                cursor: (loading || pin.length === 0) ? 'not-allowed' : 'pointer',
                opacity: (loading || pin.length === 0) ? 0.7 : 1,
                boxShadow: '0 4px 15px rgba(139,92,246,0.4)',
                display: 'flex', alignItems: 'center', justifyContent: 'center'
              }}
            >
              ✓
            </button>
          </div>
          
          <div style={{ padding: '12px', background: 'rgba(139,92,246,0.08)', borderRadius: '8px', border: '1px solid rgba(139,92,246,0.2)', textAlign: 'center' }}>
            <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
              رضا: <span style={{ color: 'var(--accent-light)' }}>0000</span> | 
              عبدالرحمن: <span style={{ color: 'var(--accent-light)' }}>00000</span> | 
              المدير: <span style={{ color: 'var(--accent-light)' }}>1234</span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
