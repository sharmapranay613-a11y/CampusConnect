import React, { useState } from 'react';
import { Package, BookOpen, Cpu, Wrench, Dumbbell } from 'lucide-react';

interface Props {
  src?: string;
  alt: string;
  category?: string;
  className?: string;
}

export const ItemPlaceholderImage: React.FC<Props> = ({
  src,
  alt,
  category = '',
  className = 'w-full h-full object-cover',
}) => {
  const [hasError, setHasError] = useState(false);

  const getCategoryIcon = () => {
    const cat = category.toLowerCase();
    if (cat.includes('book') || cat.includes('notes')) return <BookOpen className="w-10 h-10 text-slate-400 stroke-1" />;
    if (cat.includes('calc') || cat.includes('elect')) return <Cpu className="w-10 h-10 text-slate-400 stroke-1" />;
    if (cat.includes('tool') || cat.includes('draft') || cat.includes('lab')) return <Wrench className="w-10 h-10 text-slate-400 stroke-1" />;
    if (cat.includes('sport')) return <Dumbbell className="w-10 h-10 text-slate-400 stroke-1" />;
    return <Package className="w-10 h-10 text-slate-400 stroke-1" />;
  };

  if (!src || hasError) {
    return (
      <div className="w-full h-full min-h-[160px] bg-gradient-to-br from-slate-100 via-slate-50 to-slate-200 flex flex-col items-center justify-center p-4 text-center select-none">
        <div className="p-3 bg-white/80 rounded-xl shadow-xs mb-2">
          {getCategoryIcon()}
        </div>
        <span className="text-xs font-medium text-slate-500 line-clamp-1">{alt || category || 'Campus Item'}</span>
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      referrerPolicy="no-referrer"
      onError={() => setHasError(true)}
      className={className}
      loading="lazy"
    />
  );
};
