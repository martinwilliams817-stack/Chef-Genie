import React, { useState, useEffect } from 'react';
import { RecipeForm } from './components/RecipeForm';
import { RecipeResult } from './components/RecipeResult';
import { FavoritesList } from './components/FavoritesList';
import { Recipe, UserPreferences, SavedRecipe } from './types';
import { INITIAL_PREFERENCES, LOADING_MESSAGES, LOCAL_STORAGE_KEY } from './constants';
import { generateRecipe, generateDishImage } from './services/geminiService';

const App: React.FC = () => {
  const [view, setView] = useState<'home' | 'favorites'>('home');
  
  const [preferences, setPreferences] = useState<UserPreferences>(INITIAL_PREFERENCES);
  const [recipe, setRecipe] = useState<Recipe | null>(null);
  const [recipeImage, setRecipeImage] = useState<string | null>(null);
  const [isImageLoading, setIsImageLoading] = useState(false);
  
  const [favorites, setFavorites] = useState<SavedRecipe[]>(() => {
    if (typeof window === 'undefined') return [];
    const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
    return saved ? JSON.parse(saved) : [];
  });

  const [loading, setLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState(LOADING_MESSAGES[0]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(favorites));
  }, [favorites]);

  const handleGenerate = async () => {
    setLoading(true);
    setError(null);
    setRecipe(null);
    setRecipeImage(null);
    setIsImageLoading(true);
    setView('home'); // Ensure we stay on home view when generating

    // Cycle loading messages for fun UX
    const interval = setInterval(() => {
      setLoadingMessage(prev => {
        const currentIndex = LOADING_MESSAGES.indexOf(prev);
        return LOADING_MESSAGES[(currentIndex + 1) % LOADING_MESSAGES.length];
      });
    }, 2000);

    try {
      // 1. Generate Recipe Text
      const recipeData = await generateRecipe(preferences);
      setRecipe(recipeData);
      
      // 2. Generate Image (fire and forget the state update, don't block rendering)
      generateDishImage(recipeData.title, recipeData.description)
        .then(img => setRecipeImage(img))
        .catch(err => console.error("Image gen failed silently", err))
        .finally(() => setIsImageLoading(false));

    } catch (err: any) {
      setError("Oops! The kitchen is a bit chaotic right now. Please try again. " + (err.message || ""));
      setIsImageLoading(false);
    } finally {
      clearInterval(interval);
      setLoading(false);
    }
  };

  const reset = () => {
    setRecipe(null);
    setRecipeImage(null);
    setError(null);
    setIsImageLoading(false);
    // If we were viewing a recipe, 'reset' means going back to the list (if favorites) or form (if home)
    // The logic in render handles this by checking `recipe` state.
  };

  const handleToggleFavorite = () => {
    if (!recipe) return;

    const existingIndex = favorites.findIndex(f => f.title === recipe.title); // Simple check by title since ID might not exist on new gens

    if (existingIndex >= 0) {
      // Remove
      const newFavorites = [...favorites];
      newFavorites.splice(existingIndex, 1);
      setFavorites(newFavorites);
    } else {
      // Add
      const newFavorite: SavedRecipe = {
        ...recipe,
        id: crypto.randomUUID(),
        savedAt: Date.now(),
        imageUrl: recipeImage
      };
      setFavorites([newFavorite, ...favorites]);
    }
  };

  const handleRateRecipe = (id: string, rating: number) => {
    const newFavorites = favorites.map(fav => 
      fav.id === id ? { ...fav, rating } : fav
    );
    setFavorites(newFavorites);
    
    // If currently viewing this recipe, keep it in sync but don't interrupt the view
    if (recipe && 'id' in recipe && (recipe as SavedRecipe).id === id) {
      setRecipe({ ...recipe, rating } as SavedRecipe);
    }
  };

  const isCurrentRecipeFavorite = recipe ? favorites.some(f => f.title === recipe.title) : false;

  const navigateToHome = () => {
    setView('home');
    setRecipe(null);
    setIsImageLoading(false);
  };

  const navigateToFavorites = () => {
    setView('favorites');
    setRecipe(null);
    setIsImageLoading(false);
  };

  const selectFavorite = (fav: SavedRecipe) => {
    setRecipe(fav);
    setRecipeImage(fav.imageUrl);
    setIsImageLoading(false);
  };

  const removeFavorite = (id: string) => {
    setFavorites(favorites.filter(f => f.id !== id));
    // If currently viewing the deleted recipe, go back to list
    if (recipe && (recipe as SavedRecipe).id === id) {
      setRecipe(null);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-20 shadow-sm">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-2 cursor-pointer" onClick={navigateToHome}>
            <div className="w-8 h-8 bg-gradient-to-br from-emerald-400 to-emerald-600 rounded-lg flex items-center justify-center text-white font-bold text-xl shadow-emerald-200">
              C
            </div>
            <span className="font-bold text-xl text-slate-800 hidden sm:inline">ChefGenie</span>
          </div>
          
          <nav className="flex space-x-1">
             <button 
                onClick={navigateToHome}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${view === 'home' && !recipe ? 'bg-emerald-50 text-emerald-700' : 'text-slate-600 hover:bg-slate-100'}`}
             >
                Generator
             </button>
             <button 
                onClick={navigateToFavorites}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center ${view === 'favorites' ? 'bg-emerald-50 text-emerald-700' : 'text-slate-600 hover:bg-slate-100'}`}
             >
                <span className="mr-1.5">My Cookbook</span>
                {favorites.length > 0 && (
                    <span className="bg-emerald-200 text-emerald-800 text-xs py-0.5 px-1.5 rounded-full">{favorites.length}</span>
                )}
             </button>
          </nav>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 flex items-center animate-fade-in">
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            {error}
          </div>
        )}

        {loading ? (
           <div className="flex flex-col items-center justify-center py-20">
             <div className="relative w-24 h-24 mb-6">
               <div className="absolute inset-0 border-4 border-slate-200 rounded-full"></div>
               <div className="absolute inset-0 border-4 border-emerald-500 rounded-full border-t-transparent animate-spin"></div>
               <div className="absolute inset-0 flex items-center justify-center">
                 <span className="text-3xl">👨‍🍳</span>
               </div>
             </div>
             <h2 className="text-xl font-semibold text-slate-800 animate-pulse">{loadingMessage}</h2>
             <p className="text-slate-500 mt-2 text-center max-w-md">
               Creating a recipe tailored to your {preferences.diet !== 'None' ? preferences.diet : ''} preferences...
             </p>
           </div>
        ) : recipe ? (
          <RecipeResult 
            recipe={recipe} 
            imageUrl={recipeImage} 
            isImageLoading={isImageLoading}
            onReset={reset}
            isFavorite={isCurrentRecipeFavorite}
            onToggleFavorite={handleToggleFavorite}
          />
        ) : view === 'favorites' ? (
          <FavoritesList 
            favorites={favorites} 
            onSelect={selectFavorite} 
            onRemove={removeFavorite} 
            onRate={handleRateRecipe}
          />
        ) : (
          <>
            <div className="mb-8 text-center">
              <h1 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4">
                What's cooking today?
              </h1>
              <p className="text-lg text-slate-600 max-w-2xl mx-auto">
                Enter your ingredients below, or upload a photo of your fridge, and let our AI Chef craft a unique recipe just for you.
              </p>
            </div>
            <div className="max-w-3xl mx-auto">
              <RecipeForm 
                preferences={preferences} 
                onPreferencesChange={setPreferences} 
                onSubmit={handleGenerate}
                isLoading={loading}
              />
            </div>
          </>
        )}
      </main>
    </div>
  );
};

export default App;