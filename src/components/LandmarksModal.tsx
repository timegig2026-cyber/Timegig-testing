import React from 'react';
import { PRESET_LOCATIONS, calculateDistance } from '../utils/geo';
import { GeoLocationData } from '../types';

interface LandmarksModalProps {
  isOpen: boolean;
  onClose: () => void;
  userLocation: GeoLocationData;
  onSelectLandmark: (lat: number, lng: number, title: string) => void;
}

export const LandmarksModal: React.FC<LandmarksModalProps> = ({
  isOpen,
  onClose,
  userLocation,
  onSelectLandmark,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800">
          <h3 className="text-base font-bold text-slate-900 dark:text-white">World Capitals & Landmarks</h3>
          <button
            onClick={onClose}
            className="text-xs font-semibold px-2 py-1 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 rounded"
          >
            Close
          </button>
        </div>

        <div className="p-6 max-h-[65vh] overflow-y-auto">
          <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
            Select any global landmark or capital to instantly fly to its coordinates on the map and calculate distance.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {PRESET_LOCATIONS.map((loc) => {
              const dist = calculateDistance(userLocation.lat, userLocation.lng, loc.lat, loc.lng);
              return (
                <div
                  key={loc.name}
                  onClick={() => {
                    onSelectLandmark(loc.lat, loc.lng, loc.name);
                    onClose();
                  }}
                  className="bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl p-3.5 hover:border-blue-500 transition-all cursor-pointer group flex items-center justify-between"
                >
                  <div>
                    <h4 className="text-xs font-bold text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                      {loc.name}
                    </h4>
                    <span className="text-[11px] text-slate-400 font-mono block mt-0.5">
                      Distance: {Math.round(dist).toLocaleString()} km
                    </span>
                  </div>
                  <span className="text-xs font-semibold text-blue-600 dark:text-blue-400">View</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
