import { TileLayerConfig, MapTileStyle, WeatherData, NavigationRoute, RouteStep } from '../types';

export const MAP_TILES: Record<MapTileStyle, TileLayerConfig> = {
  osm: {
    name: 'OpenStreetMap Standard',
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '',
    maxZoom: 19,
  },
  satellite: {
    name: 'Satellite View',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attribution: '',
    maxZoom: 19,
    maxNativeZoom: 17,
  },
  cartoDark: {
    name: 'CartoDB Dark Matter',
    url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
    attribution: '',
    maxZoom: 20,
  },
  cartoPositron: {
    name: 'CartoDB Positron (Light)',
    url: 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
    attribution: '',
    maxZoom: 20,
  },
  topo: {
    name: 'OpenTopoMap',
    url: 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png',
    attribution: '',
    maxZoom: 17,
  },
  watercolor: {
    name: 'Stamen / Stadia Toner',
    url: 'https://tiles.stadiamaps.com/tiles/stamen_toner/{z}/{x}/{y}{r}.png',
    attribution: '',
    maxZoom: 20,
  }
};

export const PRESET_LOCATIONS = [
  { name: 'New York City, USA', lat: 40.7128, lng: -74.0060, country: 'USA' },
  { name: 'Tokyo, Japan', lat: 35.6762, lng: 139.6503, country: 'Japan' },
  { name: 'London, UK', lat: 51.5074, lng: -0.1278, country: 'United Kingdom' },
  { name: 'Paris, France', lat: 48.8566, lng: 2.3522, country: 'France' },
  { name: 'Sydney, Australia', lat: -33.8688, lng: 151.2093, country: 'Australia' },
  { name: 'Rio de Janeiro, Brazil', lat: -22.9068, lng: -43.1729, country: 'Brazil' },
  { name: 'Cairo, Egypt', lat: 30.0444, lng: 31.2357, country: 'Egypt' },
  { name: 'Reykjavik, Iceland', lat: 64.1466, lng: -21.9426, country: 'Iceland' },
  { name: 'Singapore', lat: 1.3521, lng: 103.8198, country: 'Singapore' },
  { name: 'Cape Town, South Africa', lat: -33.9249, lng: 18.4241, country: 'South Africa' },
];

/**
 * Calculate Great Circle distance between two points in kilometers using Haversine formula
 */
export function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth radius in km
  const dLat = deg2rad(lat2 - lat1);
  const dLon = deg2rad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c; // Distance in km
}

function deg2rad(deg: number): number {
  return deg * (Math.PI / 180);
}

export function formatDistance(km: number): string {
  if (km < 1) {
    return `${Math.round(km * 1000)} m`;
  }
  return `${km.toFixed(1)} km`;
}

/**
 * Free Nominatim OpenStreetMap Geocoding Search
 */
export async function searchLocations(query: string): Promise<Array<{ display_name: string; lat: string; lon: string; place_id: number }>> {
  if (!query || query.trim().length < 2) return [];
  try {
    const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=6`, {
      headers: {
        'User-Agent': 'GlobalGeoAtlasApp/1.0'
      }
    });
    if (!res.ok) throw new Error('Search failed');
    return await res.json();
  } catch (err) {
    console.error('Nominatim search error:', err);
    return [];
  }
}

/**
 * Free Reverse Geocoding via Nominatim
 */
export async function reverseGeocode(lat: number, lng: number): Promise<string> {
  try {
    const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`, {
      headers: {
        'User-Agent': 'GlobalGeoAtlasApp/1.0'
      }
    });
    if (!res.ok) return `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
    const data = await res.json();
    return data.display_name || `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
  } catch {
    return `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
  }
}

/**
 * Fetch Free Weather from Open-Meteo API
 */
export async function fetchWeather(lat: number, lng: number): Promise<WeatherData> {
  try {
    const res = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current=temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m`);
    if (!res.ok) throw new Error('Weather API error');
    const data = await res.json();
    const code = data.current.weather_code;
    const condition = getWeatherConditionText(code);
    return {
      temperature: data.current.temperature_2m,
      condition,
      windSpeed: data.current.wind_speed_10m,
      humidity: data.current.relative_humidity_2m,
      loading: false
    };
  } catch (err) {
    console.error('Weather fetch error:', err);
    return {
      temperature: 20,
      condition: 'Pleasant',
      windSpeed: 10,
      humidity: 50,
      loading: false,
      error: 'Could not load weather'
    };
  }
}

function getWeatherConditionText(code: number): string {
  const map: Record<number, string> = {
    0: 'Clear sky',
    1: 'Mainly clear',
    2: 'Partly cloudy',
    3: 'Overcast',
    45: 'Foggy',
    48: 'Depositing rime fog',
    51: 'Light drizzle',
    53: 'Moderate drizzle',
    55: 'Dense drizzle',
    61: 'Slight rain',
    63: 'Moderate rain',
    65: 'Heavy rain',
    71: 'Slight snow',
    73: 'Moderate snow',
    75: 'Heavy snow',
    95: 'Thunderstorm',
  };
  return map[code] || 'Fair';
}

