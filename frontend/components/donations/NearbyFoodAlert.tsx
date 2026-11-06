'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import {
  Bell,
  BellRing,
  Volume2,
  VolumeX,
  X,
  MapPin,
  ExternalLink,
  Sparkles,
  Package,
} from 'lucide-react';
import { apiFetch } from '@/lib/api';
import { playFoodAlertChime, isSoundEnabled, setSoundEnabled, playTestChime } from '@/lib/sound';
import { useTranslation } from '@/lib/i18n';

interface NearbyDonation {
  id: string;
  title: string;
  category: string;
  quantity: number | string;
  quantity_unit: string;
  distance_km?: number | null;
  expires_at: string;
  created_at: string;
}

export default function NearbyFoodAlert() {
  const { t, formatDistance } = useTranslation();
  const [activeAlert, setActiveAlert] = useState<NearbyDonation | null>(null);
  const [soundOn, setSoundOn] = useState<boolean>(true);
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [permissionState, setPermissionState] = useState<NotificationPermission>('default');
  const [showPromptBanner, setShowPromptBanner] = useState<boolean>(false);
  const [dismissedPrompt, setDismissedPrompt] = useState<boolean>(false);

  // Keep track of donation IDs already notified in this session to prevent duplicate alerts
  const seenIdsRef = useRef<Set<string>>(new Set());
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Initialize preferences and permissions
  useEffect(() => {
    setSoundOn(isSoundEnabled());

    const handleSoundChange = (e: Event) => {
      const custom = e as CustomEvent<{ enabled: boolean }>;
      if (custom.detail) setSoundOn(custom.detail.enabled);
    };
    window.addEventListener('ess_sound_setting_changed', handleSoundChange);

    if (typeof window !== 'undefined' && 'Notification' in window) {
      setPermissionState(Notification.permission);
    }

    // Try reading cached coordinates from previous location searches
    try {
      const storedLat = localStorage.getItem('ess_user_lat');
      const storedLng = localStorage.getItem('ess_user_lng');
      if (storedLat && storedLng) {
        setCoords({ lat: parseFloat(storedLat), lng: parseFloat(storedLng) });
      }
    } catch {
      // Ignore
    }

    return () => {
      window.removeEventListener('ess_sound_setting_changed', handleSoundChange);
    };
  }, []);

  // Request browser location and enable notification monitoring
  const requestLocationAndAlerts = useCallback(() => {
    if (!navigator.geolocation) return;

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const userCoords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setCoords(userCoords);
        try {
          localStorage.setItem('ess_user_lat', String(userCoords.lat));
          localStorage.setItem('ess_user_lng', String(userCoords.lng));
        } catch {
          // Ignore
        }
        setShowPromptBanner(false);
      },
      () => {
        // Location denied or unavailable
      },
      { timeout: 8000, enableHighAccuracy: false }
    );

    // Also ask for browser Notification permission if not decided
    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission().then((perm) => {
        setPermissionState(perm);
      });
    }
  }, []);

  // Trigger alert sound & native notification
  const triggerAlert = useCallback((donation: NearbyDonation) => {
    // 1. Play soothing notification chime
    playFoodAlertChime();

    // 2. Set in-app floating banner
    setActiveAlert(donation);

    // Auto-dismiss in-app banner after 14 seconds
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      setActiveAlert(null);
    }, 14000);

    // 3. Dispatch native OS/mobile notification if granted
    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
      try {
        const distanceStr = donation.distance_km != null ? `(${formatDistance(donation.distance_km)} ${t('alerts.away')})` : '';
        const title = t('alerts.notification_title');
        const body = t('alerts.notification_body', {
          title: donation.title,
          quantity: donation.quantity,
          unit: donation.quantity_unit,
          distance: distanceStr,
        });

        new Notification(title, {
          body,
          icon: '/icons/icon-192.svg',
          tag: `donation-${donation.id}`,
        });
      } catch {
        // Handled silently
      }
    }
  }, [formatDistance, t]);

  // Proximity polling: check for new donations within 10km
  useEffect(() => {
    if (!coords) return;

    let mounted = true;

    async function checkNearbyFood() {
      if (!coords) return;
      try {
        const res = await apiFetch<{ donations: NearbyDonation[] }>(
          `/donations/nearby?lat=${coords.lat}&lng=${coords.lng}&radius_km=10&limit=8`
        );
        if (!mounted || !res.data?.donations) return;

        const incoming = res.data.donations;

        // On first run, register current items so we don't spam for existing food
        if (seenIdsRef.current.size === 0) {
          incoming.forEach((d) => seenIdsRef.current.add(d.id));
          return;
        }

        // Look for brand new additions that haven't been alerted
        const brandNew = incoming.find((d) => !seenIdsRef.current.has(d.id));
        if (brandNew) {
          seenIdsRef.current.add(brandNew.id);
          triggerAlert(brandNew);
        }
      } catch {
        // Silent poll error handling
      }
    }

    // Check immediately and periodically every 45s
    checkNearbyFood();
    const interval = setInterval(checkNearbyFood, 45000);

    return () => {
      mounted = false;
      clearInterval(interval);
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [coords, triggerAlert]);

  function toggleSoundPref() {
    const next = !soundOn;
    setSoundOn(next);
    setSoundEnabled(next);
    if (next) playTestChime();
  }

  return (
    <>
      {/* ── Active Food Alert Floating Banner ── */}
      {activeAlert && (
        <aside
          role="alert"
          aria-live="assertive"
          className="fixed top-20 end-4 z-50 max-w-sm sm:max-w-md w-full bg-[var(--surface)] text-[var(--ink)] border-2 border-emerald-500 rounded-3xl p-4 shadow-2xl animate-bounce-subtle backdrop-blur-md"
          style={{
            boxShadow: '0 20px 40px oklch(0% 0 0 / 0.16), 0 4px 12px oklch(0% 0 0 / 0.08)',
          }}
        >
          <div className="flex items-start gap-3">
            {/* Pulsing Bell Icon Badge */}
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 animate-pulse">
              <BellRing className="w-5 h-5" />
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5 mb-0.5">
                <span className="text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-500 text-white">
                  {t('alerts.nearby_badge')}
                </span>
                {activeAlert.distance_km != null && (
                  <span className="text-xs text-[var(--ink-muted)] font-mono flex items-center gap-0.5">
                    <MapPin className="w-3 h-3 text-emerald-600 inline" />
                    {formatDistance(activeAlert.distance_km)}
                  </span>
                )}
              </div>

              <h4 className="text-sm font-bold text-[var(--ink)] truncate">
                {activeAlert.title}
              </h4>
              <p className="text-xs text-[var(--ink-muted)] line-clamp-1 mt-0.5">
                {activeAlert.quantity} {activeAlert.quantity_unit} · {t('alerts.ready_collection')}
              </p>

              <div className="flex items-center gap-2 mt-3">
                <Link
                  href={`/find?highlight=${activeAlert.id}`}
                  onClick={() => setActiveAlert(null)}
                  className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs transition-transform active:scale-95 cursor-pointer"
                >
                  <span>{t('alerts.view_reserve')}</span>
                  <ExternalLink className="w-3 h-3" />
                </Link>

                <button
                  type="button"
                  onClick={toggleSoundPref}
                  aria-label={soundOn ? t('alerts.sound_enabled') : t('alerts.sound_muted')}
                  className="p-1.5 rounded-full text-[var(--ink-muted)] hover:text-[var(--ink)] hover:bg-[var(--surface-soft)] transition-colors cursor-pointer"
                  title={soundOn ? t('alerts.sound_enabled') : t('alerts.sound_muted')}
                >
                  {soundOn ? <Volume2 className="w-4 h-4 text-emerald-600" /> : <VolumeX className="w-4 h-4 text-rose-500" />}
                </button>
              </div>
            </div>

            {/* Dismiss Button */}
            <button
              type="button"
              onClick={() => setActiveAlert(null)}
              aria-label={t('common.close')}
              className="p-1 text-[var(--ink-muted)] hover:text-[var(--ink)] rounded-lg transition-colors cursor-pointer shrink-0"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </aside>
      )}

      {/* ── Optional Permission Prompt Pill (shown if location not yet set and not dismissed) ── */}
      {!coords && !dismissedPrompt && (
        <div className="hidden sm:flex fixed bottom-6 start-6 z-40 items-center gap-2 px-3.5 py-2 rounded-full bg-[var(--surface)] border border-[var(--line-strong)] text-[var(--ink)] shadow-lg text-xs animate-fadeIn">
          <Sparkles className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
          <span className="text-[var(--ink-muted)]">{t('alerts.sound_prompt')}</span>
          <button
            type="button"
            onClick={requestLocationAndAlerts}
            className="px-2.5 py-1 rounded-full bg-emerald-600 text-white font-semibold hover:bg-emerald-700 transition-colors cursor-pointer"
          >
            {t('alerts.turn_on')}
          </button>
          <button
            type="button"
            onClick={() => setDismissedPrompt(true)}
            aria-label={t('common.close')}
            className="text-[var(--ink-muted)] hover:text-[var(--ink)] p-0.5 rounded cursor-pointer ms-1"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </>
  );
}
