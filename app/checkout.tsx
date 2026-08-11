import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, Pressable, ActivityIndicator, Alert, StyleSheet, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { useQuery, useMutation, useAction } from 'convex/react';
import { useAuth } from '@clerk/clerk-expo';
import { api } from '@/convex/_generated/api';
import { ChevronLeft, MapPin, CreditCard, Banknote, Receipt, CheckCircle, AlertTriangle, FileText, Smartphone, Wallet, Shield, ChevronRight } from 'lucide-react-native';
import MapView, { Marker } from 'react-native-maps';
import * as Haptics from 'expo-haptics';
import { useStripe } from '@stripe/stripe-react-native';
import { COLORS, SHADOWS } from '@/constant/Theme';
import { Image } from 'expo-image';
import { placeSupabaseOrder } from '@/services/supabaseOrders';
import { startAutoSimulation } from '@/services/autoSimulator';
import { LinearGradient } from 'expo-linear-gradient';

type CheckoutItem = {
    mealId: string;
    name: string;
    imageUrl?: string;
    price: number;
    quantity: number;
};

type PaymentMethod = 'COD' | 'UPI' | 'CARD' | 'WALLET';

const PAYMENT_METHODS: { key: PaymentMethod; label: string; sublabel: string; icon: any; color: string; bgColor: string }[] = [
    { key: 'UPI', label: 'UPI', sublabel: 'Google Pay, PhonePe, Paytm', icon: Smartphone, color: '#6366f1', bgColor: '#eef2ff' },
    { key: 'CARD', label: 'Credit / Debit Card', sublabel: 'Visa, Mastercard, RuPay', icon: CreditCard, color: '#3b82f6', bgColor: '#eff6ff' },
    { key: 'WALLET', label: 'Tasty Wallet', sublabel: 'Balance: ₹1,250.00', icon: Wallet, color: '#f97316', bgColor: '#fff7ed' },
    { key: 'COD', label: 'Cash on Delivery', sublabel: 'Pay when your order arrives', icon: Banknote, color: '#16a34a', bgColor: '#f0fdf4' },
];

