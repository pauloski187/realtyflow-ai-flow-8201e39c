import { useState, useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import { Menu, Moon, Sun, Wifi, WifiOff } from 'lucide-react';
import AppSidebar from './AppSidebar';
import { cn } from '@/lib/utils';
import { api } from '@/lib/api';

export default function AppLayout() {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [dark, setDark] = useState(false);
  const [backendStatus, setBackendStatus] = useState<'checking' | 'connected' | 'disconnected'>('checking');
  const [backendError, setBackendError] = useState<string | null>(null);

  const toggleDark = () => {
    setDark(!dark);
    document.documentElement.classList.toggle('dark');
  };

  useEffect(() => {
    api.healthCheck()
      .then((data) => {
        if (data.status === 'healthy') {
          setBackendStatus('connected');
        } else {
          setBackendStatus('disconnected');
          setBackendError(`Unexpected status: ${data.status}`);
        }
      })
      .catch((err) => {
        setBackendStatus('disconnected');
        setBackendError(err.message);
      });
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <AppSidebar
        collapsed={collapsed}
        onToggle={() => setCollapsed(!collapsed)}
        mobileOpen={mobileOpen}
        onMobileClose={() => setMobileOpen(false)}
      />

      <div className={cn('transition-all duration-300', collapsed ? 'lg:ml-[68px]' : 'lg:ml-[240px]')}>
        {/* Top bar */}
        <header className="sticky top-0 z-30 h-14 bg-background/80 backdrop-blur-md border-b border-border flex items-center justify-between px-4 lg:px-6">
          <button
            onClick={() => setMobileOpen(true)}
            className="lg:hidden p-2 rounded-lg hover:bg-muted text-foreground"
          >
            <Menu className="w-5 h-5" />
          </button>

          {/* Backend status */}
          <div className="hidden lg:flex items-center gap-2 text-xs">
            {backendStatus === 'checking' && (
              <span className="text-muted-foreground">Checking backend…</span>
            )}
            {backendStatus === 'connected' && (
              <span className="flex items-center gap-1.5 text-success">
                <Wifi className="w-3.5 h-3.5" /> Connected
              </span>
            )}
            {backendStatus === 'disconnected' && (
              <span className="flex items-center gap-1.5 text-destructive" title={backendError ?? ''}>
                <WifiOff className="w-3.5 h-3.5" /> {backendError ? `Request failed: ${backendError}` : 'Disconnected'}
              </span>
            )}
          </div>

          <button
            onClick={toggleDark}
            className="p-2 rounded-lg hover:bg-muted text-muted-foreground transition-colors"
          >
            {dark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
          </button>
        </header>

        {/* Content */}
        <main className="p-4 lg:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
