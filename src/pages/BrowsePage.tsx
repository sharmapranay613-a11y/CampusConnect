import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../services/api.js';
import type { Item } from '../types/index.js';
import { ItemCard } from '../components/ItemCard.js';
import { Search, Plus, SlidersHorizontal, PackageOpen, Loader2 } from 'lucide-react';
import { useAuth } from '../hooks/useAuth.js';

const CATEGORIES = [
  'All',
  'Textbooks',
  'Calculators & Electronics',
  'Lab Equipment',
  'Drafting & Tools',
  'Notes & Supplies',
  'Sports Equipment',
  'Other',
];

export const BrowsePage: React.FC = () => {
  const { user } = useAuth();
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [onlyAvailable, setOnlyAvailable] = useState(false);

  useEffect(() => {
    fetchItems();
  }, [selectedCategory]);

  const fetchItems = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await api.items.getAll({
        category: selectedCategory === 'All' ? undefined : selectedCategory,
        search: searchTerm.trim() ? searchTerm.trim() : undefined,
      });
      setItems(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load campus items');
    } finally {
      setLoading(false);
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchItems();
  };

  const filteredItems = items.filter((item) => {
    if (onlyAvailable && !item.available) return false;
    if (!searchTerm) return true;
    const q = searchTerm.toLowerCase();
    return (
      item.title.toLowerCase().includes(q) ||
      item.description.toLowerCase().includes(q) ||
      item.pickup_location.toLowerCase().includes(q) ||
      item.owner?.full_name?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6">
      {/* Hero / Header Section */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white rounded-2xl p-6 sm:p-8 shadow-sm">
        <div className="max-w-2xl">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
            Borrow & Lend Campus Essentials
          </h1>
          <p className="mt-2 text-sm text-slate-300 leading-relaxed">
            Need a scientific calculator for an exam, drawing drafter for practicals, or course textbook for this semester? Connect directly with fellow campus students.
          </p>
        </div>

        {/* Search Bar */}
        <form onSubmit={handleSearchSubmit} className="mt-6 flex flex-col sm:flex-row gap-2 max-w-xl">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search calculator, book, drafter, equipment..."
              className="w-full pl-10 pr-4 py-2.5 bg-white text-slate-900 rounded-xl text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-xs"
            />
          </div>
          <button
            type="submit"
            className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold rounded-xl transition-colors cursor-pointer shadow-xs whitespace-nowrap"
          >
            Search
          </button>
        </form>
      </div>

      {/* Filter Bar: Category Tabs & Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        {/* Categories Segmented Control */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-2 md:pb-0 scrollbar-none">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                selectedCategory === cat
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'bg-white text-slate-600 hover:bg-slate-100 hover:text-slate-900 border border-slate-200/80'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Toggle Available Only */}
        <div className="flex items-center justify-between md:justify-end gap-3 text-xs text-slate-600">
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={onlyAvailable}
              onChange={(e) => setOnlyAvailable(e.target.checked)}
              className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300"
            />
            <span>Available only</span>
          </label>

          <span className="text-slate-400">|</span>
          <span className="font-semibold text-slate-800 tabular-nums">
            {filteredItems.length} {filteredItems.length === 1 ? 'item' : 'items'}
          </span>
        </div>
      </div>

      {/* Item Grid */}
      {loading ? (
        <div className="py-20 flex flex-col items-center justify-center text-slate-400">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-600 mb-3" />
          <p className="text-sm font-medium">Loading campus items...</p>
        </div>
      ) : error ? (
        <div className="p-6 bg-red-50 text-red-700 rounded-xl text-center max-w-xl mx-auto border border-red-200">
          <p className="font-semibold text-sm">{error}</p>
          {error.includes('schema cache') && (
            <p className="mt-2 text-xs text-red-600 leading-relaxed">
              Please execute the SQL script in <code className="font-mono bg-red-100 px-1 py-0.5 rounded">supabase/schema.sql</code> in your Supabase SQL Editor to initialize the database tables and security policies.
            </p>
          )}
          <button
            onClick={fetchItems}
            className="mt-4 px-4 py-1.5 bg-red-600 text-white rounded-lg text-xs font-semibold hover:bg-red-700 cursor-pointer"
          >
            Retry
          </button>
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200/80 p-12 text-center max-w-lg mx-auto my-8">
          <div className="w-12 h-12 bg-slate-100 text-slate-400 rounded-full flex items-center justify-center mx-auto mb-4">
            <PackageOpen className="w-6 h-6" />
          </div>
          <h3 className="text-base font-semibold text-slate-900">No items found</h3>
          <p className="mt-1 text-xs text-slate-500 max-w-sm mx-auto">
            {searchTerm || selectedCategory !== 'All'
              ? 'Try changing your search terms or selecting a different category.'
              : 'Be the first student to list an item for borrowing!'}
          </p>
          {user && (
            <Link
              to="/create-listing"
              className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 text-white text-xs font-semibold rounded-lg hover:bg-indigo-700 transition-colors shadow-xs"
            >
              <Plus className="w-4 h-4" />
              Create Listing
            </Link>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredItems.map((item) => (
            <ItemCard key={item.id} item={item} />
          ))}
        </div>
      )}
    </div>
  );
};
