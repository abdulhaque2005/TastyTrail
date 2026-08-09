import { v } from 'convex/values'
import { mutation, query } from './_generated/server'

// Get user profile (or create empty one if it doesn't exist)
export const getProfile = query({
    args: {},
    handler: async (ctx) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) return null;
        
        const profile = await ctx.db.query("userProfiles")
            .withIndex("by_user", (q) => q.eq("userId", identity.subject))
            .unique();
            
        return profile;
    },
});

// Update user profile
export const updateProfile = mutation({
    args: {
        displayName: v.optional(v.string()),
        profileImage: v.optional(v.string()),
        phone: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) throw new Error("Not logged in");
        const userId = identity.subject;
        
        const profile = await ctx.db.query("userProfiles")
            .withIndex("by_user", (q) => q.eq("userId", userId))
            .unique();
            
        if (profile) {
            await ctx.db.patch(profile._id, args);
            return { updated: true };
        } else {
            await ctx.db.insert("userProfiles", {
                userId,
                ...args
            });
            return { created: true };
        }
    },
});
