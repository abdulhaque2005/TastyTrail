import { COLORS, SHADOWS } from "@/constant/Theme";
import { api } from "@/convex/_generated/api";
import { useAuth } from "@clerk/clerk-expo";
import { useConvexAuth, useMutation, useQuery } from "convex/react";
import { useRouter } from "expo-router";
import { useState } from "react";
import { View, Text, Pressable, ScrollView, ActivityIndicator, Alert, TextInput, Modal, KeyboardAvoidingView, Platform, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { ChevronLeft, MapPin, Check, Plus, Trash2, Home, Briefcase, Map, Navigation } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import MapView, { Marker } from 'react-native-maps';
import * as Location from 'expo-location';

export default function AddressesScreen() {
    const { isLoaded, isSignedIn } = useAuth();
    const { isAuthenticated } = useConvexAuth();
    const router = useRouter();

    const [isAddModalVisible, setAddModalVisible] = useState(false);
    const [newAddress, setNewAddress] = useState({ type: 'Home', fullAddress: '', phone: '' });
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [processingId, setProcessingId] = useState<string | null>(null);

    const addresses = useQuery(
        api.addresses.getAddresses,
        isLoaded && isSignedIn && isAuthenticated ? {} : "skip"
    );

    const addAddress = useMutation(api.addresses.addAddress);
    const removeAddress = useMutation(api.addresses.removeAddress);
    const setDefaultAddress = useMutation(api.addresses.setDefaultAddress);

    const handleBack = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        router.back();
    };

    const handleAddSubmit = async () => {
        if (!newAddress.fullAddress.trim() || !newAddress.phone.trim()) {
            Alert.alert("Missing Details", "Please provide complete address and phone number.");
            return;
        }

        try {
            setIsSubmitting(true);
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            await addAddress({
                type: newAddress.type,
                fullAddress: newAddress.fullAddress,
                phone: newAddress.phone,
                isDefault: addresses?.length === 0 // Make default if it's the first one
            });
            setAddModalVisible(false);
            setNewAddress({ type: 'Home', fullAddress: '', phone: '' });
        } catch (error) {
            Alert.alert("Error", "Could not save address");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDelete = (id: any) => {
        Alert.alert(
            "Delete Address",
            "Are you sure you want to delete this address?",
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Delete",
                    style: "destructive",
                    onPress: async () => {
                        try {
                            setProcessingId(id);
                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                            await removeAddress({ id });
                        } catch (e) {
                            Alert.alert("Error", "Could not delete address");
                        } finally {
                            setProcessingId(null);
                        }
                    }
                }
            ]
        );
    };

    const handleSetDefault = async (id: any, currentDefault: boolean) => {
        if (currentDefault) return;
        
        try {
            setProcessingId(id);
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            await setDefaultAddress({ id });
        } catch (e) {
            Alert.alert("Error", "Could not update default address");
        } finally {
            setProcessingId(null);
        }
    };

    const getIconForType = (type: string, color: string) => {
        switch(type) {
            case 'Home': return <Home size={20} color={color} strokeWidth={2.5} />;
            case 'Work': return <Briefcase size={20} color={color} strokeWidth={2.5} />;
            default: return <Map size={20} color={color} strokeWidth={2.5} />;
        }
    };

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.background }}>
            {/* Header */}
            <View className="flex-row items-center justify-between px-4 pt-1 pb-2 border-b border-[#f3e7d8] bg-white" style={SHADOWS.soft}>
                <Pressable onPress={handleBack} className="flex-row items-center gap-1 p-2 active:opacity-70">
                    <ChevronLeft size={24} color={COLORS.text} strokeWidth={2.5} />
                    <Text className="text-base font-bold text-[#1f2933]">Profile</Text>
                </Pressable>
                <Text className="text-[18px] font-bold text-[#1f2933]">My Addresses</Text>
                <Pressable onPress={() => router.push('/profile/add-address')} className="p-2 active:opacity-70">
                    <Plus size={24} color={COLORS.primary} strokeWidth={2.5} />
                </Pressable>
            </View>

            {/* Map Section */}
            {addresses !== undefined && addresses.length > 0 && (() => {
                const defaultAddr = addresses.find(a => a.isDefault) || addresses[0];
                const hasCoords = defaultAddr.latitude && defaultAddr.longitude;
                return (
                    <View className="h-52 w-full bg-gray-200 relative">
                        {hasCoords ? (
                            <MapView
                                style={StyleSheet.absoluteFillObject}
                                region={{
                                    latitude: defaultAddr.latitude!,
                                    longitude: defaultAddr.longitude!,
                                    latitudeDelta: 0.008,
                                    longitudeDelta: 0.008,
                                }}
                            >
                                <Marker
                                    coordinate={{
                                        latitude: defaultAddr.latitude!,
                                        longitude: defaultAddr.longitude!,
                                    }}
                                    title={defaultAddr.type}
                                    description={defaultAddr.fullAddress}
                                />
                            </MapView>
                        ) : (
                            <View className="flex-1 items-center justify-center">
                                <MapPin size={32} color="#9ca3af" />
                                <Text className="text-gray-400 mt-2 font-medium">No map coordinates</Text>
                            </View>
                        )}
                        <Pressable
                            className="absolute bottom-3 right-3 bg-white p-3 rounded-full flex-row items-center gap-2"
                            style={SHADOWS.medium}
                            onPress={async () => {
                                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                try {
                                    const { status } = await Location.requestForegroundPermissionsAsync();
                                    if (status !== 'granted') {
                                        Alert.alert('Permission needed', 'Allow location access to detect your current position.');
                                        return;
                                    }
                                    const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
                                    const geocode = await Location.reverseGeocodeAsync({ latitude: loc.coords.latitude, longitude: loc.coords.longitude });
                                    let addressStr = 'Current Location';
                                    if (geocode && geocode.length > 0) {
                                        const r = geocode[0];
                                        const parts = [r.name, r.street, r.district, r.city, r.region, r.postalCode].filter(Boolean);
                                        addressStr = [...new Set(parts)].join(', ') || 'Current Location';
                                    }
                                    await addAddress({
                                        type: 'Home',
                                        fullAddress: addressStr,
                                        phone: '',
                                        isDefault: true,
                                        latitude: loc.coords.latitude,
                                        longitude: loc.coords.longitude,
                                    });
                                    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                                } catch (e) {
                                    Alert.alert('Error', 'Could not detect location');
                                }
                            }}
                        >
                            <Navigation size={18} color="#f97316" />
                            <Text className="text-sm font-bold text-[#1f2933]">Current Location</Text>
                        </Pressable>
                    </View>
                );
            })()}

            <ScrollView className="flex-1" contentContainerClassName="px-5 pb-10 pt-5" showsVerticalScrollIndicator={false}>
                <Animated.View entering={FadeInDown.duration(400)}>
                    <Text className="text-2xl font-black text-[#1f2933]">Saved Addresses</Text>
                    <Text className="mt-1 text-sm text-[#6b7280]">Manage your delivery locations</Text>
                </Animated.View>

                {addresses === undefined ? (
                    <View className="mt-20 items-center">
                        <ActivityIndicator size="large" color={COLORS.primary} />
                    </View>
                ) : addresses.length === 0 ? (
                    <Animated.View entering={FadeInUp.duration(500)} className="mt-12 items-center rounded-3xl bg-white p-8 border border-[#f3e7d8]">
                        <View className="h-20 w-20 items-center justify-center rounded-full bg-[#ffedd5]">
                            <MapPin size={36} color={COLORS.primary} strokeWidth={2} />
                        </View>
                        <Text className="mt-5 text-xl font-bold text-[#1f2933]">No addresses saved</Text>
                        <Text className="mt-2 text-center text-[15px] leading-6 text-[#6b7280]">
                            Add an address so we can deliver your favorite meals directly to you.
                        </Text>
                        <Pressable
                            onPress={() => router.push('/profile/add-address')}
                            className="mt-6 rounded-2xl bg-[#f97316] px-6 py-3.5 active:opacity-90 flex-row items-center gap-2"
                            style={SHADOWS.glow}
                        >
                            <Plus size={18} color="#fff" strokeWidth={3} />
                            <Text className="text-base font-bold text-white">Add Address</Text>
                        </Pressable>
                    </Animated.View>
                ) : (
                    <View className="mt-6 gap-4">
                        {addresses.map((addr, index) => (
                            <Animated.View 
                                key={addr._id}
                                entering={FadeInUp.duration(400).delay(index * 100)}
                                className={`rounded-3xl bg-white p-5 border ${addr.isDefault ? 'border-[#f97316]' : 'border-[#f3e7d8]'}`}
                                style={SHADOWS.soft}
                            >
                                <Pressable onPress={() => handleSetDefault(addr._id, addr.isDefault)}>
                                    <View className="flex-row justify-between items-start">
                                        <View className="flex-row items-center gap-3">
                                            <View className={`h-10 w-10 items-center justify-center rounded-full ${addr.isDefault ? 'bg-[#ffedd5]' : 'bg-[#f8fafc]'}`}>
                                                {getIconForType(addr.type, addr.isDefault ? COLORS.primary : '#9ca3af')}
                                            </View>
                                            <View>
                                                <View className="flex-row items-center gap-2">
                                                    <Text className="text-lg font-bold text-[#1f2933]">{addr.type}</Text>
                                                    {addr.isDefault && (
                                                        <View className="rounded-md bg-[#f97316] px-2 py-0.5">
                                                            <Text className="text-[10px] font-bold text-white uppercase">Primary</Text>
                                                        </View>
                                                    )}
                                                </View>
                                                <Text className="text-sm font-medium text-[#6b7280] mt-1">{addr.phone}</Text>
                                            </View>
                                        </View>
                                        
                                        <Pressable 
                                            onPress={() => handleDelete(addr._id)}
                                            disabled={processingId === addr._id}
                                            className="p-2"
                                        >
                                            {processingId === addr._id ? (
                                                <ActivityIndicator size="small" color={COLORS.danger} />
                                            ) : (
                                                <Trash2 size={20} color="#ef4444" />
                                            )}
                                        </Pressable>
                                    </View>
                                    
                                    <Text className="mt-4 text-[15px] leading-6 text-[#4b5563]">
                                        {addr.fullAddress}
                                    </Text>
                                    
                                    {!addr.isDefault && (
                                        <View className="mt-4 flex-row items-center gap-2 border-t border-[#f3e7d8] pt-4">
                                            <View className="h-5 w-5 rounded-full border-2 border-[#d1d5db]" />
                                            <Text className="text-sm font-bold text-[#6b7280]">Tap to set as default</Text>
                                        </View>
                                    )}
                                    {addr.isDefault && (
                                        <View className="mt-4 flex-row items-center gap-2 border-t border-[#ffedd5] pt-4">
                                            <View className="h-5 w-5 items-center justify-center rounded-full bg-[#f97316]">
                                                <Check size={12} color="#fff" strokeWidth={4} />
                                            </View>
                                            <Text className="text-sm font-bold text-[#f97316]">Default delivery address</Text>
                                        </View>
                                    )}
                                </Pressable>
                            </Animated.View>
                        ))}
                    </View>
                )}
            </ScrollView>

            {/* Add Address Modal */}
            <Modal visible={isAddModalVisible} animationType="slide" presentationStyle="pageSheet">
                <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1, backgroundColor: '#f8fafc' }}>
                    <View className="flex-row justify-between items-center px-5 py-4 border-b border-[#f3e7d8] bg-white">
                        <Text className="text-xl font-bold text-[#1f2933]">Add New Address</Text>
                        <Pressable onPress={() => setAddModalVisible(false)} className="p-2">
                            <Text className="text-base font-bold text-[#6b7280]">Cancel</Text>
                        </Pressable>
                    </View>
                    
                    <ScrollView contentContainerClassName="p-5">
                        <Text className="text-sm font-bold text-[#6b7280] mb-3">Address Type</Text>
                        <View className="flex-row gap-3 mb-6">
                            {['Home', 'Work', 'Other'].map(type => (
                                <Pressable 
                                    key={type}
                                    onPress={() => setNewAddress({...newAddress, type})}
                                    className={`flex-1 flex-row items-center justify-center gap-2 rounded-xl py-3 border ${newAddress.type === type ? 'bg-[#ffedd5] border-[#f97316]' : 'bg-white border-[#f3e7d8]'}`}
                                >
                                    {getIconForType(type, newAddress.type === type ? COLORS.primary : '#9ca3af')}
                                    <Text className={`font-bold ${newAddress.type === type ? 'text-[#f97316]' : 'text-[#6b7280]'}`}>{type}</Text>
                                </Pressable>
                            ))}
                        </View>
                        
                        <Text className="text-sm font-bold text-[#6b7280] mb-2">Complete Address</Text>
                        <TextInput 
                            value={newAddress.fullAddress}
                            onChangeText={(t) => setNewAddress({...newAddress, fullAddress: t})}
                            placeholder="House No, Building, Street, City"
                            multiline
                            numberOfLines={3}
                            className="bg-white border border-[#f3e7d8] rounded-2xl p-4 text-base text-[#1f2933] mb-6 min-h-[100px]"
                            textAlignVertical="top"
                        />
                        
                        <Text className="text-sm font-bold text-[#6b7280] mb-2">Phone Number</Text>
                        <TextInput 
                            value={newAddress.phone}
                            onChangeText={(t) => setNewAddress({...newAddress, phone: t})}
                            placeholder="Receiver's mobile number"
                            keyboardType="phone-pad"
                            className="bg-white border border-[#f3e7d8] rounded-2xl p-4 text-base text-[#1f2933] mb-8"
                        />
                        
                        <Pressable 
                            onPress={handleAddSubmit}
                            disabled={isSubmitting}
                            className="bg-[#f97316] rounded-2xl py-4 items-center justify-center active:opacity-90"
                            style={SHADOWS.glow}
                        >
                            {isSubmitting ? (
                                <ActivityIndicator color="#fff" />
                            ) : (
                                <Text className="text-lg font-bold text-white">Save Address</Text>
                            )}
                        </Pressable>
                    </ScrollView>
                </KeyboardAvoidingView>
            </Modal>
        </SafeAreaView>
    );
}
