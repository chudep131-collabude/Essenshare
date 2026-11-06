'use client';

import { useState, useEffect, useCallback } from 'react';
import { MapPin, Plus, Trash2, Building, AlertCircle, CheckCircle2 } from 'lucide-react';
import { apiFetch, apiPost, apiDelete } from '@/lib/api';
import { geocodeAddress } from '@/lib/geocode';
import Alert from '@/components/ui/Alert';
import LoadingSpinner from '@/components/ui/LoadingSpinner';

export interface PickupLocation {
  id: string;
  label: string;
  address: string;
  lat: number;
  lng: number;
  notes: string | null;
  created_at: string;
}

export default function SavedLocationsManager() {
  const [locations, setLocations] = useState<PickupLocation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // New location modal/form state
  const [showAddForm, setShowAddForm] = useState(false);
  const [label, setLabel] = useState('');
  const [address, setAddress] = useState('');
  const [notes, setNotes] = useState('');
  const [geocoding, setGeocoding] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const fetchLocations = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiFetch<{ locations: PickupLocation[] }>('/donors/locations');
      if (res.data) {
        setLocations(res.data.locations || []);
      }
    } catch {
      setError('Could not load your saved pickup locations.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLocations();
  }, [fetchLocations]);

  async function handleAddLocation(e: React.FormEvent) {
    e.preventDefault();
    if (!label.trim() || !address.trim()) {
      setFormError('Please provide both a label and an address.');
      return;
    }
    setSubmitting(true);
    setFormError(null);
    try {
      setGeocoding(true);
      const geo = await geocodeAddress(address);
      setGeocoding(false);

      const lat = geo?.lat ?? 37.7749;
      const lng = geo?.lng ?? -122.4194;

      const res = await apiPost<{ location: PickupLocation }>('/donors/locations', {
        label: label.trim(),
        address: address.trim(),
        lat,
        lng,
        notes: notes.trim() || undefined,
      });

      if (res.data?.location) {
        setLocations((prev) => [res.data!.location, ...prev]);
        setSuccessMsg(`Saved location "${label}" added successfully.`);
        setLabel('');
        setAddress('');
        setNotes('');
        setShowAddForm(false);
        setTimeout(() => setSuccessMsg(null), 4000);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to save location.';
      setFormError(msg);
    } finally {
      setSubmitting(false);
      setGeocoding(false);
    }
  }

  async function handleDelete(id: string, name: string) {
    if (!window.confirm(`Are you sure you want to delete "${name}"?`)) return;
    try {
      await apiDelete(`/donors/locations/${id}`);
      setLocations((prev) => prev.filter((loc) => loc.id !== id));
      setSuccessMsg(`Location "${name}" removed.`);
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch {
      setError('Failed to delete location. Please try again.');
    }
  }

  return (
    <div className="space-y-6">
      {/* Header and Add button */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h3 className="text-base sm:text-lg font-bold text-[var(--ink)] tracking-tight">
            Saved Distribution Hubs & Loading Docks
          </h3>
          <p className="text-xs sm:text-sm text-[var(--ink-muted)]">
            Pre-configure your kitchen, warehouse, or rear alley loading bays for rapid 1-click donation posting.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowAddForm((v) => !v)}
          className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-full bg-[var(--accent)] text-[var(--accent-on)] font-semibold text-xs sm:text-sm shadow-xs hover:bg-[var(--accent-dark)] transition-colors cursor-pointer self-start sm:self-auto shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>{showAddForm ? 'Cancel' : 'Add New Hub'}</span>
        </button>
      </div>

      {successMsg && (
        <div className="p-3.5 rounded-xl bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/50 flex items-center gap-2 text-xs">
          <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
          <span>{successMsg}</span>
        </div>
      )}

      {error && <Alert type="error">{error}</Alert>}

      {/* Add New Hub Form */}
      {showAddForm && (
        <form
          onSubmit={handleAddLocation}
          className="p-5 rounded-2xl bg-[var(--surface-soft)] border border-[var(--line)] space-y-4 animate-in fade-in duration-200"
        >
          <div className="flex items-center gap-2 text-sm font-bold text-[var(--ink)]">
            <Building className="w-4 h-4 text-[var(--accent)]" />
            <span>Add Distribution Hub</span>
          </div>

          {formError && <Alert type="error">{formError}</Alert>}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="hub-label" className="block text-xs font-semibold text-[var(--ink)] mb-1">
                Hub Label *
              </label>
              <input
                id="hub-label"
                type="text"
                required
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                placeholder="e.g. Main Bakery Rear Loading Bay"
                className="w-full px-3.5 py-2 text-xs sm:text-sm rounded-lg border border-[var(--line)] bg-[var(--surface)] text-[var(--ink)] focus:outline-none focus:ring-2 focus:ring-[var(--focus-ring)]"
              />
            </div>
            <div>
              <label htmlFor="hub-address" className="block text-xs font-semibold text-[var(--ink)] mb-1">
                Physical Address *
              </label>
              <input
                id="hub-address"
                type="text"
                required
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Street address, city, postcode"
                className="w-full px-3.5 py-2 text-xs sm:text-sm rounded-lg border border-[var(--line)] bg-[var(--surface)] text-[var(--ink)] focus:outline-none focus:ring-2 focus:ring-[var(--focus-ring)]"
              />
            </div>
          </div>

          <div>
            <label htmlFor="hub-notes" className="block text-xs font-semibold text-[var(--ink)] mb-1">
              Pickup Instructions & Access Notes (Optional)
            </label>
            <input
              id="hub-notes"
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Loading dock shutter #2, call dispatch or ring doorbell"
              className="w-full px-3.5 py-2 text-xs sm:text-sm rounded-lg border border-[var(--line)] bg-[var(--surface)] text-[var(--ink)] focus:outline-none focus:ring-2 focus:ring-[var(--focus-ring)]"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => setShowAddForm(false)}
              className="px-4 py-2 rounded-lg text-xs font-semibold text-[var(--ink-muted)] hover:text-[var(--ink)] transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="inline-flex items-center justify-center gap-1.5 px-5 py-2 rounded-lg bg-[var(--accent)] text-[var(--accent-on)] text-xs font-bold hover:bg-[var(--accent-dark)] transition-colors disabled:opacity-50 cursor-pointer shadow-xs"
            >
              {submitting && <LoadingSpinner size="sm" />}
              <span>{geocoding ? 'Locating coordinates…' : submitting ? 'Saving Hub…' : 'Save Location'}</span>
            </button>
          </div>
        </form>
      )}

      {/* Locations List */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {[1, 2].map((i) => (
            <div key={i} className="p-4 rounded-xl border border-[var(--line)] bg-[var(--surface)] animate-pulse space-y-2">
              <div className="h-4 bg-[var(--skeleton)] rounded w-1/3" />
              <div className="h-3 bg-[var(--skeleton)] rounded w-3/4" />
              <div className="h-3 bg-[var(--skeleton)] rounded w-1/2" />
            </div>
          ))}
        </div>
      ) : locations.length === 0 ? (
        <div className="p-8 rounded-2xl border border-dashed border-[var(--line)] text-center bg-[var(--surface-soft)]/40">
          <div className="w-12 h-12 rounded-full bg-[var(--surface)] border border-[var(--line)] flex items-center justify-center mx-auto mb-3 text-[var(--ink-quiet)]">
            <MapPin className="w-6 h-6" />
          </div>
          <p className="text-sm font-bold text-[var(--ink)] mb-1">No saved distribution hubs yet</p>
          <p className="text-xs text-[var(--ink-muted)] max-w-sm mx-auto mb-4">
            Saving your regular loading bay or kitchen entrance means you won&apos;t have to retype pickup instructions on every donation.
          </p>
          <button
            type="button"
            onClick={() => setShowAddForm(true)}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full border border-[var(--accent)] text-[var(--accent)] font-semibold text-xs hover:bg-[var(--accent)]/10 transition-colors cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add your first hub</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {locations.map((loc) => (
            <div
              key={loc.id}
              className="p-4 rounded-xl bg-[var(--surface)] border border-[var(--line)] shadow-xs flex flex-col justify-between hover:border-[var(--accent)]/40 transition-colors group"
            >
              <div>
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-[var(--accent)] shrink-0" />
                    <h4 className="text-xs sm:text-sm font-bold text-[var(--ink)] leading-snug truncate">
                      {loc.label}
                    </h4>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleDelete(loc.id, loc.label)}
                    title={`Delete ${loc.label}`}
                    aria-label={`Delete ${loc.label}`}
                    className="text-[var(--ink-quiet)] hover:text-rose-600 p-1 rounded-md hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors opacity-70 group-hover:opacity-100 cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="space-y-1 text-xs text-[var(--ink-muted)]">
                  <p className="flex items-start gap-1.5 leading-relaxed">
                    <MapPin className="w-3.5 h-3.5 text-[var(--ink-quiet)] shrink-0 mt-0.5" />
                    <span className="line-clamp-2">{loc.address}</span>
                  </p>
                  {loc.notes && (
                    <p className="flex items-start gap-1.5 text-[11px] text-[var(--ink-quiet)] italic pl-5 line-clamp-2">
                      &ldquo;{loc.notes}&rdquo;
                    </p>
                  )}
                </div>
              </div>

              <div className="pt-3 mt-3 border-t border-[var(--line-subtle)] flex items-center justify-between text-[10px] text-[var(--ink-quiet)] tabular-nums">
                <span>GPS: {loc.lat.toFixed(4)}, {loc.lng.toFixed(4)}</span>
                <span className="text-emerald-600 dark:text-emerald-400 font-semibold">Active Hub</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
