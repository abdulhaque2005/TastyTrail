import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const getAddresses = query({
    args: {},
    handler: async (ctx) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) {
            return [];
        }

        const addresses = await ctx.db
            .query("addresses")
            .withIndex("by_user", (q) => q.eq("userId", identity.subject))
            .order("desc")
            .collect();

        return addresses;
    }
});

export const getDefaultAddress = query({
    args: {},
    handler: async (ctx) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) {
            return null;
        }

        const addresses = await ctx.db
            .query("addresses")
            .withIndex("by_user", (q) => q.eq("userId", identity.subject))
            .filter((q) => q.eq(q.field("isDefault"), true))
            .collect();

        return addresses.length > 0 ? addresses[0] : null;
    }
});

export const addAddress = mutation({
    args: {
        type: v.string(),
        deliveryType: v.optional(v.string()),
        fullAddress: v.string(),
        buildingName: v.optional(v.string()),
        floor: v.optional(v.string()),
        roomNumber: v.optional(v.string()),
        latitude: v.optional(v.number()),
        longitude: v.optional(v.number()),
        landmarkPhotos: v.optional(v.array(v.string())),
        deliveryNote: v.optional(v.string()),
        phone: v.string(),
        isDefault: v.boolean(),
    },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) {
            throw new Error("Unauthenticated call to addAddress");
        }

        // If this is set to default, unset other defaults
        if (args.isDefault) {
            const existing = await ctx.db
                .query("addresses")
                .withIndex("by_user", (q) => q.eq("userId", identity.subject))
                .filter((q) => q.eq(q.field("isDefault"), true))
                .collect();
                
            for (const addr of existing) {
                await ctx.db.patch(addr._id, { isDefault: false });
            }
        }

        // Check if this is the first address, make it default automatically
        let makeDefault = args.isDefault;
        if (!makeDefault) {
            const allAddresses = await ctx.db
                .query("addresses")
                .withIndex("by_user", (q) => q.eq("userId", identity.subject))
                .collect();
            if (allAddresses.length === 0) {
                makeDefault = true;
            }
        }

        await ctx.db.insert("addresses", {
            userId: identity.subject,
            type: args.type,
            deliveryType: args.deliveryType,
            fullAddress: args.fullAddress,
            buildingName: args.buildingName,
            floor: args.floor,
            roomNumber: args.roomNumber,
            latitude: args.latitude,
            longitude: args.longitude,
            landmarkPhotos: args.landmarkPhotos,
            deliveryNote: args.deliveryNote,
            phone: args.phone,
            isDefault: makeDefault,
            createdAt: Date.now(),
        });
    }
});

export const removeAddress = mutation({
    args: {
        id: v.id("addresses"),
    },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) {
            throw new Error("Unauthenticated call to removeAddress");
        }

        const address = await ctx.db.get(args.id);
        if (!address) {
            throw new Error("Address not found");
        }

        if (address.userId !== identity.subject) {
            throw new Error("Unauthorized to remove this address");
        }

        await ctx.db.delete(args.id);
        
        // If the removed address was default, set another one to default if exists
        if (address.isDefault) {
            const remaining = await ctx.db
                .query("addresses")
                .withIndex("by_user", (q) => q.eq("userId", identity.subject))
                .collect();
                
            if (remaining.length > 0) {
                await ctx.db.patch(remaining[0]._id, { isDefault: true });
            }
        }
    }
});

export const setDefaultAddress = mutation({
    args: {
        id: v.id("addresses"),
    },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) {
            throw new Error("Unauthenticated call to setDefaultAddress");
        }

        // Unset all existing defaults
        const existing = await ctx.db
            .query("addresses")
            .withIndex("by_user", (q) => q.eq("userId", identity.subject))
            .filter((q) => q.eq(q.field("isDefault"), true))
            .collect();
            
        for (const addr of existing) {
            await ctx.db.patch(addr._id, { isDefault: false });
        }

        // Set the new default
        const address = await ctx.db.get(args.id);
        if (!address || address.userId !== identity.subject) {
            throw new Error("Unauthorized or address not found");
        }
        
        await ctx.db.patch(args.id, { isDefault: true });
    }
});
