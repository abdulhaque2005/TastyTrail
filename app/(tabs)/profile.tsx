import { COLORS, SHADOWS } from "@/constant/Theme";
import { useAuth, useUser } from "@clerk/clerk-expo";
import { View, Text, Pressable, TextInput, Alert, ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import { Redirect, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useConvexAuth, useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { useState, useEffect } from "react";
import * as ImagePicker from 'expo-image-picker';
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";

export default function ProfileScreen() {
    const { isSignedIn, signOut } = useAuth();
    const { user } = useUser();
    const router = useRouter();
    const { isAuthenticated } = useConvexAuth();

    const [isEditing, setIsEditing] = useState(false);
    const [editName, setEditName] = useState("");
    const [isSaving, setIsSaving] = useState(false);

    const savedMeals = useQuery(
        api.savedMeals.getSavedMeals,
        isSignedIn && isAuthenticated ? {} : "skip"
    );
    
    const orders = useQuery(
        api.orders.getOrders,
        isSignedIn && isAuthenticated ? {} : "skip"
    );
    
    const profile = useQuery(
        api.userProfiles.getProfile,
        isSignedIn && isAuthenticated ? {} : "skip"
    );
    
    const updateProfile = useMutation(api.userProfiles.updateProfile);

    useEffect(() => {
        if (profile?.displayName || user?.fullName) {
            setEditName(profile?.displayName || user?.fullName || "");
        }
    }, [profile?.displayName, user?.fullName]);

    if (!isSignedIn) {
        return <Redirect href={"/"} />
    }

    const handleLogOut = async () => {
        try {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            await signOut();
        } catch (error) {
            console.log("Logout error:", error);
        }
    };
    
    const handleSaveName = async () => {
        if (!editName.trim()) return;
        
        try {
            setIsSaving(true);
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            await updateProfile({ displayName: editName.trim() });
            
            // Also try to update Clerk profile
            await user?.update({
                firstName: editName.trim().split(' ')[0],
                lastName: editName.trim().split(' ').slice(1).join(' ')
            });
            
            setIsEditing(false);
        } catch (error) {
            Alert.alert("Error", "Could not update profile name");
        } finally {
            setIsSaving(false);
        }
    };
    
    const pickImage = async () => {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
            Alert.alert('Permission needed', 'Sorry, we need camera roll permissions to change your avatar.');
            return;
        }

        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            aspect: [1, 1],
            quality: 0.5,
            base64: true
        });

        if (!result.canceled && result.assets[0].base64) {
            try {
                setIsSaving(true);
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                
                const base64Img = `data:image/jpeg;base64,${result.assets[0].base64}`;
                
                await updateProfile({ profileImage: base64Img });
                await user?.setProfileImage({ file: base64Img });
                
            } catch (error) {
                Alert.alert("Error", "Could not update profile picture");
            } finally {
                setIsSaving(false);
            }
        }
    };

    const displayName = profile?.displayName || user?.fullName || "User";
    const displayImage = profile?.profileImage || user?.imageUrl;
    const email = profile?.phone || user?.primaryEmailAddress?.emailAddress || "user@gmail.com";

    const MenuItem = ({ icon, title, subtitle, onPress, index }: { icon: keyof typeof Ionicons.glyphMap, title: string, subtitle: string, onPress: () => void, index: number }) => (
        <Animated.View entering={FadeInUp.duration(400).delay(100 + (index * 50))}>
            <Pressable 
                onPress={() => {
                    Haptics.selectionAsync();
                    onPress();
                }}
                className="flex-row items-center justify-between bg-white px-5 py-4 border-b border-[#f3e7d8] active:bg-[#fff8ef]"
            >
                <View className="flex-row items-center gap-4">
                    <View className="h-10 w-10 items-center justify-center rounded-full bg-[#fff8ef]">
                        <Ionicons name={icon} size={20} color="#f97316" />
                    </View>
                    <View>
                        <Text className="text-base font-bold text-[#1f2933]">{title}</Text>
                        <Text className="text-xs font-medium text-[#9ca3af]">{subtitle}</Text>
                    </View>
                </View>
                <Ionicons name="chevron-forward" size={20} color="#d1d5db" />
            </Pressable>
        </Animated.View>
    );

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: '#f8fafc' }}>
            <KeyboardAvoidingView 
                behavior={Platform.OS === "ios" ? "padding" : "height"}
                style={{ flex: 1 }}
            >
                <ScrollView contentContainerClassName="flex-grow pb-10" showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">

                    {/* Premium Profile Header */}
                    <Animated.View entering={FadeInDown.duration(600)} className="bg-white px-6 pb-6 pt-8 rounded-b-[32px] border-b border-[#f3e7d8]" style={SHADOWS.soft}>
                        
                        <View className="flex-row items-center justify-between">
                            {/* Avatar */}
                            <Pressable 
                                onPress={pickImage}
                                disabled={isSaving}
                                className="relative rounded-full" 
                            >
                                {displayImage ? (
                                    <Image
                                        source={{ uri: displayImage }}
                                        style={{ width: 85, height: 85, borderRadius: 45, borderWidth: 3, borderColor: '#fff8ef' }}
                                    />
                                ) : (
                                    <View className="h-[85px] w-[85px] items-center justify-center rounded-full bg-[#f97316] border-4 border-[#fff8ef]">
                                        <Text className="text-4xl font-bold text-white">
                                            {displayName[0] ?? "U"}
                                        </Text>
                                    </View>
                                )}
                                
                                <View className="absolute bottom-0 right-0 h-8 w-8 items-center justify-center rounded-full bg-white shadow-sm border border-[#f3e7d8]">
                                    {isSaving ? (
                                        <ActivityIndicator size="small" color="#f97316" />
                                    ) : (
                                        <Ionicons name="camera" size={16} color="#f97316" />
                                    )}
                                </View>
                            </Pressable>

                            {/* Name & Email Info */}
                            <View className="flex-1 ml-5">
                                {isEditing ? (
                                    <View className="flex-row items-center bg-[#f8fafc] rounded-xl px-3 py-1 border border-[#e2e8f0]">
                                        <TextInput 
                                            value={editName}
                                            onChangeText={setEditName}
                                            className="flex-1 text-lg font-bold text-[#1f2933] py-1"
                                            placeholder="Your name"
                                            placeholderTextColor="#9ca3af"
                                            autoFocus
                                            returnKeyType="done"
                                            onSubmitEditing={handleSaveName}
                                        />
                                        <Pressable onPress={handleSaveName} disabled={isSaving} className="ml-2 p-1">
                                            {isSaving ? (
                                                <ActivityIndicator size="small" color="#f97316" />
                                            ) : (
                                                <Ionicons name="checkmark-circle" size={24} color="#22c55e" />
                                            )}
                                        </Pressable>
                                    </View>
                                ) : (
                                    <View className="flex-row items-center justify-between">
                                        <Text className="text-2xl font-black text-[#1f2933] flex-1" numberOfLines={1}>
                                            {displayName}
                                        </Text>
                                        <Pressable 
                                            onPress={() => {
                                                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                                setIsEditing(true);
                                            }}
                                            className="p-1"
                                        >
                                            <Ionicons name="pencil" size={18} color="#9ca3af" />
                                        </Pressable>
                                    </View>
                                )}
                                <Text className="mt-1 text-sm font-medium text-[#6b7280]">
                                    {email}
                                </Text>
                                
                                <View className="mt-2 flex-row items-center gap-1 self-start rounded-full bg-[#fef3c7] px-2 py-0.5">
                                    <Ionicons name="star" size={12} color="#d97706" />
                                    <Text className="text-[11px] font-bold text-[#d97706]">Foodie Level 1</Text>
                                </View>
                            </View>
                        </View>
                    </Animated.View>

                    {/* Membership / PRO Banner */}
                    <Animated.View entering={FadeInUp.duration(600).delay(100)} className="px-5 mt-6">
                        <LinearGradient 
                            colors={['#f97316', '#fb923c']}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 1 }}
                            className="rounded-3xl p-5"
                            style={SHADOWS.glow}
                        >
                            <View className="flex-row items-center justify-between">
                                <View>
                                    <View className="flex-row items-center gap-1.5">
                                        <Text className="text-xl font-black text-white italic">TastyTrail</Text>
                                        <View className="rounded-md bg-white px-1.5 py-0.5">
                                            <Text className="text-[10px] font-black text-[#f97316]">PRO</Text>
                                        </View>
                                    </View>
                                    <Text className="mt-1 text-xs font-semibold text-white/90">Unlimited Free Deliveries</Text>
                                </View>
                                <Pressable className="rounded-full bg-white px-4 py-2">
                                    <Text className="text-xs font-bold text-[#f97316]">Join Now</Text>
                                </Pressable>
                            </View>
                        </LinearGradient>
                    </Animated.View>

                    {/* Menu Options */}
                    <View className="mt-6 border-t border-[#f3e7d8]">
                        <MenuItem 
                            index={0}
                            icon="receipt" 
                            title="Food Orders" 
                            subtitle={`${orders?.length ?? 0} past orders`}
                            onPress={() => router.push('/(tabs)/orders')} 
                        />
                        <MenuItem 
                            index={1}
                            icon="heart" 
                            title="Saved Meals" 
                            subtitle={`${savedMeals?.length ?? 0} favorite items`}
                            onPress={() => router.push('/(tabs)/saved')} 
                        />
                        <MenuItem 
                            index={2}
                            icon="location" 
                            title="Manage Addresses" 
                            subtitle="Home, Work, Other"
                            onPress={() => router.push('/profile/addresses')} 
                        />
                        <MenuItem 
                            index={3}
                            icon="card" 
                            title="Payments" 
                            subtitle="Cards, UPI & Wallets"
                            onPress={() => router.push('/profile/payments')} 
                        />
                        <MenuItem 
                            index={4}
                            icon="chatbubbles" 
                            title="Help & Support" 
                            subtitle="Customer Care & FAQs"
                            onPress={() => router.push('/profile/support')} 
                        />
                    </View>

                    {/* Logout Button */}
                    <Animated.View entering={FadeInUp.duration(600).delay(400)} className="px-5 mt-8">
                        <Pressable
                            onPress={handleLogOut}
                            className="flex-row items-center justify-center gap-2 rounded-2xl bg-white border border-[#fecaca] py-4 active:bg-[#fef2f2]"
                            style={SHADOWS.soft}
                        >
                            <Ionicons name="log-out" size={20} color="#ef4444" />
                            <Text className="text-base font-bold text-[#ef4444]">Log Out</Text>
                        </Pressable>
                    </Animated.View>
                    
                    <Text className="mt-6 text-center text-xs font-medium text-[#9ca3af]">
                        App Version 1.0.0
                    </Text>

                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}