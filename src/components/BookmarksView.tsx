import React from 'react';
import { SavedPin, GeoLocationData } from '../types';
import { calculateDistance, formatDistance } from '../utils/geo';

interface BookmarksViewProps {
  savedPins: SavedPin[];
  userLocation: GeoLocationData;
  onSelectLocation: (lat: number, lng: number, title?: string) => void;
  onDeletePin: (id: string) => void;
  onExport: () => void;
  onImport: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export const BookmarksView: React.FC<BookmarksViewProps> = ({
  savedPins,
  userLocation,
  onSelectLocation,
  onDeletePin,
  onExport,
  onImport,
}) => {
  return (
    <div className="flex-1 bg-slate-50 dark:bg-slate-950 p-6 md:p-10 overflow-y-auto">
      <div className="max-w-5xl mx-auto">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Saved Locations & Bookmarks</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              Manage your saved spots, view distances, export coordinates, or import custom datasets.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={onExport}
              className="px-4 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              Export JSON
            </button>
            <label className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-all cursor-pointer">
              Import JSON
              <input type="file" accept=".json" onChange={onImport} className="hidden" />
            </label>
          </div>
        </div>

        {savedPins.length === 0 ? (
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-12 text-center shadow-xs">
            <h3 className="text-base font-semibold text-slate-900 dark:text-white mb-1">No Bookmarks Saved</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
              Go to the map view and click anywhere to save your favorite geographic locations.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {savedPins.map((pin) => {
              const dist = calculateDistance(userLocation.lat, userLocation.lng, pin.lat, pin.lng);
              return (
                <div
                  key={pin.id}
                  className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs hover:shadow-md transition-all flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 bg-blue-50 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 rounded-full">
                        {pin.category}
                      </span>
                      <button
                        onClick={() => onDeletePin(pin.id)}
                        className="text-xs text-slate-400 hover:text-rose-500 transition-colors"
                      >
                        Delete
                      </button>
                    </div>

                    <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-1">
                      {pin.title}
                    </h3>

                    <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 mb-4">
                      {pin.description || pin.address || 'No description provided.'}
                    </p>
                  </div>

                  <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                    <span className="text-xs text-slate-400 font-mono tabular-nums">
                      {formatDistance(dist)} away
                    </span>
                    <button
                      onClick={() => onSelectLocation(pin.lat, pin.lng, pin.title)}
                      className="px-3 py-1.5 text-xs font-semibold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 hover:bg-blue-100 dark:hover:bg-blue-900/50 rounded-lg transition-colors"
                    >
                      View on Map
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
