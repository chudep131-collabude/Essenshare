import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get('q');
  const lat = searchParams.get('lat');
  const lng = searchParams.get('lng');

  try {
    if (q) {
      const url = new URL('https://nominatim.openstreetmap.org/search');
      url.searchParams.set('q', q.trim());
      url.searchParams.set('format', 'json');
      url.searchParams.set('limit', '1');

      const res = await fetch(url.toString(), {
        headers: {
          'User-Agent': 'EssenShare/1.0 (surplus food redistribution platform; contact@essenshare.local)',
          'Accept-Language': 'en',
        },
      });

      if (!res.ok) {
        return NextResponse.json({ error: `Nominatim error: ${res.status}` }, { status: res.status });
      }

      const data = await res.json();
      if (!Array.isArray(data) || !data.length) {
        return NextResponse.json({ result: null });
      }

      return NextResponse.json({
        result: {
          lat: parseFloat(data[0].lat),
          lng: parseFloat(data[0].lon),
          displayName: data[0].display_name,
        },
      });
    }

    if (lat && lng) {
      const url = new URL('https://nominatim.openstreetmap.org/reverse');
      url.searchParams.set('lat', lat);
      url.searchParams.set('lon', lng);
      url.searchParams.set('format', 'json');

      const res = await fetch(url.toString(), {
        headers: {
          'User-Agent': 'EssenShare/1.0 (surplus food redistribution platform; contact@essenshare.local)',
          'Accept-Language': 'en',
        },
      });

      if (!res.ok) {
        return NextResponse.json({ displayName: null });
      }

      const data = await res.json();
      return NextResponse.json({ displayName: data.display_name ?? null });
    }

    return NextResponse.json({ error: 'Missing parameters' }, { status: 400 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Geocoding failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
