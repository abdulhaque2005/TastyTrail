import React, { useEffect, useRef, useState } from 'react';
import { View, Text, FlatList, Dimensions, NativeSyntheticEvent, NativeScrollEvent } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInDown } from 'react-native-reanimated';

const { width } = Dimensions.get('window');
const ITEM_WIDTH = width - 40; // 20px padding on each side

const PROMO_BANNERS = [
    { id: '1', title: '50% OFF on Top Rated Dishes', tag: 'AI Combo', image: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?q=80&w=1000' },
    { id: '2', title: 'Free Delivery on First 5 Orders', tag: 'New User', image: 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?q=80&w=1000' },
    { id: '3', title: 'Weekend Special: Flat ₹150 Off', tag: 'Weekend', image: 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?q=80&w=1000' },
    { id: '4', title: 'Healthy & Fresh Salads 🥗', tag: 'Health', image: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?q=80&w=1000' },
];

export default function AutoScrollBanner() {
    const flatListRef = useRef<FlatList>(null);
    const [currentIndex, setCurrentIndex] = useState(0);

    useEffect(() => {
        const timer = setInterval(() => {
            const nextIndex = (currentIndex + 1) % PROMO_BANNERS.length;
            flatListRef.current?.scrollToIndex({
                index: nextIndex,
                animated: true,
            });
            setCurrentIndex(nextIndex);
        }, 3000); // 3 seconds

        return () => clearInterval(timer);
    }, [currentIndex]);

    const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
        const slideSize = event.nativeEvent.layoutMeasurement.width;
        const index = event.nativeEvent.contentOffset.x / slideSize;
        const roundIndex = Math.round(index);
        if (roundIndex !== currentIndex && roundIndex >= 0 && roundIndex < PROMO_BANNERS.length) {
            setCurrentIndex(roundIndex);
        }
    };

    return (
        <Animated.View entering={FadeInDown.duration(600).delay(100)} className="mt-5">
            <FlatList
                ref={flatListRef}
                data={PROMO_BANNERS}
                keyExtractor={(item) => item.id}
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                onMomentumScrollEnd={handleScroll}
                snapToInterval={ITEM_WIDTH}
                decelerationRate="fast"
                contentContainerStyle={{ paddingHorizontal: 20, gap: 15 }}
                renderItem={({ item }) => (
                    <View className="rounded-[24px] overflow-hidden h-44 relative bg-white border border-gray-100" style={{ width: ITEM_WIDTH, shadowColor: '#000', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.08, shadowRadius: 12, elevation: 4 }}>
                        <Image 
                            source={{ uri: item.image }} 
                            style={{ width: '100%', height: '100%' }} 
                            contentFit="cover" 
                        />
                        <LinearGradient colors={['rgba(0,0,0,0.8)', 'transparent']} start={{ x: 0, y: 0.5 }} end={{ x: 1, y: 0.5 }} style={{ position: 'absolute', width: '100%', height: '100%' }} />
                        <View className="absolute top-0 left-0 p-5 w-3/4 h-full justify-center">
                            <View className="bg-white/20 rounded-md self-start px-2.5 py-1 mb-2" style={{ backdropFilter: 'blur(10px)' }}>
                                <Text className="text-[10px] font-black text-white uppercase tracking-wider">{item.tag}</Text>
                            </View>
                            <Text className="text-[22px] leading-7 font-black text-white shadow-sm">{item.title}</Text>
                        </View>
                    </View>
                )}
            />
            {/* Dots */}
            <View className="flex-row justify-center items-center mt-4 gap-2">
                {PROMO_BANNERS.map((_, index) => (
                    <View 
                        key={index} 
                        className={`h-1.5 rounded-full ${currentIndex === index ? 'w-6 bg-orange-500' : 'w-1.5 bg-gray-300'}`} 
                        style={{ transition: 'all 0.3s ease' }}
                    />
                ))}
            </View>
        </Animated.View>
    );
}
