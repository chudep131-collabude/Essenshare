/**
 * lib/geocode.ts
 * Nominatim geocoding — address text → { lat, lng, displayName }
 *
 * Nominatim is OpenStreetMap's free geocoder. No API key required.
 * Rate limit: 1 request/second. Do not call in a tight loop.
 * Terms of use: https://operations.osmfoundation.org/policies/nominatim/
 */

export interface GeocodeResult {
  lat: number;
  lng: number;
  displayName: string;
}

/**
 * Geocode a free-text address or place name using Nominatim.
 * Returns the best match or null if nothing found.
 */
export async function geocodeAddress(query: string): Promise<GeocodeResult | null> {
  if (!query.trim()) return null;

  try {
    // In browser, use our Next.js API proxy to avoid CORS and User-Agent header blocking
    if (typeof window !== 'undefined') {
      const res = await fetch(`/api/geocode?q=${encodeURIComponent(query.trim())}`);
      if (!res.ok) throw new Error(`Geocode error: ${res.status}`);
      const data = await res.json();
      return data.result ?? null;
    }

    const url = new URL('https://nominatim.openstreetmap.org/search');
    url.searchParams.set('q', query.trim());
    url.searchParams.set('format', 'json');
    url.searchParams.set('limit', '1');

    const res = await fetch(url.toString(), {
      headers: {
        'User-Agent': 'EssenShare/1.0 (surplus food redistribution platform; contact@essenshare.local)',
        'Accept-Language': 'en',
      },
    });

    if (!res.ok) throw new Error(`Nominatim error: ${res.status}`);

    const data = (await res.json()) as Array<{
      lat: string;
      lon: string;
      display_name: string;
    }>;

    if (!data.length) return null;

    return {
      lat: parseFloat(data[0].lat),
      lng: parseFloat(data[0].lon),
      displayName: data[0].display_name,
    };
  } catch (err) {
    console.warn('geocodeAddress error:', err);
    return null;
  }
}

/**
 * Reverse geocode — lat/lng → human-readable address.
 * Used to show a readable location name after GPS detection.
 */
export async function reverseGeocode(lat: number, lng: number): Promise<string | null> {
  try {
    if (typeof window !== 'undefined') {
      const res = await fetch(`/api/geocode?lat=${lat}&lng=${lng}`);
      if (!res.ok) return null;
      const data = await res.json();
      return data.displayName ?? null;
    }

    const url = new URL('https://nominatim.openstreetmap.org/reverse');
    url.searchParams.set('lat', String(lat));
    url.searchParams.set('lon', String(lng));
    url.searchParams.set('format', 'json');

    const res = await fetch(url.toString(), {
      headers: {
        'User-Agent': 'EssenShare/1.0 (surplus food redistribution platform; contact@essenshare.local)',
        'Accept-Language': 'en',
      },
    });

    if (!res.ok) return null;

    const data = (await res.json()) as { display_name?: string };
    return data.display_name ?? null;
  } catch {
    return null;
  }
}
