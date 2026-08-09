import { COLORS, SHADOWS } from "@/constant/Theme";
import { useRouter } from "expo-router";
import { useState } from "react";
import { View, Text, Pressable, ScrollView, Linking } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { ChevronLeft, ChevronDown, ChevronUp, Mail, PhoneCall } from 'lucide-react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Animated, { FadeInDown, FadeInUp, Layout } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';

const FAQS = [
    {
        question: "How long does delivery take?",
        answer: "Our standard delivery time is 30-45 minutes depending on your location and the restaurant's preparation time."
    },
    {
        question: "Can I cancel my order?",
        answer: "You can cancel your order within 60 seconds of placing it. After that, the restaurant begins preparation and cancellation may not be possible."
    },
    {
        question: "Do you charge for delivery?",
        answer: "Delivery fees vary based on distance. PRO members get unlimited free deliveries on all orders above ₹149."
    },
    {
        question: "What if my food is cold or damaged?",
        answer: "We ensure quality packaging. However, if you face any issues, please contact our support team immediately with photos of the delivered items for a refund or replacement."
    }
];

export default function SupportScreen() {
    const router = useRouter();
    const [expandedIndex, setExpandedIndex] = useState<number | null>(null);

    const handleBack = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        router.back();
    };

    const toggleFaq = (index: number) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setExpandedIndex(expandedIndex === index ? null : index);
    };

    const handleEmail = () => {
        Linking.openURL('mailto:support@tastytrail.com?subject=App Support');
    };

    const handleCall = () => {
        Linking.openURL('tel:+919876543210');
    };

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: '#f8fafc' }}>
            {/* Header */}
            <View className="flex-row items-center justify-between px-4 pt-1 pb-2 border-b border-[#e2e8f0] bg-white">
                <Pressable onPress={handleBack} className="flex-row items-center gap-1 p-2 active:opacity-70">
                    <ChevronLeft size={24} color={COLORS.text} strokeWidth={2.5} />
                    <Text className="text-base font-bold text-[#1f2933]">Profile</Text>
                </Pressable>
            </View>

            <ScrollView className="flex-1" contentContainerClassName="px-5 pb-10 pt-5" showsVerticalScrollIndicator={false}>
                <Animated.View entering={FadeInDown.duration(400)}>
                    <Text className="text-3xl font-black text-[#1f2933]">Help & Support</Text>
                    <Text className="mt-1 text-sm text-[#6b7280]">How can we help you today?</Text>
                </Animated.View>

                {/* Contact Options */}
                <Animated.View entering={FadeInUp.duration(400).delay(100)} className="mt-8 flex-row gap-4">
                    <Pressable 
                        onPress={handleCall}
                        className="flex-1 active:scale-95 transition-transform"
                    >
                        <LinearGradient
                            colors={['#ffffff', '#f8fafc']}
                            className="items-center justify-center rounded-[28px] p-6 border border-[#e2e8f0]"
                            style={[SHADOWS.medium, { elevation: 10, shadowColor: '#94a3b8' }]}
                        >
                            <View className="h-14 w-14 items-center justify-center rounded-full bg-green-50 mb-4 border border-green-100">
                                <PhoneCall size={24} color="#16a34a" strokeWidth={2.5} />
                            </View>
                            <Text className="text-[17px] font-black text-[#1f2933]">Call Us</Text>
                            <Text className="text-[13px] font-medium text-[#94a3b8] text-center mt-1">24/7 Priority</Text>
                        </LinearGradient>
                    </Pressable>

                    <Pressable 
                        onPress={handleEmail}
                        className="flex-1 active:scale-95 transition-transform"
                    >
                        <LinearGradient
                            colors={['#ffffff', '#f8fafc']}
                            className="items-center justify-center rounded-[28px] p-6 border border-[#e2e8f0]"
                            style={[SHADOWS.medium, { elevation: 10, shadowColor: '#94a3b8' }]}
                        >
                            <View className="h-14 w-14 items-center justify-center rounded-full bg-indigo-50 mb-4 border border-indigo-100">
                                <Mail size={24} color="#6366f1" strokeWidth={2.5} />
                            </View>
                            <Text className="text-[17px] font-black text-[#1f2933]">Email</Text>
                            <Text className="text-[13px] font-medium text-[#94a3b8] text-center mt-1">Replies in 1 hr</Text>
                        </LinearGradient>
                    </Pressable>
                </Animated.View>

                {/* FAQs Section */}
                <Animated.View entering={FadeInUp.duration(400).delay(200)} className="mt-10">
                    <Text className="text-sm font-bold uppercase tracking-wider text-[#9ca3af] mb-4">Frequently Asked Questions</Text>
                    
                    <View className="rounded-3xl bg-white border border-[#e2e8f0] overflow-hidden" style={SHADOWS.soft}>
                        {FAQS.map((faq, index) => {
                            const isExpanded = expandedIndex === index;
                            
                            return (
                                <View key={index} className={index !== FAQS.length - 1 ? "border-b border-[#f1f5f9]" : ""}>
                                    <Pressable 
                                        onPress={() => toggleFaq(index)}
                                        className="flex-row items-center justify-between p-5 active:bg-[#f8fafc]"
                                    >
                                        <Text className={`text-[15px] font-bold flex-1 pr-4 ${isExpanded ? 'text-[#f97316]' : 'text-[#1f2933]'}`}>
                                            {faq.question}
                                        </Text>
                                        <View className={`h-8 w-8 items-center justify-center rounded-full ${isExpanded ? 'bg-[#ffedd5]' : 'bg-[#f1f5f9]'}`}>
                                            {isExpanded ? (
                                                <ChevronUp size={20} color="#f97316" />
                                            ) : (
                                                <ChevronDown size={20} color="#64748b" />
                                            )}
                                        </View>
                                    </Pressable>
                                    
                                    {isExpanded && (
                                        <Animated.View 
                                            entering={FadeInDown.duration(200)} 
                                            layout={Layout.springify()}
                                            className="px-5 pb-5 pt-1"
                                        >
                                            <Text className="text-[14px] leading-6 text-[#64748b]">
                                                {faq.answer}
                                            </Text>
                                        </Animated.View>
                                    )}
                                </View>
                            );
                        })}
                    </View>
                </Animated.View>

            </ScrollView>
        </SafeAreaView>
    );
}
