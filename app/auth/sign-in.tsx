import React, { useState } from "react";
import { View, Text, Pressable, ActivityIndicator, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { ChevronLeft } from "lucide-react-native";
import * as Haptics from 'expo-haptics';
import { useRouter } from "expo-router";
import { useAuth, useSSO } from "@clerk/clerk-expo";
import { Ionicons } from '@expo/vector-icons';
import * as WebBrowser from 'expo-web-browser';
import { getClerkSSORedirectUrl } from "@/lib/auth";
import { useAppstore } from "@/store/userAppstore";
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";

WebBrowser.maybeCompleteAuthSession();

export default function SignInScreen() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const { startSSOFlow } = useSSO();
    const { clearPendingAuthAction } = useAppstore(state => state);

    const handleBack = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        if (router.canGoBack()) {
            router.back();
        } else {
            router.replace("/");
        }
    };

    const handleGoogle = async () => {
        try {
            setLoading(true);
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            const redirectUrl = getClerkSSORedirectUrl();
            const { createdSessionId, setActive, authSessionResult } = await startSSOFlow({
                strategy: 'oauth_google',
                redirectUrl
            });
            if (authSessionResult?.type === "cancel") {
                return;
            }
            if (createdSessionId && setActive) {
                await setActive({ session: createdSessionId });
                clearPendingAuthAction();
                if (router.canDismiss()) {
                    router.dismissAll();
                } else {
                    router.replace("/");
                }
                return;
            }
        } catch (err) {
            console.log(err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <View style={{ flex: 1, backgroundColor: '#f8fafc' }}>
            <View style={{ height: '50%', width: '100%', position: 'absolute', top: 0 }}>
                <Image 
                    source={{ uri: 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?q=80&w=1000' }} 
                    style={{ width: '100%', height: '100%' }} 
                    contentFit="cover" 
                />
                <LinearGradient 
                    colors={['transparent', 'rgba(248,250,252,0.2)', '#f8fafc']} 
                    locations={[0, 0.7, 1]}
                    style={{ position: 'absolute', width: '100%', height: '100%', bottom: 0 }} 
                />
            </View>

            <SafeAreaView style={{ flex: 1 }}>
                
                {/* Header */}
                <View style={{ paddingHorizontal: 20, paddingTop: 10 }}>
                    <Pressable 
                        onPress={handleBack} 
                        style={({ pressed }) => [
                            { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', padding: 10, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.9)', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 3 },
                            pressed && { opacity: 0.7 }
                        ]}
                    >
                        <ChevronLeft size={20} color="#1f2933" strokeWidth={2.5} />
                    </Pressable>
                </View>

                <View style={{ flex: 1, justifyContent: 'center', paddingHorizontal: 24 }}>
                    
                    <Animated.View entering={FadeInUp.duration(600).delay(100)}>
                        <View style={{ 
                            backgroundColor: 'white', 
                            borderRadius: 32, 
                            padding: 32, 
                            shadowColor: '#000', 
                            shadowOffset: { width: 0, height: 10 }, 
                            shadowOpacity: 0.05, 
                            shadowRadius: 20, 
                            elevation: 5 
                        }}>
                            
                            <View style={{ width: 64, height: 64, borderRadius: 20, backgroundColor: '#fff3e0', justifyContent: 'center', alignItems: 'center', marginBottom: 24 }}>
                                <Ionicons name="restaurant" size={28} color="#F97316" />
                            </View>

                            <Text style={{ fontSize: 32, fontWeight: '900', color: '#1f2933', marginBottom: 12, lineHeight: 40 }}>
                                Delicious Meals,{'\n'}
                                <Text style={{ color: '#F97316' }}>Delivered Fast</Text>
                            </Text>

                            <Text style={{ fontSize: 16, color: '#64748b', lineHeight: 24, marginBottom: 40, fontWeight: '500' }}>
                                Sign in to explore personalized recommendations and track your orders in real-time.
                            </Text>

                            {/* Google Button */}
                            <Pressable
                                onPress={handleGoogle}
                                disabled={loading}
                                style={{
                                    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
                                    backgroundColor: '#1f2933', paddingVertical: 18, borderRadius: 16,
                                    opacity: loading ? 0.6 : 1
                                }}
                            >
                                {loading ? (
                                    <ActivityIndicator color="#fff" />
                                ) : (
                                    <>
                                        <Ionicons name="logo-google" size={20} color="#fff" style={{ marginRight: 12 }} />
                                        <Text style={{ fontSize: 16, fontWeight: 'bold', color: '#fff' }}>Continue with Google</Text>
                                    </>
                                )}
                            </Pressable>
                        </View>
                    </Animated.View>

                </View>
            </SafeAreaView>
        </View>
    );
}