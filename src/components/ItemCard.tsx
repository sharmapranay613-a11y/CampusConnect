import React from 'react';
import { Link } from 'react-router-dom';
import type { Item } from '../types/index.js';
import { ItemPlaceholderImage } from './ItemPlaceholderImage.js';
import { MapPin, Clock } from 'lucide-react';

interface Props {
  item: Item;
}

export const ItemCard: React.FC<Props> = ({ item }) => {
  return (
    <Link
      to={`/items/${item.id}`}
      className="group block bg-white rounded-xl border border-slate-200/80 overflow-hidden shadow-xs hover:shadow-md transition-all duration-200 hover:-translate-y-0.5 flex flex-col"
    >
      {/* Product Image Slot */}
      <div className="relative aspect-[4/3] bg-slate-100 overflow-hidden">
        <ItemPlaceholderImage
          src={item.image_url}
          alt={item.title}
          category={item.category}
          className="w-full h-full object-cover group-hover:scale-103 transition-transform duration-300"
        />

        {/* Availability Marker (Zero-pill, clean typographic indicator) */}
        <div className="absolute top-2.5 right-2.5 bg-white/90 backdrop-blur-xs px-2.5 py-1 rounded-md text-xs font-semibold shadow-xs">
          {item.available ? (
            <span className="text-emerald-700 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Available
            </span>
          ) : (
            <span className="text-amber-800 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
              Borrowed
            </span>
          )}
        </div>
      </div>

      {/* Card Body */}
      <div className="p-4 flex-1 flex flex-col justify-between">
        <div>
          {/* Unboxed Metadata Line with typographic separators */}
          <div className="flex items-center gap-1.5 text-xs text-slate-500 mb-1.5">
            <span className="font-medium text-slate-600 truncate">{item.category}</span>
            <span aria-hidden="true">·</span>
            <span>{item.condition}</span>
          </div>

          <h3 className="text-base font-semibold text-slate-900 group-hover:text-indigo-600 transition-colors line-clamp-1">
            {item.title}
          </h3>

          <p className="mt-1 text-xs text-slate-600 line-clamp-2 leading-relaxed">
            {item.description}
          </p>
        </div>

        {/* Footer info: Owner & Location */}
        <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
          <div className="truncate pr-2">
            <span className="text-slate-400">By </span>
            <span className="font-medium text-slate-700">{item.owner?.full_name || 'Student'}</span>
          </div>

          <div className="flex items-center gap-1 text-slate-500 shrink-0">
            <Clock className="w-3.5 h-3.5 text-slate-400" />
            <span>{item.borrow_duration}</span>
          </div>
        </div>
      </div>
    </Link>
  );
};
