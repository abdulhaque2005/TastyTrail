import { COLORS, SHADOWS } from "@/constant/Theme";
import { ChevronLeft, Columns, Search } from "lucide-react-native";
import { View, Text, Pressable, ScrollView, TextInput, ActivityIndicator, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import *as Haptics from 'expo-haptics'
import { router } from "expo-router";
import { Meal_cat } from "@/constant/category";
import { useCallback, useEffect, useMemo, useState } from "react";
import { MealListItem, MealListItemResponse } from "@/types/meals";
import { Image } from "expo-image";
import { getMealsByCategory, searchMealsByName } from "@/services/mealsApi";
import { useAppstore } from "@/store/userAppstore";
import { AuthLoading, useConvexAuth, useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useAuth } from "@clerk/clerk-expo";



export default function DiscoverScreen() {

    const [isSelected, setSelected] = useState("Chicken");
    const [SearchQuary, setSearchQuary] = useState("");
    const [loading, setloading] = useState(false);
    const [meals, setMeals] = useState<MealListItem[]>([]);
    const [save, setSave] = useState<string | null>(null);
    const { isLoaded, isSignedIn } = useAuth();
    const { isAuthenticated, isLoading: isConvexAuthLoading } = useConvexAuth();
    const { setPendingAuthAction } = useAppstore(state => state)
    const saveMeal = useMutation(api.savedMeals.saveMeal)
    const savedMeals = useQuery(api.savedMeals.getSavedMeals,
        isLoaded && isSignedIn && isAuthenticated ? {} : "skip"
    );
    const savedMealIds = useMemo(() =>
        new Set(savedMeals?.map((meal) => meal.mealId) ?? [])
        , [savedMeals])

    const LoadMeals = useCallback(async (c: string) => {
        setloading(true)
        const data = await getMealsByCategory(c).catch(() => [])
        setMeals(data)
        console.log("Category:", c);
        console.log("Meals:", data);
        setloading(false)
    }, [])

    const isSearching = SearchQuary.trim().length > 0;

    const runSearch = useCallback(async (query: string) => {
        setloading(true)
        const data = await searchMealsByName(query).catch(() => [])
        setMeals(data)
        setloading(false)
    }, [])

    useEffect(() => {
        if (isSearching) return;
        LoadMeals(isSelected);

    }, [isSelected, isSearching,])

    useEffect(() => {
        const query = SearchQuary.trim();
        if (!query) {
            return;
        }

        const timer = setTimeout(() => {
            runSearch(query)
        }, 400)
        return () => clearTimeout(timer);

    }, [SearchQuary, runSearch])

    const handleBack = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
        if (router.canGoBack()) {
            router.back();
        }
        else {
            router.replace('/');
        }
    }

    const handleSave = (meal: MealListItem) => {
        if (savedMealIds.has(meal.idMeal)) return;
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
        if (!isLoaded || !isSignedIn) {
            setPendingAuthAction('save-meal')
            router.push('/auth/sign-in')
        }
        if (isConvexAuthLoading || !isAuthenticated) {
            Alert.alert("Connecting account", "Your session is still loading,Please wait")
            return
        }

        try {
      setSave(meal.idMeal);
      const result = saveMeal({
        mealId:meal.idMeal,
        name:meal.strMeal,
        category:meal.strCategory ??isSelected ,
        area:meal.strArea ?? undefined,
        imageUrl:meal.strMealThumb ?? undefined,
        source:'api'
      })
        }
        catch (err) {
            Alert.alert("Error", err instanceof Error ? err.message :"Could not save")
        }
        finally {
            setSave(null)
        }

    }
    const handleCatogry = (cat: string) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setSearchQuary("");
        setSelected(cat);
    }
    return <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.background }}>

        <View className="px-4 pt-1 ">
            <Pressable onPress={handleBack} className="flex-row items-center gap-1 self-start rounded-full px-3 py-2 active:opacity-90">
                <ChevronLeft size={22} color={COLORS.text} strokeWidth={2.5} />
                <Text>Back</Text>
            </Pressable>
        </View>
        <ScrollView className="flex-1 " contentContainerClassName="px-6 pb-10" showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" >
            <Text className="mt-2 text-3xl font-bold text-[#1f2933] ">Discover Meals</Text>



            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerClassName="mt-6 gap-2">
                {
                    Meal_cat.map((c) => {
                        const isSelectedcat = c === isSelected;
                        return <Pressable onPress={() => handleCatogry(c)} key={c} className={
                            isSelectedcat ? "rounded-full bg-[#f97316] px-5 py-2.5 active:opacity-85" : "rounded-full border border-[#f3e7d8] bg-white px-5 py-2 opacity-75 "
                        }
                            style={!isSelectedcat ? SHADOWS.soft : undefined}
                        >
                            <Text className={isSelectedcat ? "text-sm font-semibold text-white" : "text-sm font-medium text-black"}>{c}</Text>
                        </Pressable>
                    })
                }
            </ScrollView>
            <View className="mt-4 flex-row items-center gap-3 rounded-2xl bg-white " >
                <Search size={20} color={COLORS.muted} strokeWidth={2.5} />
                <TextInput value={SearchQuary}
                    onChangeText={setSearchQuary}
                    placeholder="Search meals by name..."
                    placeholderTextColor="#9ca3af"
                    className="flex-1 text-base text-black"
                    returnKeyType="search"
                    autoCorrect={false}
                />
            </View>

            {
                loading ?
                    <View className="mt-15 items-center">
                        <ActivityIndicator size="large" color={COLORS.primary} />
                        <Text>
                            {isSearching ? "Searching meals ..." : "Loading meals..."}

                        </Text>
                    </View>
                    : null
            }

            {
                !loading && meals.length === 0 ?
                    (
                        <View className="mt-8 items-center rounded-3xl bg-white p-6 " style={SHADOWS.soft}>
                            <Text className="text-lg font-bold text-[#1f2933] ">No meals found</Text>
                        </View>
                    )
                    : null

            }

            {

                !loading && meals.length > 0 ?
                    (
                        <View className="mt-6 gap-4 ">

                            {meals.map(m => {
                                const isSaved = savedMealIds.has(m.idMeal);
                                const isSaving = save === m.idMeal
                                return <View key={m.idMeal} className="overflow-hidden rounded-3xl bg-white" style={SHADOWS.soft}>
                                    <Image
                                        source={{ uri: m.strMealThumb }}
                                        style={{ width: "100%", height: 200 }}
                                        contentFit="cover"
                                        transition={200}
                                    />
                                    <View className="p-5" >
                                        <View className="self-start rounded-full bg-[#ffedd5]">
                                            <Text className="text-xs font-semibold text-[#f97316]">{m.strCategory ?? isSelected}</Text>
                                        </View>
                                        <Text className="mt-2 text-lg font-bold text-white " numberOfLines={2}>{m.strMeal}</Text>
                                        <Pressable onPress={() => handleSave(m)} disabled={isSaved || isSaving || (isSignedIn && (isConvexAuthLoading || !isAuthenticated))} className={`mt-4 flex-row justify-center gap-2 rounded-2xl py-3 active:opacity-85
                                             ${isSaved ? "bg-[#22c55e]" : "bg-[#f97316]"
                                            }
                                            
                                            `}>
                                            <Text className="text-sm font-bold text-white">
                                                {
                                                    isSaved ? "Saved" : isSaving ? "Saving..." : isSignedIn && (isConvexAuthLoading || !isAuthenticated
                                                    ) ? "Connecting..." : "Save Meal"
                                                }
                                            </Text>
                                        </Pressable>
                                    </View>

                                </View>

                            })


                            }




                        </View>
                    )
                    :
                    null
            }


        </ScrollView>

    </SafeAreaView>
}