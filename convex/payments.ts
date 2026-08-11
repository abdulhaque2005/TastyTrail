"use node";

import { v } from "convex/values";
import { action } from "./_generated/server";
import Stripe from "stripe";

// We instantiate Stripe lazily inside the action to avoid Convex deploy-time errors
// if the environment variable is not set.

export const createPaymentIntent = action({
  args: {
    amount: v.number(), // Amount in INR (e.g., 500 for ₹500)
    currency: v.optional(v.string()), // Defaults to INR
    orderId: v.optional(v.string()), // Optional metadata
  },
  handler: async (ctx, args) => {
    const secretKey = process.env.STRIPE_SECRET_KEY;
    if (!secretKey || secretKey.startsWith("sk_test_YOUR_STRIPE") || secretKey === "") {
      throw new Error("Stripe is not configured. Please use Cash on Delivery (COD) or Wallet for testing.");
    }

    const stripe = new Stripe(secretKey, {
      apiVersion: "2026-07-29.dahlia" as any,
    });
    
    // 1. Verify user is authenticated
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Unauthenticated user cannot create payment intent");
    }

    try {
      // 2. Convert to the smallest currency unit (paise for INR)
      const amountInSmallestUnit = Math.round(args.amount * 100);

      // 3. Create a PaymentIntent with the order amount and currency
      const paymentIntent = await stripe.paymentIntents.create({
        amount: amountInSmallestUnit,
        currency: args.currency || "inr",
        metadata: {
          userId: identity.subject,
          orderId: args.orderId || "unknown",
        },
        // In India, automatic_payment_methods requires specific configurations
        // but for a general demo, enabling them is fine.
        automatic_payment_methods: {
          enabled: true,
        },
      });

      // 4. Return the client secret to the frontend
      return {
        clientSecret: paymentIntent.client_secret,
        id: paymentIntent.id,
      };
    } catch (error: any) {
      console.error("Stripe Error:", error);
      throw new Error(`Failed to create payment intent: ${error.message}`);
    }
  },
});
