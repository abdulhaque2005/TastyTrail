import { COLORS, RADIUS, SHADOWS, SPACING } from "@/constant/Theme";
import { View, Text, Pressable, Image, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { ArrowRight, ChefHat, Compass, Heart, LogIn, Sparkle, Sparkles, User, UtensilsCrossed } from 'lucide-react-native';
import { useAuth, useUser } from "@clerk/clerk-expo";
import { useRouter } from "expo-router";
import *as Haptics from 'expo-haptics'
import { LinearGradient } from 'expo-linear-gradient'
import { Ionicons } from "@expo/vector-icons";
export default function Index() {
  const { isLoaded, isSignedIn } = useAuth()
  const { user } = useUser()
  const router = useRouter();
  const goToSignIn = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
    router.push("/auth/sign-in")
  }
  const gotoProfile = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
    router.push('/(tabs)/profile');
  }
  const handleTheNavigatePage = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
    router.push('/(tabs)');
  }
  const handleTheNavigateSavePage = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
    router.push('/(tabs)/saved');
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.background }}>

      <View className="flex-row items-center justify-between px-6 pt-2">
        <View className="flex-row items-center gap-2 rounded-full bg-white px-4 py-2">
          <ChefHat size={16} color={COLORS.primary} strokeWidth={2.5} />
          <Text className="text-sm font-semibold">TestMate</Text>
        </View>
        {
          isLoaded && isSignedIn ? (

            <Pressable onPress={gotoProfile} style={SHADOWS.soft} className="flex-row items-center rounded-full gap-2 bg-white px-3 py-2">

              {
                user?.imageUrl ?
                  (
                    <Image source={{ uri: user.imageUrl }}
                      style={{ width: 28, height: 28, borderRadius: 14 }} />
                  )
                  :
                  <View className="h-8 w-8 items-center justify-center rounded-full bg-[#ffedd5]">
                    <User size={19} color={COLORS.primary} strokeWidth={2.5}></User>
                  </View>

              }

            </Pressable>


          )
            : (isLoaded ? <Pressable className="flex-row items-center gap-2 rounded-full py-2 px-4 bg-white opacity-80"
              style={SHADOWS.soft} onPress={goToSignIn}
            >
              <LogIn size={15} color={COLORS.primary} strokeWidth={2.5}></LogIn>
              <Text className="text-sm font-semibold">Sign In</Text>
            </Pressable> : null)
        }

      </View>

      <ScrollView className="flex-1" contentContainerClassName="pb-10 px-6 pt-6" showsHorizontalScrollIndicator={false}>
        <Text className="text-[42px] font-bold leading-[48px] text-black">
          Find your next {"\n"} Craving
        </Text>
        <LinearGradient colors={['#F97316', '#FB923C', '#FDBA74']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[{
          marginTop: SPACING.lg,
          borderRadius: RADIUS.xl,
          padding: SPACING.lg,
          overflow: "hidden",
          minHeight: 220
        },
        SHADOWS.soft
        ]} >

          <View className="mb-4 h-14 w-14 items-center justify-center">
            <UtensilsCrossed size={35} color={"#ffffff"} strokeWidth={3} />

          </View>
          <Text className="text-[26px] font-bold leading-7 text-white">
            Tonight's pick awaits
          </Text>
          <Text className="mt-2 max-w-[85%] text-sm leading-5 text-white">
            Explore thousands of recipes from around the world
          </Text>
          <Pressable onPress={handleTheNavigatePage} className="mt-5  flex-row items-center gap-2 self-start rounded-full bg-white px-5 py-3 active:opacity-90 ">
            <Text className=" font-bold text-[#f97316]">
              Explore Now
            </Text>
            <ArrowRight size={14} strokeWidth={2.5} color={COLORS.primary} />
          </Pressable>

        </LinearGradient>

        <Text className="mt-8 text-lg font-bold text-black">
          Everything you need
        </Text>
        <View className="mt-3 flex-row gap-3">
          <Pressable onPress={handleTheNavigatePage} className="flex-1 rounded-3xl bg-white p-4 active:opacity-90" style={[SHADOWS.soft, { minHeight: 200 }]}>
            <View className="h-11 w-11 items-center justify-center rounded-2xl bg-[#ffedd5]">
              <Compass size={20} strokeWidth={2.5} color={COLORS.primary} />
            </View>

            <Text className="mt-5 text-[19px] font-extrabold tracking-[-0.4px] text-[#111827]">
              Discover Meals
            </Text>

            <View className="mt-2 h-1 w-12 rounded-full bg-[#F97316]" />

            <Text className="mt-3 text-[11px] font-bold uppercase tracking-[2px] text-[#F97316]">
              Explore • Cook • Enjoy
            </Text>

            <Text className="mt-4 text-[14px] leading-6 text-[#64748B]">
              Browse thousands of recipes,
              {"\n"}
              discover new flavors, and enjoy
              {"\n"}
              every meal you make.
            </Text>

          </Pressable>

          <View className="flex-1 gap-3">

            <Pressable onPress={handleTheNavigateSavePage} className='flex-1 rounded-3xl bg-white p-4 active:opacity-90' style={[SHADOWS.soft, { minHeight: 200 }]}>
              <View className="h-9 w-9 items-center justify-center rounded-2xl bg-[#dcfce7]">
                <Heart size={19} strokeWidth={2.5} color={COLORS.secondary} />
              </View>

              <Text className="mt-4 text-base font-bold text-[#1f2933] ">
                Saved Meals
              </Text>
              <Text className="mt-1 text-xs leading-4 text-[#6b7280] ">

                {isSignedIn
                  ? "View your saved meals"
                  : "Sign in to save your meals"
                }
              </Text>
            </Pressable>

            <View className="flex-1 rounded-3xl bg-white p-4 " style={SHADOWS.soft}>
              <View className="h-10 w-10 items-center justify-center rounded-2xl bg-[#fef3c7]">
                <Sparkles size={18} strokeWidth={2.5} color="#d97706" />
              </View>
              <Text className="mt-4 text-base font-bold text-[#1f2933] ">
                Chef's Choice
              </Text>
              <Text className="mt-1 text-xs leading-4 text-[#6b7280] ">
                Today's Special
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>


    </SafeAreaView>
  );
}