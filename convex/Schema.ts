import {defineSchema,defineTable} from 'convex/server'
import {v} from 'convex/values'
export default defineSchema ({
   savedMeals:defineTable ({
    userId:v.string(),
    mealId:v.string(),
    name:v.string(),
    category:v.optional(v.string()),
    area:v.optional(v.string()),
    imageUrl:v.optional(v.string()),
    source:v.optional(v.string()),
    createdAt:v.number()
   }).index("by_user",["userId"]).index("by_user_meal",["userId","mealId"])
})