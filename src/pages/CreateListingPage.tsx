import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { api } from '../services/api.js';
import { useAuth } from '../hooks/useAuth.js';
import {
  Upload,
  ArrowLeft,
  Loader2,
  AlertCircle,
  Image as ImageIcon,
  Check,
} from 'lucide-react';

const CATEGORIES = [
  'Calculators & Electronics',
  'Textbooks',
  'Lab Equipment',
  'Drafting & Tools',
  'Notes & Supplies',
  'Sports Equipment',
  'Other',
];

const CONDITIONS = ['Like New', 'Good', 'Fair'];

const PRESET_IMAGES = [
  {
    name: 'Scientific Calculator',
    url: 'https://images.unsplash.com/photo-1594980596870-8aa52a78d8cd?auto=format&fit=crop&w=800&q=80',
  },
  {
    name: 'Textbook / Study Notes',
    url: 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&w=800&q=80',
  },
  {
    name: 'Drafter & Engineering Tools',
    url: 'https://images.unsplash.com/photo-1581291518857-4e27b48ff24e?auto=format&fit=crop&w=800&q=80',
  },
  {
    name: 'Lab Equipment / Multimeter',
    url: 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=800&q=80',
  },
];

export const CreateListingPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [condition, setCondition] = useState(CONDITIONS[0]);
  const [pickupLocation, setPickupLocation] = useState('');
  const [borrowDuration, setBorrowDuration] = useState('1 week');
  const [imageUrl, setImageUrl] = useState('');

  const [uploadingImage, setUploadingImage] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!user) {
    navigate('/login', { state: { from: '/create-listing' } });
    return null;
  }

  const handleImageFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setUploadingImage(true);
      setError(null);
      const url = await api.uploadImage(file);
      setImageUrl(url);
    } catch (err: any) {
      setError('Could not process image. Please try another image file.');
    } finally {
      setUploadingImage(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !description.trim() || !pickupLocation.trim() || !borrowDuration.trim()) {
      setError('Please fill in all required fields.');
      return;
    }

    try {
      setSubmitting(true);
      setError(null);

      const newItem = await api.items.create({
        title: title.trim(),
        description: description.trim(),
        category,
        condition,
        image_url: imageUrl.trim(),
        pickup_location: pickupLocation.trim(),
        borrow_duration: borrowDuration.trim(),
      });

      navigate(`/items/${newItem.id}`);
    } catch (err: any) {
      setError(err.message || 'Failed to create listing');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <Link
        to="/"
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Cancel and return
      </Link>

      <div className="bg-white rounded-2xl border border-slate-200/80 p-6 sm:p-8 shadow-xs">
        <div className="border-b border-slate-100 pb-4 mb-6">
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
            List an Item to Lend
          </h1>
          <p className="mt-1 text-xs text-slate-500">
            Share calculators, textbooks, drafters, or lab equipment with other students on campus.
          </p>
        </div>

        {error && (
          <div className="mb-6 p-3.5 bg-rose-50 text-rose-800 rounded-xl text-xs font-medium flex items-center gap-2 border border-rose-200">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Title */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
              Item Name *
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Casio Scientific Calculator FX-991EX"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-2xs"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
              Description *
            </label>
            <textarea
              required
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Include details about functionality, edition, included accessories, or helpful instructions for the borrower."
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-2xs"
            />
          </div>

          {/* Category & Condition in 2 columns */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
                Category *
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white shadow-2xs"
              >
                {CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
                Condition *
              </label>
              <select
                value={condition}
                onChange={(e) => setCondition(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white shadow-2xs"
              >
                {CONDITIONS.map((cond) => (
                  <option key={cond} value={cond}>
                    {cond}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Pickup Location & Max Borrow Duration */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
                Pickup Location on Campus *
              </label>
              <input
                type="text"
                required
                value={pickupLocation}
                onChange={(e) => setPickupLocation(e.target.value)}
                placeholder="e.g. Central Library 2nd Floor or CS Block B"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-2xs"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
                Maximum Borrow Duration *
              </label>
              <input
                type="text"
                required
                value={borrowDuration}
                onChange={(e) => setBorrowDuration(e.target.value)}
                placeholder="e.g. 3 days, 1 week, 2 weeks"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-2xs"
              />
            </div>
          </div>

          {/* Image Upload & Presets */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
              Item Photo (Upload or Choose Campus Preset)
            </label>

            <div className="flex flex-col sm:flex-row gap-4 items-start">
              {/* File upload trigger */}
              <label className="w-full sm:w-1/2 flex flex-col items-center justify-center p-4 border-2 border-dashed border-slate-200 rounded-xl hover:border-indigo-400 hover:bg-slate-50 transition-colors cursor-pointer text-center">
                <Upload className="w-6 h-6 text-slate-400 mb-1" />
                <span className="text-xs font-semibold text-slate-700">Upload Photo from device</span>
                <span className="text-[11px] text-slate-400 mt-0.5">PNG, JPG up to 10MB</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageFileChange}
                  className="hidden"
                  disabled={uploadingImage}
                />
              </label>

              {/* Preview */}
              <div className="w-full sm:w-1/2 h-28 rounded-xl bg-slate-100 border border-slate-200 overflow-hidden flex items-center justify-center relative">
                {uploadingImage ? (
                  <div className="flex items-center gap-2 text-xs text-slate-500">
                    <Loader2 className="w-4 h-4 animate-spin text-indigo-600" />
                    <span>Uploading...</span>
                  </div>
                ) : imageUrl ? (
                  <>
                    <img
                      src={imageUrl}
                      alt="Preview"
                      className="w-full h-full object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => setImageUrl('')}
                      className="absolute top-2 right-2 p-1 bg-black/60 text-white rounded text-[10px] hover:bg-black/80"
                    >
                      Remove
                    </button>
                  </>
                ) : (
                  <div className="text-center p-3 text-slate-400">
                    <ImageIcon className="w-6 h-6 mx-auto mb-1 stroke-1" />
                    <span className="text-[11px]">No photo selected</span>
                  </div>
                )}
              </div>
            </div>

            {/* Quick Presets */}
            <div className="mt-3">
              <span className="text-[11px] text-slate-500 block mb-1.5">Or select a standard campus preset:</span>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {PRESET_IMAGES.map((preset) => (
                  <button
                    key={preset.name}
                    type="button"
                    onClick={() => setImageUrl(preset.url)}
                    className={`p-2 rounded-lg border text-left text-xs transition-colors cursor-pointer flex items-center justify-between ${
                      imageUrl === preset.url
                        ? 'border-indigo-600 bg-indigo-50/50 text-indigo-900 font-medium'
                        : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <span className="truncate pr-1">{preset.name}</span>
                    {imageUrl === preset.url && <Check className="w-3.5 h-3.5 text-indigo-600 shrink-0" />}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Submit Button */}
          <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
            <Link
              to="/"
              className="px-4 py-2.5 text-xs font-semibold text-slate-600 hover:text-slate-900 transition-colors"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={submitting || uploadingImage}
              className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-xl shadow-xs transition-colors cursor-pointer disabled:opacity-50 flex items-center gap-2"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Publishing Listing...</span>
                </>
              ) : (
                <span>Publish Listing</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
