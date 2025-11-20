import { DietType, MealType } from './types';

export const DIET_OPTIONS = Object.values(DietType);
export const MEAL_OPTIONS = Object.values(MealType);
export const LOCAL_STORAGE_KEY = 'chefgenie_favorites';

export const INITIAL_PREFERENCES = {
  ingredients: [],
  userInstructions: [],
  diet: DietType.None,
  mealType: MealType.Dinner,
  additionalNotes: '',
  specificDietaryRestrictions: '',
  cookingTime: '',
};

export const LOADING_MESSAGES = [
  "Analyzing your ingredients...",
  "Consulting with top chefs...",
  "Preheating the digital oven...",
  "Measuring spices...",
  "Plating your masterpiece..."
];