import { GoogleGenAI, Type, Schema } from "@google/genai";
import { Recipe, UserPreferences } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const recipeSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    title: { type: Type.STRING, description: "The creative name of the dish." },
    description: { type: Type.STRING, description: "A short, appetizing description of the dish." },
    cookingTime: { type: Type.STRING, description: "Total time required (e.g., '30 mins')." },
    difficulty: { type: Type.STRING, description: "Difficulty level (Easy, Medium, Hard)." },
    servings: { type: Type.NUMBER, description: "The number of servings this recipe yields (e.g., 2, 4)." },
    ingredients: {
      type: Type.ARRAY,
      items: { 
        type: Type.OBJECT,
        properties: {
          item: { type: Type.STRING, description: "The name of the ingredient (e.g., 'Chicken Breast')." },
          quantity: { type: Type.STRING, description: "The numerical quantity (e.g., '1', '0.5', '1/2'). Leave empty if not applicable." },
          unit: { type: Type.STRING, description: "The unit of measure (e.g., 'cup', 'kg', 'pinch'). Leave empty if not applicable." }
        },
        required: ["item"]
      },
      description: "List of ingredients with structured quantities."
    },
    instructions: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: "Step-by-step cooking instructions."
    },
    macros: {
      type: Type.OBJECT,
      properties: {
        calories: { type: Type.NUMBER },
        protein: { type: Type.NUMBER, description: "In grams" },
        carbs: { type: Type.NUMBER, description: "In grams" },
        fats: { type: Type.NUMBER, description: "In grams" }
      },
      required: ["calories", "protein", "carbs", "fats"]
    }
  },
  required: ["title", "description", "cookingTime", "difficulty", "servings", "ingredients", "instructions", "macros"]
};

export const generateRecipe = async (prefs: UserPreferences): Promise<Recipe> => {
  const parts: any[] = [];

  // Add Image if present
  if (prefs.image) {
    const base64Data = prefs.image.split(',')[1]; // Remove data:image/jpeg;base64, prefix
    if (base64Data) {
        parts.push({
            inlineData: {
                data: base64Data,
                mimeType: "image/jpeg" // Assuming JPEG for simplicity from camera/input
            }
        });
    }
  }

  // Construct Prompt
  let prompt = `Generate a creative and delicious recipe.`;
  
  if (prefs.ingredients.length > 0) {
    prompt += ` Use these ingredients: ${prefs.ingredients.join(", ")}.`;
  } else if (prefs.image) {
    prompt += ` Identify the ingredients in the image and use them.`;
  } else {
    prompt += ` Suggest a random popular dish.`;
  }

  if (prefs.userInstructions.length > 0) {
    prompt += `
    Please try to incorporate the following specific cooking steps/instructions requested by the user:
    ${prefs.userInstructions.map((inst, i) => `${i + 1}. ${inst}`).join('\n')}
    `;
  }

  prompt += `
    Meal Type: ${prefs.mealType}.
    Cooking Time Goal: ${prefs.cookingTime || "No specific time constraint"}.
    Dietary Restriction: ${prefs.diet}.
    Specific Allergies/Restrictions: ${prefs.specificDietaryRestrictions || "None"}.
    Additional Notes: ${prefs.additionalNotes || "None"}.
    
    Return the result strictly as a JSON object matching the schema provided.
  `;

  parts.push({ text: prompt });

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: { parts },
      config: {
        responseMimeType: "application/json",
        responseSchema: recipeSchema,
      }
    });

    const text = response.text;
    if (!text) throw new Error("No response from AI");
    
    return JSON.parse(text) as Recipe;
  } catch (error) {
    console.error("Error generating recipe:", error);
    throw error;
  }
};

export const generateDishImage = async (recipeTitle: string, recipeDescription: string): Promise<string | null> => {
  try {
    // Enhanced prompt for better food photography
    const prompt = `Professional food photography of ${recipeTitle}. 
    Context: ${recipeDescription}. 
    Style: Michelin star plating, photorealistic, 8k resolution, soft natural window lighting, shallow depth of field to highlight texture, vibrant colors, fresh garnish, macro detail, overhead or 45-degree angle shot. No text overlays.`;
    
    const response = await ai.models.generateImages({
        model: 'imagen-4.0-generate-001',
        prompt: prompt,
        config: {
          numberOfImages: 1,
          outputMimeType: 'image/jpeg',
          aspectRatio: '16:9',
        },
    });

    const base64ImageBytes = response.generatedImages?.[0]?.image?.imageBytes;
    if (base64ImageBytes) {
        return `data:image/jpeg;base64,${base64ImageBytes}`;
    }
    return null;
  } catch (error) {
    console.error("Error generating image:", error);
    return null;
  }
};

export const generateRecipeVideo = async (recipe: Recipe): Promise<string | null> => {
  // Create a fresh instance to pick up the user-selected key which might have changed
  const aiVideo = new GoogleGenAI({ apiKey: process.env.API_KEY });

  const prompt = `Cinematic short cooking video of ${recipe.title}. 
  Show ingredients being prepared, chopped, and cooked. 
  Close up shots of the cooking process in a professional kitchen with warm lighting. 
  Final shot of the plated dish ${recipe.title}. 
  High quality, 4k, photorealistic, slow motion b-roll style.`;

  try {
    let operation = await aiVideo.models.generateVideos({
      model: 'veo-3.1-fast-generate-preview',
      prompt: prompt,
      config: {
        numberOfVideos: 1,
        resolution: '1080p',
        aspectRatio: '16:9'
      }
    });

    while (!operation.done) {
      await new Promise(resolve => setTimeout(resolve, 5000)); // Poll every 5s
      operation = await aiVideo.operations.getVideosOperation({ operation: operation });
    }

    const videoUri = operation.response?.generatedVideos?.[0]?.video?.uri;
    if (!videoUri) return null;

    // Append API key for playback as per instructions
    return `${videoUri}&key=${process.env.API_KEY}`;

  } catch (error) {
    console.error("Error generating video:", error);
    throw error;
  }
};