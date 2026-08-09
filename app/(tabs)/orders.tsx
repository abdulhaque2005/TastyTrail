import { COLORS, SHADOWS } from "@/constant/Theme";
import { useAuth } from "@clerk/clerk-expo";
import { Redirect, useRouter } from "expo-router";
import { View, Text, ScrollView, ActivityIndicator, Pressable, StyleSheet, RefreshControl } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Package, Clock, CheckCircle2, MapPin, Navigation, ChevronRight, Zap, ShoppingBag } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { Image } from "expo-image";
import MapView, { Marker } from "react-native-maps";
import { useOrders } from "@/lib/useOrders";
import { STATUS_CONFIG } from "@/lib/supabase";
import React, { useState, useCallback } from "react";

export default function OrdersScreen() {
    const { isLoaded, isSignedIn, userId } = useAuth();
    const router = useRouter();
    const [refreshing, setRefreshing] = useState(false);

    const { orders, activeOrders, pastOrders, isLoading, refetch } = useOrders(
        isLoaded && isSignedIn ? userId! : undefined
    );

    const onRefresh = useCallback(async () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setRefreshing(true);
        await refetch();
        setRefreshing(false);
    }, [refetch]);

    if (!isSignedIn) {
        return <Redirect href={'/auth/sign-in'} />
    }

    const getStatusColor = (status: string) => STATUS_CONFIG[status.toLowerCase()]?.color || COLORS.muted;
    const getStatusLabel = (status: string) => STATUS_CONFIG[status.toLowerCase()]?.label || status.replace(/_/g, ' ');
    const getStatusEmoji = (status: string) => STATUS_CONFIG[status.toLowerCase()]?.emoji || '📦';

    // Active order card (prominent, with map)
    const renderActiveCard = (order: any, index: number) => {
        const d = order.delivery;
        const hasMapData = d?.latitude && d?.longitude;
        const statusColor = getStatusColor(order.status);

        return (
            <View key={order.id}>
                <Pressable
                    onPress={() => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        router.push(`/order/${order.id}` as any);
                    }}
                    style={{ backgroundColor: '#fff', borderRadius: 20, overflow: 'hidden', marginBottom: 16, ...SHADOWS.soft }}
                >
                    {/* Map Preview */}
                    <View style={{ height: 120, backgroundColor: '#f3f4f6' }}>
                        {hasMapData ? (
                            <MapView
                                style={StyleSheet.absoluteFillObject}
                                region={{ latitude: d.latitude!, longitude: d.longitude!, latitudeDelta: 0.005, longitudeDelta: 0.005 }}
                                pitchEnabled={false} scrollEnabled={false} zoomEnabled={false}
                            >
                                <Marker coordinate={{ latitude: d.latitude!, longitude: d.longitude! }}>
                                    <View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: '#ef4444', alignItems: 'center', justifyContent: 'center', borderWidth: 3, borderColor: '#fff' }}>
                                        <MapPin size={12} color="#fff" fill="#fff" />
                                    </View>
                                </Marker>
                            </MapView>
                        ) : (
                            <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
                                <MapPin size={24} color="#d1d5db" />
                            </View>
                        )}

                        {/* Live Badge */}
                        <View style={{ position: 'absolute', top: 10, right: 10, flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#111827', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20 }}>
                            <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: '#22c55e' }} />
                            <Text style={{ color: '#fff', fontSize: 10, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.5 }}>Live</Text>
                        </View>

                        {/* Address Overlay */}
                        <View style={{ position: 'absolute', bottom: 0, left: 0, right: 0, paddingHorizontal: 14, paddingBottom: 8, paddingTop: 20, backgroundColor: 'rgba(0,0,0,0.03)' }}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                <View style={{ backgroundColor: 'rgba(0,0,0,0.6)', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 }}>
                                    <Text style={{ color: '#fff', fontSize: 9, fontWeight: '700', textTransform: 'uppercase' }}>{d?.deliveryType || 'Home'}</Text>
                                </View>
                                <Text style={{ color: '#374151', fontSize: 12, fontWeight: '600', flex: 1 }} numberOfLines={1}>{d?.fullAddress || 'Address'}</Text>
                            </View>
                        </View>
                    </View>

                    {/* Content */}
                    <View style={{ padding: 16 }}>
                        {/* Status */}
                        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                                <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: `${statusColor}15`, alignItems: 'center', justifyContent: 'center' }}>
                                    <Text style={{ fontSize: 16 }}>{getStatusEmoji(order.status)}</Text>
                                </View>
                                <View>
                                    <Text style={{ fontSize: 15, fontWeight: '700', color: '#111827' }}>{getStatusLabel(order.status)}</Text>
                                    <Text style={{ fontSize: 11, fontWeight: '500', color: '#9ca3af', marginTop: 1 }}>
                                        {new Date(order.ordered_at).toLocaleDateString()} • {new Date(order.ordered_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </Text>
                                </View>
                            </View>
                            <ChevronRight size={20} color="#d1d5db" />
                        </View>

                        {/* Items */}
                        <View style={{ height: 1, backgroundColor: '#f3f4f6', marginBottom: 12 }} />
                        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 }}>
                                <View style={{ flexDirection: 'row' }}>
                                    {order.items.slice(0, 3).map((item: any, i: number) => (
                                        <View key={i} style={{ width: 28, height: 28, borderRadius: 14, borderWidth: 2, borderColor: '#fff', overflow: 'hidden', backgroundColor: '#f3f4f6', marginLeft: i > 0 ? -8 : 0 }}>
                                            {item.imageUrl && <Image source={{ uri: item.imageUrl }} style={{ width: '100%', height: '100%' }} />}
                                        </View>
                                    ))}
                                </View>
                                <Text style={{ fontSize: 13, fontWeight: '500', color: '#6b7280', flex: 1 }} numberOfLines={1}>
                                    {order.items.map((i: any) => i.name).join(', ')}
                                </Text>
                            </View>
                            <Text style={{ fontSize: 16, fontWeight: '800', color: '#111827' }}>₹{order.total_amount}</Text>
                        </View>

                        {/* Rider Info */}
                        {order.rider && (
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 12, backgroundColor: '#f9fafb', padding: 10, borderRadius: 12 }}>
                                {order.rider.photo ? (
                                    <Image source={{ uri: order.rider.photo }} style={{ width: 24, height: 24, borderRadius: 12 }} />
                                ) : (
                                    <Text>🏍️</Text>
                                )}
                                <Text style={{ fontSize: 12, fontWeight: '600', color: '#374151' }}>{order.rider.name}</Text>
                                {order.rider.eta && <Text style={{ fontSize: 11, fontWeight: '600', color: '#9ca3af' }}>• ETA {order.rider.eta} min</Text>}
                            </View>
                        )}
                    </View>
                </Pressable>
            </View>
        );
    };

    // Past order card (compact)
    const renderPastCard = (order: any, index: number) => {
        return (
            <View key={order.id}>
                <Pressable
                    onPress={() => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        router.push(`/order/${order.id}` as any);
                    }}
                    style={{ backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', ...SHADOWS.soft }}
                >
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14, flex: 1 }}>
                        {/* Image Stack */}
                        <View style={{ width: 48, height: 48, borderRadius: 14, backgroundColor: '#f3f4f6', overflow: 'hidden', alignItems: 'center', justifyContent: 'center' }}>
                            {order.items[0]?.imageUrl ? (
                                <Image source={{ uri: order.items[0].imageUrl }} style={{ width: '100%', height: '100%' }} />
                            ) : (
                                <ShoppingBag size={20} color="#d1d5db" />
                            )}
                        </View>
                        <View style={{ flex: 1 }}>
                            <Text style={{ fontSize: 14, fontWeight: '700', color: '#111827' }} numberOfLines={1}>
                                {order.items.map((i: any) => i.name).join(', ')}
                            </Text>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 }}>
                                <Text style={{ fontSize: 12, fontWeight: '500', color: '#9ca3af' }}>
                                    {new Date(order.ordered_at).toLocaleDateString()}
                                </Text>
                                <View style={{ width: 3, height: 3, borderRadius: 1.5, backgroundColor: '#d1d5db' }} />
                                <Text style={{ fontSize: 12, fontWeight: '500', color: '#9ca3af' }}>{order.items.length} items</Text>
                                <View style={{ width: 3, height: 3, borderRadius: 1.5, backgroundColor: '#d1d5db' }} />
                                <Text style={{ fontSize: 12, fontWeight: '700', color: '#374151' }}>₹{order.total_amount}</Text>
                            </View>
                        </View>
                    </View>

                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#f0fdf4', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 }}>
                        <CheckCircle2 size={12} color="#16a34a" />
                        <Text style={{ fontSize: 10, fontWeight: '700', color: '#16a34a' }}>Done</Text>
                    </View>
                </Pressable>
            </View>
        );
    };

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: '#fafafa' }}>
            <ScrollView
                style={{ flex: 1 }}
                contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 30 }}
                showsVerticalScrollIndicator={false}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} colors={[COLORS.primary]} />
                }
            >
                {/* Title */}
                <Animated.View entering={FadeInDown.duration(400)} style={{ marginTop: 16, marginBottom: 24 }}>
                    <Text style={{ fontSize: 28, fontWeight: '900', color: '#111827' }}>My Orders</Text>
                    {orders.length > 0 && (
                        <Text style={{ fontSize: 14, fontWeight: '500', color: '#9ca3af', marginTop: 4 }}>
                            {activeOrders.length > 0 ? `${activeOrders.length} active order${activeOrders.length > 1 ? 's' : ''}` : 'All orders delivered'}
                        </Text>
                    )}
                </Animated.View>

                {/* Loading */}
                {isLoading ? (
                    <View style={{ marginTop: 60, alignItems: 'center' }}>
                        <ActivityIndicator size="large" color={COLORS.primary} />
                        <Text style={{ marginTop: 14, fontSize: 14, fontWeight: '500', color: '#9ca3af' }}>Loading orders...</Text>
                    </View>
                ) : orders.length === 0 ? (
                    /* Empty */
                    <Animated.View entering={FadeInUp.duration(500)} style={{ marginTop: 40, alignItems: 'center', backgroundColor: '#fff', borderRadius: 24, padding: 40, ...SHADOWS.soft }}>
                        <View style={{ width: 72, height: 72, borderRadius: 36, backgroundColor: '#fff7ed', alignItems: 'center', justifyContent: 'center', marginBottom: 20 }}>
                            <ShoppingBag size={32} color="#f97316" />
                        </View>
                        <Text style={{ fontSize: 20, fontWeight: '800', color: '#111827', marginBottom: 8 }}>No orders yet</Text>
                        <Text style={{ fontSize: 14, fontWeight: '500', color: '#9ca3af', textAlign: 'center', lineHeight: 20 }}>
                            Explore meals and place your{'\n'}first order today!
                        </Text>
                        <Pressable
                            onPress={() => router.push('/(tabs)')}
                            style={{ marginTop: 24, backgroundColor: '#f97316', paddingHorizontal: 28, paddingVertical: 14, borderRadius: 14, ...SHADOWS.glow }}
                        >
                            <Text style={{ fontSize: 14, fontWeight: '700', color: '#fff' }}>Browse Meals</Text>
                        </Pressable>
                    </Animated.View>
                ) : (
                    <>
                        {/* Active Orders */}
                        {activeOrders.length > 0 && (
                            <View style={{ marginBottom: 24 }}>
                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 14 }}>
                                    <View style={{ width: 7, height: 7, borderRadius: 3.5, backgroundColor: '#22c55e' }} />
                                    <Text style={{ fontSize: 13, fontWeight: '800', color: '#6b7280', textTransform: 'uppercase', letterSpacing: 1 }}>
                                        Active ({activeOrders.length})
                                    </Text>
                                </View>
                                {activeOrders.map((order, idx) => renderActiveCard(order, idx))}
                            </View>
                        )}

                        {/* Past Orders */}
                        {pastOrders.length > 0 && (
                            <View>
                                <Text style={{ fontSize: 13, fontWeight: '800', color: '#d1d5db', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 14 }}>
                                    Past Orders ({pastOrders.length})
                                </Text>
                                {pastOrders.map((order, idx) => renderPastCard(order, idx))}
                            </View>
                        )}
                    </>
                )}
            </ScrollView>
        </SafeAreaView>
    );
}
