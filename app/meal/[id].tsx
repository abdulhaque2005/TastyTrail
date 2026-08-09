import { COLORS, SHADOWS } from "@/constant/Theme";
import { api } from "@/convex/_generated/api";
import { useAppstore } from "@/store/userAppstore";
import { useAuth } from "@clerk/clerk-expo";
import { useConvexAuth, useMutation, useQuery } from "convex/react";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useState, useRef } from "react";
import { View, Text, Pressable, ScrollView, ActivityIndicator, Alert, useWindowDimensions, NativeSyntheticEvent, NativeScrollEvent } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Image } from "expo-image";
import Animated, { FadeIn, FadeInDown, FadeInUp, StretchInY } from 'react-native-reanimated';
import { generatePrice } from "@/lib/pricing";
import { getMealById } from "@/services/mealsApi";
import { MealDetail } from "@/types/meals";
import { LinearGradient } from "expo-linear-gradient";

export default function MealDetailScreen() {
    const { id } = useLocalSearchParams();
    const { width } = useWindowDimensions();
    const insets = useSafeAreaInsets();
    
    const { isLoaded, isSignedIn } = useAuth();
    const { isAuthenticated } = useConvexAuth();
    const { setPendingAuthAction } = useAppstore(state => state);

    const [meal, setMeal] = useState<MealDetail | null>(null);
    const [loading, setLoading] = useState(true);
    const [addingToCart, setAddingToCart] = useState(false);
    const [isBuying, setIsBuying] = useState(false);
    const [quantity, setQuantity] = useState(1);
    const [activeTab, setActiveTab] = useState<'ingredients' | 'instructions' | 'reviews'>('ingredients');
    const [activeImageIndex, setActiveImageIndex] = useState(0);

    const addToCart = useMutation(api.cart.addToCart);
    const saveMeal = useMutation(api.savedMeals.saveMeal);
    
    const savedMeals = useQuery(api.savedMeals.getSavedMeals,
        isLoaded && isSignedIn && isAuthenticated ? {} : "skip"
    );
    const isSaved = savedMeals?.some(m => m.mealId === id) ?? false;
    
    const ratingData = useQuery(api.ratings.getMealRating, { mealId: id as string });

    useEffect(() => {
        if (!id) return;
        getMealById(id as string)
            .then(data => {
                setMeal(data);
                setLoading(false);
            })
            .catch(() => {
                setLoading(false);
                Alert.alert("Error", "Could not load meal details");
                router.back();
            });
    }, [id]);

    const handleBack = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        router.back();
    };

    const handleAddToCart = async () => {
        if (!meal) return;
        if (!isSignedIn) {
            setPendingAuthAction('add-to-cart');
            router.push('/auth/sign-in');
            return;
        }

        try {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            setAddingToCart(true);
            const price = generatePrice(meal.strCategory, meal.idMeal);
            
            await addToCart({
                mealId: meal.idMeal,
                name: meal.strMeal,
                imageUrl: meal.strMealThumb,
                price: price,
                quantity: quantity,
                category: meal.strCategory
            });
            
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            Alert.alert("Added to cart", `"${meal.strMeal}" x${quantity} added to cart.`);
        } catch (err) {
            Alert.alert("Error", "Could not add to cart");
        } finally {
            setAddingToCart(false);
        }
    };

    const handleBuyNow = async () => {
        if (!meal) return;
        if (!isSignedIn) {
            setPendingAuthAction('add-to-cart');
            router.push('/auth/sign-in');
            return;
        }

        try {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
            setIsBuying(true);
            const price = generatePrice(meal.strCategory, meal.idMeal);
            
            const itemStr = JSON.stringify([{
                mealId: meal.idMeal,
                name: meal.strMeal,
                imageUrl: meal.strMealThumb,
                price: price,
                quantity: quantity,
                category: meal.strCategory
            }]);
            
            router.push({ 
                pathname: '/checkout', 
                params: { 
                    type: 'direct', 
                    items: itemStr,
                    amount: price * quantity
                } 
            });
        } catch (err) {
            Alert.alert("Error", "Could not process request");
        } finally {
            setIsBuying(false);
        }
    };

    const handleSave = async () => {
        if (!meal || isSaved) return;
        if (!isSignedIn) {
            setPendingAuthAction('save-meal');
            router.push('/auth/sign-in');
            return;
        }
        
        try {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            await saveMeal({
                mealId: meal.idMeal,
                name: meal.strMeal,
                category: meal.strCategory,
                area: meal.strArea,
                imageUrl: meal.strMealThumb,
                source: 'api'
            });
        } catch (err) {
            Alert.alert("Error", "Could not save meal");
        }
    };

    const updateQuantity = (change: number) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setQuantity(prev => Math.max(1, Math.min(10, prev + change)));
    };

    const onScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
        const scrollPosition = event.nativeEvent.contentOffset.x;
        const index = Math.round(scrollPosition / width);
        if (index !== activeImageIndex) {
            setActiveImageIndex(index);
        }
    };

    if (loading || !meal) {
        return (
            <View style={{ flex: 1, backgroundColor: COLORS.background, justifyContent: 'center', alignItems: 'center' }}>
                <ActivityIndicator size="large" color={COLORS.primary} />
            </View>
        );
    }

    const price = generatePrice(meal.strCategory, meal.idMeal);
    
    // Extract ingredients
    const ingredients = [];
    for (let i = 1; i <= 20; i++) {
        const ing = meal[`strIngredient${i}` as keyof MealDetail];
        const measure = meal[`strMeasure${i}` as keyof MealDetail];
        if (ing && (ing as string).trim()) {
            ingredients.push({ name: ing, measure: measure });
        }
    }
    
    const shortDesc = meal.strInstructions.split('.')[0] + " and crafted to perfection with premium ingredients. A perfect choice for your cravings.";

    return (
        <View style={{ flex: 1, backgroundColor: COLORS.background }}>
            <ScrollView showsVerticalScrollIndicator={false} contentContainerClassName="pb-40" bounces={false}>
                
                {/* Premium Single Image */}
                <Animated.View entering={FadeIn.duration(600)} style={{ width, height: width * 1.1, position: 'relative' }}>
                    <Image
                        source={{ uri: meal.strMealThumb }}
                        style={{ width: '100%', height: '100%' }}
                        contentFit="cover"
                    />

                    {/* Gradient Overlay for Top/Bottom */}
                    <LinearGradient
                        colors={['rgba(0,0,0,0.6)', 'transparent', 'rgba(255,248,239,1)']}
                        locations={[0, 0.5, 1]}
                        style={{ position: 'absolute', width: '100%', height: '100%', pointerEvents: 'none' }}
                    />
                    
                    {/* Top Nav (Absolute inside image) */}
                    <View style={{ paddingTop: insets.top + 10 }} className="absolute left-0 right-0 z-10 flex-row items-center justify-between px-5">
                        <Pressable 
                            onPress={handleBack} 
                            className="h-11 w-11 items-center justify-center rounded-full bg-white/20"
                            style={{ backdropFilter: 'blur(10px)' }}
                        >
                            <Ionicons name="chevron-back" size={24} color="#fff" />
                        </Pressable>
                        <Pressable 
                            onPress={handleSave} 
                            className="h-11 w-11 items-center justify-center rounded-full bg-white/20"
                            style={{ backdropFilter: 'blur(10px)' }}
                        >
                            <Ionicons name={isSaved ? "heart" : "heart-outline"} size={22} color={isSaved ? "#ef4444" : "#fff"} />
                        </Pressable>
                    </View>
                    
                    {/* Bestseller Badge */}
                    <View className="absolute bottom-12 left-6 rounded-full bg-black/60 px-3 py-1.5" style={{ backdropFilter: 'blur(10px)' }}>
                        <View className="flex-row items-center gap-1.5">
                            <Ionicons name="medal" size={14} color="#f59e0b" />
                            <Text className="text-xs font-bold text-white uppercase tracking-wider">Bestseller</Text>
                        </View>
                    </View>
                </Animated.View>

                {/* Content Body */}
                <Animated.View 
                    entering={FadeInUp.duration(600).delay(100)}
                    className="flex-1 -mt-8 px-6 pt-2"
                >
                    {/* Title & Ratings Header */}
                    <View className="flex-row items-start justify-between">
                        <View className="flex-1 pr-4">
                            <Text className="text-3xl font-black tracking-tight text-[#1f2933]">
                                {meal.strMeal}
                            </Text>
                            <View className="mt-2 flex-row items-center gap-3">
                                <Text className="text-sm font-bold text-[#6b7280]">{meal.strCategory}</Text>
                                <View className="h-1 w-1 rounded-full bg-[#d1d5db]" />
                                <Text className="text-sm font-bold text-[#6b7280]">{meal.strArea}</Text>
                            </View>
                        </View>
                        
                        <View className="items-center rounded-2xl bg-[#fff8ef] p-2 border border-[#f3e7d8]" style={SHADOWS.soft}>
                            <View className="flex-row items-center gap-1 rounded-lg bg-[#22c55e] px-2 py-1">
                                <Text className="text-sm font-bold text-white">{ratingData?.average || 4.8}</Text>
                                <Ionicons name="star" size={12} color="#fff" />
                            </View>
                            <Text className="mt-1 text-[10px] font-bold text-[#9ca3af]">{ratingData?.count || 124} Ratings</Text>
                        </View>
                    </View>
                    
                    {/* Description */}
                    <Text className="mt-5 text-[15px] leading-6 text-[#4b5563]">
                        {shortDesc}
                    </Text>
                    
                    {/* Premium Quick Info Strip */}
                    <View className="mt-6 flex-row items-center justify-between rounded-3xl bg-white p-5 border border-[#f3e7d8]" style={SHADOWS.soft}>
                        <View className="flex-row items-center gap-3">
                            <View className="h-10 w-10 items-center justify-center rounded-full bg-[#fff8ef]">
                                <Ionicons name="time" size={20} color="#f97316" />
                            </View>
                            <View>
                                <Text className="text-[11px] font-bold uppercase text-[#9ca3af]">Prep Time</Text>
                                <Text className="text-sm font-bold text-[#1f2933]">30 mins</Text>
                            </View>
                        </View>
                        <View className="h-8 w-[1px] bg-[#f3e7d8]" />
                        <View className="flex-row items-center gap-3">
                            <View className="h-10 w-10 items-center justify-center rounded-full bg-[#fff8ef]">
                                <Ionicons name="flame" size={20} color="#f97316" />
                            </View>
                            <View>
                                <Text className="text-[11px] font-bold uppercase text-[#9ca3af]">Energy</Text>
                                <Text className="text-sm font-bold text-[#1f2933]">450 Kcal</Text>
                            </View>
                        </View>
                    </View>

                    {/* Custom Segmented Control */}
                    <View className="mt-8 flex-row rounded-2xl bg-[#f3e7d8] p-1">
                        {(['ingredients', 'instructions', 'reviews'] as const).map(tab => (
                            <Pressable 
                                key={tab} 
                                onPress={() => {
                                    Haptics.selectionAsync();
                                    setActiveTab(tab);
                                }}
                                className={`flex-1 items-center justify-center rounded-xl py-3 ${activeTab === tab ? 'bg-white shadow-sm' : ''}`}
                            >
                                <Text className={`text-[13px] font-black uppercase tracking-wider ${activeTab === tab ? 'text-[#f97316]' : 'text-[#6b7280]'}`}>
                                    {tab}
                                </Text>
                            </Pressable>
                        ))}
                    </View>

                    {/* Tab Content */}
                    <View className="mt-6 min-h-[300px]">
                        {activeTab === 'ingredients' && (
                            <Animated.View entering={FadeIn.duration(400)}>
                                <View className="rounded-3xl bg-white p-5 border border-[#f3e7d8]" style={SHADOWS.soft}>
                                    {ingredients.map((ing, i) => (
                                        <View key={i} className={`flex-row items-center justify-between py-2 ${i !== ingredients.length - 1 ? 'border-b border-[#f3e7d8]' : ''}`}>
                                            <View className="flex-row items-center gap-3">
                                                <View className="h-8 w-8 items-center justify-center rounded-full bg-[#fff8ef]">
                                                    <Ionicons name="nutrition" size={16} color="#f97316" />
                                                </View>
                                                <Text className="text-[15px] font-bold text-[#1f2933]">{ing.name}</Text>
                                            </View>
                                            <Text className="text-[14px] font-black text-[#6b7280]">{ing.measure}</Text>
                                        </View>
                                    ))}
                                </View>
                            </Animated.View>
                        )}
                        
                        {activeTab === 'instructions' && (
                            <Animated.View entering={FadeIn.duration(400)}>
                                <View className="rounded-3xl bg-white p-6 border border-[#f3e7d8]" style={SHADOWS.soft}>
                                    <Text className="text-[15px] leading-7 text-[#4b5563]">
                                        {meal.strInstructions.replace(/\r\n/g, '\n\n')}
                                    </Text>
                                </View>
                            </Animated.View>
                        )}
                        
                        {activeTab === 'reviews' && (
                            <Animated.View entering={FadeIn.duration(400)} className="items-center rounded-3xl bg-white p-8 border border-[#f3e7d8]" style={SHADOWS.soft}>
                                <Ionicons name="star" size={48} color="#f59e0b" />
                                <Text className="mt-4 text-center text-[15px] font-semibold text-[#6b7280]">
                                    Order this meal to leave the first review!
                                </Text>
                            </Animated.View>
                        )}
                    </View>
                </Animated.View>
            </ScrollView>

            {/* Docked Bottom Bar (Zomato/Swiggy Style) */}
            <View className="absolute bottom-0 left-0 right-0 bg-white border-t border-[#f3e7d8]" style={{ paddingBottom: Math.max(insets.bottom, 16), paddingTop: 16, paddingHorizontal: 20, shadowColor: '#000', shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.05, shadowRadius: 10, elevation: 20 }}>
                <View className="flex-row items-center justify-between">
                    
                    {/* Price & Quantity Left Side */}
                    <View className="flex-row items-center gap-4">
                        <View>
                            <Text className="text-[12px] font-bold uppercase text-[#9ca3af] mb-1">Total</Text>
                            <Text className="text-xl font-black text-[#1f2933]">₹{price * quantity}</Text>
                        </View>
                        
                        <View className="h-10 w-[1px] bg-[#f3e7d8]" />
                        
                        {/* Zomato style quantity selector */}
                        <View className="flex-row items-center rounded-xl border border-[#f97316] bg-[#fff8ef] px-2 py-1.5">
                            <Pressable onPress={() => updateQuantity(-1)} className="px-2 active:opacity-50">
                                <Ionicons name="remove" size={16} color="#f97316" />
                            </Pressable>
                            <Text className="w-6 text-center text-[15px] font-black text-[#f97316]">{quantity}</Text>
                            <Pressable onPress={() => updateQuantity(1)} className="px-2 active:opacity-50">
                                <Ionicons name="add" size={16} color="#f97316" />
                            </Pressable>
                        </View>
                    </View>

                    {/* Add to Cart Right Side */}
                    <View className="flex-row gap-3">
                        <Pressable
                            onPress={handleAddToCart}
                            disabled={addingToCart}
                            className="flex-row items-center justify-center gap-2 rounded-2xl bg-[#fff8ef] border border-[#f97316] px-5 py-4 active:bg-[#ffedd5]"
                        >
                            {addingToCart ? (
                                <ActivityIndicator color="#f97316" size="small" />
                            ) : (
                                <Ionicons name="cart-outline" size={20} color="#f97316" />
                            )}
                        </Pressable>
                        <Pressable
                            onPress={handleBuyNow}
                            disabled={isBuying}
                            className="flex-row items-center justify-center gap-2 rounded-2xl bg-[#f97316] px-6 py-4 active:bg-[#ea580c]"
                            style={SHADOWS.glow}
                        >
                            {isBuying ? (
                                <ActivityIndicator color="#fff" size="small" />
                            ) : (
                                <>
                                    <Ionicons name="flash" size={18} color="#fff" />
                                    <Text className="text-[16px] font-black text-white tracking-wide">Buy Now</Text>
                                </>
                            )}
                        </Pressable>
                    </View>
                </View>
            </View>
        </View>
    );
}
