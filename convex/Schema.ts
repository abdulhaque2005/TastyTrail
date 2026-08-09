import { defineSchema, defineTable } from 'convex/server'
import { v } from 'convex/values'

export default defineSchema({
    savedMeals: defineTable({
        userId: v.string(),
        mealId: v.string(),
        name: v.string(),
        category: v.optional(v.string()),
        area: v.optional(v.string()),
        imageUrl: v.optional(v.string()),
        source: v.optional(v.string()),
        createdAt: v.number()
    })
        .index("by_user", ["userId"])
        .index("by_user_meal", ["userId", "mealId"]),

    cart: defineTable({
        userId: v.string(),
        mealId: v.string(),
        name: v.string(),
        imageUrl: v.optional(v.string()),
        price: v.number(),
        quantity: v.number(),
        category: v.optional(v.string()),
    })
        .index("by_user", ["userId"])
        .index("by_user_meal", ["userId", "mealId"]),

    orders: defineTable({
        userId: v.string(),
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
        orderedAt: v.number(),
        
        // IMMUTABLE DELIVERY SNAPSHOT
        delivery: v.optional(v.object({
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
        })),

        // ECOSYSTEM STATE
        status: v.string(), // pending_payment, confirmed, accepted, preparing, ready, rider_assigned, picked_up, out_for_delivery, nearby, delivered
        
        timeline: v.optional(v.array(v.object({
            status: v.string(),
            timestamp: v.number(),
            description: v.optional(v.string()),
            updatedBy: v.optional(v.string()), // 'system', 'restaurant', 'rider'
        }))),

        // RIDER DATA
        rider: v.optional(v.object({
            id: v.string(),
            name: v.string(),
            phone: v.string(),
            photo: v.optional(v.string()),
            vehicle: v.optional(v.string()),
            eta: v.optional(v.number()),
            currentLocation: v.optional(v.object({ lat: v.number(), lng: v.number() })),
        })),

        // DELIVERY PROOF
        deliveryProof: v.optional(v.object({
            photo: v.optional(v.string()),
            deliveredAt: v.optional(v.number()),
            gpsVerified: v.optional(v.boolean()),
        })),
    })
        .index("by_user", ["userId"]),

    ratings: defineTable({
        userId: v.string(),
        mealId: v.string(),
        rating: v.number(),
        review: v.optional(v.string()),
        createdAt: v.number(),
    })
        .index("by_meal", ["mealId"])
        .index("by_user_meal", ["userId", "mealId"]),

    userProfiles: defineTable({
        userId: v.string(),
        displayName: v.optional(v.string()),
        profileImage: v.optional(v.string()),
        phone: v.optional(v.string()),
    })
        .index("by_user", ["userId"]),

    addresses: defineTable({
        userId: v.string(),
        type: v.string(), // e.g. "Home", "Work", etc.
        deliveryType: v.optional(v.string()), // e.g. "Apartment", "Hostel", "Main Gate"
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
        createdAt: v.number(),
    })
        .index("by_user", ["userId"]),
})