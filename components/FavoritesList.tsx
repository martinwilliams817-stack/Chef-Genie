import React, { useState } from 'react';
import { SavedRecipe } from '../types';

interface FavoritesListProps {
  favorites: SavedRecipe[];
  onSelect: (recipe: SavedRecipe) => void;
  onRemove: (id: string) => void;
  onRate: (id: string, rating: number) => void;
}

const FavoriteCard: React.FC<{
  fav: SavedRecipe;
  onSelect: (recipe: SavedRecipe) => void;
  onRemove: (id: string) => void;
  onRate: (id: string, rating: number) => void;
}> = ({ fav, onSelect, onRemove, onRate }) => {
  const [showRatingConfirm, setShowRatingConfirm] = useState(false);
  const [animatingStar, setAnimatingStar] = useState<number | null>(null);

  const handleRate = (rating: number) => {
    onRate(fav.id, rating);
    setAnimatingStar(rating);
    setShowRatingConfirm(true);
    
    // Reset animation state shortly after
    setTimeout(() => setAnimatingStar(null), 300);
    // Hide confirmation tooltip after delay
    setTimeout(() => setShowRatingConfirm(false), 2000);
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden hover:shadow-md transition-all duration-300 flex flex-col h-full group relative">
      {/* Image Area */}
      <div 
          className="h-48 w-full bg-slate-100 relative cursor-pointer overflow-hidden"
          onClick={() => onSelect(fav)}
      >
        {fav.imageUrl ? (
          <img src={fav.imageUrl} alt={fav.title} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-slate-400 bg-slate-50">
            <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
        )}
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
      </div>
      
      {/* Content Area */}
      <div className="p-5 flex-1 flex flex-col">
          <div className="flex justify-between items-start mb-2">
              <div className="flex gap-2">
                    <span className="text-xs font-medium bg-emerald-100 text-emerald-700 px-2 py-1 rounded-full">{fav.cookingTime}</span>
                    <span className="text-xs font-medium bg-amber-100 text-amber-700 px-2 py-1 rounded-full">{fav.difficulty}</span>
              </div>
          </div>
          <h3 
              className="text-lg font-bold text-slate-800 mb-2 line-clamp-2 cursor-pointer hover:text-emerald-600 transition-colors"
              onClick={() => onSelect(fav)}
          >
              {fav.title}
          </h3>
          <p className="text-slate-500 text-sm line-clamp-2 mb-4 flex-1">{fav.description}</p>
          
          {/* Rating Section */}
          <div className="flex items-center mb-4 relative" onClick={(e) => e.stopPropagation()}>
              <span className="text-xs font-medium text-slate-500 mr-2 uppercase tracking-wider">My Rating</span>
              <div className="flex gap-0.5 relative">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    onClick={() => handleRate(star)}
                    className={`focus:outline-none transition-transform duration-200 p-0.5 ${
                        animatingStar === star ? 'scale-150 text-amber-500' : 'hover:scale-110'
                    }`}
                    title={`${star} stars`}
                  >
                    <svg
                      className={`w-5 h-5 ${star <= (fav.rating || 0) ? 'text-amber-400 fill-amber-400' : 'text-slate-200 fill-slate-100'}`}
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={star <= (fav.rating || 0) ? 0 : 1.5}
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.545.044.77.77.35 1.127l-4.208 3.584a.562.562 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.208-3.584a.562.562 0 01.35-1.127l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" />
                    </svg>
                  </button>
                ))}
                
                {/* Visual Confirmation Tooltip */}
                <div className={`absolute -top-8 left-0 bg-slate-800 text-white text-[10px] font-bold px-2 py-1.5 rounded shadow-lg whitespace-nowrap transition-all duration-300 z-10 flex items-center ${showRatingConfirm ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 translate-y-2 scale-90 pointer-events-none'}`}>
                   <span className="text-amber-400 mr-1">★</span> Saved!
                   <div className="absolute -bottom-1 left-4 w-2 h-2 bg-slate-800 rotate-45"></div>
                </div>
              </div>
          </div>

          <div className="pt-4 border-t border-slate-100 flex justify-between items-center mt-auto">
              <span className="text-xs text-slate-400">
                  {new Date(fav.savedAt).toLocaleDateString()}
              </span>
              <button 
                  onClick={(e) => { e.stopPropagation(); onRemove(fav.id); }}
                  className="text-slate-400 hover:text-red-500 hover:bg-red-50 p-2 rounded-full transition-all"
                  title="Remove from favorites"
              >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
              </button>
          </div>
      </div>
    </div>
  );
};

export const FavoritesList: React.FC<FavoritesListProps> = ({ favorites, onSelect, onRemove, onRate }) => {
  if (favorites.length === 0) {
    return (
      <div className="text-center py-20">
        <div className="text-6xl mb-6 animate-bounce">📒</div>
        <h2 className="text-2xl font-bold text-slate-800 mb-2">No favorites yet</h2>
        <p className="text-slate-500">Save your delicious discoveries to access them anytime.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-slate-800">My Cookbook ({favorites.length})</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {favorites.map((fav) => (
          <FavoriteCard 
            key={fav.id} 
            fav={fav} 
            onSelect={onSelect} 
            onRemove={onRemove} 
            onRate={onRate} 
          />
        ))}
      </div>
    </div>
  );
};