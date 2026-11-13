import React from 'react';
import { Compass, Bookmark, MapPin, Globe, Share2, Plus, Moon, Sun } from 'lucide-react';

interface NavbarProps {
  activeTab: 'map' | 'bookmarks' | 'analytics';
  setActiveTab: (tab: 'map' | 'bookmarks' | 'analytics') => void;
  onOpenAddPin: () => void;
  onOpenLandmarks: () => void;
  isDarkMode: boolean;
  toggleDarkMode: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  onOpenAddPin,
  onOpenLandmarks,
  isDarkMode,
  toggleDarkMode,
}) => {
  return (
    <header className="flex items-center justify-between gap-8 px-6 py-3.5 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 shrink-0 z-30 transition-colors">
      {/* Zone 1: Single text element wordmark */}
      <div className="flex items-center gap-2.5 shrink-0">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-blue-500/20">
          <Compass className="w-5 h-5" />
        </div>
        <span className="text-lg font-bold tracking-tight text-slate-900 dark:text-white whitespace-nowrap">
          Global GeoAtlas
        </span>
      </div>

      {/* Zone 2: 4-5 concise single-line text navigation links */}
      <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-600 dark:text-slate-300">
        <button
          onClick={() => setActiveTab('map')}
          className={`transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5 py-1 ${
            activeTab === 'map' ? 'text-blue-600 dark:text-blue-400 font-semibold' : 'hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <Globe className="w-4 h-4" /> Live Map
        </button>
        <button
          onClick={() => setActiveTab('bookmarks')}
          className={`transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5 py-1 ${
            activeTab === 'bookmarks' ? 'text-blue-600 dark:text-blue-400 font-semibold' : 'hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <Bookmark className="w-4 h-4" /> Bookmarks
        </button>
        <button
          onClick={onOpenLandmarks}
          className="hover:text-slate-900 dark:hover:text-white transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5 py-1"
        >
          <MapPin className="w-4 h-4" /> World Capitals
        </button>
      </nav>

      {/* Zone 3: 1 primary action (+ theme & add pin) */}
      <div className="flex items-center gap-3 shrink-0">
        <button
          onClick={toggleDarkMode}
          aria-label="Toggle theme"
          className="p-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
        >
          {isDarkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        </button>
        <button
          onClick={onOpenAddPin}
          className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm shadow-blue-500/20 transition-all flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer"
        >
          <Plus className="w-4 h-4" /> Drop Pin
        </button>
      </div>
    </header>
  );
};
