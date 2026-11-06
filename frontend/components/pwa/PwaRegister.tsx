'use client';

import { useEffect, useState } from 'react';
import { WifiOff, X, HeartHandshake } from 'lucide-react';
import { useTranslation } from '@/lib/i18n';

export default function PwaRegister() {
  const { t } = useTranslation();
  const [isOnline, setIsOnline] = useState<boolean>(true);
  const [showOfflineBanner, setShowOfflineBanner] = useState<boolean>(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showInstallPill, setShowInstallPill] = useState<boolean>(false);

  useEffect(() => {
    // 1. Service Worker registration
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker
          .register('/sw.js')
          .then((reg) => {
            console.log('[PWA] Service Worker registered successfully with scope:', reg.scope);
          })
          .catch((err) => {
            console.warn('[PWA] Service Worker registration failed:', err);
          });
      });
    }

    // 2. Online / Offline status
    const updateOnline = () => {
      const online = typeof navigator !== 'undefined' ? navigator.onLine : true;
      setIsOnline(online);
      setShowOfflineBanner(!online);
    };

    window.addEventListener('online', updateOnline);
    window.addEventListener('offline', updateOnline);
    updateOnline();

    // 3. PWA install prompt handler
    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      // Only show install banner if not already installed
      setShowInstallPill(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);

    return () => {
      window.removeEventListener('online', updateOnline);
      window.removeEventListener('offline', updateOnline);
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
    };
  }, []);

  async function handleInstallClick() {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    console.log('[PWA] User response to install:', outcome);
    setDeferredPrompt(null);
    setShowInstallPill(false);
  }

  return (
    <>
      {/* Offline Alert Banner */}
      {showOfflineBanner && (
        <aside
          role="status"
          aria-live="polite"
          className="bg-amber-600 text-white px-4 py-2 text-xs sm:text-sm font-medium flex items-center justify-between gap-3 shadow-md fixed top-0 inset-x-0 z-[100] animate-fadeIn"
        >
          <div className="flex items-center gap-2 max-w-7xl mx-auto w-full justify-center">
            <WifiOff className="w-4 h-4 shrink-0" aria-hidden="true" />
            <span>
              <strong>{t('pwa.offline_title')}</strong> {t('pwa.offline_desc')}
            </span>
          </div>
          <button
            type="button"
            onClick={() => setShowOfflineBanner(false)}
            aria-label={t('pwa.dismiss')}
            className="text-white/80 hover:text-white p-1 rounded cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </aside>
      )}

      {/* Floating Install App Pill (Mobile/Desktop) */}
      {showInstallPill && (
        <div
          role="region"
          aria-label={t('pwa.install_title')}
          className="fixed bottom-20 end-4 z-40 bg-[var(--surface)] text-[var(--ink)] border border-[var(--line-strong)] rounded-2xl p-3 shadow-2xl flex items-center gap-3 max-w-sm animate-slideUp"
        >
          <div className="w-10 h-10 rounded-xl bg-teal-600 flex items-center justify-center text-white shrink-0 shadow-xs">
            <HeartHandshake className="w-5 h-5 text-white" />
          </div>
          <div className="flex-1 text-xs">
            <p className="font-bold text-[var(--ink)]">{t('pwa.install_title')}</p>
            <p className="text-[var(--ink-muted)]">{t('pwa.install_desc')}</p>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={handleInstallClick}
              className="px-3 py-1.5 rounded-lg bg-[var(--accent)] text-[var(--accent-on)] font-semibold text-xs hover:brightness-105 active:scale-95 transition-all cursor-pointer"
            >
              {t('pwa.install_button')}
            </button>
            <button
              type="button"
              onClick={() => setShowInstallPill(false)}
              aria-label={t('pwa.dismiss')}
              className="p-1 text-[var(--ink-muted)] hover:text-[var(--ink)] rounded cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </>
  );
}
