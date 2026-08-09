import React, { useRef, useState, useEffect } from 'react';
import { View, Text, Pressable, useWindowDimensions, FlatList, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useAuth, useUser } from '@clerk/clerk-expo';
import { BlurView } from 'expo-blur';
import Animated, { FadeInDown, FadeIn, useAnimatedStyle, interpolate, Extrapolation, useSharedValue, withSpring } from 'react-native-reanimated';
import { Sparkles, MapPin, Zap, ArrowRight, ArrowLeft } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, SHADOWS, GRADIENTS } from '@/constant/Theme';

const ONBOARDING_DATA = [
    {
        id: '1',
        title: 'AI-Powered Discovery',
        subtitle: 'Tell us your mood or budget, and our AI will find the perfect meal for you instantly.',
        icon: Sparkles,
        color: '#F97316'
    },
    {
        id: '2',
        title: 'Smart Meal Combos',
        subtitle: 'Our AI generates the best value combinations so you eat better and save more.',
        icon: Zap,
        color: '#22C55E'
    },
    {
        id: '3',
        title: 'Live Kitchen Queue',
        subtitle: 'Track your order from the kitchen to your doorstep with real-time ETA.',
        icon: MapPin,
        color: '#3B82F6'
    }
];

const PaginationDot = ({ index, scrollX, width }: { index: number; scrollX: any; width: number }) => {
    const animatedDotStyle = useAnimatedStyle(() => {
        const widthAnim = interpolate(
            scrollX.value,
            [(index - 1) * width, index * width, (index + 1) * width],
            [8, 24, 8],
            Extrapolation.CLAMP
        );
        const opacityAnim = interpolate(
            scrollX.value,
            [(index - 1) * width, index * width, (index + 1) * width],
            [0.3, 1, 0.3],
            Extrapolation.CLAMP
        );
        return { width: widthAnim, opacity: opacityAnim };
    });

    return (
        <Animated.View
            style={[
                { height: 8, borderRadius: 4, backgroundColor: '#F97316' },
                animatedDotStyle
            ]}
        />
    );
};

export default function OnboardingScreen() {
    const { width, height } = useWindowDimensions();
    const { isLoaded, isSignedIn } = useAuth();
    const [currentIndex, setCurrentIndex] = useState(0);
    const scrollX = useSharedValue(0);
    const flatListRef = useRef<FlatList>(null);

    // If user is already signed in, go straight to tabs
    useEffect(() => {
        if (isLoaded && isSignedIn) {
            router.replace('/(tabs)');
        }
    }, [isLoaded, isSignedIn]);

    if (!isLoaded || isSignedIn) return null; // Avoid flashing

    const handleNext = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        if (currentIndex < ONBOARDING_DATA.length - 1) {
            flatListRef.current?.scrollToIndex({ index: currentIndex + 1, animated: true });
        } else {
            router.push('/auth/sign-in');
        }
    };

    const handleSkip = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        router.push('/auth/sign-in');
    };

    return (
        <View style={{ flex: 1, backgroundColor: '#111827' }}>
            {/* Background Gradient Orbs */}
            <View style={[StyleSheet.absoluteFillObject, { overflow: 'hidden' }]}>
                <View style={{ position: 'absolute', top: -50, right: -100, width: 350, height: 350, borderRadius: 175, backgroundColor: 'rgba(249,115,22,0.15)' }} />
                <View style={{ position: 'absolute', bottom: -50, left: -50, width: 300, height: 300, borderRadius: 150, backgroundColor: 'rgba(59,130,246,0.1)' }} />
            </View>

            <SafeAreaView style={{ flex: 1 }}>
                <View style={{ flex: 1 }}>
                    <View style={{ position: 'absolute', top: 20, right: 20, zIndex: 10 }}>
                        <Pressable onPress={handleSkip} style={{ padding: 10 }}>
                            <Text style={{ color: '#9CA3AF', fontWeight: 'bold' }}>Skip</Text>
                        </Pressable>
                    </View>

                    <Animated.FlatList
                        ref={flatListRef}
                        data={ONBOARDING_DATA}
                        keyExtractor={item => item.id}
                        horizontal
                        pagingEnabled
                        showsHorizontalScrollIndicator={false}
                        bounces={false}
                        onScroll={(e) => {
                            scrollX.value = e.nativeEvent.contentOffset.x;
                        }}
                        scrollEventThrottle={16}
                        onMomentumScrollEnd={(e) => {
                            const index = Math.round(e.nativeEvent.contentOffset.x / width);
                            setCurrentIndex(index);
                        }}
                        renderItem={({ item, index }) => {
                            const Icon = item.icon;
                            return (
                                <View style={{ width, flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 }}>
                                    
                                    {/* Icon Container with Glassmorphism */}
                                    <Animated.View entering={FadeInDown.duration(600).delay(100)} style={{ marginBottom: 40 }}>
                                        <View style={{ width: 160, height: 160, borderRadius: 80, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' }}>
                                            <BlurView intensity={20} tint="dark" style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.05)' }}>
                                                <LinearGradient
                                                    colors={[`${item.color}40`, 'transparent']}
                                                    style={StyleSheet.absoluteFillObject}
                                                />
                                                <Icon size={64} color={item.color} strokeWidth={1.5} />
                                            </BlurView>
                                        </View>
                                    </Animated.View>

                                    {/* Text Content */}
                                    <Animated.View entering={FadeInDown.duration(600).delay(200)} style={{ alignItems: 'center' }}>
                                        <Text style={{ color: 'white', fontSize: 28, fontWeight: '900', marginBottom: 15, textAlign: 'center' }}>
                                            {item.title}
                                        </Text>
                                        <Text style={{ color: '#9CA3AF', fontSize: 16, lineHeight: 24, textAlign: 'center' }}>
                                            {item.subtitle}
                                        </Text>
                                    </Animated.View>
                                </View>
                            );
                        }}
                    />
                </View>

                {/* Bottom Controls */}
                <View style={{ paddingHorizontal: 30, paddingBottom: 40, paddingTop: 20 }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                        
                        {/* Pagination Dots */}
                        <View style={{ flexDirection: 'row', gap: 8 }}>
                            {ONBOARDING_DATA.map((_, index) => (
                                <PaginationDot key={index} index={index} scrollX={scrollX} width={width} />
                            ))}
                        </View>

                        {/* Next / Get Started Button */}
                        <Pressable
                            onPress={handleNext}
                            style={{
                                backgroundColor: '#F97316',
                                paddingHorizontal: 24,
                                paddingVertical: 14,
                                borderRadius: 30,
                                flexDirection: 'row',
                                alignItems: 'center',
                                gap: 8
                            }}
                        >
                            <Text style={{ color: 'white', fontWeight: 'bold', fontSize: 16 }}>
                                {currentIndex === ONBOARDING_DATA.length - 1 ? 'Get Started' : 'Next'}
                            </Text>
                            <ArrowRight size={20} color="white" strokeWidth={2.5} />
                        </Pressable>
                    </View>
                </View>
            </SafeAreaView>
        </View>
    );
}