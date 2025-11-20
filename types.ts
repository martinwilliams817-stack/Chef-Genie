export enum DietType {
  None = 'None',
  Vegan = 'Vegan',
  Vegetarian = 'Vegetarian',
  Keto = 'Keto',
  Paleo = 'Paleo',
  GlutenFree = 'Gluten-Free'
}

export enum MealType {
  Breakfast = 'Breakfast',
  Lunch = 'Lunch',
  Dinner = 'Dinner',
  Snack = 'Snack',
  Dessert = 'Dessert'
}

export interface Macros {
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
}

export interface Ingredient {
  item: string;
  quantity: string; // e.g. "1", "1/2", "1.5"
  unit: string; // e.g. "cup", "tbsp", "to taste"
}

export interface Recipe {
  title: string;
  description: string;
  cookingTime: string;
  difficulty: string;
  servings: number; // Base number of servings
  ingredients: Ingredient[] | string[]; // Union type for backward compatibility
  instructions: string[];
  macros: Macros;
}

export interface SavedRecipe extends Recipe {
  id: string;
  savedAt: number;
  imageUrl: string | null;
  rating?: number;
}

export interface UserPreferences {
  ingredients: string[];
  userInstructions: string[];
  diet: DietType;
  mealType: MealType;
  additionalNotes: string;
  specificDietaryRestrictions: string;
  cookingTime: string;
  image?: string; // Base64 string
}