'use client';

/**
 * DonationMap
 * Interactive Leaflet map with 100% IN-APP directions (never redirects to Google Maps):
 *  - Turn-by-turn routing directly on the map via internal /api/directions
 *  - Walk, Bike, and Drive modes with live distance and duration
 *  - High-contrast route polyline and arrival flag
 *  - Dual/Multi map sources (Street, Satellite, Mapbox)
 *  - High-precision pin placement with category-coded SVGs
 *  - Click on card address or pin for instant in-app navigation
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import 'leaflet/dist/leaflet.css';
import {
  Map as MapIcon,
  Satellite,
  Sparkles,
  LocateFixed,
  Search,
  AlertTriangle,
  X,
  Navigation,
  Footprints,
  Bike,
  Car,
} from 'lucide-react';
import type { Donation } from '@/components/donations/DonationCard';

export interface DonationMapProps {
  donations: Donation[];
  userLat?: number | null;
  userLng?: number | null;
  onSelectDonation?: (donationId: string) => void;
  height?: string;
  className?: string;
}

type MapSource = 'street' | 'satellite' | 'mapbox';
type RouteMode = 'walking' | 'cycling' | 'driving';

interface RouteStep {
  id: number;
  instruction: string;
  distanceMeters: number;
  formattedDistance: string;
  durationSeconds: number;
  location: [number, number];
}

interface ActiveRoute {
  donation: Donation;
  mode: RouteMode;
  formattedDistance: string;
  formattedDuration: string;
  coordinates: [number, number][];
  steps: RouteStep[];
  originName: string;
  isSimulatedOrigin: boolean;
}

const CATEGORY_COLORS: Record<string, string> = {
  PREPARED_FOOD: '#ea580c',
  GROCERIES:     '#16a34a',
  PRODUCE:       '#15803d',
  BAKERY:        '#d97706',
  DAIRY:         '#0284c7',
  BEVERAGES:     '#4f46e5',
  NON_FOOD_ESSENTIALS: '#7c3aed',
  OTHER:         '#57534e',
};

const CATEGORY_NAMES: Record<string, string> = {
  PREPARED_FOOD: 'Prepared Food',
  GROCERIES:     'Groceries',
  PRODUCE:       'Fresh Produce',
  BAKERY:        'Bakery',
  DAIRY:         'Dairy & Chilled',
  BEVERAGES:     'Beverages',
  NON_FOOD_ESSENTIALS: 'Essentials',
  OTHER:         'Surplus Item',
};

// Default city center origin if user GPS is cross-continent or unavailable (Trafalgar Square)
const DEFAULT_DEMO_ORIGIN = {
  lat: 51.5080,
  lng: -0.1281,
  name: 'Trafalgar Square, London',
};

function getCategoryColor(category: string): string {
  return CATEGORY_COLORS[category] ?? '#16a34a';
}

function makePinSvg(colour: string): string {
  return `
    <div style="position:relative;width:32px;height:40px;display:flex;align-items:center;justify-content:center;filter:drop-shadow(0 3px 6px rgba(0,0,0,0.35));cursor:pointer;transition:transform 0.15s ease;">
      <svg xmlns="http://www.w3.org/2000/svg" width="32" height="40" viewBox="0 0 32 40" fill="none">
        <path d="M16 0C7.163 0 0 7.163 0 16c0 11.2 16 24 16 24s16-12.8 16-24c0-8.837-7.163-16-16-16z" fill="${colour}" stroke="#ffffff" stroke-width="2"/>
        <circle cx="16" cy="15" r="7.5" fill="#ffffff"/>
        <circle cx="16" cy="15" r="4" fill="${colour}"/>
      </svg>
    </div>
  `;
}

function makeUserGpsPin(): string {
  return `
    <div style="position:relative;width:24px;height:24px;display:flex;align-items:center;justify-content:center;">
      <div class="user-gps-pulse" style="position:absolute;width:24px;height:24px;border-radius:50%;background:#2563eb;opacity:0.4;"></div>
      <div style="position:relative;width:14px;height:14px;border-radius:50%;background:#2563eb;border:2.5px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.35);"></div>
    </div>
  `;
}

function computeDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export default function DonationMap({
  donations,
  userLat,
  userLng,
  onSelectDonation,
  height = '460px',
  className = '',
}: DonationMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mapRef = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const tileLayerRef = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const leafletModuleRef = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const userMarkerRef = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const markersMapRef = useRef<Map<string, any>>(new Map());
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const routePolylineGroupRef = useRef<any>(null);

  const [mapReady, setMapReady] = useState(false);
  const [activeSource, setActiveSource] = useState<MapSource>('street');
  const [mapboxToken, setMapboxToken] = useState<string>('');
  const [tokenModalOpen, setTokenModalOpen] = useState(false);
  const [inputToken, setInputToken] = useState('');

  // In-App Directions State
  const [activeRoute, setActiveRoute] = useState<ActiveRoute | null>(null);
  const [routeLoading, setRouteLoading] = useState(false);
  const [routeError, setRouteError] = useState<string | null>(null);
  const [routeMode, setRouteMode] = useState<RouteMode>('walking');
  const [stepsCollapsed, setStepsCollapsed] = useState(false);

  // Keep latest donations and routeMode in refs so global window handlers are never stale
  const donationsRef = useRef(donations);
  useEffect(() => {
    donationsRef.current = donations;
  }, [donations]);

  const routeModeRef = useRef(routeMode);
  useEffect(() => {
    routeModeRef.current = routeMode;
  }, [routeMode]);

  // Initialize Mapbox token
  useEffect(() => {
    const envToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || '';
    const storedToken =
      typeof window !== 'undefined' ? localStorage.getItem('essenshare_mapbox_token') || '' : '';
    const initialToken = envToken.startsWith('pk.') ? envToken : storedToken;
    if (initialToken) {
      setMapboxToken(initialToken);
    }
  }, []);

  const switchSource = useCallback(
    (source: MapSource, token?: string) => {
      if (!mapRef.current || !leafletModuleRef.current) return;
      const map = mapRef.current;
      const L = leafletModuleRef.current;

      if (tileLayerRef.current) {
        map.removeLayer(tileLayerRef.current);
        tileLayerRef.current = null;
      }

      if (source === 'mapbox') {
        const activeToken = token || mapboxToken;
        if (!activeToken) {
          setTokenModalOpen(true);
          return;
        }
        const mbLayer = L.tileLayer(
          `https://api.mapbox.com/styles/v1/mapbox/streets-v12/tiles/{z}/{x}/{y}?access_token=${activeToken}`,
          {
            attribution:
              '© <a href="https://www.mapbox.com/about/maps/" target="_blank" rel="noopener">Mapbox</a> ' +
              '© <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a>',
            maxZoom: 19,
            tileSize: 512,
            zoomOffset: -1,
          }
        );
        mbLayer.addTo(map);
        tileLayerRef.current = mbLayer;
        setActiveSource('mapbox');
      } else if (source === 'satellite') {
        const satLayer = L.tileLayer(
          'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
          {
            attribution:
              'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community',
            maxZoom: 19,
          }
        );
        satLayer.addTo(map);
        tileLayerRef.current = satLayer;
        setActiveSource('satellite');
      } else {
        const streetLayer = L.tileLayer(
          'https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}',
          {
            attribution:
              'Tiles &copy; Esri &mdash; Esri, DeLorme, NAVTEQ, TomTom, OpenStreetMap',
            maxZoom: 19,
          }
        );
        streetLayer.addTo(map);
        tileLayerRef.current = streetLayer;
        setActiveSource('street');
      }
    },
    [mapboxToken]
  );

  function handleSaveToken(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = inputToken.trim();
    if (!trimmed) return;
    setMapboxToken(trimmed);
    if (typeof window !== 'undefined') {
      localStorage.setItem('essenshare_mapbox_token', trimmed);
    }
    setTokenModalOpen(false);
    switchSource('mapbox', trimmed);
  }

  // Draw or clear route line on Leaflet map
  useEffect(() => {
    const map = mapRef.current;
    const L = leafletModuleRef.current;
    if (!map || !L) return;

    if (routePolylineGroupRef.current) {
      map.removeLayer(routePolylineGroupRef.current);
      routePolylineGroupRef.current = null;
    }

    if (!activeRoute) return;

    const group = L.featureGroup();

    // 1. Casing line for contrast
    const casing = L.polyline(activeRoute.coordinates, {
      color: '#052e16',
      weight: 8,
      opacity: 0.5,
      lineCap: 'round',
      lineJoin: 'round',
    });
    group.addLayer(casing);

    // 2. Foreground green route line
    const line = L.polyline(activeRoute.coordinates, {
      color: '#16a34a',
      weight: 5,
      opacity: 0.95,
      lineCap: 'round',
      lineJoin: 'round',
    });
    group.addLayer(line);

    // 3. Destination flag/marker
    const lastCoord = activeRoute.coordinates[activeRoute.coordinates.length - 1];
    if (lastCoord) {
      const finishIcon = L.divIcon({
        html: `<div style="display:flex;align-items:center;justify-content:center;width:28px;height:28px;border-radius:50%;background:#15803d;border:2.5px solid #fff;box-shadow:0 3px 6px rgba(0,0,0,0.3);color:#fff;"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" y1="22" x2="4" y2="15"/></svg></div>`,
        className: 'donation-pin-icon',
        iconSize: [28, 28],
        iconAnchor: [14, 14],
      });
      const finishMarker = L.marker(lastCoord, { icon: finishIcon, zIndexOffset: 2000 });
      group.addLayer(finishMarker);
    }

    group.addTo(map);
    routePolylineGroupRef.current = group;

    map.fitBounds(activeRoute.coordinates, {
      padding: [60, 60],
      maxZoom: 17,
      animate: true,
      duration: 0.8,
    });
  }, [activeRoute]);

  // Request in-app directions
  const requestDirections = useCallback(
    async (donation: Donation, mode: RouteMode = 'walking', forceDemoOrigin = false) => {
      console.log('[EssenShare] requestDirections called:', { title: donation.title, mode, forceDemoOrigin });
      setRouteLoading(true);
      setRouteError(null);

      const destLat = Number(donation.pickup_lat);
      const destLng = Number(donation.pickup_lng);

      if (isNaN(destLat) || isNaN(destLng)) {
        console.warn('[EssenShare] invalid destination coordinates:', donation.pickup_lat, donation.pickup_lng);
        setRouteError('Invalid destination coordinates.');
        setRouteLoading(false);
        return;
      }

      const validUserLat =
        userLat != null && !isNaN(Number(userLat)) && Math.abs(Number(userLat)) > 1
          ? Number(userLat)
          : null;
      const validUserLng =
        userLng != null && !isNaN(Number(userLng)) && Math.abs(Number(userLng)) > 1
          ? Number(userLng)
          : null;

      let startLat = validUserLat;
      let startLng = validUserLng;
      let originName = 'Your detected location';
      let isSimulatedOrigin = false;

      // If user has no GPS, or is cross-continent (>400km away) or forceDemoOrigin
      if (
        forceDemoOrigin ||
        startLat == null ||
        startLng == null ||
        computeDistanceKm(startLat, startLng, destLat, destLng) > 400
      ) {
        startLat = DEFAULT_DEMO_ORIGIN.lat;
        startLng = DEFAULT_DEMO_ORIGIN.lng;
        originName = DEFAULT_DEMO_ORIGIN.name;
        isSimulatedOrigin = true;
      }

      console.log('[EssenShare] fetching route from:', { startLat, startLng }, 'to:', { destLat, destLng });

      try {
        const res = await fetch(
          `/api/directions?fromLat=${startLat}&fromLng=${startLng}&toLat=${destLat}&toLng=${destLng}&mode=${mode}`
        );

        if (!res.ok) {
          throw new Error(`Routing request failed (${res.status})`);
        }

        const data = await res.json();
        console.log('[EssenShare] /api/directions response:', data);

        if (!data.success) {
          if (data.isCrossContinent && !isSimulatedOrigin) {
            console.log('[EssenShare] isCrossContinent, retrying with demo origin');
            requestDirections(donation, mode, true);
            return;
          }
          setRouteError(data.message || 'Could not find a walkable route to this location.');
          setRouteLoading(false);
          return;
        }

        console.log('[EssenShare] setting activeRoute:', data.formattedDistance, data.formattedDuration);
        setActiveRoute({
          donation,
          mode,
          formattedDistance: data.formattedDistance,
          formattedDuration: data.formattedDuration,
          coordinates: data.coordinates,
          steps: data.steps,
          originName,
          isSimulatedOrigin,
        });
        setRouteMode(mode);
        setStepsCollapsed(false);

        if (mapRef.current) {
          mapRef.current.closePopup();
        }

        if (mapContainerRef.current) {
          mapContainerRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Could not generate directions';
        console.error('[EssenShare] route error:', msg);
        setRouteError(msg);
      } finally {
        setRouteLoading(false);
      }
    },
    [userLat, userLng]
  );

  // Clear in-app route
  function handleClearRoute() {
    setActiveRoute(null);
    setRouteError(null);
    if (mapRef.current && routePolylineGroupRef.current) {
      mapRef.current.removeLayer(routePolylineGroupRef.current);
      routePolylineGroupRef.current = null;
    }
    const coords: [number, number][] = donations
      .filter((d) => d.pickup_lat != null && d.pickup_lng != null)
      .map((d) => [Number(d.pickup_lat), Number(d.pickup_lng)] as [number, number]);

    if (coords.length > 1 && mapRef.current) {
      mapRef.current.fitBounds(coords, { padding: [50, 50], maxZoom: 15 });
    }
  }

  // Helper to build rich popup HTML with in-app directions button
  const buildPopupHtml = useCallback(
    (d: Donation) => {
      const dLat = Number(d.pickup_lat);
      const dLng = Number(d.pickup_lng);
      const categoryColor = getCategoryColor(d.category);
      const categoryName = CATEGORY_NAMES[d.category] ?? d.category;

      let distanceText = '';
      if (d.distance_km != null) {
        distanceText =
          d.distance_km < 1
            ? `${Math.round(d.distance_km * 1000)} m away`
            : `${d.distance_km.toFixed(1)} km away`;
      } else if (
        userLat != null &&
        userLng != null &&
        !isNaN(Number(userLat)) &&
        !isNaN(Number(userLng))
      ) {
        const dist = computeDistanceKm(Number(userLat), Number(userLng), dLat, dLng);
        distanceText = dist < 1 ? `${Math.round(dist * 1000)} m away` : `${dist.toFixed(1)} km away`;
      }

      const expiryText = d.expires_at
        ? `Expires ${new Date(d.expires_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
        : '';

      return `
        <div style="min-width:220px;max-width:280px;font-family:inherit;padding:2px;box-sizing:border-box;">
          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:6px;">
            <span style="display:inline-flex;align-items:center;gap:5px;padding:2px 8px;border-radius:12px;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.04em;background:${categoryColor}18;color:${categoryColor};border:1px solid ${categoryColor}40;">
              <span style="width:6px;height:6px;border-radius:50%;background:${categoryColor};"></span>
              <span>${categoryName}</span>
            </span>
            ${distanceText ? `<span style="font-size:11px;color:#16a34a;font-weight:700;">${distanceText}</span>` : ''}
          </div>

          <h4 style="font-weight:800;font-size:14px;line-height:1.25;margin:0 0 4px;color:#111827;">
            ${escapeHtml(d.title)}
          </h4>

          <p style="font-size:12px;color:#4b5563;margin:0 0 4px;font-weight:500;">
            Available: <strong>${d.quantity} ${d.quantity_unit}</strong>
          </p>

          <p style="font-size:11px;color:#6b7280;margin:0 0 6px;line-height:1.3;display:flex;align-items:flex-start;gap:4px;">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="flex-shrink:0;margin-top:2px;"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
            <span>${escapeHtml(d.pickup_address)}</span>
          </p>

          ${expiryText ? `<p style="font-size:10px;color:#9ca3af;margin:0 0 8px;display:flex;align-items:center;gap:4px;"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg> <span>${expiryText}</span></p>` : ''}

          <div style="display:flex;align-items:center;gap:6px;margin-top:8px;">
            <!-- 100% IN-APP DIRECTIONS BUTTON -->
            <button
              onclick="window._essenshareGetDirections('${d.id}')"
              style="display:inline-flex;align-items:center;justify-content:center;gap:4px;padding:6px 10px;border-radius:18px;border:1px solid #16a34a;background:#f0fdf4;color:#15803d;font-size:11px;font-weight:700;cursor:pointer;white-space:nowrap;"
              title="Show in-app route on map"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="3 11 22 2 13 21 11 13 3 11"/></svg>
              <span>Directions</span>
            </button>

            ${
              onSelectDonation
                ? `<button
                    onclick="window._essenshareSelectDonation('${d.id}')"
                    style="flex:1;display:inline-flex;align-items:center;justify-content:center;padding:6px 12px;border-radius:18px;border:none;background:#15803d;color:#ffffff;font-size:11px;font-weight:700;cursor:pointer;white-space:nowrap;box-shadow:0 1px 2px rgba(0,0,0,0.1);"
                  >
                    Pickup Code →
                  </button>`
                : ''
            }
          </div>
        </div>
      `;
    },
    [onSelectDonation, userLat, userLng]
  );

  // Mount Leaflet Map
  useEffect(() => {
    if (!mapContainerRef.current) return;
    if (typeof window === 'undefined') return;

    let isMounted = true;

    (async () => {
      const L = (await import('leaflet')).default;
      leafletModuleRef.current = L;

      // Fix default icons
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      delete (L.Icon.Default.prototype as any)._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl:
          'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
        iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
        shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
      });

      if (!isMounted || !mapContainerRef.current) return;
      if (mapRef.current) return;

      const validUserLat =
        userLat != null && !isNaN(Number(userLat)) && Math.abs(Number(userLat)) > 1
          ? Number(userLat)
          : null;
      const validUserLng =
        userLng != null && !isNaN(Number(userLng)) && Math.abs(Number(userLng)) > 1
          ? Number(userLng)
          : null;

      const firstDonationLat =
        donations[0]?.pickup_lat != null && !isNaN(Number(donations[0].pickup_lat))
          ? Number(donations[0].pickup_lat)
          : null;
      const firstDonationLng =
        donations[0]?.pickup_lng != null && !isNaN(Number(donations[0].pickup_lng))
          ? Number(donations[0].pickup_lng)
          : null;

      const centerLat = validUserLat ?? firstDonationLat ?? 51.508;
      const centerLng = validUserLng ?? firstDonationLng ?? -0.128;
      const zoom = validUserLat ? 14 : donations.length > 0 ? 14 : 12;

      const map = L.map(mapContainerRef.current, {
        center: [centerLat, centerLng],
        zoom,
        zoomControl: true,
        attributionControl: true,
        keyboard: false,
      });

      mapRef.current = map;

      const streetLayer = L.tileLayer(
        'https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}',
        {
          attribution:
            'Tiles &copy; Esri &mdash; Esri, DeLorme, NAVTEQ, TomTom, OpenStreetMap',
          maxZoom: 19,
        }
      );
      streetLayer.addTo(map);
      tileLayerRef.current = streetLayer;

      // In-app actions bindings
      if (onSelectDonation) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (window as any)._essenshareSelectDonation = (id: string) => {
          onSelectDonation(id);
          map.closePopup();
        };
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (window as any)._essenshareFocusDonation = (id: string) => {
        const marker = markersMapRef.current.get(id);
        if (marker && mapRef.current) {
          const latLng = marker.getLatLng();
          mapRef.current.flyTo(latLng, 16, { duration: 0.8 });
          setTimeout(() => {
            marker.openPopup();
          }, 850);
          if (mapContainerRef.current) {
            mapContainerRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }
        }
      };

      // In-app directions caller from marker popup or cards
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (window as any)._essenshareGetDirections = (id: string, donationFallback?: Donation) => {
        const target =
          donationFallback ||
          donationsRef.current.find((d) => String(d.id) === String(id));
        if (target) {
          requestDirections(target, routeModeRef.current);
        }
      };

      // Set ready flag so the marker sync effect populates pins!
      setMapReady(true);

      // ResizeObserver to ensure Leaflet recalculates dimensions if container changes
      let resizeObserver: ResizeObserver | null = null;
      if (typeof ResizeObserver !== 'undefined' && mapContainerRef.current) {
        resizeObserver = new ResizeObserver(() => {
          if (mapRef.current) {
            mapRef.current.invalidateSize();
          }
        });
        resizeObserver.observe(mapContainerRef.current);
      }

      setTimeout(() => {
        if (mapRef.current) mapRef.current.invalidateSize();
      }, 150);
      setTimeout(() => {
        if (mapRef.current) mapRef.current.invalidateSize();
      }, 600);
    })();

    return () => {
      isMounted = false;
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
      setMapReady(false);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      delete (window as any)._essenshareSelectDonation;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      delete (window as any)._essenshareFocusDonation;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      delete (window as any)._essenshareGetDirections;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Update global bindings whenever requestDirections changes
  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (window as any)._essenshareGetDirections = (id: string, donationFallback?: Donation) => {
      const target =
        donationFallback ||
        donationsRef.current.find((d) => String(d.id) === String(id));
      if (target) {
        requestDirections(target, routeModeRef.current);
      }
    };
  }, [requestDirections]);

  // Sync Donation Markers & User GPS Pin (runs whenever mapReady or dependencies update)
  useEffect(() => {
    const map = mapRef.current;
    const L = leafletModuleRef.current;
    if (!map || !L || !mapReady) return;

    // Clear previous markers
    markersMapRef.current.forEach((marker) => {
      map.removeLayer(marker);
    });
    markersMapRef.current.clear();

    const validCoords: [number, number][] = [];

    donations.forEach((d) => {
      const dLat = Number(d.pickup_lat);
      const dLng = Number(d.pickup_lng);
      if (isNaN(dLat) || isNaN(dLng) || Math.abs(dLat) < 0.1) return;
      validCoords.push([dLat, dLng]);

      const colour = getCategoryColor(d.category);
      const pinIcon = L.divIcon({
        html: makePinSvg(colour),
        className: 'donation-pin-icon',
        iconSize: [32, 40],
        iconAnchor: [16, 40],
        popupAnchor: [0, -40],
      });

      const popupHtml = buildPopupHtml(d);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const marker = L.marker([dLat, dLng], { icon: pinIcon }) as any;
      marker.bindPopup(popupHtml, { maxWidth: 280, minWidth: 220 });

      marker.bindTooltip(`${d.title} • ${d.quantity} ${d.quantity_unit}`, {
        direction: 'top',
        offset: [0, -38],
        className: 'donation-marker-tooltip',
      });

      marker.addTo(map);
      markersMapRef.current.set(d.id, marker);
    });

    // Update / Place User GPS Marker
    const validUserLat =
      userLat != null && !isNaN(Number(userLat)) && Math.abs(Number(userLat)) > 1
        ? Number(userLat)
        : null;
    const validUserLng =
      userLng != null && !isNaN(Number(userLng)) && Math.abs(Number(userLng)) > 1
        ? Number(userLng)
        : null;

    if (userMarkerRef.current) {
      map.removeLayer(userMarkerRef.current);
      userMarkerRef.current = null;
    }

    if (validUserLat != null && validUserLng != null) {
      const userIcon = L.divIcon({
        html: makeUserGpsPin(),
        className: 'donation-pin-icon',
        iconSize: [24, 24],
        iconAnchor: [12, 12],
      });

      const uMarker = L.marker([validUserLat, validUserLng], {
        icon: userIcon,
        zIndexOffset: 1000,
      });
      uMarker.bindTooltip('Your detected location', {
        permanent: false,
        direction: 'top',
        offset: [0, -12],
      });
      uMarker.addTo(map);
      userMarkerRef.current = uMarker;
    }

    // Only update bounds if there's no active route being inspected
    if (!activeRoute) {
      let includeUserInBounds = false;
      if (validUserLat != null && validUserLng != null && validCoords.length > 0) {
        const firstCoord = validCoords[0];
        const latDiff = Math.abs(firstCoord[0] - validUserLat);
        const lngDiff = Math.abs(firstCoord[1] - validUserLng);
        if (latDiff < 1.0 && lngDiff < 1.0) {
          includeUserInBounds = true;
        }
      } else if (validUserLat != null && validUserLng != null && validCoords.length === 0) {
        includeUserInBounds = true;
      }

      const boundsPoints: [number, number][] = [...validCoords];
      if (includeUserInBounds && validUserLat != null && validUserLng != null) {
        boundsPoints.push([validUserLat, validUserLng]);
      }

      if (boundsPoints.length > 1) {
        map.fitBounds(boundsPoints, { padding: [50, 50], maxZoom: 15 });
      } else if (boundsPoints.length === 1) {
        map.setView(boundsPoints[0], 14);
      } else {
        map.setView([51.508, -0.128], 13);
      }
    }

    setTimeout(() => {
      if (mapRef.current) mapRef.current.invalidateSize();
    }, 200);
  }, [mapReady, donations, userLat, userLng, buildPopupHtml, activeRoute]);

  // Center on user location
  function handleCenterOnUser() {
    if (!mapRef.current) return;
    if (userLat != null && userLng != null && !isNaN(Number(userLat)) && !isNaN(Number(userLng))) {
      mapRef.current.flyTo([Number(userLat), Number(userLng)], 15, { duration: 0.8 });
    } else {
      alert('Your current location is not detected yet. Click "Use My Location" above to detect it.');
    }
  }

  // Re-fit all active donations
  function handleFitAllPins() {
    if (!mapRef.current) return;
    const coords: [number, number][] = donations
      .filter((d) => d.pickup_lat != null && d.pickup_lng != null)
      .map((d) => [Number(d.pickup_lat), Number(d.pickup_lng)] as [number, number]);

    if (coords.length > 1) {
      mapRef.current.fitBounds(coords, { padding: [50, 50], maxZoom: 15 });
    } else if (coords.length === 1) {
      mapRef.current.flyTo(coords[0], 15);
    }
  }

  return (
    <div
      style={{
        height,
        width: '100%',
        borderRadius: 'var(--radius-lg, 16px)',
        overflow: 'hidden',
        border: '1px solid var(--line)',
        position: 'relative',
        boxShadow: 'var(--shadow-sm)',
      }}
      className={className}
    >
      {/* Map DOM target */}
      <div ref={mapContainerRef} style={{ height: '100%', width: '100%', background: '#e5e7eb' }} />

      {/* ─── Top-Right: Map Source Switcher (Street, Satellite, Mapbox) ─── */}
      <div
        className="absolute top-3 right-3 z-[1000] flex items-center p-1 rounded-full shadow-md backdrop-blur-md bg-white/95 dark:bg-black/90 border border-black/10 dark:border-white/20"
        role="group"
        aria-label="Map imagery options"
      >
        <button
          type="button"
          onClick={() => switchSource('street')}
          className={`flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold transition-all cursor-pointer ${
            activeSource === 'street'
              ? 'bg-[var(--accent)] text-[var(--accent-on)] shadow-xs'
              : 'text-[var(--ink-muted)] hover:text-[var(--ink)]'
          }`}
          aria-pressed={activeSource === 'street'}
        >
          <MapIcon className="w-3.5 h-3.5" aria-hidden="true" />
          <span>Street</span>
        </button>

        <button
          type="button"
          onClick={() => switchSource('satellite')}
          className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold transition-all cursor-pointer ${
            activeSource === 'satellite'
              ? 'bg-[var(--accent)] text-[var(--accent-on)] shadow-xs'
              : 'text-[var(--ink-muted)] hover:text-[var(--ink)]'
          }`}
          aria-pressed={activeSource === 'satellite'}
        >
          <Satellite className="w-3.5 h-3.5" aria-hidden="true" />
          <span>Satellite</span>
        </button>

        <button
          type="button"
          onClick={() => switchSource('mapbox')}
          className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold transition-all cursor-pointer ${
            activeSource === 'mapbox'
              ? 'bg-[var(--accent)] text-[var(--accent-on)] shadow-xs'
              : 'text-[var(--ink-muted)] hover:text-[var(--ink)]'
          }`}
          aria-pressed={activeSource === 'mapbox'}
        >
          <Sparkles className="w-3.5 h-3.5" aria-hidden="true" />
          <span>Mapbox</span>
        </button>
      </div>

      {/* ─── Bottom-Left: Quick Controls (Center on Me & Fit All Pins) ─── */}
      {!activeRoute && (
        <div className="absolute bottom-3 left-3 z-[1000] flex items-center gap-2">
          {userLat != null && userLng != null && (
            <button
              type="button"
              onClick={handleCenterOnUser}
              title="Recenter on your location"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold shadow-md backdrop-blur-md bg-white/95 dark:bg-black/90 text-[var(--ink)] border border-black/10 dark:border-white/20 hover:bg-[var(--accent)] hover:text-[var(--accent-on)] transition-all cursor-pointer"
            >
              <LocateFixed className="w-3.5 h-3.5" aria-hidden="true" />
              <span className="hidden sm:inline">My Location</span>
            </button>
          )}

          {donations.length > 0 && (
            <button
              type="button"
              onClick={handleFitAllPins}
              title="Fit all donation pins in view"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold shadow-md backdrop-blur-md bg-white/95 dark:bg-black/90 text-[var(--ink)] border border-black/10 dark:border-white/20 hover:bg-[var(--surface-soft)] transition-all cursor-pointer"
            >
              <Search className="w-3.5 h-3.5" aria-hidden="true" />
              <span className="hidden sm:inline">Show All Pins ({donations.length})</span>
            </button>
          )}
        </div>
      )}

      {/* ─── In-App Directions Navigation Sheet (Floating over Map) ─── */}
      {(activeRoute || routeLoading || routeError) && (
        <div
          style={{ zIndex: 1200 }}
          className="absolute top-3 left-3 bottom-3 w-[calc(100%-24px)] sm:w-80 md:w-96 flex flex-col pointer-events-none"
        >
          <div className="pointer-events-auto flex flex-col h-full rounded-2xl shadow-2xl backdrop-blur-md bg-white/95 dark:bg-zinc-900/95 border border-[var(--line)] text-[var(--ink)] overflow-hidden">
            {/* Loading Indicator */}
            {routeLoading && (
              <div className="p-5 flex items-center justify-center gap-3 my-auto">
                <div className="w-5 h-5 border-2 border-[var(--accent)] border-t-transparent rounded-full animate-spin" />
                <span className="text-xs font-semibold text-[var(--ink-muted)]">
                  Calculating in-app route…
                </span>
              </div>
            )}

            {/* Error Message */}
            {routeError && !routeLoading && (
              <div className="p-4 space-y-3 my-auto">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-rose-600 flex items-center gap-1.5">
                    <AlertTriangle className="w-4 h-4 text-rose-600" />
                    <span>Route Unavailable</span>
                  </span>
                  <button
                    type="button"
                    onClick={handleClearRoute}
                    className="p-1 text-xs text-[var(--ink-muted)] hover:text-[var(--ink)] cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <p className="text-xs text-[var(--ink-muted)] leading-relaxed">{routeError}</p>
                <div className="flex items-center gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      if (activeRoute?.donation) {
                        requestDirections(activeRoute.donation, routeMode, true);
                      }
                    }}
                    className="px-3 py-1.5 rounded-full text-xs font-semibold bg-[var(--surface-soft)] hover:bg-[var(--line)] transition-colors cursor-pointer"
                  >
                    Use London Center Origin
                  </button>
                  <button
                    type="button"
                    onClick={handleClearRoute}
                    className="px-3 py-1.5 rounded-full text-xs font-semibold text-[var(--ink-muted)] cursor-pointer"
                  >
                    Dismiss
                  </button>
                </div>
              </div>
            )}

            {/* Active Route Content */}
            {activeRoute && !routeLoading && (
              <div className="flex flex-col h-full">
                {/* Header */}
                <div className="p-3.5 border-b border-[var(--line)] bg-[var(--surface-soft)] shrink-0">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="space-y-0.5 min-w-0">
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-[var(--accent)]">
                        <Navigation className="w-3 h-3 text-[var(--accent)]" />
                        <span>In-App Navigation</span>
                      </span>
                      <h4 className="font-bold text-xs sm:text-sm text-[var(--ink)] truncate">
                        {activeRoute.donation.title}
                      </h4>
                    </div>

                    <button
                      type="button"
                      onClick={handleClearRoute}
                      title="Clear route"
                      className="p-1 rounded-full text-[var(--ink-muted)] hover:text-[var(--ink)] hover:bg-[var(--line)] transition-colors cursor-pointer shrink-0"
                      aria-label="Close directions"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Mode Selector (Walk, Bike, Drive) */}
                  <div className="flex items-center gap-1.5 p-0.5 rounded-lg bg-[var(--surface)] border border-[var(--line)] text-xs">
                    <button
                      type="button"
                      onClick={() => requestDirections(activeRoute.donation, 'walking')}
                      className={`flex-1 flex items-center justify-center gap-1 py-1 rounded-md font-semibold transition-all cursor-pointer ${
                        routeMode === 'walking'
                          ? 'bg-[var(--accent)] text-[var(--accent-on)] shadow-xs'
                          : 'text-[var(--ink-muted)] hover:text-[var(--ink)]'
                      }`}
                    >
                      <Footprints className="w-3.5 h-3.5" />
                      <span>Walk</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => requestDirections(activeRoute.donation, 'cycling')}
                      className={`flex-1 flex items-center justify-center gap-1 py-1 rounded-md font-semibold transition-all cursor-pointer ${
                        routeMode === 'cycling'
                          ? 'bg-[var(--accent)] text-[var(--accent-on)] shadow-xs'
                          : 'text-[var(--ink-muted)] hover:text-[var(--ink)]'
                      }`}
                    >
                      <Bike className="w-3.5 h-3.5" />
                      <span>Bike</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => requestDirections(activeRoute.donation, 'driving')}
                      className={`flex-1 flex items-center justify-center gap-1 py-1 rounded-md font-semibold transition-all cursor-pointer ${
                        routeMode === 'driving'
                          ? 'bg-[var(--accent)] text-[var(--accent-on)] shadow-xs'
                          : 'text-[var(--ink-muted)] hover:text-[var(--ink)]'
                      }`}
                    >
                      <Car className="w-3.5 h-3.5" />
                      <span>Drive</span>
                    </button>
                  </div>

                  {/* Summary Time & Distance Stats */}
                  <div className="flex items-baseline justify-between mt-2.5">
                    <div className="flex items-baseline gap-1.5">
                      <span className="text-lg sm:text-xl font-extrabold text-[var(--ink)]">
                        {activeRoute.formattedDuration}
                      </span>
                      <span className="text-xs font-semibold text-[var(--ink-muted)]">
                        ({activeRoute.formattedDistance})
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => setStepsCollapsed(!stepsCollapsed)}
                      className="text-[11px] font-semibold text-[var(--accent)] hover:underline cursor-pointer"
                    >
                      {stepsCollapsed ? 'View Steps ↓' : 'Hide Steps ↑'}
                    </button>
                  </div>

                  {/* Origin info pill */}
                  <div className="mt-1 flex items-center gap-1 text-[10px] text-[var(--ink-muted)] truncate">
                    <span>From:</span>
                    <span className="font-medium truncate">{activeRoute.originName}</span>
                    {activeRoute.isSimulatedOrigin && (
                      <span className="text-[9px] px-1 rounded bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-200 shrink-0">
                        Demo
                      </span>
                    )}
                  </div>
                </div>

                {/* Turn-by-Turn Steps List (Scrollable) */}
                {!stepsCollapsed && (
                  <div className="flex-1 overflow-y-auto p-2.5 space-y-1.5 text-xs divide-y divide-[var(--line-subtle)]">
                    {activeRoute.steps.map((step, idx) => (
                      <div
                        key={step.id}
                        className="pt-1.5 first:pt-0 flex items-start gap-2 hover:bg-[var(--surface-soft)] p-1 rounded-lg transition-colors"
                      >
                        <span className="w-5 h-5 rounded-full bg-[var(--surface-soft)] text-[10px] font-bold flex items-center justify-center text-[var(--ink-muted)] shrink-0 border border-[var(--line)]">
                          {idx + 1}
                        </span>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-[var(--ink)] leading-snug">
                            {step.instruction}
                          </p>
                          <p className="text-[10px] text-[var(--ink-muted)]">
                            {step.formattedDistance}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Footer Actions */}
                <div className="p-3 border-t border-[var(--line)] bg-[var(--surface)] flex items-center gap-2 shrink-0">
                  {onSelectDonation && (
                    <button
                      type="button"
                      onClick={() => onSelectDonation(activeRoute.donation.id)}
                      className="flex-1 py-2 px-3 rounded-full bg-[var(--accent)] text-[var(--accent-on)] font-bold text-xs shadow-xs hover:brightness-105 active:scale-[0.99] transition-all cursor-pointer flex items-center justify-center gap-1"
                    >
                      <span>Get Pickup Code</span>
                      <span aria-hidden="true">→</span>
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={handleClearRoute}
                    className="py-2 px-3 rounded-full border border-[var(--line)] text-xs font-semibold text-[var(--ink-muted)] hover:text-[var(--ink)] hover:bg-[var(--surface-soft)] transition-colors cursor-pointer"
                  >
                    Clear Route
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ─── Mapbox Token Setup Dialog ─── */}
      {tokenModalOpen && (
        <div className="absolute inset-0 z-[1002] bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[var(--surface)] text-[var(--ink)] max-w-sm w-full p-5 rounded-2xl border border-[var(--line)] shadow-xl space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="font-bold text-sm flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-500" />
                <span>Mapbox Access Token</span>
              </h4>
              <button
                type="button"
                onClick={() => setTokenModalOpen(false)}
                className="text-xs text-[var(--ink-muted)] hover:text-[var(--ink)] p-1 cursor-pointer"
                aria-label="Close dialog"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-xs text-[var(--ink-muted)] leading-relaxed">
              To use Mapbox vector tiles, enter your public Mapbox access token (starts with{' '}
              <code className="text-accent font-mono">pk.</code>). Free tier includes 50,000 monthly map loads at{' '}
              <a
                href="https://account.mapbox.com/access-tokens/"
                target="_blank"
                rel="noreferrer"
                className="text-accent underline font-medium"
              >
                mapbox.com
              </a>
              .
            </p>
            <form onSubmit={handleSaveToken} className="space-y-3">
              <input
                type="text"
                placeholder="pk.eyJ1Ijo..."
                value={inputToken}
                onChange={(e) => setInputToken(e.target.value)}
                required
                className="w-full px-3 py-2 text-xs rounded-lg border border-[var(--line)] bg-[var(--surface-soft)] text-[var(--ink)] focus:outline-none focus:ring-2 focus:ring-[var(--focus-ring)] font-mono"
              />
              <div className="flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setTokenModalOpen(false)}
                  className="px-3 py-1.5 text-xs text-[var(--ink-muted)] hover:text-[var(--ink)] rounded-lg cursor-pointer"
                >
                  Keep Free Map
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-bold rounded-full bg-[var(--accent)] text-[var(--accent-on)] shadow-xs hover:brightness-105 cursor-pointer"
                >
                  Activate Mapbox
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Leaflet CSS fallback link */}
      {/* eslint-disable-next-line @next/next/no-css-tags */}
      <link
        rel="stylesheet"
        href="https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css"
        // @ts-expect-error — precedence is valid in Next.js HTML tag
        precedence="default"
      />
    </div>
  );
}
