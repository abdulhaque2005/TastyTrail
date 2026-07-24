import { SafeAreaProvider } from "react-native-safe-area-context";
import "../global.css";
import { Stack } from "expo-router";

import { ClerkProvider, useAuth } from "@clerk/clerk-expo";
import { ConvexReactClient } from "convex/react";
import { ConvexProviderWithClerk } from "convex/react-clerk";
import { StatusBar } from "expo-status-bar";
import React from "react";

const publicKey = process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY!;
const convexUrl = process.env.EXPO_PUBLIC_CONVEX_URL!;

if (!publicKey) {
  throw new Error("Publishable key not found");
}

if (!convexUrl) {
  throw new Error("Convex URL not found");
}

const convex = new ConvexReactClient(convexUrl, {
  unsavedChangesWarning: false,
});

function ConvexClerkProvider({
  children,
}: {
  children: React.ReactNode;
}) 


{
  const { sessionId } = useAuth();

  return (
    <ConvexProviderWithClerk
      key={sessionId || "signed-out"}
      client={convex}
      useAuth={useAuth}
    >
      {children}
    </ConvexProviderWithClerk>
  );
}

import { tokenCache } from "../lib/cache";

export default function Layout() {
  return (
    <SafeAreaProvider>
      <ClerkProvider publishableKey={publicKey} tokenCache={tokenCache}>
        <ConvexClerkProvider>
          <StatusBar  style="dark"/>
          <Stack  screenOptions={{
            headerShown:false,
            contentStyle:{
              backgroundColor:"#fff8ef"
            }
          }} />
        </ConvexClerkProvider>
      </ClerkProvider>
    </SafeAreaProvider>
  );
}