import React, { useEffect } from 'react';
import { View, Text, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import Animated, { FadeInDown, ZoomIn, ZoomOut, useSharedValue, useAnimatedStyle, withRepeat, withTiming, Easing, withSequence, withDelay } from 'react-native-reanimated';
import { Check, MapPin, Navigation, Zap } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { COLORS, SHADOWS } from '@/constant/Theme';

export default function OrderSuccessScreen() {
    const params = useLocalSearchParams();
    const orderId = params.orderId as string;
    const addressPreview = params.address as string || "Your Location";
    const isSupabase = params.isSupabase === 'true';

    // Pulse animation for the background circles
    const pulse1 = useSharedValue(1);
    const pulse2 = useSharedValue(1);
    const checkScale = useSharedValue(0);

    useEffect(() => {
        // Success haptic
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

        // Pulse animations
        pulse1.value = withRepeat(
            withTiming(1.5, { duration: 2000, easing: Easing.out(Easing.ease) }),
            -1,
            true
        );
        pulse2.value = withDelay(
            1000,
            withRepeat(
                withTiming(1.8, { duration: 2000, easing: Easing.out(Easing.ease) }),
                -1,
                true
            )
        );

        // Checkmark pop animation
        checkScale.value = withDelay(
            300,
            withSequence(
                withTiming(1.2, { duration: 400, easing: Easing.bounce }),
                withTiming(1, { duration: 200 })
            )
        );
    }, []);

    const pulseStyle1 = useAnimatedStyle(() => ({
        transform: [{ scale: pulse1.value }],
        opacity: 2 - pulse1.value,
    }));

    const pulseStyle2 = useAnimatedStyle(() => ({
        transform: [{ scale: pulse2.value }],
        opacity: 2 - pulse2.value,
    }));

    const checkStyle = useAnimatedStyle(() => ({
        transform: [{ scale: checkScale.value }],
    }));

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: '#fff8ef' }}>
            <View className="flex-1 items-center justify-center px-6">
                
                {/* Animated Success Icon */}
                <View className="items-center justify-center h-48 w-48 mb-8">
                    <Animated.View 
                        className="absolute h-24 w-24 rounded-full bg-orange-100" 
                        style={pulseStyle2} 
                    />
                    <Animated.View 
                        className="absolute h-24 w-24 rounded-full bg-orange-200" 
                        style={pulseStyle1} 
                    />
                    <Animated.View 
                        className="h-24 w-24 rounded-full bg-[#f97316] items-center justify-center z-10"
                        style={[checkStyle, SHADOWS.medium]}
                    >
                        <Check size={48} color="#fff" strokeWidth={3} />
                    </Animated.View>
                </View>

                {/* Text Content */}
                <Animated.View entering={FadeInDown.duration(600).delay(400)} className="items-center">
                    <Text className="text-3xl font-black text-[#1f2933] mb-2 text-center">
                        Order Placed!
                    </Text>
                    <Text className="text-[16px] text-[#6b7280] text-center px-4 leading-6">
                        Your delicious food is being prepared. We'll notify you once it's out for delivery.
                    </Text>
                </Animated.View>

                {/* Delivery Snapshot Preview */}
                <Animated.View entering={FadeInDown.duration(600).delay(600)} className="w-full mt-10">
                    <View className="bg-white p-5 rounded-3xl border border-[#f3e7d8]" style={SHADOWS.soft}>
                        <View className="flex-row items-center gap-3 mb-4">
                            <View className="h-10 w-10 bg-orange-50 rounded-full items-center justify-center">
                                <MapPin size={20} color="#f97316" />
                            </View>
                            <View className="flex-1">
                                <Text className="text-[12px] font-bold text-gray-400 uppercase tracking-wider">Delivering To</Text>
                                <Text className="text-[15px] font-bold text-gray-800 mt-0.5" numberOfLines={1}>{addressPreview}</Text>
                            </View>
                        </View>
                        
                        <View className="h-[1px] bg-gray-100 w-full mb-4" />

                        <View className="flex-row items-center gap-3">
                            <View className="h-10 w-10 bg-green-50 rounded-full items-center justify-center">
                                <Navigation size={20} color="#22c55e" />
                            </View>
                            <View className="flex-1">
                                <Text className="text-[12px] font-bold text-gray-400 uppercase tracking-wider">Status</Text>
                                <Text className="text-[15px] font-bold text-green-600 mt-0.5">Assigning Delivery Partner...</Text>
                            </View>
                        </View>

                        {isSupabase && (
                            <View className="mt-4 bg-blue-50 rounded-xl p-3 flex-row items-center gap-2 border border-blue-100">
                                <Zap size={16} color="#3b82f6" />
                                <Text className="text-[12px] font-bold text-blue-700 flex-1">Real-time tracking is active! You'll see live updates on the map.</Text>
                            </View>
                        )}
                    </View>
                </Animated.View>

            </View>

            {/* Bottom Actions */}
            <Animated.View entering={FadeInDown.duration(600).delay(800)} className="p-6 bg-white border-t border-[#f3e7d8]" style={SHADOWS.medium}>
                <Pressable
                    onPress={() => router.replace(`/order/${orderId}` as any)}
                    className="w-full bg-[#f97316] py-4 rounded-2xl items-center justify-center mb-3 active:bg-[#ea580c] flex-row gap-2"
                >
                    <Navigation size={18} color="#fff" />
                    <Text className="text-white text-[16px] font-bold tracking-wide">Track Order Live</Text>
                </Pressable>
                
                <Pressable
                    onPress={() => router.replace('/(tabs)' as any)}
                    className="w-full py-4 rounded-2xl items-center justify-center active:bg-gray-50 border border-gray-200"
                >
                    <Text className="text-[#1f2933] text-[16px] font-bold tracking-wide">Back to Home</Text>
                </Pressable>
            </Animated.View>
        </SafeAreaView>
    );
}
