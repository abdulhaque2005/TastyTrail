import React, { useEffect } from 'react';
import { View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withRepeat, withSequence, withTiming } from 'react-native-reanimated';

export default function SkeletonCard() {
    const opacity = useSharedValue(0.4);

    useEffect(() => {
        opacity.value = withRepeat(
            withSequence(
                withTiming(0.8, { duration: 800 }),
                withTiming(0.4, { duration: 800 })
            ),
            -1,
            true
        );
    }, []);

    const animatedStyle = useAnimatedStyle(() => ({
        opacity: opacity.value,
    }));

    return (
        <View className="bg-white rounded-[20px] overflow-hidden border border-gray-100 mb-5" style={{ shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 10, elevation: 2 }}>
            <Animated.View style={animatedStyle}>
                {/* Image Placeholder */}
                <View className="h-56 w-full bg-gray-200" />
                
                {/* Text Placeholder */}
                <View className="px-4 pt-3 pb-4">
                    <View className="flex-row justify-between mb-2">
                        <View className="h-5 w-2/3 bg-gray-200 rounded-md" />
                        <View className="h-5 w-1/4 bg-gray-200 rounded-md" />
                    </View>
                    <View className="h-4 w-1/3 bg-gray-200 rounded-md" />
                </View>
            </Animated.View>
        </View>
    );
}
