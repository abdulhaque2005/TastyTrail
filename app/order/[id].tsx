import React, { useEffect, useRef, useState } from 'react';
import { View, Text, ScrollView, Pressable, ActivityIndicator, StyleSheet, Dimensions, Linking } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { ChevronLeft, MapPin, Phone, MessageSquare, Receipt, RotateCcw, HelpCircle, CheckCircle, Package, Clock, Truck, Navigation, Star, ArrowRight, Shield } from 'lucide-react-native';
import MapView, { Marker, Polyline, PROVIDER_DEFAULT } from 'react-native-maps';
import { COLORS, SHADOWS } from '@/constant/Theme';
import { Image } from 'expo-image';
import Animated, { FadeInDown, SlideInUp, useSharedValue, useAnimatedStyle, withRepeat, withTiming, Easing, withSequence } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { useOrderTracking } from '@/lib/useOrderTracking';
import { STATUS_CONFIG, ORDER_FLOW } from '@/lib/supabase';
import { fetchRoute, type RouteResult } from '@/services/routeService';

const { width } = Dimensions.get('window');

export default function OrderDetailsScreen() {
    const { id } = useLocalSearchParams();
    const insets = useSafeAreaInsets();
    const mapRef = useRef<MapView>(null);
    const orderId = id as string;

    const { order, timeline, riderLocation, isLoading, error } = useOrderTracking(orderId);
    const [roadRoute, setRoadRoute] = useState<RouteResult | null>(null);
    const [routeETA, setRouteETA] = useState<number | null>(null);

    // Pulse animation
    const pulseScale = useSharedValue(1);
    useEffect(() => {
        pulseScale.value = withRepeat(
            withSequence(
                withTiming(1.15, { duration: 1200, easing: Easing.out(Easing.ease) }),
                withTiming(1, { duration: 1200, easing: Easing.in(Easing.ease) })
            ),
            -1, false
        );
    }, []);
    const pulseStyle = useAnimatedStyle(() => ({
        transform: [{ scale: pulseScale.value }],
        opacity: 1.5 - pulseScale.value * 0.5,
    }));

    // Fetch real road route when rider location changes
    useEffect(() => {
        if (!riderLocation || !order?.delivery) return;
        const d = order.delivery;
        if (!d.latitude || !d.longitude) return;
        if (riderLocation.latitude === 0 && riderLocation.longitude === 0) return;

        (async () => {
            try {
                const route = await fetchRoute(
                    { latitude: riderLocation.latitude, longitude: riderLocation.longitude },
                    { latitude: d.latitude!, longitude: d.longitude! }
                );
                setRoadRoute(route);
                setRouteETA(Math.round(route.durationMinutes));
            } catch (err) {
                console.warn('Failed to fetch road route:', err);
            }
        })();
    }, [riderLocation?.latitude, riderLocation?.longitude, order?.delivery?.latitude]);

    // Auto-fit map to show both rider and delivery location
    useEffect(() => {
        if (!riderLocation || !order?.delivery) return;
        const d = order.delivery;
        if (!d.latitude || !d.longitude) return;
        if (riderLocation.latitude === 0 || riderLocation.longitude === 0) return;

        mapRef.current?.fitToCoordinates(
            [
                { latitude: riderLocation.latitude, longitude: riderLocation.longitude },
                { latitude: d.latitude, longitude: d.longitude },
            ],
            { edgePadding: { top: 140, right: 60, bottom: 80, left: 60 }, animated: true }
        );
    }, [riderLocation?.latitude, riderLocation?.longitude]);

    // --- Loading ---
    if (isLoading) {
        return (
            <View style={{ flex: 1, backgroundColor: '#fafafa', justifyContent: 'center', alignItems: 'center' }}>
                <View className="h-16 w-16 rounded-full bg-orange-50 items-center justify-center mb-4">
                    <ActivityIndicator size="large" color="#f97316" />
                </View>
                <Text className="text-[15px] font-semibold text-gray-500">Loading your order...</Text>
            </View>
        );
    }

    // --- Not Found ---
    if (!order) {
        return (
            <View style={{ flex: 1, backgroundColor: '#fafafa', justifyContent: 'center', alignItems: 'center', paddingHorizontal: 32 }}>
                <View className="h-20 w-20 rounded-full bg-gray-100 items-center justify-center mb-5">
                    <Package size={36} color="#d1d5db" />
                </View>
                <Text className="text-xl font-bold text-gray-800 mb-2 text-center">Order not found</Text>
                <Text className="text-sm text-gray-500 text-center mb-6">{error || 'This order may have been removed.'}</Text>
                <Pressable onPress={() => router.back()} className="px-8 py-3.5 bg-gray-900 rounded-xl active:opacity-80">
                    <Text className="font-semibold text-white text-[15px]">Go Back</Text>
                </Pressable>
            </View>
        );
    }

    const d = order.delivery || ({} as any);
    const hasDeliveryLocation = d?.latitude && d?.longitude;
    const hasRiderLocation = riderLocation && riderLocation.latitude !== 0 && riderLocation.longitude !== 0;
    const hasMapData = hasDeliveryLocation || hasRiderLocation;

    const mapRegion = hasDeliveryLocation ? {
        latitude: d.latitude!, longitude: d.longitude!,
        latitudeDelta: 0.006, longitudeDelta: 0.006,
    } : hasRiderLocation ? {
        latitude: riderLocation!.latitude, longitude: riderLocation!.longitude,
        latitudeDelta: 0.006, longitudeDelta: 0.006,
    } : null;

    const statusLower = order.status.toLowerCase();
    const currentStatusConfig = STATUS_CONFIG[statusLower] || { label: order.status, color: '#9ca3af', emoji: '📦' };
    const isDelivered = statusLower === 'delivered';
    const isActive = !isDelivered;
    const showRiderOnMap = hasRiderLocation && ['rider_assigned', 'picked_up', 'out_for_delivery', 'nearby'].includes(statusLower);

    // Timeline
    const timelineSteps = [
        { key: 'confirmed', label: 'Order Confirmed', desc: 'Your order has been received' },
        { key: 'preparing', label: 'Preparing', desc: 'Restaurant is cooking your food' },
        { key: 'picked_up', label: 'On the Way', desc: 'Rider picked up your order' },
        { key: 'delivered', label: 'Delivered', desc: 'Enjoy your meal!' },
    ];
    const getStepState = (stepKey: string) => {
        const stepMap: Record<string, number> = {
            confirmed: 1, accepted: 1,
            preparing: 2, ready: 2,
            rider_assigned: 3, picked_up: 3, out_for_delivery: 3, nearby: 3,
            delivered: 4,
        };
        const current = stepMap[statusLower] ?? 0;
        const step = stepMap[stepKey] ?? 0;
        if (current > step) return 'completed';
        if (current === step) return 'active';
        return 'pending';
    };
    const getStepTime = (stepKey: string) => {
        const event = timeline.find(t => t.status === stepKey);
        if (!event) return null;
        return new Date(event.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    const handleCall = () => {
        if (order.rider?.phone) Linking.openURL(`tel:${order.rider.phone}`);
    };

    // Calculate display ETA
    const displayETA = routeETA || order.rider?.eta || null;

    return (
        <View style={{ flex: 1, backgroundColor: '#f5f5f5' }}>

            {/* === MAP SECTION === */}
            <View style={{ height: '36%', backgroundColor: '#e5e7eb' }}>
                {mapRegion ? (
                    <MapView
                        ref={mapRef}
                        style={StyleSheet.absoluteFillObject}
                        initialRegion={mapRegion}
                        pitchEnabled={false}
                        showsUserLocation={false}
                        provider={PROVIDER_DEFAULT}
                        customMapStyle={mapStyle}
                    >
                        {/* Delivery Location Marker */}
                        {hasDeliveryLocation && (
                            <Marker coordinate={{ latitude: d.latitude!, longitude: d.longitude! }}>
                                <View style={{ alignItems: 'center' }}>
                                    <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', ...SHADOWS.medium, borderWidth: 2.5, borderColor: '#ef4444' }}>
                                        <MapPin size={15} color="#ef4444" fill="#ef4444" />
                                    </View>
                                    <View style={{ width: 3, height: 8, backgroundColor: '#ef4444', borderBottomLeftRadius: 2, borderBottomRightRadius: 2 }} />
                                </View>
                            </Marker>
                        )}

                        {/* Rider Marker */}
                        {showRiderOnMap && (
                            <Marker coordinate={{ latitude: riderLocation!.latitude, longitude: riderLocation!.longitude }} anchor={{ x: 0.5, y: 0.5 }}>
                                <View style={{ alignItems: 'center' }}>
                                    <View style={{ width: 38, height: 38, borderRadius: 19, backgroundColor: '#2563eb', alignItems: 'center', justifyContent: 'center', ...SHADOWS.medium, borderWidth: 3, borderColor: '#fff' }}>
                                        <Text style={{ fontSize: 18 }}>🏍️</Text>
                                    </View>
                                </View>
                            </Marker>
                        )}

                        {/* Real Road Route (from OSRM) */}
                        {showRiderOnMap && roadRoute && roadRoute.coordinates.length > 1 && (
                            <Polyline
                                coordinates={roadRoute.coordinates}
                                strokeColor="#2563eb"
                                strokeWidth={4}
                                lineCap="round"
                                lineJoin="round"
                            />
                        )}

                        {/* Fallback: straight dashed line if no road route yet */}
                        {showRiderOnMap && hasDeliveryLocation && !roadRoute && (
                            <Polyline
                                coordinates={[
                                    { latitude: riderLocation!.latitude, longitude: riderLocation!.longitude },
                                    { latitude: d.latitude!, longitude: d.longitude! },
                                ]}
                                strokeColor="#2563eb"
                                strokeWidth={3}
                                lineDashPattern={[6, 8]}
                            />
                        )}
                    </MapView>
                ) : (
                    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#f3f4f6' }}>
                        <MapPin size={40} color="#d1d5db" />
                        <Text style={{ color: '#9ca3af', fontWeight: '600', marginTop: 8 }}>Location unavailable</Text>
                    </View>
                )}

                {/* Top Gradient for status bar */}
                <LinearGradient
                    colors={['rgba(0,0,0,0.35)', 'transparent']}
                    style={{ position: 'absolute', top: 0, left: 0, right: 0, height: insets.top + 60 }}
                    pointerEvents="none"
                />

                {/* Navigation Bar */}
                <View style={{ position: 'absolute', top: insets.top + 8, left: 16, right: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Pressable
                        onPress={() => router.back()}
                        style={{ height: 42, width: 42, borderRadius: 21, backgroundColor: 'rgba(255,255,255,0.92)', alignItems: 'center', justifyContent: 'center', ...SHADOWS.soft }}
                    >
                        <ChevronLeft size={22} color="#111827" strokeWidth={2.5} />
                    </Pressable>

                    {/* Live indicator badge */}
                    {isActive && (
                        <View style={{ height: 34, paddingHorizontal: 12, borderRadius: 17, backgroundColor: 'rgba(255,255,255,0.92)', flexDirection: 'row', alignItems: 'center', gap: 5, ...SHADOWS.soft }}>
                            <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: '#22c55e' }} />
                            <Text style={{ fontSize: 11, fontWeight: '700', color: '#374151' }}>LIVE</Text>
                        </View>
                    )}

                    <Pressable style={{ height: 42, width: 42, borderRadius: 21, backgroundColor: 'rgba(255,255,255,0.92)', alignItems: 'center', justifyContent: 'center', ...SHADOWS.soft }}>
                        <HelpCircle size={20} color="#111827" strokeWidth={2} />
                    </Pressable>
                </View>

                {/* Distance & ETA overlay on map */}
                {showRiderOnMap && roadRoute && (
                    <View style={{ position: 'absolute', bottom: 32, left: 16, right: 16, flexDirection: 'row', justifyContent: 'center' }}>
                        <View style={{ backgroundColor: 'rgba(255,255,255,0.95)', flexDirection: 'row', alignItems: 'center', gap: 16, paddingHorizontal: 20, paddingVertical: 10, borderRadius: 20, ...SHADOWS.soft }}>
                            <View style={{ alignItems: 'center' }}>
                                <Text style={{ fontSize: 16, fontWeight: '900', color: '#111827' }}>{roadRoute.distanceKm.toFixed(1)} km</Text>
                                <Text style={{ fontSize: 10, fontWeight: '600', color: '#9ca3af' }}>DISTANCE</Text>
                            </View>
                            <View style={{ width: 1, height: 28, backgroundColor: '#e5e7eb' }} />
                            <View style={{ alignItems: 'center' }}>
                                <Text style={{ fontSize: 16, fontWeight: '900', color: '#f97316' }}>{displayETA || Math.round(roadRoute.durationMinutes)} min</Text>
                                <Text style={{ fontSize: 10, fontWeight: '600', color: '#9ca3af' }}>ETA</Text>
                            </View>
                        </View>
                    </View>
                )}
            </View>

            {/* === BOTTOM SHEET CONTENT === */}
            <ScrollView
                style={{ flex: 1, marginTop: -24, borderTopLeftRadius: 24, borderTopRightRadius: 24, backgroundColor: '#fff', zIndex: 10 }}
                contentContainerStyle={{ paddingBottom: 110, paddingTop: 8 }}
                showsVerticalScrollIndicator={false}
            >
                {/* Handle Bar */}
                <View style={{ alignItems: 'center', paddingVertical: 10 }}>
                    <View style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: '#e5e7eb' }} />
                </View>

                {/* Status Banner */}
                <View style={{ marginHorizontal: 20, marginBottom: 20 }}>
                    <View style={{
                        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
                        backgroundColor: isDelivered ? '#f0fdf4' : '#fffbeb',
                        borderWidth: 1, borderColor: isDelivered ? '#bbf7d0' : '#fef3c7',
                        borderRadius: 16, padding: 16,
                    }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 }}>
                            {isActive && (
                                <View style={{ position: 'relative', width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}>
                                    <Animated.View style={[pulseStyle, { position: 'absolute', width: 44, height: 44, borderRadius: 22, backgroundColor: `${currentStatusConfig.color}20` }]} />
                                    <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: currentStatusConfig.color, alignItems: 'center', justifyContent: 'center' }}>
                                        <Text style={{ fontSize: 18 }}>{currentStatusConfig.emoji}</Text>
                                    </View>
                                </View>
                            )}
                            {isDelivered && (
                                <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: '#dcfce7', alignItems: 'center', justifyContent: 'center' }}>
                                    <CheckCircle size={24} color="#16a34a" />
                                </View>
                            )}
                            <View style={{ flex: 1 }}>
                                <Text style={{ fontSize: 17, fontWeight: '800', color: '#111827' }}>{currentStatusConfig.label}</Text>
                                <Text style={{ fontSize: 13, color: '#6b7280', fontWeight: '500', marginTop: 2 }}>
                                    {isDelivered
                                        ? `Delivered at ${new Date(order.updated_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
                                        : displayETA ? `ETA ${displayETA} mins` : 'Estimated time calculating...'}
                                </Text>
                            </View>
                        </View>
                    </View>
                </View>

                {/* Rider Card */}
                {order.rider && (
                    <View style={{ marginHorizontal: 20, marginBottom: 20 }}>
                        <View style={{ backgroundColor: '#111827', borderRadius: 20, padding: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', ...SHADOWS.medium }}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
                                <View style={{ width: 50, height: 50, borderRadius: 25, backgroundColor: 'rgba(255,255,255,0.15)', overflow: 'hidden', borderWidth: 2, borderColor: 'rgba(255,255,255,0.2)' }}>
                                    {order.rider.photo ? (
                                        <Image source={{ uri: order.rider.photo }} style={{ width: '100%', height: '100%' }} />
                                    ) : (
                                        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
                                            <Text style={{ fontSize: 22 }}>🏍️</Text>
                                        </View>
                                    )}
                                </View>
                                <View>
                                    <Text style={{ color: '#fff', fontWeight: '800', fontSize: 15 }}>{order.rider.name}</Text>
                                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 3 }}>
                                        <Star size={12} color="#fbbf24" fill="#fbbf24" />
                                        <Text style={{ color: 'rgba(255,255,255,0.6)', fontWeight: '600', fontSize: 12 }}>4.8 • {order.rider.vehicle || 'Bike'}</Text>
                                    </View>
                                </View>
                            </View>
                            <View style={{ flexDirection: 'row', gap: 10 }}>
                                <Pressable onPress={handleCall} style={{ height: 44, width: 44, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.1)', alignItems: 'center', justifyContent: 'center' }}>
                                    <Phone size={20} color="#fff" />
                                </Pressable>
                                <Pressable style={{ height: 44, width: 44, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.1)', alignItems: 'center', justifyContent: 'center' }}>
                                    <MessageSquare size={20} color="#fff" />
                                </Pressable>
                            </View>
                        </View>
                    </View>
                )}

                {/* Order Progress */}
                <View style={{ marginHorizontal: 20, marginBottom: 20 }}>
                    <Text style={{ fontSize: 15, fontWeight: '800', color: '#111827', marginBottom: 18 }}>Order Progress</Text>
                    {timelineSteps.map((step, index) => {
                        const state = getStepState(step.key);
                        const isLast = index === timelineSteps.length - 1;
                        const stepTime = getStepTime(step.key);

                        return (
                            <View key={step.key} style={{ flexDirection: 'row', alignItems: 'flex-start', paddingBottom: isLast ? 0 : 28, position: 'relative' }}>
                                {/* Line */}
                                {!isLast && (
                                    <View style={{
                                        position: 'absolute', left: 11, top: 26, bottom: 0, width: 2,
                                        backgroundColor: state === 'completed' ? '#22c55e' : '#f3f4f6',
                                        borderRadius: 1,
                                    }} />
                                )}
                                {/* Dot */}
                                <View style={{
                                    width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center',
                                    backgroundColor: state === 'completed' ? '#22c55e' : state === 'active' ? '#f97316' : '#f3f4f6',
                                    borderWidth: state === 'active' ? 3 : 0, borderColor: '#fed7aa',
                                }}>
                                    {state === 'completed' ? <CheckCircle size={13} color="#fff" strokeWidth={3} /> : null}
                                    {state === 'active' ? <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: '#fff' }} /> : null}
                                </View>
                                {/* Text */}
                                <View style={{ marginLeft: 14, flex: 1, paddingTop: 1 }}>
                                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <Text style={{ fontSize: 14, fontWeight: state === 'pending' ? '500' : '700', color: state === 'pending' ? '#c3c7cc' : '#111827' }}>
                                            {step.label}
                                        </Text>
                                        {stepTime && <Text style={{ fontSize: 11, fontWeight: '600', color: '#9ca3af' }}>{stepTime}</Text>}
                                    </View>
                                    <Text style={{ fontSize: 12, color: state === 'pending' ? '#d1d5db' : '#9ca3af', marginTop: 2, fontWeight: '500' }}>{step.desc}</Text>
                                </View>
                            </View>
                        );
                    })}
                </View>

                {/* Divider */}
                <View style={{ height: 8, backgroundColor: '#f5f5f5', marginBottom: 20 }} />

                {/* Delivery Address */}
                <View style={{ marginHorizontal: 20, marginBottom: 20 }}>
                    <Text style={{ fontSize: 15, fontWeight: '800', color: '#111827', marginBottom: 14 }}>Delivery Address</Text>
                    <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 14 }}>
                        <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: '#fef2f2', alignItems: 'center', justifyContent: 'center' }}>
                            <MapPin size={18} color="#ef4444" />
                        </View>
                        <View style={{ flex: 1 }}>
                            {d.buildingName && <Text style={{ fontSize: 15, fontWeight: '700', color: '#111827', marginBottom: 3 }}>{d.buildingName}</Text>}
                            <Text style={{ fontSize: 13, color: '#6b7280', lineHeight: 20 }}>{d.fullAddress || 'Address not available'}</Text>
                            {(d.floor || d.roomNumber) && (
                                <Text style={{ fontSize: 13, fontWeight: '600', color: '#374151', marginTop: 4 }}>
                                    Room {d.roomNumber || '-'} • Floor {d.floor || '-'}
                                </Text>
                            )}
                            {d.deliveryNote && (
                                <View style={{ backgroundColor: '#fffbeb', padding: 10, borderRadius: 10, marginTop: 8, borderWidth: 1, borderColor: '#fef3c7' }}>
                                    <Text style={{ fontSize: 12, fontWeight: '600', color: '#92400e', fontStyle: 'italic' }}>"{d.deliveryNote}"</Text>
                                </View>
                            )}
                        </View>
                    </View>
                </View>

                {/* Divider */}
                <View style={{ height: 8, backgroundColor: '#f5f5f5', marginBottom: 20 }} />

                {/* Order Items */}
                <View style={{ marginHorizontal: 20, marginBottom: 12 }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                        <Text style={{ fontSize: 15, fontWeight: '800', color: '#111827' }}>Order Summary</Text>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#f0fdf4', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 }}>
                            <Shield size={11} color="#16a34a" />
                            <Text style={{ fontSize: 10, fontWeight: '700', color: '#16a34a', textTransform: 'uppercase' }}>{order.payment_method || 'COD'}</Text>
                        </View>
                    </View>

                    {order.items.map((item: any, idx: number) => (
                        <View key={item.mealId + idx} style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 }}>
                                <View style={{ width: 28, height: 28, borderRadius: 6, backgroundColor: '#f3f4f6', alignItems: 'center', justifyContent: 'center' }}>
                                    <Text style={{ fontSize: 12, fontWeight: '800', color: '#6b7280' }}>{item.quantity}×</Text>
                                </View>
                                <Text style={{ fontSize: 14, fontWeight: '600', color: '#374151', flex: 1 }} numberOfLines={1}>{item.name}</Text>
                            </View>
                            <Text style={{ fontSize: 14, fontWeight: '700', color: '#111827' }}>₹{item.price * item.quantity}</Text>
                        </View>
                    ))}

                    <View style={{ height: 1, backgroundColor: '#f3f4f6', marginVertical: 12 }} />

                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
                        <Text style={{ fontSize: 13, fontWeight: '500', color: '#9ca3af' }}>Delivery Fee</Text>
                        <Text style={{ fontSize: 13, fontWeight: '600', color: '#374151' }}>₹40</Text>
                    </View>

                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 12, paddingTop: 14, borderTopWidth: 1, borderTopColor: '#e5e7eb', borderStyle: 'dashed' }}>
                        <Text style={{ fontSize: 16, fontWeight: '800', color: '#111827' }}>Total</Text>
                        <Text style={{ fontSize: 20, fontWeight: '900', color: '#111827' }}>₹{order.total_amount}</Text>
                    </View>
                </View>
            </ScrollView>

            {/* === BOTTOM BAR === */}
            <View
                style={{
                    position: 'absolute', bottom: 0, left: 0, right: 0,
                    backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#f3f4f6',
                    paddingTop: 14, paddingBottom: insets.bottom > 0 ? insets.bottom : 24, paddingHorizontal: 20,
                    ...SHADOWS.medium,
                }}
            >
                <View style={{ flexDirection: 'row', gap: 10 }}>
                    <Pressable
                        onPress={() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)}
                        style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 15, borderRadius: 14, backgroundColor: '#f5f5f5' }}
                    >
                        <Receipt size={17} color="#374151" />
                        <Text style={{ fontSize: 14, fontWeight: '700', color: '#374151' }}>Invoice</Text>
                    </Pressable>
                    <Pressable
                        onPress={() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)}
                        style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 15, borderRadius: 14, backgroundColor: '#111827', ...SHADOWS.soft }}
                    >
                        <RotateCcw size={17} color="#fff" />
                        <Text style={{ fontSize: 14, fontWeight: '700', color: '#fff' }}>Reorder</Text>
                    </Pressable>
                </View>
            </View>
        </View>
    );
}

// Subtle map styling (lighter, cleaner)
const mapStyle = [
    { featureType: 'poi', stylers: [{ visibility: 'off' }] },
    { featureType: 'transit', stylers: [{ visibility: 'off' }] },
    { featureType: 'road', elementType: 'labels.icon', stylers: [{ visibility: 'off' }] },
    { featureType: 'water', elementType: 'geometry.fill', stylers: [{ color: '#dbeafe' }] },
    { featureType: 'landscape', elementType: 'geometry.fill', stylers: [{ color: '#f8fafc' }] },
];
