import React, { useState } from 'react';
import { View, Text, TextInput, ScrollView, Pressable, ActivityIndicator, Alert, StyleSheet, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronLeft, MapPin, Camera, Navigation, Building, Info, FileText } from 'lucide-react-native';
import { router } from 'expo-router';
import MapView, { Marker } from 'react-native-maps';
import * as Haptics from 'expo-haptics';
import { useMutation } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { COLORS, SHADOWS } from '@/constant/Theme';
import { Image } from 'expo-image';
import * as Location from 'expo-location';

const { width } = Dimensions.get('window');

const DELIVERY_TYPES = [
    "Home", "Apartment", "Hostel", "Office", "College", 
    "Hospital", "Parking", "Main Gate", "Reception", "Security Gate"
];

const INITIAL_REGION = {
    latitude: 28.7041,
    longitude: 77.1025,
    latitudeDelta: 0.05,
    longitudeDelta: 0.05,
};

export default function AddAddressScreen() {
    const addAddress = useMutation(api.addresses.addAddress);
    
    const [region, setRegion] = useState(INITIAL_REGION);
    const [pinnedLocation, setPinnedLocation] = useState({ latitude: INITIAL_REGION.latitude, longitude: INITIAL_REGION.longitude });
    
    const [type, setType] = useState('Home');
    const [deliveryType, setDeliveryType] = useState('Apartment');
    const [fullAddress, setFullAddress] = useState('');
    const [buildingName, setBuildingName] = useState('');
    const [floor, setFloor] = useState('');
    const [roomNumber, setRoomNumber] = useState('');
    const [phone, setPhone] = useState('');
    const [deliveryNote, setDeliveryNote] = useState('');
    const [isDefault, setIsDefault] = useState(true);
    const [landmarkPhotos, setLandmarkPhotos] = useState<string[]>([]);
    
    const [loading, setLoading] = useState(false);
    const [fetchingLocation, setFetchingLocation] = useState(true);

    const reverseGeocode = async (lat: number, lon: number) => {
        try {
            const geocode = await Location.reverseGeocodeAsync({ latitude: lat, longitude: lon });
            if (geocode && geocode.length > 0) {
                const result = geocode[0];
                const addressStr = [
                    result.streetNumber, 
                    result.street, 
                    result.district, 
                    result.city, 
                    result.region, 
                    result.postalCode
                ].filter(Boolean).join(', ');
                
                if (addressStr) setFullAddress(addressStr);
                if (result.name && !result.name.includes(result.street || '')) {
                    setBuildingName(result.name);
                }
            }
        } catch (e) {
            console.log("Geocoding error", e);
        }
    };

    React.useEffect(() => {
        (async () => {
            try {
                const { status } = await Location.requestForegroundPermissionsAsync();
                if (status !== 'granted') {
                    Alert.alert('Permission denied', 'Allow location access to pin your exact delivery spot.');
                    setFetchingLocation(false);
                    return;
                }

                const location = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
                const currentRegion = {
                    latitude: location.coords.latitude,
                    longitude: location.coords.longitude,
                    latitudeDelta: 0.005,
                    longitudeDelta: 0.005,
                };
                
                setRegion(currentRegion);
                setPinnedLocation({ latitude: currentRegion.latitude, longitude: currentRegion.longitude });
                await reverseGeocode(currentRegion.latitude, currentRegion.longitude);
            } catch (error) {
                console.log("Error fetching location", error);
            } finally {
                setFetchingLocation(false);
            }
        })();
    }, []);

    const handleMockPhotoUpload = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        const mockPhotoUrl = 'https://images.unsplash.com/photo-1542361345-89e58247f2d5?q=80&w=500';
        setLandmarkPhotos([...landmarkPhotos, mockPhotoUrl]);
    };

    const handleSave = async () => {
        if (!fullAddress.trim() || !phone.trim() || !buildingName.trim()) {
            Alert.alert("Missing Details", "Please fill in Building Name, Full Address, and Phone Number.");
            return;
        }

        try {
            setLoading(true);
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

            await addAddress({
                type,
                deliveryType,
                fullAddress,
                buildingName,
                floor: floor || undefined,
                roomNumber: roomNumber || undefined,
                latitude: pinnedLocation.latitude,
                longitude: pinnedLocation.longitude,
                landmarkPhotos: landmarkPhotos.length > 0 ? landmarkPhotos : undefined,
                deliveryNote: deliveryNote || undefined,
                phone,
                isDefault,
            });

            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            router.back();
        } catch (error) {
            Alert.alert("Error", "Could not save address. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.background }}>
            <View className="flex-row items-center justify-between px-4 pt-2 pb-3 bg-white z-10" style={SHADOWS.soft}>
                <Pressable onPress={() => router.back()} className="p-2 active:opacity-70">
                    <ChevronLeft size={24} color="#1f2933" strokeWidth={2.5} />
                </Pressable>
                <Text className="text-[18px] font-bold text-[#1f2933]">Smart Delivery Pin</Text>
                <View className="w-10" />
            </View>

            <ScrollView className="flex-1" contentContainerStyle={{ paddingBottom: 100 }} showsVerticalScrollIndicator={false}>
                
                <View className="h-64 w-full bg-gray-200 relative justify-center items-center">
                    {fetchingLocation ? (
                        <View className="items-center justify-center">
                            <ActivityIndicator size="large" color="#f97316" />
                            <Text className="mt-2 text-gray-500 font-medium text-sm">Getting real location...</Text>
                        </View>
                    ) : (
                        <>
                            <MapView 
                                style={StyleSheet.absoluteFillObject}
                                region={region}
                                onRegionChangeComplete={async (r) => {
                                    setRegion(r);
                                    setPinnedLocation({ latitude: r.latitude, longitude: r.longitude });
                                    Haptics.selectionAsync();
                                    await reverseGeocode(r.latitude, r.longitude);
                                }}
                            >
                            </MapView>
                            <View className="absolute top-1/2 left-1/2" style={{ transform: [{ translateX: -15 }, { translateY: -30 }] }}>
                                <MapPin size={30} color="#f97316" fill="#f97316" strokeWidth={2} />
                            </View>
                        </>
                    )}
                    <Pressable 
                        className="absolute bottom-3 right-3 bg-white p-3 rounded-full" 
                        style={SHADOWS.soft}
                        onPress={async () => {
                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                            try {
                                const location = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
                                setRegion({
                                    latitude: location.coords.latitude,
                                    longitude: location.coords.longitude,
                                    latitudeDelta: 0.005,
                                    longitudeDelta: 0.005,
                                });
                                await reverseGeocode(location.coords.latitude, location.coords.longitude);
                            } catch (e) {}
                        }}
                    >
                        <Navigation size={22} color="#f97316" />
                    </Pressable>
                </View>

                <View className="px-5 pt-6 bg-white -mt-4 rounded-t-3xl shadow-lg">
                    
                    <View className="bg-orange-50 rounded-xl p-3 flex-row items-center gap-3 mb-6 border border-orange-100">
                        <Info size={20} color="#f97316" />
                        <Text className="flex-1 text-sm text-orange-800 font-medium leading-5">
                            This exact pin location will be <Text className="font-bold">locked</Text> for your delivery. The rider will navigate precisely to this spot.
                        </Text>
                    </View>

                    <Text className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-3">Delivery Type</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-6">
                        <View className="flex-row gap-2">
                            {DELIVERY_TYPES.map(t => (
                                <Pressable 
                                    key={t}
                                    onPress={() => setDeliveryType(t)}
                                    className={`px-4 py-2 rounded-full border ${deliveryType === t ? 'bg-orange-500 border-orange-500' : 'bg-white border-gray-200'}`}
                                >
                                    <Text className={`text-sm font-semibold ${deliveryType === t ? 'text-white' : 'text-gray-600'}`}>{t}</Text>
                                </Pressable>
                            ))}
                        </View>
                    </ScrollView>

                    <Text className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-3">Location Details</Text>
                    
                    <View className="flex-row gap-3 mb-4">
                        <View className="flex-1">
                            <TextInput 
                                value={buildingName}
                                onChangeText={setBuildingName}
                                placeholder="Building / Apartment Name *"
                                className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3.5 text-[15px] text-gray-800 font-medium"
                            />
                        </View>
                    </View>

                    <View className="flex-row gap-3 mb-4">
                        <View className="flex-1">
                            <TextInput 
                                value={floor}
                                onChangeText={setFloor}
                                placeholder="Floor (Optional)"
                                className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3.5 text-[15px] text-gray-800 font-medium"
                            />
                        </View>
                        <View className="flex-1">
                            <TextInput 
                                value={roomNumber}
                                onChangeText={setRoomNumber}
                                placeholder="Room/Flat No."
                                className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3.5 text-[15px] text-gray-800 font-medium"
                            />
                        </View>
                    </View>

                    <TextInput 
                        value={fullAddress}
                        onChangeText={setFullAddress}
                        placeholder="Complete Street Address *"
                        className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3.5 mb-4 text-[15px] text-gray-800 font-medium"
                    />

                    <TextInput 
                        value={phone}
                        onChangeText={setPhone}
                        placeholder="Contact Phone Number *"
                        keyboardType="phone-pad"
                        className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3.5 mb-6 text-[15px] text-gray-800 font-medium"
                    />

                    <View className="flex-row items-center justify-between mb-3">
                        <Text className="text-sm font-bold text-gray-500 uppercase tracking-wider">Smart Landmark Photos</Text>
                        <Text className="text-xs text-orange-500 font-bold">Recommended</Text>
                    </View>
                    <Text className="text-sm text-gray-500 mb-3 leading-5">Add a photo of your building gate, entrance, or a nearby landmark to help riders find you faster.</Text>
                    
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-6">
                        <View className="flex-row gap-3">
                            <Pressable 
                                onPress={handleMockPhotoUpload}
                                className="h-24 w-24 rounded-xl border-2 border-dashed border-gray-300 bg-gray-50 items-center justify-center active:opacity-70"
                            >
                                <Camera size={24} color="#9ca3af" />
                                <Text className="text-xs text-gray-500 mt-1 font-medium">Add Photo</Text>
                            </Pressable>
                            
                            {landmarkPhotos.map((photo, i) => (
                                <View key={i} className="h-24 w-24 rounded-xl overflow-hidden border border-gray-200">
                                    <Image source={{ uri: photo }} style={{ width: '100%', height: '100%' }} contentFit="cover" />
                                </View>
                            ))}
                        </View>
                    </ScrollView>

                    <Text className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-3">Smart Delivery Note</Text>
                    <View className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 mb-6 flex-row items-start gap-3">
                        <FileText size={20} color="#9ca3af" style={{ marginTop: 2 }} />
                        <TextInput 
                            value={deliveryNote}
                            onChangeText={setDeliveryNote}
                            placeholder="e.g. Come to Hostel Gate, Don't ring the bell, Call when you arrive..."
                            multiline
                            numberOfLines={3}
                            className="flex-1 text-[15px] text-gray-800 font-medium"
                            style={{ minHeight: 80, textAlignVertical: 'top' }}
                        />
                    </View>

                    <Pressable
                        onPress={handleSave}
                        disabled={loading}
                        className="bg-orange-500 rounded-2xl py-4 items-center justify-center active:bg-orange-600 flex-row gap-2"
                        style={SHADOWS.glow}
                    >
                        {loading ? (
                            <ActivityIndicator color="white" />
                        ) : (
                            <>
                                <MapPin size={18} color="white" />
                                <Text className="text-white font-bold text-[16px]">Save Smart Delivery Pin</Text>
                            </>
                        )}
                    </Pressable>
                    <View className="h-10" />
                </View>

            </ScrollView>
        </SafeAreaView>
    );
}
