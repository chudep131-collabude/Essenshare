import { NextRequest, NextResponse } from 'next/server';

function formatDistance(meters: number): string {
  if (meters < 1000) return `${Math.round(meters)} m`;
  return `${(meters / 1000).toFixed(1)} km`;
}

function formatDuration(seconds: number): string {
  const mins = Math.round(seconds / 60);
  if (mins < 60) return `${mins} min`;
  const hrs = Math.floor(mins / 60);
  const remainingMins = mins % 60;
  return `${hrs} hr ${remainingMins} min`;
}

function computeHaversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
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

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const fromLatStr = searchParams.get('fromLat');
  const fromLngStr = searchParams.get('fromLng');
  const toLatStr = searchParams.get('toLat');
  const toLngStr = searchParams.get('toLng');
  const mode = searchParams.get('mode') || 'walking'; // walking, cycling, driving

  if (!fromLatStr || !fromLngStr || !toLatStr || !toLngStr) {
    return NextResponse.json({ error: 'Missing coordinates (fromLat, fromLng, toLat, toLng required)' }, { status: 400 });
  }

  const fromLat = parseFloat(fromLatStr);
  const fromLng = parseFloat(fromLngStr);
  const toLat = parseFloat(toLatStr);
  const toLng = parseFloat(toLngStr);

  if (isNaN(fromLat) || isNaN(fromLng) || isNaN(toLat) || isNaN(toLng)) {
    return NextResponse.json({ error: 'Invalid coordinate numbers' }, { status: 400 });
  }

  const directDistKm = computeHaversineKm(fromLat, fromLng, toLat, toLng);

  // If points are across oceans / continents (> 500km away)
  if (directDistKm > 500) {
    return NextResponse.json({
      success: false,
      isCrossContinent: true,
      directDistanceKm: Math.round(directDistKm),
      message: `Your current location is ${Math.round(directDistKm).toLocaleString()} km away from this donation. In-app walking/cycling directions are available within the metro area.`,
    });
  }

  const osrmProfile = mode === 'driving' ? 'driving' : mode === 'cycling' ? 'cycling' : 'walking';
  const osrmUrl = `https://router.project-osrm.org/route/v1/${osrmProfile}/${fromLng},${fromLat};${toLng},${toLat}?overview=full&geometries=geojson&steps=true`;

  try {
    const res = await fetch(osrmUrl, {
      headers: {
        'User-Agent': 'EssenShare/1.0 (surplus food redistribution; contact@essenshare.local)',
      },
    });

    if (!res.ok) {
      throw new Error(`OSRM error: ${res.status}`);
    }

    const data = await res.json();

    if (!data.routes || !data.routes.length) {
      return NextResponse.json({
        success: false,
        message: 'No walkable street route could be found between these locations.',
      });
    }

    const primaryRoute = data.routes[0];
    // OSRM returns GeoJSON coordinates in [lng, lat] format; Leaflet polyline expects [lat, lng]
    const leafletCoordinates: [number, number][] = primaryRoute.geometry.coordinates.map(
      (coord: [number, number]) => [coord[1], coord[0]]
    );

    // Format human readable step instructions
    const steps = (primaryRoute.legs?.[0]?.steps || []).map((step: any, index: number) => {
      const type = step.maneuver?.type || 'turn';
      const modifier = step.maneuver?.modifier || '';
      const name = step.name ? step.name : 'path';

      let text = '';
      if (type === 'depart') {
        text = `Head ${modifier ? modifier + ' ' : ''}on ${name}`;
      } else if (type === 'arrive') {
        text = `Arrive at destination (${name !== 'path' ? name : 'pickup location'})`;
      } else if (type === 'turn') {
        text = `Turn ${modifier || 'around'} onto ${name}`;
      } else if (type === 'continue') {
        text = `Continue straight onto ${name}`;
      } else if (type === 'roundabout' || type === 'rotary') {
        text = `Take roundabout onto ${name}`;
      } else if (type === 'fork') {
        text = `Take the ${modifier} fork onto ${name}`;
      } else {
        text = `${type} ${modifier ? modifier + ' ' : ''}onto ${name}`.trim();
      }

      // Capitalize first letter
      text = text.charAt(0).toUpperCase() + text.slice(1);

      return {
        id: index,
        instruction: text,
        distanceMeters: Math.round(step.distance),
        formattedDistance: formatDistance(step.distance),
        durationSeconds: Math.round(step.duration),
        location: [step.maneuver?.location?.[1], step.maneuver?.location?.[0]] as [number, number],
      };
    });

    return NextResponse.json({
      success: true,
      mode: osrmProfile,
      distanceMeters: Math.round(primaryRoute.distance),
      durationSeconds: Math.round(primaryRoute.duration),
      formattedDistance: formatDistance(primaryRoute.distance),
      formattedDuration: formatDuration(primaryRoute.duration),
      coordinates: leafletCoordinates,
      steps,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Routing service unavailable';
    return NextResponse.json({
      success: false,
      message: `Routing service currently unavailable (${message}). Please check street signs or address directly.`,
    });
  }
}
