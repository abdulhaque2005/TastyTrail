
import { SHADOWS } from "@/constant/Theme";
import { useAuth, useUser } from "@clerk/clerk-expo";
import { View,Text ,Image, Pressable} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import *as Haptics from "expo-haptics"
import{Redirect, useRouter}  from 'expo-router'
export default function DiscoverScreen (){
    const {isSignedIn,signOut} = useAuth();
    const {user} = useUser();
    const router = useRouter();
    if(!isSignedIn){
       return <Redirect href={"/"}  ></Redirect>
    }
    const handleLogOut = async ()=>{
       Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
       await signOut();
       router.dismissAll();
       router.replace('/');
    }
    return <SafeAreaView style={{flex:1,backgroundColor:"#fff8ef"}}>
        <View className="flex-1 justify-center px-5">
        <View className="items-center rounded-3xl bg-white p-6 "style={SHADOWS.soft} >
    {
        user?.imageUrl ?
        <Image 
        source={{uri:user.imageUrl}}
        style = {{width:80,height:80,borderRadius:40}}
        />
        :
       ( <View className="h-20 w-20 items-center justify-center rounded-full ">
    <Text className="text- 2xl font-bold text-[#f97316]">
        {user?.firstName?.[0] ?? "U" }
    </Text>
     </View>
    )}
    <Text className="mt-5 text-3xl font-bold text-[#1f2933]">
     { user?.fullName ?? "User"

     }
    </Text>
    <Text className="mt-1 text-base font-medium text-[#6b7280]">
     { user?.primaryEmailAddress?.emailAddress ?? "user@gmail.com"

     }
    </Text>
    <Pressable onPress={handleLogOut} className="mt-8 w-full items-center rounded-2xl bg-orange-500  py-4 active:opacity-90">
        <Text className="text-base font-bold text-white">LogOut</Text>
    </Pressable>

  </View>
  </View>
    </SafeAreaView>
}