import React, { useState } from 'react';
import { SavedPin } from '../types';

interface AddPinModalProps {
  isOpen: boolean;
  onClose: () => void;
  lat: number;
  lng: number;
  address?: string;
  onSavePin: (pin: Omit<SavedPin, 'id' | 'createdAt'>) => void;
}

export const AddPinModal: React.FC<AddPinModalProps> = ({
  isOpen,
  onClose,
  lat,
  lng,
  address,
  onSavePin,
}) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<SavedPin['category']>('Favorite');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    onSavePin({
      title: title.trim(),
      description: description.trim(),
      lat,
      lng,
      category,
      address,
    });
    setTitle('');
    setDescription('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800">
          <h3 className="text-base font-bold text-slate-900 dark:text-white">Save Location Pin</h3>
          <button
            onClick={onClose}
            className="text-xs font-semibold px-2 py-1 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 rounded"
          >
            Close
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Location Title *
            </label>
            <input
              type="text"
              required
              placeholder="e.g. My Favorite Cafe, Office"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Category
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as SavedPin['category'])}
              className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="Favorite">Favorite</option>
              <option value="Home">Home</option>
              <option value="Work">Work</option>
              <option value="Travel">Travel</option>
              <option value="Emergency">Emergency</option>
              <option value="Other">Other</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Notes / Description
            </label>
            <textarea
              rows={3}
              placeholder="Add details..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="bg-slate-50 dark:bg-slate-800/50 p-3 rounded-xl border border-slate-200 dark:border-slate-700/50 text-xs text-slate-500 dark:text-slate-400 font-mono">
            <div>Lat: {lat.toFixed(5)}° | Lng: {lng.toFixed(5)}°</div>
            {address && <div className="mt-1 truncate">{address}</div>}
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-md transition-all cursor-pointer"
            >
              Save Pin
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
