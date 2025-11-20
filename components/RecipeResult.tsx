import React, { useState, useEffect } from 'react';
import { Recipe, Ingredient } from '../types';
import { Button } from './Button';
import { NutritionChart } from './NutritionChart';
import { generateRecipeVideo } from '../services/geminiService';

interface RecipeResultProps {
  recipe: Recipe;
  imageUrl: string | null;
  isImageLoading?: boolean;
  onReset: () => void;
  isFavorite: boolean;
  onToggleFavorite: () => void;
}

export const RecipeResult: React.FC<RecipeResultProps> = ({ 
  recipe, 
  imageUrl, 
  isImageLoading = false,
  onReset,
  isFavorite,
  onToggleFavorite
}) => {
  const [showShareTooltip, setShowShareTooltip] = useState(false);
  const [showShareMenu, setShowShareMenu] = useState(false);
  const [isCookMode, setIsCookMode] = useState(false);
  const [activeStep, setActiveStep] = useState(0);
  const [showMobileIngredients, setShowMobileIngredients] = useState(false);
  
  // Default to recipe.servings, fallback to 4 if undefined (old data)
  const [currentServings, setCurrentServings] = useState<number>(recipe.servings || 4);
  
  // Video Generation State
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [isGeneratingVideo, setIsGeneratingVideo] = useState(false);
  const [videoError, setVideoError] = useState<string | null>(null);

  // Slideshow Fallback State
  const [isPlayingSlideshow, setIsPlayingSlideshow] = useState(false);
  const [currentSlide, setCurrentSlide] = useState(0);

  // Reset servings if recipe changes
  useEffect(() => {
    setCurrentServings(recipe.servings || 4);
    setVideoUrl(null);
    setVideoError(null);
    setIsCookMode(false);
    setActiveStep(0);
    setIsPlayingSlideshow(false);
    setCurrentSlide(0);
  }, [recipe.servings, recipe.title]);

  // Lock body scroll when in cook mode or slideshow
  useEffect(() => {
    if (isCookMode || isPlayingSlideshow) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isCookMode, isPlayingSlideshow]);

  // Keyboard navigation for steps
  useEffect(() => {
    if (!isCookMode) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') {
        if (activeStep < recipe.instructions.length - 1) {
            setActiveStep(prev => prev + 1);
        }
      } else if (e.key === 'ArrowLeft') {
        if (activeStep > 0) {
            setActiveStep(prev => prev - 1);
        }
      } else if (e.key === 'Escape') {
        setIsCookMode(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isCookMode, activeStep, recipe.instructions.length]);

  // Slideshow Auto-Advance Logic
  useEffect(() => {
    if (!isPlayingSlideshow) return;
    
    const totalSlides = 1 + recipe.instructions.length + 1; // Title + Steps + End
    // Slide duration: Title (4s), Steps (6s), End (Indefinite/Long)
    const duration = currentSlide === 0 ? 4000 : currentSlide === totalSlides - 1 ? null : 6000;

    if (!duration) return;

    const timer = setTimeout(() => {
        setCurrentSlide(prev => {
            if (prev < totalSlides - 1) return prev + 1;
            return prev;
        });
    }, duration);

    return () => clearTimeout(timer);
  }, [isPlayingSlideshow, currentSlide, recipe.instructions.length]);


  const isStructuredIngredients = (ingredients: any[]): ingredients is Ingredient[] => {
    return ingredients.length > 0 && typeof ingredients[0] === 'object';
  };

  // Logic to parse fractions, decimals, and ranges for scaling
  const getScaledQuantity = (quantity: string, base: number, target: number): string => {
    if (!quantity) return '';
    if (base === target) return quantity;

    const ratio = target / base;

    // Helper to convert number to neat string (decimals to fractions if close)
    const formatNumber = (num: number): string => {
      const decimal = num - Math.floor(num);
      if (decimal < 0.01) return Math.floor(num).toString(); // integer
      
      // Common fractions
      if (Math.abs(decimal - 0.25) < 0.05) return `${Math.floor(num) > 0 ? Math.floor(num) + ' ' : ''}¼`;
      if (Math.abs(decimal - 0.33) < 0.05) return `${Math.floor(num) > 0 ? Math.floor(num) + ' ' : ''}⅓`;
      if (Math.abs(decimal - 0.5) < 0.05) return `${Math.floor(num) > 0 ? Math.floor(num) + ' ' : ''}½`;
      if (Math.abs(decimal - 0.66) < 0.05) return `${Math.floor(num) > 0 ? Math.floor(num) + ' ' : ''}⅔`;
      if (Math.abs(decimal - 0.75) < 0.05) return `${Math.floor(num) > 0 ? Math.floor(num) + ' ' : ''}¾`;
      
      return num.toFixed(1).replace('.0', '');
    };

    // Attempt to parse "1/2", "1.5", "1-2"
    try {
        if (quantity.includes('-')) {
            // Handle ranges "1-2"
            const parts = quantity.split('-').map(p => parseFloat(p.trim()));
            if (parts.every(p => !isNaN(p))) {
                return `${formatNumber(parts[0] * ratio)}-${formatNumber(parts[1] * ratio)}`;
            }
        } else if (quantity.includes('/')) {
            // Handle fractions "1/2"
            const [num, den] = quantity.split('/').map(p => parseFloat(p.trim()));
            if (!isNaN(num) && !isNaN(den) && den !== 0) {
                return formatNumber((num / den) * ratio);
            }
        } else {
            const parsed = parseFloat(quantity);
            if (!isNaN(parsed)) {
                return formatNumber(parsed * ratio);
            }
        }
    } catch (e) {
        // Fallback to original if parsing fails
        return quantity;
    }
    return quantity;
  };

  const updateServings = (delta: number) => {
    const newServings = Math.max(1, currentServings + delta);
    setCurrentServings(newServings);
  };

  const formatIngredientText = (ing: Ingredient | string, baseServings: number, currentServings: number): string => {
      if (typeof ing === 'string') return ing;
      
      const scaledQty = getScaledQuantity(ing.quantity, baseServings, currentServings);
      const part = [scaledQty, ing.unit, ing.item].filter(Boolean).join(' ');
      return part;
  };

  const getShareContent = () => {
    const baseServings = recipe.servings || 4;
    const ingredientsList = recipe.ingredients.map(ing => 
        `- ${formatIngredientText(ing, baseServings, currentServings)}`
    ).join('\n');

    const fullText = `Check out this recipe for ${recipe.title}!\n\n${recipe.description}\n\nServes: ${currentServings}\n\nIngredients:\n${ingredientsList}\n\nInstructions:\n${recipe.instructions.map((s, i) => `${i + 1}. ${s}`).join('\n')}`;
    
    const shortText = `Check out this AI-generated recipe for ${recipe.title}! #ChefGenie`;

    return { title: recipe.title, fullText, shortText, url: window.location.href };
  };

  const handleNativeShare = async () => {
    const { title, fullText, url } = getShareContent();
    setShowShareMenu(false);

    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({
          title: title,
          text: fullText,
          url: url
        });
      } catch (err) {
        console.log('Share cancelled');
      }
    } else {
      try {
        await navigator.clipboard.writeText(fullText);
        setShowShareTooltip(true);
        setTimeout(() => setShowShareTooltip(false), 2000);
      } catch (err) {
        console.error('Failed to copy to clipboard', err);
      }
    }
  };

  const handleSocialShare = (platform: 'twitter' | 'facebook') => {
      const { shortText, url } = getShareContent();
      let shareUrl = '';

      if (platform === 'twitter') {
          shareUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shortText)}&url=${encodeURIComponent(url)}`;
      } else if (platform === 'facebook') {
          // Facebook primarily uses the URL, but we can try adding a quote if supported
          shareUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}&quote=${encodeURIComponent(shortText)}`;
      }

      window.open(shareUrl, '_blank', 'width=600,height=400,noopener,noreferrer');
      setShowShareMenu(false);
  };

  const handleGenerateVideo = async () => {
    if (isGeneratingVideo) return;
    setVideoError(null);

    try {
        // Explicitly check and ask for API key as per Veo requirements
        if (typeof (window as any).aistudio !== 'undefined' && !(window as any).aistudio.hasSelectedApiKey()) {
            await (window as any).aistudio.openSelectKey();
            // We assume success and proceed, managing any errors if key wasn't actually selected in the catch block
        }

        setIsGeneratingVideo(true);
        const url = await generateRecipeVideo(recipe);
        if (url) {
            setVideoUrl(url);
        } else {
            setVideoError("Could not generate video. Please try again.");
        }
    } catch (err: any) {
        console.error("Video generation failed", err);
        
        // Specific handling for missing entity/key issues which might imply invalid key
        if (err.message && err.message.includes("Requested entity was not found")) {
            setVideoError("Authorization failed. Please select a valid API key.");
             // Retry logic: Prompt user to select key again
             try {
                if (typeof (window as any).aistudio !== 'undefined') {
                     await (window as any).aistudio.openSelectKey();
                }
             } catch (e) {
                 // Ignore errors opening dialog
             }
        } else {
            setVideoError("Video generation unavailable right now.");
        }
    } finally {
        setIsGeneratingVideo(false);
    }
  };

  const startSlideshow = () => {
      setVideoError(null);
      setIsPlayingSlideshow(true);
      setCurrentSlide(0);
  }

  const canScale = isStructuredIngredients(recipe.ingredients) && recipe.servings;
  const totalSteps = recipe.instructions.length;
  const progress = ((activeStep + 1) / totalSteps) * 100;

  // Slideshow Content Helper
  const getSlideshowContent = () => {
    if (currentSlide === 0) {
        return (
            <div className="text-center px-4 animate-fade-in-up">
                <h2 className="text-4xl md:text-6xl font-bold text-white mb-4 drop-shadow-lg">{recipe.title}</h2>
                <p className="text-xl text-white/90 drop-shadow-md">{recipe.description}</p>
            </div>
        );
    } else if (currentSlide <= recipe.instructions.length) {
        const index = currentSlide - 1;
        return (
            <div className="max-w-4xl px-6 text-center animate-fade-in-up">
                <span className="inline-block px-4 py-1 rounded-full bg-emerald-500 text-white font-bold text-sm mb-6 shadow-lg">
                    Step {index + 1}
                </span>
                <p className="text-2xl md:text-4xl font-medium text-white leading-normal drop-shadow-lg">
                    {recipe.instructions[index]}
                </p>
            </div>
        );
    } else {
        return (
            <div className="text-center px-4 animate-fade-in-up">
                 <h2 className="text-4xl md:text-6xl font-bold text-white mb-6 drop-shadow-lg">Bon Appétit!</h2>
                 <div className="flex justify-center gap-4 text-white/90">
                    <div className="flex flex-col">
                        <span className="text-2xl font-bold">{recipe.macros.calories}</span>
                        <span className="text-xs uppercase">Calories</span>
                    </div>
                    <div className="w-px bg-white/30"></div>
                    <div className="flex flex-col">
                        <span className="text-2xl font-bold">{recipe.macros.protein}g</span>
                        <span className="text-xs uppercase">Protein</span>
                    </div>
                 </div>
                 <button 
                    onClick={() => setIsPlayingSlideshow(false)}
                    className="mt-10 px-8 py-3 bg-white text-slate-900 rounded-full font-bold hover:bg-slate-200 transition-colors shadow-xl"
                 >
                    Back to Recipe
                 </button>
            </div>
        );
    }
  };

  return (
    <div className="max-w-4xl mx-auto pb-20 relative">
      
      {/* Cook Mode Overlay */}
      {isCookMode && (
        <div className="fixed inset-0 z-[60] bg-white flex flex-col animate-fade-in overflow-hidden">
            {/* Cook Mode Header */}
            <div className="h-16 border-b border-slate-200 flex items-center justify-between px-4 md:px-8 bg-white shrink-0 relative z-10">
                <div className="flex items-center gap-4">
                    <h2 className="font-bold text-lg md:text-xl text-slate-800 line-clamp-1">{recipe.title}</h2>
                    <span className="hidden md:inline-flex bg-emerald-100 text-emerald-800 text-xs font-medium px-2.5 py-0.5 rounded-full">
                        Step {activeStep + 1} of {totalSteps}
                    </span>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => setShowMobileIngredients(!showMobileIngredients)}
                        className="md:hidden px-3 py-1.5 text-sm font-medium text-emerald-700 bg-emerald-50 rounded-lg"
                    >
                        {showMobileIngredients ? 'Hide Ingredients' : 'Ingredients'}
                    </button>
                    <button 
                        onClick={() => setIsCookMode(false)}
                        className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-medium text-sm transition-colors"
                    >
                        Exit
                    </button>
                </div>
                
                {/* Progress Bar */}
                <div className="absolute bottom-0 left-0 right-0 h-1 bg-slate-100">
                    <div 
                        className="h-full bg-emerald-500 transition-all duration-500 ease-out"
                        style={{ width: `${progress}%` }}
                    />
                </div>
            </div>

            {/* Cook Mode Content */}
            <div className="flex-1 overflow-hidden relative flex bg-slate-50">
                
                {/* Ingredients Sidebar (Desktop / Toggleable Mobile) */}
                <div className={`
                    absolute inset-y-0 left-0 z-20 w-full md:static md:w-80 lg:w-96 bg-white border-r border-slate-200 transform transition-transform duration-300 ease-in-out flex flex-col
                    ${showMobileIngredients ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
                `}>
                    <div className="p-6 overflow-y-auto flex-1">
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="text-xl font-bold text-slate-800">Ingredients</h3>
                            <span className="text-xs font-medium text-slate-500">{currentServings} Servings</span>
                        </div>
                        <ul className="space-y-3">
                            {recipe.ingredients.map((ing, i) => {
                                const text = typeof ing === 'string' 
                                    ? ing 
                                    : formatIngredientText(ing, recipe.servings || 4, currentServings);
                                return (
                                    <li key={i} className="flex items-start group cursor-pointer select-none" onClick={(e) => e.currentTarget.classList.toggle('opacity-40')}>
                                        <div className="w-6 h-6 rounded-full border-2 border-slate-300 mr-3 flex items-center justify-center shrink-0 group-hover:border-emerald-500 transition-colors">
                                            <div className="w-3 h-3 rounded-full bg-emerald-500 opacity-0 group-hover:opacity-20 transition-opacity" />
                                        </div>
                                        <span className="text-slate-700 leading-snug">{text}</span>
                                    </li>
                                );
                            })}
                        </ul>
                    </div>
                    <div className="p-4 border-t border-slate-200 bg-slate-50 md:hidden">
                        <button 
                            onClick={() => setShowMobileIngredients(false)}
                            className="w-full py-3 bg-slate-800 text-white rounded-lg font-medium"
                        >
                            Close Ingredients
                        </button>
                    </div>
                </div>

                {/* Active Step Main View */}
                <div className="flex-1 flex flex-col relative overflow-hidden">
                    <div className="flex-1 overflow-y-auto p-6 md:p-12 flex items-center justify-center">
                        <div className="max-w-3xl w-full">
                             <div className="mb-8 text-center">
                                <span className="inline-block px-4 py-1 rounded-full bg-emerald-100 text-emerald-800 font-bold text-sm mb-4">
                                    Step {activeStep + 1}
                                </span>
                             </div>
                             
                             <p className="text-2xl md:text-4xl font-medium text-slate-800 leading-normal text-center animate-fade-in-up">
                                {recipe.instructions[activeStep]}
                             </p>
                        </div>
                    </div>

                    {/* Navigation Footer */}
                    <div className="p-6 bg-white border-t border-slate-200 shrink-0">
                        <div className="max-w-3xl mx-auto flex items-center justify-between gap-4">
                            <button
                                onClick={() => setActiveStep(prev => Math.max(0, prev - 1))}
                                disabled={activeStep === 0}
                                className="flex-1 md:flex-none px-6 py-4 rounded-xl bg-slate-100 text-slate-700 font-bold hover:bg-slate-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                                Previous
                            </button>

                            <div className="hidden md:block text-slate-400 font-medium text-sm">
                                Use arrow keys to navigate
                            </div>
                            
                            {activeStep < totalSteps - 1 ? (
                                <button
                                    onClick={() => setActiveStep(prev => Math.min(totalSteps - 1, prev + 1))}
                                    className="flex-1 md:flex-none px-8 py-4 rounded-xl bg-emerald-600 text-white font-bold hover:bg-emerald-700 shadow-lg shadow-emerald-200 hover:shadow-xl transition-all flex items-center justify-center gap-2"
                                >
                                    Next Step
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                                </button>
                            ) : (
                                <button
                                    onClick={() => setIsCookMode(false)}
                                    className="flex-1 md:flex-none px-8 py-4 rounded-xl bg-slate-900 text-white font-bold hover:bg-slate-800 shadow-lg transition-all flex items-center justify-center gap-2"
                                >
                                    Finish Cooking
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
      )}

      {/* Slideshow Overlay */}
      {isPlayingSlideshow && (
          <div className="fixed inset-0 z-[70] bg-black flex items-center justify-center overflow-hidden">
             {/* Background Image with Zoom Effect */}
             <div className="absolute inset-0 opacity-50">
                {imageUrl ? (
                    <img 
                        src={imageUrl} 
                        alt="Background" 
                        className="w-full h-full object-cover transition-transform duration-[20000ms] ease-linear scale-100 animate-[kenburns_20s_infinite_alternate]"
                        style={{ animationName: 'kenburns', animationDuration: '20s', animationTimingFunction: 'linear', animationIterationCount: 'infinite', animationDirection: 'alternate' }}
                    />
                ) : (
                    <div className="w-full h-full bg-gradient-to-br from-slate-800 to-slate-900" />
                )}
             </div>
             {/* Dark overlay gradient */}
             <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-black/20" />

             {/* Content */}
             <div className="relative z-10 w-full max-w-6xl p-8 flex flex-col items-center justify-center min-h-screen">
                 {getSlideshowContent()}
             </div>

             {/* Progress Indicator */}
             <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex space-x-2 z-20">
                 {Array.from({ length: 1 + recipe.instructions.length + 1 }).map((_, i) => (
                     <div 
                        key={i}
                        className={`h-1 rounded-full transition-all duration-300 ${i === currentSlide ? 'w-8 bg-white' : 'w-2 bg-white/30'}`} 
                     />
                 ))}
             </div>

             {/* Close Button */}
             <button 
                onClick={() => setIsPlayingSlideshow(false)}
                className="absolute top-6 right-6 text-white/50 hover:text-white p-2 z-20 transition-colors"
             >
                <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
             </button>

             <style dangerouslySetInnerHTML={{__html: `
                @keyframes kenburns {
                    0% { transform: scale(1); }
                    100% { transform: scale(1.2); }
                }
             `}} />
          </div>
      )}

      <div className="mb-6">
        <Button variant="outline" onClick={onReset} className="mb-4">
          ← Back
        </Button>
      </div>

      {/* Video Modal */}
      {videoUrl && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4 animate-fade-in" onClick={() => setVideoUrl(null)}>
            <div className="relative w-full max-w-5xl aspect-video bg-black rounded-xl overflow-hidden shadow-2xl" onClick={e => e.stopPropagation()}>
                <video src={videoUrl} controls autoPlay className="w-full h-full" />
                <button 
                    onClick={() => setVideoUrl(null)} 
                    className="absolute top-4 right-4 text-white bg-black/50 hover:bg-black/80 backdrop-blur-sm rounded-full p-2 transition-colors"
                >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>
            </div>
          </div>
      )}

      <div className="bg-white rounded-3xl overflow-hidden shadow-xl border border-slate-100">
        {/* Hero Image */}
        <div className="relative h-64 md:h-96 w-full bg-slate-100 group">
          {isImageLoading ? (
             <div className="w-full h-full bg-slate-200 animate-pulse flex items-center justify-center">
                 <svg className="w-16 h-16 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                 </svg>
             </div>
          ) : imageUrl ? (
            <img 
              src={imageUrl} 
              alt={recipe.title} 
              className="w-full h-full object-cover"
            />
          ) : (
             <div className="w-full h-full flex flex-col items-center justify-center text-slate-400 bg-slate-50">
                <svg className="w-16 h-16 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <span>Image generation unavailable</span>
             </div>
          )}
          
          {/* Action Buttons */}
          <div className="absolute top-4 right-4 md:top-6 md:right-6 flex items-center gap-3 z-20">
            
            {/* Cook Mode Button */}
            <button
              onClick={() => setIsCookMode(true)}
              className="p-3 rounded-full bg-white/20 backdrop-blur-md border border-white/30 shadow-lg hover:bg-white/40 transition-all duration-200 active:scale-95 text-white"
              title="Enter Cook Mode (Full Screen)"
            >
              <svg className="w-6 h-6 md:w-8 md:h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
              </svg>
            </button>

            {/* Generate Video Button */}
            <button
              onClick={handleGenerateVideo}
              disabled={isGeneratingVideo}
              className="p-3 rounded-full bg-white/20 backdrop-blur-md border border-white/30 shadow-lg hover:bg-white/40 transition-all duration-200 active:scale-95 text-white disabled:opacity-70 disabled:cursor-not-allowed"
              title="Generate AI Video"
            >
             {isGeneratingVideo ? (
                <svg className="animate-spin w-6 h-6 md:w-8 md:h-8" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
             ) : (
                <svg className="w-6 h-6 md:w-8 md:h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
             )}
            </button>

            {/* Share Button Container */}
            <div className="relative">
                <button 
                onClick={() => setShowShareMenu(!showShareMenu)}
                className="p-3 rounded-full bg-white/20 backdrop-blur-md border border-white/30 shadow-lg hover:bg-white/40 transition-all duration-200 active:scale-95 text-white relative"
                title="Share recipe"
                >
                <svg className="w-6 h-6 md:w-8 md:h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                </svg>
                </button>

                {/* Share Dropdown Menu */}
                {showShareMenu && (
                    <>
                        <div className="fixed inset-0 z-10" onClick={() => setShowShareMenu(false)}></div>
                        <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-2xl ring-1 ring-black ring-opacity-5 z-20 overflow-hidden">
                            <div className="py-1">
                                <button
                                    onClick={() => handleSocialShare('facebook')}
                                    className="flex items-center w-full px-4 py-3 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
                                >
                                    <svg className="w-5 h-5 mr-3 text-[#1877F2]" fill="currentColor" viewBox="0 0 24 24">
                                        <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                                    </svg>
                                    Facebook
                                </button>
                                <button
                                    onClick={() => handleSocialShare('twitter')}
                                    className="flex items-center w-full px-4 py-3 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
                                >
                                    <svg className="w-5 h-5 mr-3 text-black" fill="currentColor" viewBox="0 0 24 24">
                                        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                                    </svg>
                                    X / Twitter
                                </button>
                                <button
                                    onClick={handleNativeShare}
                                    className="flex items-center w-full px-4 py-3 text-sm text-slate-700 hover:bg-slate-50 transition-colors border-t border-slate-100 relative"
                                >
                                    <svg className="w-5 h-5 mr-3 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                                    </svg>
                                    Copy Link / More
                                    
                                    {showShareTooltip && (
                                        <div className="absolute right-4 top-1/2 -translate-y-1/2 px-2 py-1 bg-slate-800 text-white text-xs font-medium rounded animate-fade-in">
                                        Copied!
                                        </div>
                                    )}
                                </button>
                            </div>
                        </div>
                    </>
                )}
            </div>

            {/* Favorite Button */}
            <button 
              onClick={onToggleFavorite}
              className="p-3 rounded-full bg-white/20 backdrop-blur-md border border-white/30 shadow-lg hover:bg-white/40 transition-all duration-200 group-hover:scale-110 active:scale-95"
              title={isFavorite ? "Remove from favorites" : "Save to favorites"}
            >
              <svg 
                  className={`w-6 h-6 md:w-8 md:h-8 transition-colors ${isFavorite ? 'fill-red-500 text-red-500' : 'text-white fill-none'}`}
                  stroke="currentColor" 
                  viewBox="0 0 24 24"
                  strokeWidth={2}
              >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
              </svg>
            </button>
          </div>
          
          {/* Status Messages Overlay */}
          {isGeneratingVideo && (
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm flex flex-col items-center justify-center text-white z-10">
                 <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-white mb-4"></div>
                 <p className="text-lg font-semibold">Creating your recipe video...</p>
                 <p className="text-sm text-white/80">This may take a minute.</p>
            </div>
          )}

          {/* Error Message Overlay */}
          {videoError && (
            <div className="absolute top-0 left-0 right-0 p-4 z-20">
                 <div className="bg-red-500/90 backdrop-blur-md text-white px-4 py-3 rounded-lg shadow-lg flex items-center justify-between flex-wrap gap-2">
                    <span>{videoError}</span>
                    <div className="flex items-center gap-3">
                        <button 
                            onClick={startSlideshow}
                            className="px-3 py-1.5 bg-white text-red-600 rounded-md text-sm font-bold hover:bg-red-50 shadow-sm transition-colors"
                        >
                            Play Slideshow
                        </button>
                        <button onClick={() => setVideoError(null)} className="ml-2 font-bold hover:opacity-75 p-1">✕</button>
                    </div>
                 </div>
            </div>
          )}

          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent pointer-events-none flex items-end p-6 md:p-10">
            <div className="text-white">
              <div className="flex flex-wrap gap-2 mb-2">
                <span className="bg-emerald-500/90 backdrop-blur-sm px-3 py-1 rounded-full text-sm font-semibold shadow-sm">
                  {recipe.cookingTime}
                </span>
                <span className="bg-amber-500/90 backdrop-blur-sm px-3 py-1 rounded-full text-sm font-semibold shadow-sm">
                  {recipe.difficulty}
                </span>
              </div>
              <h1 className="text-3xl md:text-5xl font-bold mb-2 drop-shadow-md">{recipe.title}</h1>
              <p className="text-slate-200 text-lg line-clamp-2 drop-shadow-sm">{recipe.description}</p>
            </div>
          </div>
        </div>

        <div className="p-6 md:p-10 grid grid-cols-1 lg:grid-cols-3 gap-10">
          
          {/* Left Col: Ingredients & Instructions */}
          <div className="lg:col-span-2 space-y-8">
            
            <section>
              <div className="flex items-center justify-between mb-4">
                  <h2 className="text-2xl font-bold text-slate-800 flex items-center">
                    <span className="bg-emerald-100 text-emerald-600 p-2 rounded-lg mr-3">
                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                        </svg>
                    </span>
                    Ingredients
                  </h2>

                  {/* Serving Control */}
                  {canScale && (
                      <div className="flex items-center bg-slate-100 rounded-lg p-1">
                          <button 
                            onClick={() => updateServings(-1)}
                            className="w-8 h-8 flex items-center justify-center rounded-md bg-white text-slate-600 shadow-sm hover:text-emerald-600 disabled:opacity-50"
                            disabled={currentServings <= 1}
                          >
                            -
                          </button>
                          <span className="px-3 text-sm font-semibold text-slate-700 min-w-[4rem] text-center">
                              {currentServings} Srv
                          </span>
                          <button 
                             onClick={() => updateServings(1)}
                             className="w-8 h-8 flex items-center justify-center rounded-md bg-white text-slate-600 shadow-sm hover:text-emerald-600"
                          >
                            +
                          </button>
                      </div>
                  )}
              </div>
              
              <ul className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {recipe.ingredients.map((ing, i) => {
                    // Backward compatibility check
                    const isString = typeof ing === 'string';
                    const text = isString 
                        ? ing 
                        : formatIngredientText(ing, recipe.servings || 4, currentServings);
                        
                    return (
                      <li key={i} className="flex items-start p-3 rounded-lg bg-slate-50 hover:bg-slate-100 transition-colors">
                        <span className="h-2 w-2 mt-2 rounded-full bg-emerald-400 mr-3 shrink-0" />
                        <span className="text-slate-700">{text}</span>
                      </li>
                    );
                })}
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-slate-800 mb-4 flex items-center">
                <span className="bg-amber-100 text-amber-600 p-2 rounded-lg mr-3">
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                    </svg>
                </span>
                Instructions
              </h2>
              <div className="space-y-4">
                {recipe.instructions.map((step, i) => (
                  <div key={i} className="flex gap-4">
                    <div className="flex-shrink-0 flex items-center justify-center w-8 h-8 rounded-full bg-slate-800 text-white font-bold text-sm">
                      {i + 1}
                    </div>
                    <p className="text-slate-700 leading-relaxed pt-1">{step}</p>
                  </div>
                ))}
              </div>
            </section>
          </div>

          {/* Right Col: Nutrition & Stats */}
          <div className="space-y-6">
             <NutritionChart macros={recipe.macros} />
             
             <div className="bg-emerald-50 rounded-xl p-6 border border-emerald-100">
                <h3 className="text-emerald-800 font-semibold mb-2">Chef's Note</h3>
                <p className="text-emerald-700 text-sm italic">
                    "Enjoy this meal while fresh! The estimated cooking time is {recipe.cookingTime}. 
                    Adjust seasoning to your personal preference."
                </p>
             </div>
          </div>
        </div>
      </div>
    </div>
  );
};