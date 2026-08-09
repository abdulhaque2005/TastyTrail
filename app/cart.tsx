import { COLORS, SHADOWS } from "@/constant/Theme";
import { api } from "@/convex/_generated/api";
import { useAuth } from "@clerk/clerk-expo";
import { useConvexAuth, useMutation, useQuery } from "convex/react";
import { Redirect, useRouter } from "expo-router";
import { useState } from "react";
import { View, Text, Pressable, ScrollView, ActivityIndicator, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { ChevronLeft, Trash2, ShoppingCart, Plus, Minus, Receipt, ChevronRight } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { Image } from "expo-image";
import Animated, { FadeInDown, FadeInUp, Layout } from 'react-native-reanimated';

export default function CartScreen() {
    const { isLoaded, isSignedIn } = useAuth();
    const { isAuthenticated } = useConvexAuth();
    const router = useRouter();

    const cartItems = useQuery(
        api.cart.getCart,
        isLoaded && isSignedIn && isAuthenticated ? {} : "skip"
    );

    const updateQuantity = useMutation(api.cart.updateCartQuantity);
    const removeFromCart = useMutation(api.cart.removeFromCart);
    const clearCart = useMutation(api.cart.clearCart);
    const placeOrder = useMutation(api.orders.placeOrder);

    const [processingId, setProcessingId] = useState<string | null>(null);
    const [isPlacingOrder, setIsPlacingOrder] = useState(false);

    if (!isSignedIn) {
        return <Redirect href={'/auth/sign-in'} />
    }

    const totalAmount = cartItems?.reduce((sum, item) => sum + (item.price * item.quantity), 0) || 0;
    const totalItems = cartItems?.reduce((sum, item) => sum + item.quantity, 0) || 0;

    const handleBack = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        if (router.canGoBack()) router.back();
        else router.replace('/');
    };

    const handleUpdateQuantity = async (id: any, currentQuantity: number, change: number) => {
        const newQuantity = currentQuantity + change;
        
        if (newQuantity <= 0) {
            handleRemove(id);
            return;
        }
        
        try {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            setProcessingId(id);
            await updateQuantity({ id, quantity: newQuantity });
        } catch (err) {
            Alert.alert("Error", "Could not update quantity");
        } finally {
            setProcessingId(null);
        }
    };

    const handleRemove = (id: any) => {
        Alert.alert(
            "Remove item?",
            "Do you want to remove this item from your cart?",
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Remove",
                    style: "destructive",
                    onPress: async () => {
                        try {
                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                            setProcessingId(id);
                            await removeFromCart({ id });
                        } catch (err) {
                            Alert.alert("Error", "Could not remove item");
                        } finally {
                            setProcessingId(null);
                        }
                    }
                }
            ]
        );
    };
    
    const handleCheckout = () => {
        if (!cartItems || cartItems.length === 0) return;
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        router.push({ pathname: '/checkout', params: { type: 'cart', amount: totalAmount + 40 } });
    };

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.background }}>
            {/* Header */}
            <View className="flex-row items-center justify-between px-4 pt-1">
                <Pressable onPress={handleBack} className="flex-row items-center gap-1 rounded-full px-3 py-2 active:opacity-90">
                    <ChevronLeft size={22} color={COLORS.text} strokeWidth={2.5} />
                    <Text className="text-base font-medium text-[#1f2933]">Back</Text>
                </Pressable>
                
                {cartItems && cartItems.length > 0 && (
                    <Pressable 
                        onPress={() => {
                            Alert.alert("Clear Cart", "Are you sure?", [
                                { text: "Cancel", style: "cancel" },
                                { text: "Clear", style: "destructive", onPress: () => clearCart() }
                            ]);
                        }}
                        className="px-3 py-2"
                    >
                        <Text className="text-sm font-semibold text-[#ef4444]">Clear All</Text>
                    </Pressable>
                )}
            </View>

            <ScrollView className="flex-1" contentContainerClassName="px-6 pb-32" showsVerticalScrollIndicator={false}>
                {/* Title */}
                <Animated.View entering={FadeInDown.duration(500)}>
                    <Text className="mt-2 text-3xl font-bold text-[#1f2933]">Your Cart</Text>
                    {totalItems > 0 && (
                        <Text className="mt-1 text-sm text-[#6b7280]">{totalItems} item{totalItems > 1 ? 's' : ''}</Text>
                    )}
                </Animated.View>

                {/* Loading State */}
                {cartItems === undefined ? (
                    <View className="mt-16 items-center">
                        <ActivityIndicator size="large" color={COLORS.primary} />
                    </View>
                ) : cartItems.length === 0 ? (
                    /* Empty State */
                    <Animated.View entering={FadeInUp.duration(500)} className="mt-12 items-center rounded-3xl bg-white p-8" style={SHADOWS.medium}>
                        <View className="h-20 w-20 items-center justify-center rounded-full bg-[#ffedd5]">
                            <ShoppingCart size={36} color={COLORS.primary} strokeWidth={2} />
                        </View>
                        <Text className="mt-5 text-xl font-bold text-[#1f2933]">Your cart is empty</Text>
                        <Text className="mt-2 text-center text-sm leading-5 text-[#6b7280]">
                            Looks like you haven&apos;t added{"\n"}any meals to your cart yet.
                        </Text>
                        <Pressable
                            onPress={() => router.replace('/(tabs)')}
                            className="mt-6 rounded-full bg-[#f97316] px-6 py-3 active:opacity-90"
                            style={SHADOWS.glow}
                        >
                            <Text className="text-sm font-bold text-white">Browse Menu</Text>
                        </Pressable>
                    </Animated.View>
                ) : (
                    /* Cart Items List */
                    <View className="mt-6 gap-4">
                        {cartItems.map((item, index) => (
                            <View
                                key={item._id}
                                className="flex-row items-center gap-4 rounded-3xl bg-white p-4"
                                style={SHADOWS.soft}
                            >
                                <Image
                                    source={{ uri: item.imageUrl }}
                                    style={{ width: 80, height: 80, borderRadius: 20 }}
                                />
                                
                                <View className="flex-1">
                                    <Text className="text-base font-bold text-[#1f2933]" numberOfLines={1}>{item.name}</Text>
                                    <Text className="mt-1 text-lg font-extrabold text-[#f97316]">₹{item.price}</Text>
                                    
                                    <View className="mt-3 flex-row items-center justify-between">
                                        <View className="flex-row items-center gap-3 rounded-full bg-[#f3e7d8] px-2 py-1">
                                            <Pressable 
                                                onPress={() => handleUpdateQuantity(item._id, item.quantity, -1)}
                                                disabled={processingId === item._id}
                                                className="h-7 w-7 items-center justify-center rounded-full bg-white shadow-sm disabled:opacity-50"
                                            >
                                                <Minus size={14} color="#1f2933" strokeWidth={3} />
                                            </Pressable>
                                            
                                            <Text className="w-4 text-center font-bold text-[#1f2933]">{item.quantity}</Text>
                                            
                                            <Pressable 
                                                onPress={() => handleUpdateQuantity(item._id, item.quantity, 1)}
                                                disabled={processingId === item._id}
                                                className="h-7 w-7 items-center justify-center rounded-full bg-[#f97316] shadow-sm disabled:opacity-50"
                                            >
                                                <Plus size={14} color="#fff" strokeWidth={3} />
                                            </Pressable>
                                        </View>
                                        
                                        <Pressable 
                                            onPress={() => handleRemove(item._id)}
                                            className="p-2"
                                        >
                                            <Trash2 size={20} color="#ef4444" strokeWidth={2} />
                                        </Pressable>
                                    </View>
                                </View>
                            </View>
                        ))}
                        
                        {/* Bill Summary */}
                        <Animated.View entering={FadeInUp.duration(500).delay(300)} className="mt-4 rounded-3xl bg-white p-6" style={SHADOWS.medium}>
                            <Text className="mb-4 text-lg font-bold text-[#1f2933]">Bill Summary</Text>
                            
                            <View className="gap-3 border-b border-[#f3e7d8] pb-4">
                                <View className="flex-row justify-between">
                                    <Text className="text-[#6b7280]">Item Total</Text>
                                    <Text className="font-semibold text-[#1f2933]">₹{totalAmount}</Text>
                                </View>
                                <View className="flex-row justify-between">
                                    <Text className="text-[#6b7280]">Delivery Fee</Text>
                                    <Text className="font-semibold text-[#1f2933]">₹40</Text>
                                </View>
                            </View>
                            
                            <View className="mt-4 flex-row justify-between items-center">
                                <Text className="text-lg font-bold text-[#1f2933]">Grand Total</Text>
                                <Text className="text-2xl font-extrabold text-[#f97316]">₹{totalAmount + 40}</Text>
                            </View>
                        </Animated.View>
                    </View>
                )}
            </ScrollView>

            {/* Sticky Checkout Button */}
            {cartItems && cartItems.length > 0 && (
                <View className="absolute bottom-0 left-0 right-0 border-t border-[#f3e7d8] bg-white p-6 pb-8" style={SHADOWS.medium}>
                    <Pressable
                        onPress={handleCheckout}
                        disabled={isPlacingOrder}
                        className="flex-row items-center justify-center gap-3 rounded-2xl bg-[#f97316] py-4 active:opacity-90 disabled:opacity-70"
                        style={SHADOWS.glow}
                    >
                        {isPlacingOrder ? (
                            <ActivityIndicator color="#fff" />
                        ) : (
                            <>
                                <Text className="text-lg font-bold text-white tracking-wide">Proceed to Checkout</Text>
                                <ChevronRight size={20} color="#fff" strokeWidth={2.5} />
                            </>
                        )}
                    </Pressable>
                </View>
            )}
        </SafeAreaView>
    );
}
