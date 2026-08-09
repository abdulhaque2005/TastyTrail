import { v } from 'convex/values'
import { mutation, query } from './_generated/server'

// Add or update rating
export const rateMeal = mutation({
    args: {
        mealId: v.string(),
        rating: v.number(),
        review: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) throw new Error("Not logged in");
        const userId = identity.subject;

        if (args.rating < 1 || args.rating > 5) {
            throw new Error("Rating must be between 1 and 5");
        }

        // Check if user already rated this meal
        const existing = await ctx.db.query("ratings")
            .withIndex("by_user_meal", (q) => q.eq("userId", userId).eq("mealId", args.mealId))
            .unique();

        if (existing) {
            await ctx.db.patch(existing._id, {
                rating: args.rating,
                review: args.review,
            });
            return { updated: true, id: existing._id };
        }

        const id = await ctx.db.insert("ratings", {
            userId,
            mealId: args.mealId,
            rating: args.rating,
            review: args.review,
            createdAt: Date.now(),
        });

        return { added: true, id };
    },
});

// Get average rating for a meal
export const getMealRating = query({
    args: { mealId: v.string() },
    handler: async (ctx, args) => {
        const ratings = await ctx.db.query("ratings")
            .withIndex("by_meal", (q) => q.eq("mealId", args.mealId))
            .collect();

        if (ratings.length === 0) return { average: 0, count: 0 };

        const sum = ratings.reduce((acc, curr) => acc + curr.rating, 0);
        return {
            average: Math.round((sum / ratings.length) * 10) / 10,
            count: ratings.length
        };
    },
});

// Get user's rating for a specific meal
export const getUserMealRating = query({
    args: { mealId: v.string() },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) return null;

        return await ctx.db.query("ratings")
            .withIndex("by_user_meal", (q) => q.eq("userId", identity.subject).eq("mealId", args.mealId))
            .unique();
    },
});
