import { COLORS, SHADOWS } from "@/constant/Theme";
import { ChevronLeft } from "lucide-react-native";
import { Pressable, View, Text, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import * as Haptics from 'expo-haptics'
import { useRouter } from "expo-router";
import { useAuth, useSSO } from "@clerk/clerk-expo";
import { LinearGradient } from 'expo-linear-gradient'
import { Ionicons } from '@expo/vector-icons'
import { useState } from "react";
import * as WebBrowser from 'expo-web-browser';
import { getClerkSSORedirectUrl } from "@/lib/auth";
import { useAppstore } from "@/store/userAppstore";
WebBrowser.maybeCompleteAuthSession()
export default function SignINScreen() {
    const router = useRouter();
    const { isLoaded, isSignedIn } = useAuth();
    const [loading,setLoading] = useState(false)
    const {startSSOFlow} = useSSO()
    const {clearPendingAuthAction} = useAppstore(state=>state)
    const handleBack = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
        if (router.canGoBack()) {
            router.back();
        }
        else {
            router.replace("/")
        }
    }

     const handleGoogle = async ()=>{
       try{
        setLoading(true)
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        const redirectUrl =getClerkSSORedirectUrl();
        const {createdSessionId,setActive,authSessionResult} = await startSSOFlow ({
            strategy:'oauth_google',
            redirectUrl
        })
        if(authSessionResult?.type==="cancel"){
            return
        }
        if(createdSessionId && setActive){
            await setActive({session:createdSessionId});
            clearPendingAuthAction();
            if (router.canDismiss()) {
                router.dismissAll();
            } else {
                router.replace("/");
            }
            return
        }
       } 
       catch(err){
        console.log(err)
       }
       finally{
        setLoading(false)
       }
     }
    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.background }}>
            <View className="px-4 pt-1">
                <Pressable onPress={handleBack} className="flex-row items-center gap-1 rounded-full opacity-70 self-start">
                    <ChevronLeft size={22} strokeWidth={2.5} color={COLORS.text} />
                    <Text className="text-base font-semibold ">Back</Text>
                </Pressable>
            </View>

            <View className="flex-1 justify-center px-5 pb-7">
                <LinearGradient
                    colors={["#f97316", '#fb923c', "#ffedd5"]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={{
                        height: 6,
                        borderRadius: 999,
                        marginBottom: 20
                    }}
                />
                <View className="rounded-3xl bg-white p-6" style={SHADOWS.soft}>
                    <View className="mb-4 h-14 w-14 items-center justify-center rounded-2xl bg-[#ffedd5]">
                        <Ionicons name="restaurant-outline" size={28} color={COLORS.primary} />
                    </View>
                    <Text className="text-2xl font-bold leading-tight text-black">Welcome to Mealapp</Text>
                    <Text className="mt-3 text-base leading-6 text-[#6b7180]" >Sign in with google to save your favorite meals</Text>
                    <Pressable onPress={handleGoogle} disabled={loading} style={SHADOWS.soft} className="mt-8 border-cyan-400 border flex-row items-center justify-center gap-3 rounded-2xl bg-white  py-4 active:opacity-90 disabled:opacity-60 ">
                        {
                        loading? (<ActivityIndicator />) :(
                            <>
                            <Ionicons name="logo-google" size={24} color={COLORS.primary} />
                            <Text className="text-base font-semibold text-black">Continue with Google</Text>
                            </>
                        )
                        }
                    </Pressable>
                </View>
            </View>

        </SafeAreaView>
    )
}