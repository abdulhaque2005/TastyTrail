import { v } from 'convex/values'
import { mutation, query } from './_generated/server'

// Add item to cart
export const addToCart = mutation({
    args: {
        mealId: v.string(),
        name: v.string(),
        imageUrl: v.optional(v.string()),
        price: v.number(),
        quantity: v.number(),
        category: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) throw new Error("Not logged in");
        const userId = identity.subject;

        // Check if already in cart
        const existing = await ctx.db.query("cart")
            .withIndex("by_user_meal", (q) => q.eq("userId", userId).eq("mealId", args.mealId))
            .unique();

        if (existing) {
            await ctx.db.patch(existing._id, {
                quantity: existing.quantity + args.quantity
            });
            return { added: true, updated: true, id: existing._id };
        }

        const id = await ctx.db.insert("cart", {
            userId,
            mealId: args.mealId,
            name: args.name,
            imageUrl: args.imageUrl,
            price: args.price,
            quantity: args.quantity,
            category: args.category,
        });
        return { added: true, updated: false, id };
    },
});

// Get cart items
export const getCart = query({
    args: {},
    handler: async (ctx) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) return [];
        return await ctx.db.query("cart")
            .withIndex("by_user", (q) => q.eq("userId", identity.subject))
            .collect();
    },
});

// Update cart item quantity
export const updateCartQuantity = mutation({
    args: {
        id: v.id("cart"),
        quantity: v.number(),
    },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) throw new Error("Not logged in");
        const item = await ctx.db.get(args.id);
        if (!item || item.userId !== identity.subject) throw new Error("Not found");

        if (args.quantity <= 0) {
            await ctx.db.delete(args.id);
            return { deleted: true };
        }
        await ctx.db.patch(args.id, { quantity: args.quantity });
        return { deleted: false };
    },
});

// Remove item from cart
export const removeFromCart = mutation({
    args: { id: v.id("cart") },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) throw new Error("Not logged in");
        const item = await ctx.db.get(args.id);
        if (!item || item.userId !== identity.subject) throw new Error("Not found");
        await ctx.db.delete(args.id);
        return { removed: true };
    },
});

// Clear entire cart
export const clearCart = mutation({
    args: {},
    handler: async (ctx) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) throw new Error("Not logged in");
        const items = await ctx.db.query("cart")
            .withIndex("by_user", (q) => q.eq("userId", identity.subject))
            .collect();
        for (const item of items) {
            await ctx.db.delete(item._id);
        }
        return { cleared: true };
    },
});
