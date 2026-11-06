'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import {
  Bell,
  Check,
  CheckCheck,
  Package,
  ShieldCheck,
  AlertTriangle,
  Clock,
  Sparkles,
  ExternalLink,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { apiFetch, apiPatch, apiPost } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { useTranslation } from '@/lib/i18n';
import { playFoodAlertChime, isSoundEnabled, setSoundEnabled, playTestChime } from '@/lib/sound';

interface NotificationItem {
  id: string;
  type: string;
  title: string;
  body: string;
  data: Record<string, unknown> | null;
  read_at: string | null;
  created_at: string;
}

interface NotificationsResponse {
  notifications: NotificationItem[];
  unread_count: number;
  pagination: {
    total: number;
    page: number;
    limit: number;
    total_pages: number;
  };
}

function timeAgo(dateString: string): string {
  const diffMs = Date.now() - new Date(dateString).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function getNotificationIcon(type: string) {
  switch (type) {
    case 'PICKUP_REQUESTED':
    case 'ALLOCATION_REQUEST':
      return <Package className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />;
    case 'PICKUP_CONFIRMED':
    case 'VERIFICATION_UPDATE':
      return <ShieldCheck className="w-4 h-4 text-sky-600 dark:text-sky-400" />;
    case 'SAFETY_ALERT':
    case 'RECALL':
      return <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400" />;
    default:
      return <Sparkles className="w-4 h-4 text-[var(--accent)]" />;
  }
}

export default function NotificationCenter() {
  const { user } = useAuth();
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [markingAll, setMarkingAll] = useState(false);
  const [soundOn, setSoundOn] = useState<boolean>(true);
  const prevUnreadRef = useRef<number | null>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    setSoundOn(isSoundEnabled());
    const handleSoundChange = (e: Event) => {
      const custom = e as CustomEvent<{ enabled: boolean }>;
      if (custom.detail) setSoundOn(custom.detail.enabled);
    };
    window.addEventListener('ess_sound_setting_changed', handleSoundChange);
    return () => window.removeEventListener('ess_sound_setting_changed', handleSoundChange);
  }, []);

  const fetchNotifications = useCallback(async () => {
    if (!user) return;
    try {
      setLoading(true);
      const res = await apiFetch<NotificationsResponse>('/notifications?limit=15');
      if (res.data) {
        const count = res.data.unread_count || 0;
        // Play audio chime if new unread notification arrived
        if (prevUnreadRef.current !== null && count > prevUnreadRef.current) {
          playFoodAlertChime();
        }
        prevUnreadRef.current = count;
        setNotifications(res.data.notifications || []);
        setUnreadCount(count);
      }
    } catch {
      // Background poll or silent fail
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Initial fetch and periodic refresh (every 45s)
  useEffect(() => {
    if (!user) return;
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 45000);
    return () => clearInterval(interval);
  }, [user, fetchNotifications]);

  // Close on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        popoverRef.current &&
        !popoverRef.current.contains(e.target as Node) &&
        triggerRef.current &&
        !triggerRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  // Close on Escape key
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
        triggerRef.current?.focus();
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  async function handleMarkAsRead(id: string, e: React.MouseEvent) {
    e.stopPropagation();
    try {
      await apiPatch(`/notifications/${id}/read`, {});
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, read_at: new Date().toISOString() } : n))
      );
      setUnreadCount((c) => Math.max(0, c - 1));
    } catch {
      // Ignored
    }
  }

  async function handleMarkAllAsRead() {
    if (markingAll || unreadCount === 0) return;
    setMarkingAll(true);
    try {
      await apiPost('/notifications/mark-all-read', {});
      setNotifications((prev) =>
        prev.map((n) => ({ ...n, read_at: new Date().toISOString() }))
      );
      setUnreadCount(0);
    } catch {
      // Ignored
    } finally {
      setMarkingAll(false);
    }
  }

  if (!user) return null;

  return (
    <div className="relative inline-block text-left">
      {/* Trigger Button */}
      <button
        ref={triggerRef}
        type="button"
        onClick={() => {
          setIsOpen((prev) => !prev);
          if (!isOpen) fetchNotifications();
        }}
        aria-expanded={isOpen}
        aria-haspopup="true"
        aria-label={`Notifications ${unreadCount > 0 ? `(${unreadCount} unread)` : ''}`}
        className="relative inline-flex items-center justify-center w-10 h-10 rounded-full text-[var(--ink-muted)] hover:text-[var(--ink)] hover:bg-[var(--surface-soft)] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)] cursor-pointer"
      >
        <Bell className="w-5 h-5" aria-hidden="true" />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-600 px-1 text-[10px] font-bold text-white shadow-sm animate-pulse tabular-nums">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Popover Dropdown */}
      {isOpen && (
        <div
          ref={popoverRef}
          role="dialog"
          aria-label="Notification center"
          className="absolute right-0 mt-2 w-80 sm:w-96 rounded-2xl bg-[var(--surface)] border border-[var(--line)] shadow-2xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-150"
          style={{
            boxShadow: '0 20px 40px oklch(0% 0 0 / 0.14), 0 4px 12px oklch(0% 0 0 / 0.08)',
          }}
        >
          {/* Header */}
          <div className="px-4 py-3 bg-[var(--surface-soft)]/60 border-b border-[var(--line)] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold text-[var(--ink)] tracking-tight">{t('notifications.title')}</h2>
              {unreadCount > 0 && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[var(--accent)]/15 text-[var(--accent-dark)] dark:text-[var(--accent-on)] tabular-nums">
                  {t('notifications.new_count', { count: unreadCount })}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  const next = !soundOn;
                  setSoundOn(next);
                  setSoundEnabled(next);
                  if (next) playTestChime();
                }}
                title={soundOn ? t('notifications.sound_enabled') : t('notifications.sound_muted')}
                className="p-1 rounded-md text-[var(--ink-muted)] hover:text-[var(--ink)] hover:bg-[var(--surface)] transition-colors cursor-pointer inline-flex items-center gap-1"
                aria-label={soundOn ? t('notifications.sound_enabled') : t('notifications.sound_muted')}
              >
                {soundOn ? <Volume2 className="w-4 h-4 text-emerald-600" /> : <VolumeX className="w-4 h-4 text-rose-500" />}
              </button>

              {unreadCount > 0 && (
                <button
                  type="button"
                  onClick={handleMarkAllAsRead}
                  disabled={markingAll}
                  className="text-xs font-semibold text-[var(--accent)] hover:text-[var(--accent-dark)] transition-colors inline-flex items-center gap-1 cursor-pointer disabled:opacity-50"
                >
                  <CheckCheck className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>{t('notifications.mark_all_read')}</span>
                </button>
              )}
            </div>
          </div>

          {/* List Content */}
          <div className="max-h-96 overflow-y-auto divide-y divide-[var(--line-subtle)] focus:outline-none">
            {loading && notifications.length === 0 ? (
              <div className="p-6 space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex gap-3 animate-pulse">
                    <div className="w-8 h-8 rounded-full bg-[var(--skeleton)] shrink-0" />
                    <div className="flex-1 space-y-2">
                      <div className="h-4 bg-[var(--skeleton)] rounded w-3/4" />
                      <div className="h-3 bg-[var(--skeleton)] rounded w-1/2" />
                    </div>
                  </div>
                ))}
              </div>
            ) : notifications.length === 0 ? (
              <div className="p-8 text-center flex flex-col items-center justify-center">
                <div className="w-12 h-12 rounded-full bg-[var(--surface-soft)] flex items-center justify-center mb-2 text-[var(--ink-quiet)]">
                  <Bell className="w-6 h-6" />
                </div>
                <p className="text-xs font-semibold text-[var(--ink)]">{t('notifications.empty_title')}</p>
                <p className="text-[11px] text-[var(--ink-muted)] mt-0.5">
                  {t('notifications.empty_desc')}
                </p>
              </div>
            ) : (
              notifications.map((item) => {
                const isUnread = !item.read_at;
                return (
                  <div
                    key={item.id}
                    className={`p-3.5 transition-colors flex gap-3 relative group hover:bg-[var(--surface-soft)] ${
                      isUnread ? 'bg-[var(--accent)]/5' : ''
                    }`}
                  >
                    {/* Icon container */}
                    <div className="w-8 h-8 rounded-full bg-[var(--surface)] border border-[var(--line)] shadow-xs flex items-center justify-center shrink-0 mt-0.5">
                      {getNotificationIcon(item.type)}
                    </div>

                    {/* Text Details */}
                    <div className="flex-1 min-w-0 pr-6">
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <p className={`text-xs ${isUnread ? 'font-bold text-[var(--ink)]' : 'font-medium text-[var(--ink-muted)]'} truncate`}>
                          {item.title}
                        </p>
                        {isUnread && (
                          <span
                            className="w-2 h-2 rounded-full bg-[var(--accent)] shrink-0"
                            aria-label="Unread"
                          />
                        )}
                      </div>
                      <p className="text-xs text-[var(--ink-muted)] line-clamp-2 leading-relaxed">
                        {item.body}
                      </p>
                      <div className="flex items-center gap-2 mt-1.5 text-[10px] text-[var(--ink-quiet)]">
                        <Clock className="w-3 h-3" />
                        <span>{timeAgo(item.created_at)}</span>
                      </div>
                    </div>

                    {/* Action to Mark Read individually */}
                    {isUnread && (
                      <button
                        type="button"
                        onClick={(e) => handleMarkAsRead(item.id, e)}
                        title="Mark as read"
                        aria-label="Mark as read"
                        className="absolute right-3 top-3 text-[var(--ink-quiet)] hover:text-[var(--accent)] p-1 rounded-full hover:bg-[var(--surface)] transition-colors opacity-80 group-hover:opacity-100"
                      >
                        <Check className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                );
              })
            )}
          </div>

          {/* Footer */}
          <div className="p-2.5 bg-[var(--surface-soft)]/60 border-t border-[var(--line)] text-center">
            <Link
              href="/dashboard"
              onClick={() => setIsOpen(false)}
              className="text-xs font-semibold text-[var(--accent)] hover:underline inline-flex items-center gap-1"
            >
              <span>View full dashboard</span>
              <ExternalLink className="w-3 h-3" />
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
