import { MealListItem, MealListItemResponse } from "@/types/meals";

const base_url = "https://www.themealdb.com/api/json/v1/1/";


export async function getMealsByCategory(category: string):
    Promise<MealListItem[]> {
    try {
        const res = await fetch(`${base_url}/filter.php?c=${encodeURIComponent(category)}`);
        if (!res.ok) {
            throw new Error("Could not load meal list!");

        }
        const data: MealListItemResponse = await res.json()
        return data?.meals ?? []
    }
    catch (err) {
        if (err instanceof Error) {
            throw err
        }
        throw new Error("Could not load meal list")
    }
}



export async function searchMealsByName(search: string):
    Promise<MealListItem[]> {
    try {
        const res = await fetch(`${base_url}/search.php?s=${encodeURIComponent(search)}`);
        if (!res.ok) {
            throw new Error("Could not load meal list!");

        }
        const data: MealListItemResponse = await res.json()
        return data?.meals ?? []
    }
    catch (err) {
        if (err instanceof Error) {
            throw err
        }
        throw new Error("Could not load meal list")
    }
}