/**
 * Fetch Route from OSRM (Open Source Routing Machine)
 */
export async function fetchRoute(start: [number, number], end: [number, number]): Promise<[number, number][] | null> {
  const nav = await fetchRouteWithSteps(start, end);
  return nav ? nav.coordinates : null;
}

export function formatSpokenDistance(meters: number): string {
  if (meters < 1000) {
    const rounded = Math.max(10, Math.round(meters / 10) * 10);
    return `${rounded} meters`;
  }
  const km = meters / 1000;
  return `${km.toFixed(1)} kilometers`;
}

export function formatDuration(seconds: number): string {
  const mins = Math.max(1, Math.round(seconds / 60));
  if (mins < 60) {
    return `${mins} minute${mins === 1 ? '' : 's'}`;
  }
  const hours = Math.floor(mins / 60);
  const remMins = mins % 60;
  if (remMins === 0) return `${hours} hour${hours === 1 ? '' : 's'}`;
  return `${hours} hour${hours === 1 ? '' : 's'} and ${remMins} minutes`;
}

function buildStepInstruction(step: any): string {
  const maneuver = step.maneuver || {};
  const type: string = maneuver.type || '';
  const modifier: string = maneuver.modifier ? maneuver.modifier.replace(/_/g, ' ') : '';
  const roadName: string = step.name && step.name.trim() ? `onto ${step.name.trim()}` : '';

  if (type === 'depart') {
    const dir = modifier ? `Head ${modifier}` : 'Go straight';
    const onRoad = step.name && step.name.trim() ? ` on ${step.name.trim()}` : '';
    return `${dir}${onRoad}.`;
  }
  if (type === 'arrive') {
    return 'You have arrived.';
  }
  if (type === 'roundabout' || type === 'rotary') {
    const exit = maneuver.exit ? `Take exit ${maneuver.exit}` : 'Exit roundabout';
    return `${exit} ${roadName}.`.replace(/\s+/g, ' ').trim();
  }
  if (type === 'turn' || type === 'end of road' || type === 'fork' || type === 'merge' || type === 'on ramp' || type === 'off ramp') {
    const action = modifier ? `Turn ${modifier}` : 'Continue';
    if (type === 'merge') return `Merge ${modifier || ''} ${roadName}.`.replace(/\s+/g, ' ').trim();
    if (type === 'fork') return `Keep ${modifier || 'straight'} ${roadName}.`.replace(/\s+/g, ' ').trim();
    return `${action} ${roadName}.`.replace(/\s+/g, ' ').trim();
  }
  if (type === 'continue' || type === 'new name') {
    return `Continue ${roadName || 'straight'}.`.replace(/\s+/g, ' ').trim();
  }

  return `Continue ${roadName || 'ahead'}.`.replace(/\s+/g, ' ').trim();
}

export async function fetchRouteWithSteps(start: [number, number], end: [number, number]): Promise<NavigationRoute | null> {
  try {
    const url = `https://router.project-osrm.org/route/v1/driving/${start[1]},${start[0]};${end[1]},${end[0]}?overview=full&geometries=geojson&steps=true`;
    const res = await fetch(url);
    if (!res.ok) throw new Error('Routing API error');
    const data = await res.json();
    if (data.routes && data.routes.length > 0) {
      const route = data.routes[0];
      const coordinates: [number, number][] = route.geometry.coordinates.map((coord: [number, number]) => [coord[1], coord[0]]);
      const rawSteps = route.legs?.[0]?.steps || [];
      const steps: RouteStep[] = rawSteps.map((s: any) => ({
        instruction: buildStepInstruction(s),
        distanceMeters: s.distance || 0,
        durationSeconds: s.duration || 0,
        location: s.maneuver?.location ? [s.maneuver.location[1], s.maneuver.location[0]] : end,
      }));

      return {
        coordinates,
        distanceMeters: route.distance || 0,
        durationSeconds: route.duration || 0,
        steps,
      };
    }
  } catch (err) {
    console.error('Fetch route error:', err);
  }

  // Fallback direct geodesic route if OSRM cannot find road path (e.g. across oceans)
  const km = calculateDistance(start[0], start[1], end[0], end[1]);
  const distanceMeters = km * 1000;
  const durationSeconds = Math.max(60, Math.round(distanceMeters / 13.8));
  return {
    coordinates: [start, end],
    distanceMeters,
    durationSeconds,
    steps: [
      {
        instruction: `Head toward destination, ${formatSpokenDistance(distanceMeters)}.`,
        distanceMeters,
        durationSeconds,
        location: start,
      },
      {
        instruction: 'You have arrived.',
        distanceMeters: 0,
        durationSeconds: 0,
        location: end,
      },
    ],
  };
}

