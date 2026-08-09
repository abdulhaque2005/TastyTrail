import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import MapView, { Marker, Polyline } from 'react-native-maps';
import * as Haptics from 'expo-haptics';
import { MapPin, Navigation, Phone, CheckCircle, Camera, AlertTriangle, ShieldCheck } from 'lucide-react-native';
import { COLORS, SHADOWS } from '@/constant/Theme';
import { Image } from 'expo-image';
import Animated, { FadeInUp } from 'react-native-reanimated';

const RIDER_COORD = { latitude: 28.7000, longitude: 77.1000 };
const CUST_COORD = { latitude: 28.7041, longitude: 77.1025 };

export default function RiderViewScreen() {
    const [deliveryStatus, setDeliveryStatus] = useState<'navigating' | 'arrived' | 'verified'>('navigating');

    const handleArrive = () => {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        setDeliveryStatus('arrived');
    };

    const handleAIVerify = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
        Alert.alert(
            "AI Delivery Verification",
            "Simulating Photo Capture...",
            [
                { 
                    text: "Capture & Verify", 
                    onPress: () => {
                        setDeliveryStatus('verified');
                        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                        Alert.alert("Verified!", "GPS Matches Locked Location ✓\nTimestamp Recorded ✓\nDelivery Photo Saved ✓");
                    }
                }
            ]
        );
    };

    return (
        <View style={{ flex: 1, backgroundColor: COLORS.background }}>
            
            <MapView 
                style={StyleSheet.absoluteFillObject}
                initialRegion={{
                    latitude: 28.7020,
                    longitude: 77.1012,
                    latitudeDelta: 0.015,
                    longitudeDelta: 0.015,
                }}
            >
                <Marker coordinate={RIDER_COORD} title="Rider">
                    <View className="bg-blue-500 p-2 rounded-full border-2 border-white" style={SHADOWS.medium}>
                        <Navigation size={20} color="white" />
                    </View>
                </Marker>
                
                <Marker coordinate={CUST_COORD} title="Locked Delivery Pin">
                    <View className="bg-red-500 px-3 py-1.5 rounded-full border-2 border-white flex-row items-center gap-1" style={SHADOWS.medium}>
                        <MapPin size={16} color="white" fill="white" />
                        <Text className="text-white font-bold text-xs">Locked</Text>
                    </View>
                </Marker>

                <Polyline 
                    coordinates={[RIDER_COORD, CUST_COORD]}
                    strokeColor="#3b82f6"
                    strokeWidth={4}
                    lineDashPattern={[10, 10]}
                />
            </MapView>

            <SafeAreaView style={{ flex: 1, justifyContent: 'space-between' }} pointerEvents="box-none">
                
                <View className="px-4 pt-2 pointer-events-auto">
                    <View className="bg-gray-900 rounded-full px-4 py-3 flex-row items-center justify-between" style={SHADOWS.medium}>
                        <Pressable onPress={() => router.replace('/')} className="active:opacity-70">
                            <Text className="text-white font-bold">Exit Rider View</Text>
                        </Pressable>
                        <View className="bg-red-500 px-2 py-1 rounded">
                            <Text className="text-white text-xs font-bold uppercase tracking-wider">Demo Mode</Text>
                        </View>
                    </View>
                </View>

                <Animated.View entering={FadeInUp.duration(500)} className="bg-white rounded-t-3xl p-5 shadow-2xl pointer-events-auto" style={{ shadowColor: '#000', shadowOffset: { width: 0, height: -10 }, shadowOpacity: 0.1, shadowRadius: 20 }}>
                    
                    <View className="flex-row items-center justify-between mb-5">
                        <View>
                            <Text className="text-3xl font-black text-gray-900">5 min</Text>
                            <Text className="text-gray-500 font-bold">1.2 km away • 12:45 PM Arrival</Text>
                        </View>
                        <Pressable className="bg-blue-100 p-3 rounded-full active:opacity-70">
                            <Phone size={24} color="#3b82f6" fill="#3b82f6" />
                        </Pressable>
                    </View>

                    <View className="bg-yellow-50 rounded-2xl p-4 border border-yellow-200 mb-5 flex-row items-start gap-4">
                        <View className="w-16 h-16 rounded-xl overflow-hidden bg-gray-200 border border-gray-300">
                            <Image 
                                source={{ uri: 'https://images.unsplash.com/photo-1542361345-89e58247f2d5?q=80&w=200' }} 
                                style={{ width: '100%', height: '100%' }} 
                            />
                        </View>
                        <View className="flex-1">
                            <View className="flex-row items-center gap-2 mb-1">
                                <AlertTriangle size={16} color="#d97706" />
                                <Text className="font-bold text-yellow-800">Smart Delivery Note</Text>
                            </View>
                            <Text className="text-yellow-900 font-medium leading-5">
                                &quot;Come to Hostel Gate, Don&apos;t ring the bell. Room 307, Third Floor.&quot;
                            </Text>
                        </View>
                    </View>

                    {deliveryStatus === 'navigating' && (
                        <Pressable 
                            onPress={handleArrive}
                            className="bg-blue-600 rounded-2xl py-4 items-center justify-center active:bg-blue-700 flex-row gap-2"
                        >
                            <Navigation size={20} color="white" />
                            <Text className="text-white font-bold text-lg">Mark as Arrived</Text>
                        </Pressable>
                    )}

                    {deliveryStatus === 'arrived' && (
                        <Pressable 
                            onPress={handleAIVerify}
                            className="bg-gray-900 rounded-2xl py-4 items-center justify-center active:bg-gray-800 flex-row gap-2"
                        >
                            <Camera size={20} color="white" />
                            <Text className="text-white font-bold text-lg">Capture Photo for AI Verification</Text>
                        </Pressable>
                    )}

                    {deliveryStatus === 'verified' && (
                        <View className="bg-green-100 rounded-2xl py-4 items-center justify-center flex-row gap-2 border border-green-300">
                            <ShieldCheck size={24} color="#16a34a" />
                            <Text className="text-green-700 font-bold text-lg">Delivery Verified & Completed</Text>
                        </View>
                    )}

                </Animated.View>
            </SafeAreaView>
        </View>
    );
}
