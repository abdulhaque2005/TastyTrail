import { v } from 'convex/values'
import { mutation, query } from './_generated/server'
export const saveMeal = mutation({
    args: {
        mealId: v.string(),
        name: v.string(),
        category: v.string(),
        area: v.optional(v.string()),
        imageUrl: v.optional(v.string()),
        source: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) {
            throw new Error("not logged in")
        }
        const userId = identity.subject;

        const exist = await ctx.db.query("savedMeals").
            withIndex('by_user_meal', (q) => q.eq("userId", userId).eq("mealId", args.mealId),).unique();
        if (exist) {
            return {
                saved: true,
                alreadySaved: true,
                id: exist._id
            }
        }
        const id = await ctx.db.insert("savedMeals", {
            userId,
            mealId: args.mealId,
            name: args.name,
            category: args.category,
            imageUrl: args.imageUrl,
            source: args.source,
            createdAt: Date.now()
        })
        return {
            saved: true,
            alreadySaved: false,
            id
        }
    },
})

export const getSavedMeals = query({
    args: {},
    handler: async (ctx) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) {
            return [];
        }
        const userId = identity.subject;
        return await ctx.db.query("savedMeals")
            .withIndex("by_user", (q) => q.eq('userId', userId)).order('desc').collect();
    },


})
export const isMealSaved = query({
    args: {
        mealId: v.string()
    },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) return false;
        const exist = await ctx.db.query("savedMeals").
            withIndex('by_user_meal', (q) => q.eq("userId", identity.subject).eq("mealId", args.mealId),).unique();
        return exist !== null;

    }

})

export const deleteMeal = mutation({
    args: {
        id: v.id("savedMeals")
    },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) {
            throw new Error("not logged in")
        }
        const userId = identity.subject;
        const savedMeals = await ctx.db.get(args.id)
        if(!savedMeals){
            throw new Error("Meal is not found!");
            
        }
        if(savedMeals.userId !==userId){
            throw new Error("You can only delete your saved meals!");
        }
        await ctx.db.delete(args.id);
        return{
            delete:true
        }
    },
})