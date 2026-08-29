import { USDAFoodItem, MacroTotals } from '../types';

const BASE_URL = 'https://api.nal.usda.gov/fdc/v1';
const API_KEY = import.meta.env.VITE_USDA_API_KEY || 'DEMO_KEY';

// Nutrient IDs from USDA FoodData Central
const NUTRIENT_IDS = {
  calories: 1008,   // Energy (kcal)
  protein: 1003,    // Protein
  fat: 1004,        // Total lipid (fat)
  totalCarbs: 1005, // Carbohydrate, by difference
  fiber: 1079,      // Fiber, total dietary
};

export async function searchFoods(query: string): Promise<USDAFoodItem[]> {
  if (!query.trim()) return [];

  const params = new URLSearchParams({
    query,
    api_key: API_KEY,
    pageSize: '20',
    dataType: 'Foundation,SR Legacy,Branded',
  });

  const res = await fetch(`${BASE_URL}/foods/search?${params}`);
  if (!res.ok) throw new Error(`USDA search failed: ${res.status}`);

  const data = await res.json();
  return (data.foods || []) as USDAFoodItem[];
}

export async function getFoodDetails(fdcId: number): Promise<USDAFoodItem | null> {
  const res = await fetch(`${BASE_URL}/food/${fdcId}?api_key=${API_KEY}`);
  if (!res.ok) return null;
  return res.json();
}

export function extractMacros(food: USDAFoodItem, servingQty: number = 1, servingGrams: number = 100): MacroTotals {
  const getNutrient = (id: number): number => {
    const n = food.foodNutrients?.find((fn: any) => {
      // Handle both search result shape and detail shape
      return fn.nutrientId === id || fn.nutrient?.id === id;
    });
    const raw = n ? ((n as any).value ?? (n as any).amount ?? 0) : 0;
    // Values are per 100g from USDA — scale to serving
    return Math.round(((raw * servingGrams) / 100) * servingQty * 10) / 10;
  };

  const totalCarbs = getNutrient(NUTRIENT_IDS.totalCarbs);
  const fiber = getNutrient(NUTRIENT_IDS.fiber);

  return {
    calories: Math.round(getNutrient(NUTRIENT_IDS.calories)),
    protein: Math.round(getNutrient(NUTRIENT_IDS.protein) * 10) / 10,
    fat: Math.round(getNutrient(NUTRIENT_IDS.fat) * 10) / 10,
    netCarbs: Math.max(0, Math.round((totalCarbs - fiber) * 10) / 10),
  };
}

export function getServingInfo(food: USDAFoodItem): { qty: number; unit: string; grams: number } {
  const size = food.servingSize || 100;
  const unit = food.servingSizeUnit || 'g';
  return { qty: 1, unit, grams: size };
}
