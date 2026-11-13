import React, { useState, useEffect } from 'react';
import { Search, Layers, Navigation, CloudSun, Bookmark, MapPin, Trash2, ArrowRight, Crosshair, ExternalLink, RefreshCw } from 'lucide-react';
import { GeoLocationData, SavedPin, MapTileStyle, WeatherData } from '../types';
import { MAP_TILES, searchLocations, fetchWeather, formatDistance, calculateDistance } from '../utils/geo';

interface SidebarProps {
  userLocation: GeoLocationData;
  savedPins: SavedPin[];
  selectedTile: MapTileStyle;
  setSelectedTile: (style: MapTileStyle) => void;
  isTracking: boolean;
  toggleTracking: () => void;
  onSelectLocation: (lat: number, lng: number, title?: string) => void;
  onDeletePin: (id: string) => void;
  onOpenAddPinAt: (lat: number, lng: number, address?: string) => void;
  trackingTrail: Array<[number, number]>;
}

export const Sidebar: React.FC<SidebarProps> = ({
  userLocation,
  savedPins,
  selectedTile,
  setSelectedTile,
  isTracking,
  toggleTracking,
  onSelectLocation,
  onDeletePin,
  onOpenAddPinAt,
  trackingTrail,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Array<{ display_name: string; lat: string; lon: string; place_id: number }>>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [weather, setWeather] = useState<WeatherData>({ temperature: 0, condition: '', windSpeed: 0, humidity: 0, loading: true });
  const [activeAccordion, setActiveAccordion] = useState<'search' | 'layers' | 'weather' | 'bookmarks'>('search');

  // Fetch weather when user location updates
  useEffect(() => {
    let mounted = true;
    fetchWeather(userLocation.lat, userLocation.lng).then((w) => {
      if (mounted) setWeather(w);
    });
    return () => {
      mounted = false;
    };
  }, [userLocation.lat, userLocation.lng]);

  // Handle search with debounce
  useEffect(() => {
    const timer = setTimeout(async () => {
      if (searchQuery.trim().length >= 2) {
        setIsSearching(true);
        const results = await searchLocations(searchQuery);
        setSearchResults(results);
        setIsSearching(false);
      } else {
        setSearchResults([]);
      }
    }, 350);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  return (
    <aside className="w-full md:w-96 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex flex-col h-full overflow-hidden transition-colors shadow-lg z-20">
      {/* Top Search Bar */}
      <div className="p-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search city, address or landmark..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm"
          />
          {searchQuery && (
            <button
              onClick={() => {
                setSearchQuery('');
                setSearchResults([]);
              }}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            >
              Clear
            </button>
          )}
        </div>

        {/* Search Results Dropdown */}
        {searchResults.length > 0 && (
          <div className="mt-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl overflow-hidden max-h-60 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-700/50">
            {searchResults.map((item) => (
              <button
                key={item.place_id}
                onClick={() => {
                  const lat = parseFloat(item.lat);
                  const lng = parseFloat(item.lon);
                  onSelectLocation(lat, lng, item.display_name);
                  setSearchQuery('');
                  setSearchResults([]);
                }}
                className="w-full text-left px-3.5 py-2.5 text-xs text-slate-700 dark:text-slate-200 hover:bg-blue-50 dark:hover:bg-slate-700/50 transition-colors flex items-start gap-2"
              >
                <MapPin className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
                <span className="line-clamp-2">{item.display_name}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Accordion / Content Sections */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* User GPS & Live Tracking Section */}
        <div className="bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 rounded-2xl p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className={`w-2.5 h-2.5 rounded-full ${isTracking ? 'bg-emerald-500 animate-pulse' : 'bg-blue-500'}`} />
              <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                User Location ({userLocation.source.toUpperCase()})
              </h3>
            </div>
            <button
              onClick={toggleTracking}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all flex items-center gap-1.5 ${
                isTracking
                  ? 'bg-rose-500 text-white shadow-sm shadow-rose-500/20'
                  : 'bg-blue-600 text-white shadow-sm shadow-blue-500/20 hover:bg-blue-700'
              }`}
            >
              <Navigation className={`w-3.5 h-3.5 ${isTracking ? 'animate-spin' : ''}`} />
              {isTracking ? 'Stop Live GPS' : 'Start Live GPS'}
            </button>
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs mb-3">
            <div className="bg-white dark:bg-slate-900 p-2.5 rounded-xl border border-slate-200 dark:border-slate-700">
              <span className="text-slate-400 block mb-0.5">Latitude</span>
              <span className="font-mono font-semibold tabular-nums text-slate-800 dark:text-slate-200">
                {userLocation.lat.toFixed(5)}°
              </span>
            </div>
            <div className="bg-white dark:bg-slate-900 p-2.5 rounded-xl border border-slate-200 dark:border-slate-700">
              <span className="text-slate-400 block mb-0.5">Longitude</span>
              <span className="font-mono font-semibold tabular-nums text-slate-800 dark:text-slate-200">
                {userLocation.lng.toFixed(5)}°
              </span>
            </div>
          </div>

          {userLocation.address && (
            <div className="text-xs text-slate-600 dark:text-slate-300 flex items-start gap-1.5 bg-white dark:bg-slate-900 p-2.5 rounded-xl border border-slate-200 dark:border-slate-700">
              <MapPin className="w-3.5 h-3.5 text-blue-500 shrink-0 mt-0.5" />
              <span className="line-clamp-2">{userLocation.address}</span>
            </div>
          )}

          <div className="mt-3 flex items-center justify-between">
            <button
              onClick={() => onSelectLocation(userLocation.lat, userLocation.lng, 'My Location')}
              className="text-xs text-blue-600 dark:text-blue-400 font-medium hover:underline flex items-center gap-1"
            >
              <Crosshair className="w-3.5 h-3.5" /> Center on Map
            </button>
            <button
              onClick={() => onOpenAddPinAt(userLocation.lat, userLocation.lng, userLocation.address)}
              className="text-xs text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white font-medium hover:underline flex items-center gap-1"
            >
              <MapPin className="w-3.5 h-3.5" /> Save Pin here
            </button>
          </div>
        </div>

        {/* Weather Widget */}
        <div className="bg-gradient-to-br from-blue-500/10 to-indigo-500/10 dark:from-blue-500/20 dark:to-indigo-500/20 border border-blue-200/50 dark:border-blue-800/50 rounded-2xl p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <CloudSun className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              <h3 className="text-xs font-semibold uppercase tracking-wider text-blue-700 dark:text-blue-300">
                Local Weather
              </h3>
            </div>
            <span className="text-xs font-mono tabular-nums text-slate-500 dark:text-slate-400">
              Open-Meteo
            </span>
          </div>

          {weather.loading ? (
            <div className="text-xs text-slate-500 py-3 text-center animate-pulse">Loading weather data...</div>
          ) : (
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="bg-white/80 dark:bg-slate-900/80 p-2 rounded-xl border border-blue-100 dark:border-blue-900/50">
                <span className="text-[10px] text-slate-400 block">Temp</span>
                <span className="text-sm font-bold font-mono tabular-nums text-slate-900 dark:text-white">
                  {weather.temperature}°C
                </span>
              </div>
              <div className="bg-white/80 dark:bg-slate-900/80 p-2 rounded-xl border border-blue-100 dark:border-blue-900/50">
                <span className="text-[10px] text-slate-400 block">Condition</span>
                <span className="text-xs font-medium text-slate-800 dark:text-slate-200 truncate block mt-0.5">
                  {weather.condition}
                </span>
              </div>
              <div className="bg-white/80 dark:bg-slate-900/80 p-2 rounded-xl border border-blue-100 dark:border-blue-900/50">
                <span className="text-[10px] text-slate-400 block">Wind</span>
                <span className="text-sm font-bold font-mono tabular-nums text-slate-900 dark:text-white">
                  {weather.windSpeed} km/h
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Map Tile Layers */}
        <div>
          <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2.5 flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5" /> Map Style (OpenStreetMap Tiles)
          </h3>
          <div className="grid grid-cols-2 gap-2">
            {(Object.keys(MAP_TILES) as MapTileStyle[]).map((key) => (
              <button
                key={key}
                onClick={() => setSelectedTile(key)}
                className={`px-3 py-2 text-xs font-medium rounded-xl border transition-all text-left truncate ${
                  selectedTile === key
                    ? 'bg-blue-600 text-white border-blue-600 shadow-sm shadow-blue-500/20'
                    : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
                }`}
              >
                {MAP_TILES[key].name}
              </button>
            ))}
          </div>
        </div>

        {/* Bookmarked / Saved Locations */}
        <div>
          <div className="flex items-center justify-between mb-2.5">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <Bookmark className="w-3.5 h-3.5" /> Saved Locations ({savedPins.length})
            </h3>
          </div>

          {savedPins.length === 0 ? (
            <div className="text-center py-6 border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl p-4">
              <MapPin className="w-6 h-6 text-slate-300 dark:text-slate-700 mx-auto mb-2" />
              <p className="text-xs text-slate-500 dark:text-slate-400">No saved locations yet. Click any spot on the map or drop a pin.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {savedPins.map((pin) => {
                const dist = calculateDistance(userLocation.lat, userLocation.lng, pin.lat, pin.lng);
                return (
                  <div
                    key={pin.id}
                    className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-3 hover:border-blue-500/50 transition-all group"
                  >
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <div>
                        <span className="text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.5 bg-blue-50 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 rounded">
                          {pin.category}
                        </span>
                        <h4 className="text-xs font-semibold text-slate-900 dark:text-white mt-1">
                          {pin.title}
                        </h4>
                      </div>
                      <button
                        onClick={() => onDeletePin(pin.id)}
                        className="text-slate-400 hover:text-rose-500 transition-colors p-1"
                        title="Delete pin"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-1 mb-2">
                      {pin.description || pin.address || `${pin.lat.toFixed(4)}, ${pin.lng.toFixed(4)}`}
                    </p>

                    <div className="flex items-center justify-between text-[11px] pt-2 border-t border-slate-100 dark:border-slate-700/50">
                      <span className="text-slate-400 font-mono tabular-nums">
                        Dist: {formatDistance(dist)}
                      </span>
                      <button
                        onClick={() => onSelectLocation(pin.lat, pin.lng, pin.title)}
                        className="text-blue-600 dark:text-blue-400 font-medium hover:underline flex items-center gap-1"
                      >
                        View <ArrowRight className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </aside>
  );
};
