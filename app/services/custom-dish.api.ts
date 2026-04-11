import apiClient from './api';

export interface IngredientResult {
    food_name: string;
    energy_kcal: number;
    carb_g: number;
    protein_g: number;
    fat_g: number;
    fibre_g: number;
    [key: string]: any;
}

export interface CustomDishIngredient {
    food_name: string;
    grams: number;
}

export interface CustomDish {
    id?: string;
    food_name: string;
    energy_kcal: number;
    carb_g: number;
    protein_g: number;
    fat_g: number;
    ingredients: CustomDishIngredient[];
    created_at?: string;
    [key: string]: any;
}

/** Search ingredientsfinal.csv by name substring */
export async function searchIngredients(
    q: string,
    limit = 20
): Promise<IngredientResult[]> {
    const res = await apiClient.get('/api/ingredients/search', {
        params: { q, limit },
    });
    return res.data;
}

/** Save a custom dish (backend computes all 40 nutrient totals) */
export async function saveCustomDish(
    dish_name: string,
    ingredients: CustomDishIngredient[]
): Promise<CustomDish> {
    const res = await apiClient.post('/api/custom-dishes', {
        dish_name,
        ingredients,
    });
    return res.data;
}

/** Get all custom dishes saved by the current user */
export async function getCustomDishes(): Promise<CustomDish[]> {
    const res = await apiClient.get('/api/custom-dishes');
    return res.data;
}
