'use client';

import { useEffect, useState } from 'react';
import { usePosStore } from '@/lib/store';
import LoginScreen from '@/components/LoginScreen';
import Dashboard from '@/components/Dashboard';
import PosScreen from '@/components/PosScreen';
import PeriodModal from '@/components/PeriodModal';
import ShiftModal from '@/components/ShiftModal';
import CloseShiftModal from '@/components/CloseShiftModal';
import StockModal from '@/components/StockModal';
import ReportsModal from '@/components/ReportsModal';
import SettingsModal from '@/components/SettingsModal';
import AdminUsersModal from '@/components/AdminUsersModal';
import AdminProductsModal from '@/components/AdminProductsModal';

export type ActiveView = 'dashboard' | 'pos' | 'period' | 'shift' | 'close-shift' | 'stock' | 'reports' | 'settings' | 'admin-users' | 'admin-products';

export default function Home() {
  const { currentUser } = usePosStore();
  const [view, setView] = useState<ActiveView>('dashboard');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return null; // or a loading spinner
  }

  if (!currentUser) {
    return <LoginScreen />;
  }

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--bg-primary)' }}>
      {view === 'dashboard' && <Dashboard setView={setView} />}
      {view === 'pos' && <PosScreen setView={setView} />}
      {view === 'period' && <PeriodModal setView={setView} />}
      {view === 'shift' && <ShiftModal setView={setView} />}
      {view === 'close-shift' && <CloseShiftModal setView={setView} />}
      {view === 'stock' && <StockModal setView={setView} />}
      {view === 'reports' && <ReportsModal setView={setView} />}
      {view === 'settings' && <SettingsModal setView={setView} />}
      {view === 'admin-users' && <AdminUsersModal setView={setView} />}
      {view === 'admin-products' && <AdminProductsModal setView={setView} />}
    </div>
  );
}
