import { COLORS, SHADOWS } from "@/constant/Theme";
import { api } from "@/convex/_generated/api";
import { useAppstore } from "@/store/userAppstore";
import { useAuth } from "@clerk/clerk-expo";
import { useConvexAuth, useMutation, useQuery } from "convex/react";
import { Redirect, useRouter } from "expo-router";
import { useState } from "react";
import { View, Text, Pressable, ScrollView, ActivityIndicator, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { ChevronLeft, Trash2, Heart, ShoppingCart } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { Image } from "expo-image";
import { Id } from "@/convex/_generated/dataModel";
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { generatePrice } from "@/lib/pricing";

export default function SavedScreen() {
    const { isLoaded, isSignedIn } = useAuth();
    const { isAuthenticated } = useConvexAuth();
    const router = useRouter();

    const SavedMeals = useQuery(
        api.savedMeals.getSavedMeals,
        isLoaded && isSignedIn && isAuthenticated ? {} : "skip",
    );

    const deleteMeals = useMutation(api.savedMeals.deleteMeal);
    const addToCart = useMutation(api.cart.addToCart);
    const [deleteId, setDeleteId] = useState<string | null>(null);
    const [addingToCart, setAddingToCart] = useState<string | null>(null);

    if (!isSignedIn) {
        return <Redirect href={'/auth/sign-in'} />
    }

    const handleBack = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        if (router.canGoBack()) {
            router.back();
        } else {
            router.replace('/');
        }
    };

    const handleDelete = (id: Id<"savedMeals">, name: string) => {
        Alert.alert(
            "Remove saved meal?",
            `"${name}" will be removed from your saved list`,
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Remove",
                    style: "destructive",
                    onPress: async () => {
                        try {
                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                            setDeleteId(id);
                            await deleteMeals({ id });
                        } catch (err) {
                            Alert.alert("Error", err instanceof Error ? err.message : "Could not delete");
                        } finally {
                            setDeleteId(null);
                        }
                    }
                }
            ]
        );
    };

    const handleAddToCart = async (meal: any) => {
        try {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            setAddingToCart(meal._id);
            const price = generatePrice(meal.category, meal.mealId);
            
            await addToCart({
                mealId: meal.mealId,
                name: meal.name,
                imageUrl: meal.imageUrl,
                price: price,
                quantity: 1,
                category: meal.category
            });
            Alert.alert("Added to cart", `"${meal.name}" has been added to your cart.`);
        } catch (err) {
            Alert.alert("Error", "Could not add to cart");
        } finally {
            setAddingToCart(null);
        }
    };

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.background }}>

            {/* Back Button */}
            <View className="px-4 pt-1">
                <Pressable onPress={handleBack} className="flex-row items-center gap-1 self-start rounded-full px-3 py-2 active:opacity-90">
                    <ChevronLeft size={22} color={COLORS.text} strokeWidth={2.5} />
                    <Text className="text-base font-medium text-[#1f2933]">Back</Text>
                </Pressable>
            </View>

            <ScrollView className="flex-1" contentContainerClassName="px-6 pb-10" showsVerticalScrollIndicator={false}>

                {/* Title */}
                <Animated.View entering={FadeInDown.duration(500)}>
                    <Text className="mt-2 text-3xl font-bold text-[#1f2933]">Saved Meals</Text>
                    {SavedMeals && SavedMeals.length > 0 ? (
                        <Text className="mt-1 text-sm text-[#6b7280]">{SavedMeals.length} meal{SavedMeals.length > 1 ? 's' : ''} saved</Text>
                    ) : null}
                </Animated.View>

                {/* Loading */}
                {
                    SavedMeals === undefined ?
                        <View className="mt-16 items-center">
                            <ActivityIndicator size="large" color={COLORS.primary} />
                            <Text className="mt-4 text-sm font-medium text-[#6b7280]">Loading saved meals...</Text>
                        </View>

                        : SavedMeals.length === 0 ?

                            /* Empty State */
                            <Animated.View entering={FadeInUp.duration(500)} className="mt-12 items-center rounded-3xl bg-white p-8" style={SHADOWS.medium}>
                                <View className="h-20 w-20 items-center justify-center rounded-full bg-[#ffedd5]">
                                    <Heart size={36} color={COLORS.primary} strokeWidth={2} />
                                </View>
                                <Text className="mt-5 text-xl font-bold text-[#1f2933]">No saved meals yet</Text>
                                <Text className="mt-2 text-center text-sm leading-5 text-[#6b7280]">
                                    Discover meals and tap &quot;Save&quot; to{"\n"}add them to your collection
                                </Text>
                                <Pressable
                                    onPress={() => router.push('/(tabs)')}
                                    className="mt-6 rounded-full bg-[#f97316] px-6 py-3 active:opacity-90"
                                    style={SHADOWS.glow}
                                >
                                    <Text className="text-sm font-bold text-white">Explore Meals</Text>
                                </Pressable>
                            </Animated.View>

                            :
                            /* Meal Cards */
                            <View className="mt-4 gap-4">
                                {
                                    SavedMeals.map((m, index) => {
                                        const isDeleting = deleteId === m._id;
                                        const isAdding = addingToCart === m._id;
                                        const price = generatePrice(m.category, m.mealId);
                                        
                                        return <View
                                            key={m._id}
                                            className="overflow-hidden rounded-3xl bg-white"
                                            style={SHADOWS.medium}
                                        >
                                            <Pressable onPress={() => router.push(`/meal/${m.mealId}`)}>
                                                <Image
                                                    source={{ uri: m.imageUrl }}
                                                    style={{ width: "100%", height: 200 }}
                                                    contentFit="cover"
                                                    transition={300}
                                                />
                                                <View className="p-5">
                                                    <View className="flex-row items-center justify-between">
                                                        <View className="flex-row items-center gap-2">
                                                            <View className="rounded-full bg-[#ffedd5] px-3 py-1">
                                                                <Text className="text-xs font-semibold text-[#f97316]">{m.category}</Text>
                                                            </View>
                                                        </View>
                                                        <Text className="text-lg font-extrabold text-[#f97316]">₹{price}</Text>
                                                    </View>

                                                    <Text className="mt-3 text-lg font-bold text-[#1f2933]">{m.name}</Text>

                                                    <View className="mt-4 flex-row gap-3">
                                                        <Pressable
                                                            onPress={() => handleDelete(m._id, m.name)}
                                                            disabled={isDeleting || isAdding}
                                                            className="flex-1 items-center justify-center rounded-2xl border border-[#fecaca] bg-[#fef2f2] py-3.5 active:opacity-85 disabled:opacity-45"
                                                        >
                                                            {isDeleting ? (
                                                                <ActivityIndicator size={18} color={COLORS.danger} />
                                                            ) : (
                                                                <Trash2 size={20} color={COLORS.danger} strokeWidth={2} />
                                                            )}
                                                        </Pressable>
                                                        
                                                        <Pressable
                                                            onPress={() => handleAddToCart(m)}
                                                            disabled={isDeleting || isAdding}
                                                            className="flex-[3] flex-row items-center justify-center gap-2 rounded-2xl bg-[#f97316] py-3.5 active:opacity-85 disabled:opacity-45"
                                                            style={SHADOWS.glow}
                                                        >
                                                            {isAdding ? (
                                                                <ActivityIndicator size={18} color="#fff" />
                                                            ) : (
                                                                <>
                                                                    <ShoppingCart size={18} color="#fff" strokeWidth={2.5} />
                                                                    <Text className="text-sm font-bold text-white">Add to Cart</Text>
                                                                </>
                                                            )}
                                                        </Pressable>
                                                    </View>
                                                </View>
                                            </Pressable>
                                        </View>
                                    })
                                }
                            </View>
                }
            </ScrollView>

        </SafeAreaView>
    );
}