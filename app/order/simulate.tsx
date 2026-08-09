import React, { useState, useEffect, useRef } from 'react';
import { View, Text, Pressable, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { ChevronLeft, Play, CheckCircle, Zap, SkipForward, Square, Star } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { SHADOWS } from '@/constant/Theme';
import { ORDER_FLOW, STATUS_CONFIG, OrderStatus } from '@/lib/supabase';
import { updateOrderStatus, assignRider, updateRiderLocation, markDelivered, getSupabaseOrder } from '@/services/supabaseOrders';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { Image } from 'expo-image';

const RIDER_ROUTE = [
    { latitude: 28.6990, longitude: 77.1000 },
    { latitude: 28.6995, longitude: 77.1005 },
    { latitude: 28.7000, longitude: 77.1008 },
    { latitude: 28.7005, longitude: 77.1012 },
    { latitude: 28.7010, longitude: 77.1015 },
    { latitude: 28.7015, longitude: 77.1018 },
    { latitude: 28.7020, longitude: 77.1020 },
    { latitude: 28.7025, longitude: 77.1022 },
    { latitude: 28.7030, longitude: 77.1024 },
    { latitude: 28.7035, longitude: 77.1025 },
];

const MOCK_RIDER = {
    id: 'rider_demo_001',
    name: 'Rahul Kumar',
    phone: '+91 98765 43210',
    photo: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=200',
    vehicle: 'Bike',
    eta: 15,
};

const STATUS_DESCRIPTIONS: Record<string, string> = {
    confirmed: 'Order confirmed by restaurant',
    accepted: 'Restaurant accepted your order',
    preparing: 'Chef is preparing your food 🍳',
    ready: 'Food is packed and ready',
    rider_assigned: `${MOCK_RIDER.name} is on the way`,
    picked_up: `${MOCK_RIDER.name} picked up your food`,
    out_for_delivery: 'Your food is on the way! 🚀',
    nearby: 'Rider is almost there! 📍',
    delivered: 'Delivered! Enjoy your meal 🎉',
};

export default function SimulateScreen() {
    const { orderId } = useLocalSearchParams();
    const id = orderId as string;
    const insets = useSafeAreaInsets();

    const [currentStatus, setCurrentStatus] = useState<string>('confirmed');
    const [isProcessing, setIsProcessing] = useState(false);
    const [completedSteps, setCompletedSteps] = useState<string[]>([]);
    const [riderRouteIndex, setRiderRouteIndex] = useState(0);
    const [isAutoPlaying, setIsAutoPlaying] = useState(false);
    const autoPlayRef = useRef<ReturnType<typeof setInterval> | null>(null);

    useEffect(() => {
        if (!id) return;
        (async () => {
            const order = await getSupabaseOrder(id);
            if (order) {
                setCurrentStatus(order.status);
                const currentIdx = ORDER_FLOW.indexOf(order.status as OrderStatus);
                if (currentIdx > 0) setCompletedSteps(ORDER_FLOW.slice(0, currentIdx));
            }
        })();
    }, [id]);

    useEffect(() => () => { if (autoPlayRef.current) clearInterval(autoPlayRef.current); }, []);

    const advanceStatus = async () => {
        if (!id) return;
        const currentIdx = ORDER_FLOW.indexOf(currentStatus as OrderStatus);
        const nextIdx = currentIdx + 1;
        if (nextIdx >= ORDER_FLOW.length) return;

        const nextStatus = ORDER_FLOW[nextIdx];
        setIsProcessing(true);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

        try {
            if (nextStatus === 'rider_assigned') {
                await assignRider(id, MOCK_RIDER);
                await updateRiderLocation({ orderId: id, riderId: MOCK_RIDER.id, latitude: RIDER_ROUTE[0].latitude, longitude: RIDER_ROUTE[0].longitude });
                setRiderRouteIndex(0);
            } else if (nextStatus === 'delivered') {
                await markDelivered(id);
            } else {
                await updateOrderStatus({
                    orderId: id, status: nextStatus,
                    description: STATUS_DESCRIPTIONS[nextStatus],
                    updatedBy: ['confirmed', 'accepted', 'preparing', 'ready'].includes(nextStatus) ? 'restaurant' : 'rider',
                });
            }

            if (['picked_up', 'out_for_delivery', 'nearby'].includes(nextStatus)) {
                const newIdx = Math.min(riderRouteIndex + 3, RIDER_ROUTE.length - 1);
                await updateRiderLocation({ orderId: id, riderId: MOCK_RIDER.id, latitude: RIDER_ROUTE[newIdx].latitude, longitude: RIDER_ROUTE[newIdx].longitude, speed: 25 + Math.random() * 15 });
                setRiderRouteIndex(newIdx);
            }

            setCompletedSteps(prev => [...prev, currentStatus]);
            setCurrentStatus(nextStatus);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        } catch (err) {
            Alert.alert('Error', 'Failed to update status');
        } finally {
            setIsProcessing(false);
        }
    };

    const handleAutoPlay = () => {
        if (isAutoPlaying) {
            if (autoPlayRef.current) clearInterval(autoPlayRef.current);
            setIsAutoPlaying(false);
            return;
        }
        setIsAutoPlaying(true);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
        autoPlayRef.current = setInterval(() => advanceStatus(), 3000);
    };

    // Stop autoplay when delivered
    useEffect(() => {
        if (currentStatus === 'delivered' && isAutoPlaying) {
            if (autoPlayRef.current) clearInterval(autoPlayRef.current);
            setIsAutoPlaying(false);
        }
    }, [currentStatus]);

    const isDelivered = currentStatus === 'delivered';
    const currentIdx = ORDER_FLOW.indexOf(currentStatus as OrderStatus);
    const nextStatus = currentIdx < ORDER_FLOW.length - 1 ? ORDER_FLOW[currentIdx + 1] : null;

    return (
        <View style={{ flex: 1, backgroundColor: '#fafafa' }}>
            {/* Header */}
            <View style={{ backgroundColor: '#fff', paddingTop: insets.top, paddingBottom: 14, paddingHorizontal: 20, borderBottomWidth: 1, borderBottomColor: '#f3f4f6', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <Pressable onPress={() => router.back()} style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: '#f5f5f5', alignItems: 'center', justifyContent: 'center' }}>
                    <ChevronLeft size={22} color="#111827" strokeWidth={2.5} />
                </Pressable>
                <Text style={{ fontSize: 17, fontWeight: '700', color: '#111827' }}>Simulator</Text>
                <View style={{ backgroundColor: '#fef2f2', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8 }}>
                    <Text style={{ color: '#ef4444', fontSize: 10, fontWeight: '800', textTransform: 'uppercase' }}>Demo</Text>
                </View>
            </View>

            <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 20, paddingBottom: 160 }} showsVerticalScrollIndicator={false}>
                {/* Order Info */}
                <Animated.View entering={FadeInDown.duration(300)} style={{ backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 20, ...SHADOWS.soft }}>
                    <Text style={{ fontSize: 11, fontWeight: '700', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: 1 }}>Order ID</Text>
                    <Text style={{ fontSize: 14, fontWeight: '800', color: '#111827', marginTop: 4 }}>{id?.substring(0, 12)}...</Text>
                </Animated.View>

                {/* Status Flow */}
                <Animated.View entering={FadeInDown.duration(300).delay(80)} style={{ backgroundColor: '#fff', borderRadius: 20, padding: 20, marginBottom: 20, ...SHADOWS.soft }}>
                    <Text style={{ fontSize: 16, fontWeight: '800', color: '#111827', marginBottom: 20 }}>Order Lifecycle</Text>

                    {ORDER_FLOW.map((status, index) => {
                        const config = STATUS_CONFIG[status];
                        const isCompleted = completedSteps.includes(status);
                        const isCurrent = currentStatus === status;
                        const isPending = !isCompleted && !isCurrent;
                        const isLast = index === ORDER_FLOW.length - 1;

                        return (
                            <View key={status} style={{ flexDirection: 'row', alignItems: 'flex-start', paddingBottom: isLast ? 0 : 24, position: 'relative' }}>
                                {!isLast && (
                                    <View style={{
                                        position: 'absolute', left: 10, top: 24, bottom: 0, width: 2, borderRadius: 1,
                                        backgroundColor: isCompleted ? '#86efac' : '#f3f4f6',
                                    }} />
                                )}
                                <View style={{
                                    width: 22, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center',
                                    backgroundColor: isCompleted ? '#22c55e' : isCurrent ? '#f97316' : '#f3f4f6',
                                    borderWidth: isCurrent ? 3 : 0, borderColor: '#fed7aa',
                                }}>
                                    {isCompleted && <CheckCircle size={12} color="#fff" strokeWidth={3} />}
                                    {isCurrent && <View style={{ width: 5, height: 5, borderRadius: 2.5, backgroundColor: '#fff' }} />}
                                </View>
                                <View style={{ marginLeft: 14, flex: 1 }}>
                                    <Text style={{ fontSize: 13, fontWeight: isPending ? '500' : '700', color: isPending ? '#d1d5db' : '#111827' }}>
                                        {config?.emoji} {config?.label}
                                    </Text>
                                    {isCurrent && (
                                        <View style={{ backgroundColor: '#fff7ed', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, marginTop: 4, alignSelf: 'flex-start' }}>
                                            <Text style={{ fontSize: 10, fontWeight: '700', color: '#ea580c' }}>CURRENT</Text>
                                        </View>
                                    )}
                                </View>
                            </View>
                        );
                    })}
                </Animated.View>

                {/* Rider Card */}
                {currentIdx >= ORDER_FLOW.indexOf('rider_assigned') && (
                    <Animated.View entering={FadeInUp.duration(300)} style={{ backgroundColor: '#111827', borderRadius: 18, padding: 18, marginBottom: 20, flexDirection: 'row', alignItems: 'center', gap: 14, ...SHADOWS.medium }}>
                        <View style={{ width: 46, height: 46, borderRadius: 23, backgroundColor: 'rgba(255,255,255,0.12)', overflow: 'hidden', borderWidth: 2, borderColor: 'rgba(255,255,255,0.15)' }}>
                            <Image source={{ uri: MOCK_RIDER.photo }} style={{ width: '100%', height: '100%' }} />
                        </View>
                        <View>
                            <Text style={{ color: '#fff', fontWeight: '700', fontSize: 15 }}>{MOCK_RIDER.name}</Text>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 }}>
                                <Star size={11} color="#fbbf24" fill="#fbbf24" />
                                <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12, fontWeight: '600' }}>4.8 • {MOCK_RIDER.vehicle}</Text>
                            </View>
                        </View>
                    </Animated.View>
                )}
            </ScrollView>

            {/* Bottom Actions */}
            <View style={{
                position: 'absolute', bottom: 0, left: 0, right: 0,
                backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#f3f4f6',
                paddingHorizontal: 20, paddingTop: 16, paddingBottom: insets.bottom > 0 ? insets.bottom : 24,
                ...SHADOWS.medium,
            }}>
                {isDelivered ? (
                    <View style={{ backgroundColor: '#f0fdf4', borderRadius: 16, paddingVertical: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderWidth: 1, borderColor: '#bbf7d0' }}>
                        <CheckCircle size={20} color="#16a34a" />
                        <Text style={{ fontSize: 15, fontWeight: '700', color: '#16a34a' }}>Simulation Complete 🎉</Text>
                    </View>
                ) : (
                    <View style={{ gap: 10 }}>
                        <Pressable
                            onPress={advanceStatus}
                            disabled={isProcessing}
                            style={{ backgroundColor: '#111827', borderRadius: 16, paddingVertical: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, opacity: isProcessing ? 0.6 : 1 }}
                        >
                            {isProcessing ? (
                                <ActivityIndicator color="#fff" size="small" />
                            ) : (
                                <>
                                    <SkipForward size={18} color="#fff" />
                                    <Text style={{ fontSize: 15, fontWeight: '700', color: '#fff' }}>
                                        Next → {nextStatus ? STATUS_CONFIG[nextStatus]?.label : 'Done'}
                                    </Text>
                                </>
                            )}
                        </Pressable>

                        <Pressable
                            onPress={handleAutoPlay}
                            style={{
                                borderRadius: 16, paddingVertical: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
                                backgroundColor: isAutoPlaying ? '#fef2f2' : '#f5f5f5',
                                borderWidth: 1, borderColor: isAutoPlaying ? '#fecaca' : '#e5e7eb',
                            }}
                        >
                            {isAutoPlaying ? <Square size={14} color="#ef4444" /> : <Play size={14} color="#374151" />}
                            <Text style={{ fontSize: 13, fontWeight: '700', color: isAutoPlaying ? '#ef4444' : '#374151' }}>
                                {isAutoPlaying ? 'Stop Auto-Play' : 'Auto-Play (3s intervals)'}
                            </Text>
                        </Pressable>
                    </View>
                )}
            </View>
        </View>
    );
}
