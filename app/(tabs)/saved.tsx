import { COLORS, SHADOWS } from "@/constant/Theme";
import { api } from "@/convex/_generated/api";
import { useAppstore } from "@/store/userAppstore";
import { useAuth } from "@clerk/clerk-expo";
import { useConvexAuth, useMutation, useQueries, useQuery } from "convex/react";
import { Redirect, useRouter } from "expo-router";
import { useState } from "react";
import { View, Text, Pressable, ScrollView, ActivityIndicator, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { ChevronLeft, Trash2 } from 'lucide-react-native'
import *as Haptics from 'expo-haptics'
import { Image } from "expo-image";
import { Id } from "@/convex/_generated/dataModel";

export default function DiscoverScreen() {
    const { isLoaded, isSignedIn } = useAuth();
    const { isAuthenticated } = useConvexAuth();
    const router = useRouter();
    const { setPendingAuthAction } = useAppstore(state => state);

    const SavedMeals = useQuery(
        api.savedMeals.getSavedMeals,
        isLoaded && isSignedIn && isAuthenticated ? {} : "skip",
    )

    const deleteMeals = useMutation(api.savedMeals.deleteMeal);
    const [deleteId, setDeleteId] = useState<String | null>(null);

    if (!isSignedIn) {
        return <Redirect href={'/auth/sign-in'} />
    }


    const handleBack = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
        if (router.canGoBack()) {
            router.back();
        }
        else {
            router.replace('/');
        }
    }

    const handleDelete = (id: Id<"savedMeals">, name: string) => {
        Alert.alert(
            "Remove saved meals?",
            `"${name}" will be removed from your saved list`,
            [
                {
                    text: "Cancel",
                    style: "cancel"
                },
                {
                    text: "Remove No Need",
                    style: "destructive",
                    onPress: async () => {
                        try {
                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                            setDeleteId(id);
                            await deleteMeals({ id });
                        }
                        catch (err) {
                            Alert.alert("Error", err instanceof Error ? err.message : "Could not save")
                        }
                    }

                }
            ]


        )
    }
    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.background }}>

            <View className="px-4 pt-1 ">
                <Pressable onPress={handleBack} className="flex-row items-center gap-1 self-start rounded-full px-3 py-2 active:opacity-90">
                    <ChevronLeft size={22} color={COLORS.text} strokeWidth={2.5} />
                    <Text>Back</Text>
                </Pressable>
            </View>


            <ScrollView className="flex:1" contentContainerClassName="px-6 pb-10" showsVerticalScrollIndicator={false}>
                <Text className="mt-2 text-3xl font-bold text-[#1f2933] ">Saved Meals</Text>
                {
                    SavedMeals === undefined ?
                        <View className="mt-16 items-center" >
                            <ActivityIndicator size={20} color={COLORS.primary} />
                            <Text className="mt-5 text-base font-medium text-black">Loading saved meals...</Text>
                        </View>
                        : SavedMeals.length === 0 ?

                            <View className="mt-10 items-center rounded-3xl bg-white p-8" style={SHADOWS.soft}>
                                <Text className="mt-5 text-base font-medium text-black">No saved meals...</Text>
                            </View>

                            :
                            <>
                                <View className="mt-4 gap-4">
                                    {
                                        SavedMeals.map(m => {
                                            const isDeleting = deleteId == m._id
                                            return <View key={m._id} className="overflow-hidden rounded-3xl bg-white">
                                                <Image
                                                    source={{ uri: m.imageUrl }}
                                                    style={{ width: "100%", height: 200 }}
                                                    contentFit="cover"
                                                    transition={200}
                                                />
                                                <View className="p-4 ">

                                                    <View className="flex-row flex-wrap gap-3 ">
                                                        <Text className="text-xs font-semibold text-[#f97316]">{m.category}</Text>
                                                    </View>
                                                    {
                                                        m?.area ?
                                                            <View className="flex-row flex-wrap gap-3 ">
                                                                <Text className="text-xs font-medium text-[#22c55e]">{m.area}</Text>
                                                            </View>
                                                            : null
                                                    }

                                                    <View className="flex-row flex-wrap gap-3 ">
                                                        <Text className="text-xs text-black font-bold">{m.name}</Text>
                                                    </View>


                                                    <Pressable onPress={() => handleDelete(m._id, m.name)} disabled={isDeleting} className="mt-4  p-4 flex-row items-center gap-2 rounded-3xl border bg-white border-[#f3e7d8] py3 active:opacity-95 disabled:opacity-45 justify-center ">
                                                        {
                                                            isDeleting ? (
                                                                <ActivityIndicator size={22} color={COLORS.primary} />

                                                            )
                                                                :
                                                                <>
                                                                    <Trash2 size={18} color={COLORS.danger} />
                                                                    <Text className="text-sm font-bold text-[#ef4444]">
                                                                        Remove
                                                                    </Text>
                                                                </>

                                                        }
                                                    </Pressable>

                                                </View>

                                            </View>
                                        })
                                    }
                                </View>
                            </>

                }
            </ScrollView>

        </SafeAreaView>

    )
}