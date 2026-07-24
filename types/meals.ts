export type MealListItem ={
    idMeal :string;
    strMeal :string;
    strMealThumb:string;
    strCategory?:string;
    strArea?:string
}
export type MealListItemResponse={
    meals:MealListItem[]|null;
}