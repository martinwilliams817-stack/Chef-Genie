import React, { useState, useRef } from 'react';
import { UserPreferences, DietType, MealType } from '../types';
import { DIET_OPTIONS, MEAL_OPTIONS } from '../constants';
import { Button } from './Button';

interface RecipeFormProps {
  preferences: UserPreferences;
  onPreferencesChange: (newPrefs: UserPreferences) => void;
  onSubmit: () => void;
  isLoading: boolean;
}

export const RecipeForm: React.FC<RecipeFormProps> = ({
  preferences,
  onPreferencesChange,
  onSubmit,
  isLoading
}) => {
  const [newIngredient, setNewIngredient] = useState('');
  const [newInstruction, setNewInstruction] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleAddIngredient = () => {
    if (newIngredient.trim()) {
      onPreferencesChange({
        ...preferences,
        ingredients: [...preferences.ingredients, newIngredient.trim()]
      });
      setNewIngredient('');
    }
  };

  const handleIngredientKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddIngredient();
    }
  };

  const removeIngredient = (index: number) => {
    const newIngredients = [...preferences.ingredients];
    newIngredients.splice(index, 1);
    onPreferencesChange({ ...preferences, ingredients: newIngredients });
  };

  const handleAddInstruction = () => {
    if (newInstruction.trim()) {
      onPreferencesChange({
        ...preferences,
        userInstructions: [...preferences.userInstructions, newInstruction.trim()]
      });
      setNewInstruction('');
    }
  };

  const handleInstructionKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddInstruction();
    }
  };

  const removeInstruction = (index: number) => {
    const newInstructions = [...preferences.userInstructions];
    newInstructions.splice(index, 1);
    onPreferencesChange({ ...preferences, userInstructions: newInstructions });
  };

  const processFile = (file: File) => {
    if (file && file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onloadend = () => {
        onPreferencesChange({ ...preferences, image: reader.result as string });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.currentTarget.contains(e.relatedTarget as Node)) return;
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  return (
    <div className="space-y-8 pb-24 md:pb-0">
      {/* Image Upload Section */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
        <h3 className="text-lg font-semibold text-slate-800 mb-4">1. Fridge Scan (Optional)</h3>
        <div 
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`relative border-2 border-dashed rounded-xl p-8 text-center transition-all duration-300 ease-in-out group cursor-pointer ${
            isDragging 
              ? 'border-emerald-500 bg-emerald-100 scale-[1.02] ring-4 ring-emerald-200 shadow-lg' 
              : preferences.image 
                ? 'border-emerald-500 bg-emerald-50' 
                : 'border-slate-300 hover:border-emerald-400 hover:bg-slate-50 hover:shadow-sm'
          }`}
        >
          <input
            type="file"
            ref={fileInputRef}
            accept="image/*"
            onChange={handleImageUpload}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
          />
          
          <div className="pointer-events-none relative z-0">
            {preferences.image ? (
                <div className="relative h-48 w-full group-hover:scale-[1.02] transition-transform duration-300">
                    <img 
                        src={preferences.image} 
                        alt="Uploaded ingredients" 
                        className="h-full w-full object-contain rounded-lg shadow-sm" 
                    />
                    <div className={`absolute inset-0 flex items-center justify-center bg-black/30 rounded-lg transition-opacity duration-300 ${isDragging ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
                        <p className="text-white font-bold bg-black/50 px-4 py-2 rounded-full backdrop-blur-sm transform transition-transform duration-300 hover:scale-105">
                            {isDragging ? 'Drop to replace' : 'Click or drop to change'}
                        </p>
                    </div>
                </div>
            ) : (
                <div className="flex flex-col items-center space-y-3">
                    <div className={`p-4 rounded-full transition-all duration-300 ${
                        isDragging 
                            ? 'bg-white text-emerald-600 shadow-md scale-110 animate-bounce' 
                            : 'bg-slate-100 text-slate-400 group-hover:bg-emerald-100 group-hover:text-emerald-500 group-hover:scale-110'
                    }`}>
                        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                    </div>
                    <div className="space-y-1">
                        <p className={`text-lg font-medium transition-colors duration-300 ${isDragging ? 'text-emerald-700' : 'text-slate-700'}`}>
                            {isDragging ? 'Drop it like it\'s hot!' : 'Upload a photo of your ingredients'}
                        </p>
                        <p className="text-sm text-slate-500">
                            <span className="text-emerald-600 font-semibold group-hover:underline">Click to upload</span> or drag and drop
                        </p>
                        <p className="text-xs text-slate-400 mt-2">PNG, JPG, WebP up to 10MB</p>
                    </div>
                </div>
            )}
          </div>
        </div>
      </div>

      {/* Ingredients Text Section */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
        <h3 className="text-lg font-semibold text-slate-800 mb-4">2. Ingredients</h3>
        <div className="flex space-x-2 mb-4">
          <input
            type="text"
            value={newIngredient}
            onChange={(e) => setNewIngredient(e.target.value)}
            onKeyDown={handleIngredientKeyDown}
            placeholder="Enter ingredient (e.g., chicken, spinach)"
            className="flex-1 px-4 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
          />
          <button 
            onClick={handleAddIngredient}
            className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 font-medium"
          >
            Add
          </button>
        </div>
        <div className="flex flex-wrap gap-2">
            {preferences.ingredients.length === 0 && !preferences.image && (
                <p className="text-sm text-slate-400 italic">No ingredients added yet.</p>
            )}
          {preferences.ingredients.map((ing, idx) => (
            <span key={idx} className="inline-flex items-center bg-emerald-100 text-emerald-800 px-3 py-1 rounded-full text-sm">
              {ing}
              <button
                onClick={() => removeIngredient(idx)}
                className="ml-2 text-emerald-600 hover:text-emerald-900 font-bold"
              >
                ×
              </button>
            </span>
          ))}
        </div>
      </div>

      {/* Specific Instructions Section */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
        <h3 className="text-lg font-semibold text-slate-800 mb-4">3. Specific Steps/Instructions (Optional)</h3>
        <div className="flex space-x-2 mb-4">
          <input
            type="text"
            value={newInstruction}
            onChange={(e) => setNewInstruction(e.target.value)}
            onKeyDown={handleInstructionKeyDown}
            placeholder="e.g., Sear the meat first, Cut vegetables in julienne"
            className="flex-1 px-4 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
          />
          <button 
            onClick={handleAddInstruction}
            className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 font-medium"
          >
            Add
          </button>
        </div>
        <div className="space-y-2">
            {preferences.userInstructions.length === 0 && (
                <p className="text-sm text-slate-400 italic">No specific instructions added.</p>
            )}
            {preferences.userInstructions.map((inst, idx) => (
              <div key={idx} className="flex items-center justify-between bg-amber-50 text-amber-900 px-3 py-2 rounded-lg text-sm">
                <span className="flex-1 mr-2"><span className="font-semibold mr-2">{idx + 1}.</span>{inst}</span>
                <button
                  onClick={() => removeInstruction(idx)}
                  className="text-amber-600 hover:text-amber-900 font-bold px-2"
                >
                  ×
                </button>
              </div>
            ))}
        </div>
      </div>

      {/* Preferences Section */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
        <h3 className="text-lg font-semibold text-slate-800 mb-4">4. Preferences</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Meal Type</label>
            <select
              value={preferences.mealType}
              onChange={(e) => onPreferencesChange({ ...preferences, mealType: e.target.value as MealType })}
              className="w-full px-4 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-emerald-500 outline-none bg-white"
            >
              {MEAL_OPTIONS.map(opt => (
                <option key={opt} value={opt}>{opt}</option>
              ))}
            </select>
          </div>

          <div>
             <label className="block text-sm font-medium text-slate-700 mb-2">Cooking Time</label>
             <input
               type="text"
               value={preferences.cookingTime}
               onChange={(e) => onPreferencesChange({ ...preferences, cookingTime: e.target.value })}
               placeholder="e.g. Under 30 mins"
               className="w-full px-4 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-emerald-500 outline-none"
             />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Dietary Restrictions</label>
            <select
              value={preferences.diet}
              onChange={(e) => onPreferencesChange({ ...preferences, diet: e.target.value as DietType })}
              className="w-full px-4 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-emerald-500 outline-none bg-white"
            >
              {DIET_OPTIONS.map(opt => (
                <option key={opt} value={opt}>{opt}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="mt-4">
           <label className="block text-sm font-medium text-slate-700 mb-2">Specific Allergies or Restrictions</label>
           <input 
             type="text"
             className="w-full px-4 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-emerald-500 outline-none"
             placeholder="e.g., Peanut allergy, No shellfish, Low sodium"
             value={preferences.specificDietaryRestrictions}
             onChange={(e) => onPreferencesChange({...preferences, specificDietaryRestrictions: e.target.value})}
           />
        </div>
        
        <div className="mt-4">
           <label className="block text-sm font-medium text-slate-700 mb-2">Additional Notes</label>
           <textarea 
             className="w-full px-4 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-emerald-500 outline-none"
             rows={2}
             placeholder="e.g., 'Make it spicy' or 'I have 20 minutes'"
             value={preferences.additionalNotes}
             onChange={(e) => onPreferencesChange({...preferences, additionalNotes: e.target.value})}
           />
        </div>
      </div>

      {/* Sticky Footer Action */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t border-slate-200 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)] z-10 md:relative md:bg-transparent md:border-0 md:shadow-none md:p-0 flex justify-center">
        <Button 
            onClick={onSubmit} 
            isLoading={isLoading} 
            className="w-full md:w-auto md:min-w-[200px] shadow-emerald-200/50"
        >
            Create Recipe
        </Button>
      </div>
    </div>
  );
};
