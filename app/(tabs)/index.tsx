import React, { useCallback, useEffect, useMemo, useState, useRef } from "react";
import { View, Text, Pressable, ScrollView, TextInput, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import * as Haptics from 'expo-haptics';
import { Image } from "expo-image";
import { Sparkles, MapPin, ShoppingCart, Star, Bell, SlidersHorizontal, ChevronDown, Heart, Package, Clock } from "lucide-react-native";
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { LinearGradient } from "expo-linear-gradient";
import { useAuth, useUser } from "@clerk/clerk-expo";
import { useConvexAuth, useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import * as Location from 'expo-location';

import { Meal_cat } from "@/constant/category";
import { MealListItem } from "@/types/meals";
import { getMealsByCategory, searchMealsByName } from "@/services/mealsApi";
import { generatePrice } from "@/lib/pricing";
import { COLORS, SHADOWS } from "@/constant/Theme";

export default function NextGenHomeScreen() {
    const { user } = useUser();
    const { isLoaded, isSignedIn } = useAuth();
    const { isAuthenticated } = useConvexAuth();

    const [isSelected, setSelected] = useState("Chicken");
    const [searchQuery, setSearchQuery] = useState("");
    const [loading, setLoading] = useState(true);
    const [meals, setMeals] = useState<MealListItem[]>([]);
    const [aiThinking, setAiThinking] = useState(false);
    const hasAutoDetected = useRef(false);

    // --- Convex queries ---
    const savedMeals = useQuery(api.savedMeals.getSavedMeals,
        isLoaded && isSignedIn && isAuthenticated ? {} : "skip"
    );
    const savedMealIds = useMemo(() => new Set(savedMeals?.map(m => m.mealId) ?? []), [savedMeals]);
        
    const cartItems = useQuery(api.cart.getCart,
        isLoaded && isSignedIn && isAuthenticated ? {} : "skip"
    );
    const cartCount = cartItems?.reduce((sum, item) => sum + item.quantity, 0) || 0;

    const defaultAddress = useQuery(
        api.addresses.getDefaultAddress,
        isLoaded && isSignedIn && isAuthenticated ? {} : "skip"
    );
    const addAddress = useMutation(api.addresses.addAddress);

    const allOrders = useQuery(
        api.orders.getOrders,
        isLoaded && isSignedIn && isAuthenticated ? {} : "skip"
    );
    const activeOrders = useMemo(() => {
        if (!allOrders) return [];
        return allOrders.filter(o => o.status !== 'delivered').slice(0, 3);
    }, [allOrders]);

    // Auto-detect location & save to Convex if user has no addresses
    useEffect(() => {
        if (!isAuthenticated || hasAutoDetected.current) return;
        // Wait for defaultAddress query to resolve (not undefined)
        if (defaultAddress === undefined) return;
        // If user already has an address, skip
        if (defaultAddress !== null) {
            hasAutoDetected.current = true;
            return;
        }

        hasAutoDetected.current = true;

        (async () => {
            try {
                const { status } = await Location.requestForegroundPermissionsAsync();
                if (status !== 'granted') return;

                const location = await Location.getCurrentPositionAsync({
                    accuracy: Location.Accuracy.Balanced,
                });

                const geocode = await Location.reverseGeocodeAsync({
                    latitude: location.coords.latitude,
                    longitude: location.coords.longitude,
                });

                let addressStr = 'Current Location';
                if (geocode && geocode.length > 0) {
                    const r = geocode[0];
                    const parts = [r.name, r.street, r.district, r.city, r.region, r.postalCode].filter(Boolean);
                    const unique = [...new Set(parts)];
                    addressStr = unique.join(', ') || 'Current Location';
                }

                // Auto-save as default address in Convex
                await addAddress({
                    type: 'Home',
                    fullAddress: addressStr,
                    phone: user?.primaryPhoneNumber?.phoneNumber || '',
                    isDefault: true,
                    latitude: location.coords.latitude,
                    longitude: location.coords.longitude,
                });
            } catch (err) {
                console.log('Auto-detect location error:', err);
            }
        })();
    }, [isAuthenticated, defaultAddress, addAddress, user]);

    const loadMeals = useCallback(async (cat: string) => {
        setLoading(true);
        const data = await getMealsByCategory(cat).catch(() => []);
        setMeals(data);
        setLoading(false);
    }, []);

    const runSearch = useCallback(async (query: string) => {
        setLoading(true);
        setAiThinking(true);
        
        // Simulate AI search delay
        setTimeout(async () => {
            const data = await searchMealsByName(query).catch(() => []);
            setMeals(data);
            setAiThinking(false);
            setLoading(false);
        }, 800);
    }, []);

    useEffect(() => {
        if (searchQuery.trim().length > 0) return;
        loadMeals(isSelected);
    }, [isSelected, searchQuery]);

    useEffect(() => {
        const query = searchQuery.trim();
        if (!query) return;
        const timer = setTimeout(() => {
            runSearch(query);
        }, 500);
        return () => clearTimeout(timer);
    }, [searchQuery, runSearch]);

    const handleCategory = (cat: string) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setSearchQuery("");
        setSelected(cat);
    };

    const isSearching = searchQuery.trim().length > 0;

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: '#f8fafc' }} edges={['top']}>
            
            {/* Header V2 - Premium Glassmorphism */}
            <View className="px-5 pt-2 pb-4 z-10 bg-white shadow-sm" style={{ shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.03, shadowRadius: 10, elevation: 2 }}>
                <View className="flex-row items-center justify-between mb-4">
                        <Pressable 
                            onPress={() => router.push('/profile/addresses')}
                            className="flex-row items-center gap-3"
                        >
                            <Pressable onPress={() => router.push('/(tabs)/profile')} className="h-11 w-11 rounded-full overflow-hidden border-2 border-white" style={SHADOWS.soft}>
                                {user?.imageUrl ? (
                                    <Image source={{ uri: user.imageUrl }} style={{ width: '100%', height: '100%' }} />
                                ) : (
                                    <View className="bg-gray-200 h-full w-full" />
                                )}
                            </Pressable>
                            <View>
                                <Text className="text-[12px] font-bold text-gray-400 uppercase tracking-wider">Deliver to</Text>
                                <View className="flex-row items-center gap-1">
                                    <MapPin size={14} color="#f97316" strokeWidth={2.5} />
                                    <Text className="text-[15px] font-black text-gray-800 max-w-[180px]" numberOfLines={1}>
                                        {defaultAddress ? `${defaultAddress.type} • ${defaultAddress.fullAddress.split(',')[0]}` : 'Set location'}
                                    </Text>
                                    <ChevronDown size={14} color="#9ca3af" />
                                </View>
                            </View>
                        </Pressable>
                    
                    <View className="flex-row items-center gap-3">
                        <Pressable className="h-10 w-10 items-center justify-center rounded-full bg-gray-50 border border-gray-100">
                            <Bell size={20} color="#1f2933" />
                        </Pressable>
                        <Pressable 
                            onPress={() => router.push('/cart')}
                            className="h-10 w-10 items-center justify-center rounded-full bg-orange-50 border border-orange-100 relative"
                        >
                            <ShoppingCart size={20} color="#f97316" />
                            {cartCount > 0 && (
                                <View className="absolute -top-1 -right-1 h-5 w-5 bg-red-500 rounded-full items-center justify-center border-2 border-white">
                                    <Text className="text-[10px] font-bold text-white">{cartCount}</Text>
                                </View>
                            )}
                        </Pressable>
                    </View>
                </View>

                {/* AI Search Bar */}
                <View className="flex-row items-center gap-2">
                    <View className="flex-1 flex-row items-center gap-3 rounded-2xl bg-gray-100 px-4 py-3 border border-gray-200">
                        {aiThinking ? (
                            <ActivityIndicator size="small" color="#8b5cf6" />
                        ) : (
                            <Sparkles size={20} color="#8b5cf6" />
                        )}
                        <TextInput 
                            value={searchQuery}
                            onChangeText={setSearchQuery}
                            placeholder='Try "High protein spicy dinner"'
                            placeholderTextColor="#9ca3af"
                            className="flex-1 text-[15px] font-medium text-gray-800"
                        />
                    </View>
                    <Pressable className="h-12 w-12 items-center justify-center rounded-2xl bg-gray-800">
                        <SlidersHorizontal size={20} color="#fff" />
                    </Pressable>
                </View>
            </View>

            <ScrollView className="flex-1" contentContainerStyle={{ paddingBottom: 100 }} showsVerticalScrollIndicator={false}>
                
                {/* Promotional Banner */}
                {!isSearching && (
                    <Animated.View entering={FadeInDown.duration(600).delay(100)} className="px-5 mt-5">
                        <View className="rounded-3xl overflow-hidden h-40 relative shadow-sm" style={SHADOWS.medium}>
                            <Image 
                                source={{ uri: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?q=80&w=1000' }} 
                                style={{ width: '100%', height: '100%' }} 
                                contentFit="cover" 
                            />
                            <LinearGradient colors={['rgba(0,0,0,0.7)', 'transparent']} start={{ x: 0, y: 0.5 }} end={{ x: 1, y: 0.5 }} style={{ position: 'absolute', width: '100%', height: '100%' }} />
                            <View className="absolute top-0 left-0 p-5 w-2/3 h-full justify-center">
                                <View className="bg-orange-500 rounded-md self-start px-2 py-1 mb-2">
                                    <Text className="text-[10px] font-black text-white uppercase tracking-wider">AI Combo</Text>
                                </View>
                                <Text className="text-xl font-black text-white">50% OFF on Top Rated Dishes</Text>
                            </View>
                        </View>
                    </Animated.View>
                )}

                {/* Recent Orders */}
                {!isSearching && activeOrders.length > 0 && (
                    <Animated.View entering={FadeInDown.duration(600).delay(150)} className="mt-8">
                        <View className="px-5 flex-row items-center justify-between mb-4">
                            <Text className="text-lg font-bold text-gray-800">Active Orders</Text>
                            <Pressable onPress={() => router.push('/(tabs)/orders')}>
                                <Text className="text-sm font-bold text-orange-500">Track All</Text>
                            </Pressable>
                        </View>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 20, gap: 12 }}>
                            {activeOrders.map((order) => (
                                <Pressable 
                                    key={order._id}
                                    onPress={() => router.push(`/order/${order._id}` as any)}
                                    className="bg-white rounded-3xl p-4 w-72 border border-[#f3e7d8]"
                                    style={SHADOWS.soft}
                                >
                                    <View className="flex-row items-center justify-between mb-3">
                                        <View className="flex-row items-center gap-2">
                                            <View className="h-8 w-8 bg-orange-50 rounded-full items-center justify-center">
                                                <Package size={14} color="#f97316" />
                                            </View>
                                            <Text className="text-[13px] font-bold text-gray-800">Order #{order._id.substring(order._id.length - 6).toUpperCase()}</Text>
                                        </View>
                                        <Text className="text-[11px] font-bold text-orange-600 bg-orange-50 px-2 py-1 rounded-md uppercase">{order.status.replace(/_/g, ' ')}</Text>
                                    </View>
                                    
                                    <View className="flex-row items-center justify-between">
                                        <Text className="text-[12px] font-medium text-gray-500 flex-1" numberOfLines={1}>
                                            {order.items.map(i => i.name).join(', ')}
                                        </Text>
                                        <Text className="text-[14px] font-black text-gray-800 ml-2">₹{order.totalAmount}</Text>
                                    </View>
                                </Pressable>
                            ))}
                        </ScrollView>
                    </Animated.View>
                )}

                {/* Categories */}
                {!isSearching && (
                    <Animated.View entering={FadeInDown.duration(600).delay(200)} className="mt-8">
                        <View className="px-5 flex-row items-center justify-between mb-4">
                            <Text className="text-lg font-bold text-gray-800">Categories</Text>
                            <Text className="text-sm font-bold text-orange-500">See All</Text>
                        </View>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 20, gap: 12 }}>
                            {Meal_cat.map((cat, index) => {
                                const active = cat === isSelected;
                                return (
                                    <Pressable 
                                        key={cat} 
                                        onPress={() => handleCategory(cat)}
                                        className={`px-5 py-3 rounded-2xl items-center justify-center border ${active ? 'bg-orange-500 border-orange-500' : 'bg-white border-gray-200'}`}
                                        style={active ? SHADOWS.glow : SHADOWS.soft}
                                    >
                                        <Text className={`text-[14px] font-bold ${active ? 'text-white' : 'text-gray-600'}`}>{cat}</Text>
                                    </Pressable>
                                );
                            })}
                        </ScrollView>
                    </Animated.View>
                )}

                {/* Results / Trending */}
                <View className="px-5 mt-8">
                    <View className="flex-row items-center justify-between mb-4">
                        <Text className="text-lg font-bold text-gray-800">
                            {isSearching ? 'AI Search Results' : 'Trending Near You'}
                        </Text>
                        {isSearching && aiThinking && <Text className="text-xs font-bold text-purple-500">AI is thinking...</Text>}
                    </View>

                    {loading ? (
                        <View className="items-center py-20">
                            <ActivityIndicator size="large" color="#f97316" />
                        </View>
                    ) : meals.length === 0 ? (
                        <View className="items-center py-20">
                            <Text className="text-gray-400 font-medium">No meals found for this criteria.</Text>
                        </View>
                    ) : (
                        <View className="flex-row flex-wrap justify-between gap-y-5">
                            {meals.map((m, index) => {
                                const isSaved = savedMealIds.has(m.idMeal);
                                const price = generatePrice(m.strCategory ?? isSelected, m.idMeal);
                                return (
                                    <View
                                        key={m.idMeal}
                                        className="bg-white rounded-[20px] overflow-hidden border border-gray-100"
                                        style={[{ width: '47%' }, SHADOWS.soft]}
                                    >
                                        <Pressable onPress={() => { Haptics.selectionAsync(); router.push(`/meal/${m.idMeal}`); }} className="active:opacity-80">
                                            <View className="h-40 w-full relative">
                                                <Image source={{ uri: m.strMealThumb }} style={{ width: '100%', height: '100%' }} contentFit="cover" />
                                                <LinearGradient colors={['rgba(0,0,0,0.5)', 'transparent']} style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 40 }} />
                                                
                                                {/* Saved Icon */}
                                                <View className="absolute top-2 right-2 bg-white/20 p-1.5 rounded-full" style={{ backdropFilter: 'blur(10px)' }}>
                                                    <Heart size={14} color={isSaved ? "#ef4444" : "#ffffff"} fill={isSaved ? "#ef4444" : "transparent"} strokeWidth={isSaved ? 0 : 2} />
                                                </View>
                                                
                                                {/* Rating Badge */}
                                                <View className="absolute bottom-2 left-2 bg-white/95 px-1.5 py-0.5 rounded-md flex-row items-center gap-1">
                                                    <Star size={10} color="#f59e0b" fill="#f59e0b" />
                                                    <Text className="text-[10px] font-bold text-gray-800">4.8</Text>
                                                </View>
                                            </View>
                                            
                                            <View className="px-3 pt-2 pb-3">
                                                <Text className="text-[13px] font-bold text-gray-800 leading-4 mb-1" numberOfLines={2}>{m.strMeal}</Text>
                                                <View className="flex-row items-center justify-between mt-auto pt-1">
                                                    <Text className="text-[14px] font-black text-orange-500">₹{price}</Text>
                                                    <View className="bg-orange-50 h-6 w-6 rounded-full items-center justify-center">
                                                        <Sparkles size={10} color="#f97316" />
                                                    </View>
                                                </View>
                                            </View>
                                        </Pressable>
                                    </View>
                                );
                            })}
                        </View>
                    )}
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}