export default function CheckoutScreen() {
    const params = useLocalSearchParams();
    const type = params.type as 'cart' | 'direct';
    const parsedAmount = params.amount ? parseFloat(params.amount as string) : 0;
    const directItemsStr = params.items as string;
    const { userId } = useAuth();

    const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null);
    const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('UPI');
    const [isPlacingOrder, setIsPlacingOrder] = useState(false);
    const [showPaymentProcessing, setShowPaymentProcessing] = useState(false);
    const [paymentStep, setPaymentStep] = useState(0);

    const { initPaymentSheet, presentPaymentSheet } = useStripe();

    const addresses = useQuery(api.addresses.getAddresses);
    const cartItems = useQuery(api.cart.getCart);
    const placeOrder = useMutation(api.orders.placeOrder);
    const clearCart = useMutation(api.cart.clearCart);
    const createPaymentIntent = useAction(api.payments.createPaymentIntent);

    useEffect(() => {
        if (addresses && addresses.length > 0 && !selectedAddressId) {
            const def = addresses.find(a => a.isDefault) || addresses[0];
            setSelectedAddressId(def._id);
        }
    }, [addresses]);

    const getItems = (): CheckoutItem[] => {
        if (type === 'direct' && directItemsStr) {
            try {
                return JSON.parse(directItemsStr);
            } catch (e) {
                return [];
            }
        } else if (type === 'cart' && cartItems) {
            return cartItems.map(item => ({
                mealId: item.mealId,
                name: item.name,
                imageUrl: item.imageUrl,
                price: item.price,
                quantity: item.quantity,
            }));
        }
        return [];
    };

    const items = getItems();
    
    const itemTotal = type === 'direct' ? parsedAmount : items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const deliveryFee = 40;
    const platformFee = 5;
    const gstAmount = Math.round(itemTotal * 0.05);
    const discount = paymentMethod === 'WALLET' ? Math.min(50, Math.round(itemTotal * 0.1)) : 0;
    const grandTotal = itemTotal + deliveryFee + platformFee + gstAmount - discount;

    const isLoading = addresses === undefined || (type === 'cart' && cartItems === undefined);

    // Payment processing animation
    const paymentSteps = [
        'Securing transaction...',
        'Verifying payment method...',
        paymentMethod === 'UPI' ? 'Waiting for UPI confirmation...' : 
        paymentMethod === 'CARD' ? 'Processing card payment...' :
        paymentMethod === 'WALLET' ? 'Deducting from wallet...' :
        'Confirming COD order...',
        'Payment successful! ✓',
    ];

    const handlePlaceOrder = async () => {
        if (!selectedAddressId) {
            Alert.alert("Missing Address", "Please add a delivery address.");
            return;
        }
        if (items.length === 0) {
            Alert.alert("Error", "No items to order.");
            return;
        }

        const selectedAddr = addresses?.find(a => a._id === selectedAddressId);
        if (!selectedAddr) {
            Alert.alert("Error", "Address not found.");
            return;
        }

        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
        setIsPlacingOrder(true);

        try {
            // Real Stripe Processing for Card and UPI
            if (paymentMethod === 'CARD' || paymentMethod === 'UPI') {
                // 1. Fetch Payment Intent from Backend
                const { clientSecret } = await createPaymentIntent({
                    amount: grandTotal,
                });

                // 2. Initialize Payment Sheet
                const initResult = await initPaymentSheet({
                    merchantDisplayName: "TastyTrail",
                    paymentIntentClientSecret: clientSecret,
                    allowsDelayedPaymentMethods: true,
                    defaultBillingDetails: {
                        name: 'Test User',
                    },
                    appearance: {
                        colors: {
                            primary: '#f97316',
                            background: '#ffffff',
                            componentBackground: '#f3f4f6',
                            componentBorder: '#e5e7eb',
                            componentDivider: '#e5e7eb',
                            primaryText: '#1f2933',
                            secondaryText: '#6b7280',
                            componentText: '#1f2933',
                            placeholderText: '#9ca3af',
                        },
                        shapes: {
                            borderRadius: 16,
                        }
                    }
                });

                if (initResult.error) {
                    Alert.alert("Initialization Error", initResult.error.message);
                    setIsPlacingOrder(false);
                    return;
                }

                // 3. Present Payment Sheet
                const presentResult = await presentPaymentSheet();

                if (presentResult.error) {
                    if (presentResult.error.code === 'Canceled') {
                        setIsPlacingOrder(false);
                        return; // User canceled
                    }
                    Alert.alert("Payment Error", presentResult.error.message);
                    setIsPlacingOrder(false);
                    return;
                }
                
                // Payment Successful!
            } else if (paymentMethod === 'WALLET') {
                // Mock Wallet processing
                setShowPaymentProcessing(true);
                setPaymentStep(0);
                for (let i = 0; i < paymentSteps.length; i++) {
                    await new Promise(resolve => setTimeout(resolve, 800));
                    setPaymentStep(i + 1);
                }
                await new Promise(resolve => setTimeout(resolve, 500));
                setShowPaymentProcessing(false);
            }
            const deliveryData = {
                fullAddress: selectedAddr.fullAddress,
                buildingName: selectedAddr.buildingName,
                floor: selectedAddr.floor,
                roomNumber: selectedAddr.roomNumber,
                deliveryType: selectedAddr.deliveryType || selectedAddr.type,
                deliveryNote: selectedAddr.deliveryNote,
                phone: selectedAddr.phone,
                latitude: selectedAddr.latitude,
                longitude: selectedAddr.longitude,
                landmarkPhotos: selectedAddr.landmarkPhotos,
            };

            // Place order in Convex
            const convexResult = await placeOrder({
                items: items,
                totalAmount: grandTotal,
                paymentMethod: paymentMethod,
                delivery: deliveryData,
            });

            // Place order in Supabase (real-time tracking)
            let supabaseOrderId: string | null = null;
            try {
                const supabaseResult = await placeSupabaseOrder({
                    userId: userId || 'unknown',
                    items: items,
                    totalAmount: grandTotal,
                    paymentMethod: paymentMethod,
                    delivery: deliveryData,
                });
                supabaseOrderId = supabaseResult.orderId;

                // 🚀 Auto-start the simulation engine!
                // This makes the order progress through stages automatically
                if (supabaseOrderId) {
                    startAutoSimulation(supabaseOrderId);
                }
            } catch (err) {
                console.error('Supabase order failed (non-critical):', err);
            }

            if (type === 'cart') {
                await clearCart();
            }

            const addressPreview = selectedAddr.type + " • " + selectedAddr.fullAddress.split(',')[0];

            router.replace({
                pathname: '/order-success',
                params: { 
                    orderId: supabaseOrderId || convexResult.orderId,
                    address: addressPreview,
                    isSupabase: supabaseOrderId ? 'true' : 'false',
                }
            });
            
        } catch (err: any) {
            console.error("Order error", err);
            const msg = err.message || "";
            if (msg.includes("Stripe is not configured")) {
                Alert.alert("Payment Error", "Stripe is not configured. Please use Cash on Delivery (COD) or Wallet for testing.");
            } else {
                Alert.alert("Checkout Failed", "Could not place your order. Please try again.");
            }
        } finally {
            setIsPlacingOrder(false);
        }
    };

    if (isLoading) {
        return (
            <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.background, justifyContent: 'center', alignItems: 'center' }}>
                <ActivityIndicator size="large" color={COLORS.primary} />
            </SafeAreaView>
        );
    }

    const selectedAddress = addresses?.find(a => a._id === selectedAddressId);
    
    const hasMapData = selectedAddress?.latitude && selectedAddress?.longitude;
    const mapRegion = hasMapData ? {
        latitude: selectedAddress.latitude!,
        longitude: selectedAddress.longitude!,
        latitudeDelta: 0.005,
        longitudeDelta: 0.005,
    } : null;

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.background }}>
            <View className="flex-row items-center justify-between px-4 pt-1 pb-2 border-b border-[#f3e7d8]">
                <Pressable onPress={() => router.back()} className="flex-row items-center gap-1 rounded-full px-2 py-2 active:opacity-70">
                    <ChevronLeft size={24} color={COLORS.text} strokeWidth={2.5} />
                </Pressable>
                <Text className="text-xl font-bold text-[#1f2933]">Checkout</Text>
                <View className="w-10" />
            </View>

            <ScrollView className="flex-1 px-5 pt-6" showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 140 }}>
                
                {/* Delivery Address Section */}
                <View className="mb-6">
                    <View className="flex-row items-center justify-between mb-3">
                        <Text className="text-lg font-bold text-[#1f2933]">Delivery Address</Text>
                        <Pressable onPress={() => router.push('/profile/add-address' as any)}>
                            <Text className="text-sm font-bold text-[#f97316]">Change</Text>
                        </Pressable>
                    </View>
                    
                    {selectedAddress ? (
                        <View className="rounded-3xl bg-white overflow-hidden border border-[#f3e7d8]" style={SHADOWS.soft}>
                            {mapRegion ? (
                                <View className="h-32 w-full relative">
                                    <MapView 
                                        style={StyleSheet.absoluteFillObject}
                                        region={mapRegion}
                                        pitchEnabled={false}
                                        scrollEnabled={false}
                                        zoomEnabled={false}
                                    >
                                        <Marker coordinate={{ latitude: mapRegion.latitude, longitude: mapRegion.longitude }} />
                                    </MapView>
                                </View>
                            ) : null}

                            <View className="p-4">
                                <View className="flex-row items-center gap-2 mb-1">
                                    <View className="bg-orange-100 px-2 py-0.5 rounded-md">
                                        <Text className="text-[11px] font-bold text-orange-600 uppercase">{selectedAddress.deliveryType || selectedAddress.type || 'Home'}</Text>
                                    </View>
                                    {selectedAddress.buildingName && (
                                        <Text className="text-sm font-bold text-gray-800">{selectedAddress.buildingName}</Text>
                                    )}
                                </View>
                                <Text className="text-[13px] leading-5 text-[#6b7280]" numberOfLines={2}>
                                    {selectedAddress.fullAddress}
                                </Text>
                            </View>
                        </View>
                    ) : (
                        <Pressable 
                            onPress={() => router.push('/profile/add-address' as any)}
                            className="items-center justify-center rounded-3xl border-2 border-dashed border-[#f97316] bg-[#fff8ef] p-6 active:opacity-70"
                        >
                            <MapPin size={24} color="#f97316" strokeWidth={2} />
                            <Text className="mt-2 text-base font-bold text-[#f97316]">Add Delivery Address</Text>
                        </Pressable>
                    )}
                </View>

                {/* Payment Methods Section */}
                <View className="mb-6">
                    <Text className="mb-3 text-lg font-bold text-[#1f2933]">Payment Method</Text>
                    <View className="gap-3">
                        {PAYMENT_METHODS.map((method) => {
                            const Icon = method.icon;
                            const isActive = paymentMethod === method.key;
                            return (
                                <Pressable 
                                    key={method.key}
                                    onPress={() => {
                                        Haptics.selectionAsync();
                                        setPaymentMethod(method.key);
                                    }}
                                    className={`flex-row items-center justify-between rounded-2xl border-2 p-4 ${isActive ? 'border-[#f97316]' : 'border-transparent bg-white'}`}
                                    style={[
                                        isActive ? { backgroundColor: '#fff8ef' } : SHADOWS.soft,
                                        { backgroundColor: isActive ? '#fff8ef' : '#fff' }
                                    ]}
                                >
                                    <View className="flex-row items-center gap-3 flex-1">
                                        <View style={{ backgroundColor: method.bgColor }} className="h-11 w-11 items-center justify-center rounded-xl">
                                            <Icon size={22} color={method.color} />
                                        </View>
                                        <View className="flex-1">
                                            <Text className="text-[15px] font-bold text-[#1f2933]">{method.label}</Text>
                                            <Text className="text-[12px] text-gray-500 font-medium mt-0.5">{method.sublabel}</Text>
                                        </View>
                                    </View>
                                    {isActive ? (
                                        <CheckCircle size={22} color="#f97316" />
                                    ) : (
                                        <View className="h-5 w-5 rounded-full border-2 border-gray-300" />
                                    )}
                                </Pressable>
                            );
                        })}
                    </View>
                </View>

                {/* Order Summary Section */}
                <View className="mb-6">
                    <Text className="mb-3 text-lg font-bold text-[#1f2933]">Order Summary</Text>
                    <View className="rounded-3xl bg-white p-5 border border-[#f3e7d8]" style={SHADOWS.soft}>
                        
                        {items.map((item, idx) => (
                            <View key={item.mealId + idx} className="mb-3 flex-row items-center justify-between">
                                <View className="flex-row items-center gap-3 flex-1">
                                    <View className="h-7 w-7 rounded-md bg-gray-100 items-center justify-center">
                                        <Text className="text-[12px] font-bold text-[#6b7280]">{item.quantity}×</Text>
                                    </View>
                                    <Text className="text-[14px] font-semibold text-[#1f2933] flex-1" numberOfLines={1}>{item.name}</Text>
                                </View>
                                <Text className="text-[14px] font-bold text-[#1f2933]">₹{item.price * item.quantity}</Text>
                            </View>
                        ))}
                        
                        <View className="my-3 h-[1px] bg-[#f3e7d8]" />
                        
                        <View className="gap-2">
                            <View className="flex-row justify-between">
                                <Text className="text-[13px] text-gray-500">Item Total</Text>
                                <Text className="text-[13px] font-semibold text-[#1f2933]">₹{itemTotal}</Text>
                            </View>
                            <View className="flex-row justify-between">
                                <Text className="text-[13px] text-gray-500">Delivery Fee</Text>
                                <Text className="text-[13px] font-semibold text-[#1f2933]">₹{deliveryFee}</Text>
                            </View>
                            <View className="flex-row justify-between">
                                <Text className="text-[13px] text-gray-500">Platform Fee</Text>
                                <Text className="text-[13px] font-semibold text-[#1f2933]">₹{platformFee}</Text>
                            </View>
                            <View className="flex-row justify-between">
                                <Text className="text-[13px] text-gray-500">GST (5%)</Text>
                                <Text className="text-[13px] font-semibold text-[#1f2933]">₹{gstAmount}</Text>
                            </View>
                            {discount > 0 && (
                                <View className="flex-row justify-between">
                                    <Text className="text-[13px] text-green-600 font-medium">Wallet Discount</Text>
                                    <Text className="text-[13px] font-semibold text-green-600">-₹{discount}</Text>
                                </View>
                            )}
                        </View>
                        
                        <View className="my-3 h-[1px] bg-[#f3e7d8]" />
                        
                        <View className="flex-row justify-between items-center">
                            <Text className="text-[17px] font-black text-[#1f2933]">Total Payable</Text>
                            <Text className="text-[20px] font-black text-[#f97316]">₹{grandTotal}</Text>
                        </View>
                    </View>
                </View>

                {/* Security Badge */}
                <View className="flex-row items-center justify-center gap-2 mb-4">
                    <Shield size={14} color="#16a34a" />
                    <Text className="text-[11px] font-bold text-gray-500">100% Secure & Encrypted Payment</Text>
                </View>

            </ScrollView>

            {/* Bottom CTA */}
            <View className="absolute bottom-0 left-0 right-0 bg-white border-t border-[#f3e7d8]" style={{ paddingBottom: 24, paddingTop: 16, paddingHorizontal: 20, shadowColor: '#000', shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.05, shadowRadius: 10, elevation: 20 }}>
                <View className="flex-row items-center justify-between mb-3">
                    <Text className="text-[13px] text-gray-500 font-medium">Total</Text>
                    <Text className="text-[20px] font-black text-[#1f2933]">₹{grandTotal}</Text>
                </View>
                <Pressable
                    onPress={handlePlaceOrder}
                    disabled={isPlacingOrder || !selectedAddressId}
                    className="flex-row items-center justify-center gap-2 rounded-2xl bg-[#f97316] px-8 py-4 active:bg-[#ea580c] disabled:opacity-50"
                    style={SHADOWS.glow}
                >
                    {isPlacingOrder ? (
                        <ActivityIndicator color="#fff" size="small" />
                    ) : (
                        <>
                            <Text className="text-[16px] font-black text-white tracking-wide">
                                {paymentMethod === 'COD' ? 'Place Order' : `Pay ₹${grandTotal}`}
                            </Text>
                            <ChevronRight size={20} color="#fff" strokeWidth={2.5} />
                        </>
                    )}
                </Pressable>
            </View>

            {/* Payment Processing Modal */}
            <Modal visible={showPaymentProcessing} transparent animationType="fade">
                <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center', paddingHorizontal: 32 }}>
                    <View style={{ backgroundColor: '#fff', borderRadius: 28, padding: 32, width: '100%', alignItems: 'center', ...SHADOWS.medium }}>
                        {paymentStep < paymentSteps.length ? (
                            <>
                                <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: '#eef2ff', alignItems: 'center', justifyContent: 'center', marginBottom: 20 }}>
                                    <ActivityIndicator size="large" color="#6366f1" />
                                </View>
                                <Text style={{ fontSize: 18, fontWeight: '800', color: '#111827', marginBottom: 8, textAlign: 'center' }}>
                                    Processing Payment
                                </Text>
                                <Text style={{ fontSize: 14, fontWeight: '500', color: '#6b7280', textAlign: 'center' }}>
                                    {paymentSteps[Math.min(paymentStep, paymentSteps.length - 1)]}
                                </Text>
                                {/* Progress dots */}
                                <View style={{ flexDirection: 'row', gap: 6, marginTop: 24 }}>
                                    {paymentSteps.map((_, i) => (
                                        <View key={i} style={{
                                            width: i <= paymentStep ? 24 : 8,
                                            height: 8,
                                            borderRadius: 4,
                                            backgroundColor: i <= paymentStep ? '#6366f1' : '#e5e7eb',
                                        }} />
                                    ))}
                                </View>
                            </>
                        ) : (
                            <>
                                <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: '#f0fdf4', alignItems: 'center', justifyContent: 'center', marginBottom: 20 }}>
                                    <CheckCircle size={36} color="#16a34a" />
                                </View>
                                <Text style={{ fontSize: 18, fontWeight: '800', color: '#16a34a', textAlign: 'center' }}>
                                    Payment Successful!
                                </Text>
                            </>
                        )}
                    </View>
                </View>
            </Modal>
        </SafeAreaView>
    );
}
