import { v } from 'convex/values'
import { mutation, query } from './_generated/server'

// Place an order (from cart items) with an immutable delivery snapshot
export const placeOrder = mutation({
    args: {
        items: v.array(v.object({
            mealId: v.string(),
            name: v.string(),
            imageUrl: v.optional(v.string()),
            price: v.number(),
            quantity: v.number(),
            category: v.optional(v.string()),
        })),
        totalAmount: v.number(),
        paymentMethod: v.optional(v.string()),
        delivery: v.object({
            fullAddress: v.string(),
            buildingName: v.optional(v.string()),
            floor: v.optional(v.string()),
            roomNumber: v.optional(v.string()),
            deliveryType: v.optional(v.string()),
            deliveryNote: v.optional(v.string()),
            phone: v.optional(v.string()),
            latitude: v.optional(v.number()),
            longitude: v.optional(v.number()),
            landmarkPhotos: v.optional(v.array(v.string())),
        }),
    },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) throw new Error("Not logged in");
        const userId = identity.subject;

        if (args.items.length === 0) throw new Error("Cart is empty");

        const orderedAt = Date.now();

        // Initial timeline entry
        const timeline = [{
            status: "pending_payment", // Or confirmed depending on logic
            timestamp: orderedAt,
            description: "Order placed successfully",
            updatedBy: "system",
        }];

        const orderId = await ctx.db.insert("orders", {
            userId,
            items: args.items,
            totalAmount: args.totalAmount,
            paymentMethod: args.paymentMethod,
            orderedAt,
            delivery: args.delivery,
            status: args.paymentMethod === 'COD' ? "confirmed" : "pending_payment",
            timeline,
        });

        // If COD, add 'confirmed' to timeline immediately
        if (args.paymentMethod === 'COD') {
            await ctx.db.patch(orderId, {
                timeline: [
                    ...timeline,
                    {
                        status: "confirmed",
                        timestamp: orderedAt + 1000,
                        description: "Order confirmed",
                        updatedBy: "system",
                    }
                ]
            });
        }

        return { orderId, success: true };
    },
});

// Get user's orders
export const getOrders = query({
    args: {},
    handler: async (ctx) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) return [];
        
        return await ctx.db.query("orders")
            .withIndex("by_user", (q) => q.eq("userId", identity.subject))
            .order("desc")
            .collect();
    },
});

// Get a specific order by ID
export const getOrder = query({
    args: {
        orderId: v.id("orders"),
    },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) return null;

        const order = await ctx.db.get(args.orderId);
        
        if (!order || order.userId !== identity.subject) {
            return null; // Ensure users can only see their own orders
        }

        return order;
    },
});

// Mock update for testing ecosystem lifecycle (In real app, this is called by Restaurant/Rider panels)
export const updateOrderStatus = mutation({
    args: {
        orderId: v.id("orders"),
        status: v.string(),
        description: v.optional(v.string()),
        updatedBy: v.string(), // 'restaurant' or 'rider'
    },
    handler: async (ctx, args) => {
        const order = await ctx.db.get(args.orderId);
        if (!order) throw new Error("Order not found");

        const newTimelineEntry = {
            status: args.status,
            timestamp: Date.now(),
            description: args.description,
            updatedBy: args.updatedBy,
        };

        const updatedTimeline = order.timeline ? [...order.timeline, newTimelineEntry] : [newTimelineEntry];

        await ctx.db.patch(args.orderId, {
            status: args.status,
            timeline: updatedTimeline,
        });

        return { success: true };
    },
});
