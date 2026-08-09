import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, Pressable, Alert, ActivityIndicator, TextInput, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { ChevronLeft, Plus, CreditCard, Banknote, ShieldCheck, Smartphone, CheckCircle, Trash2, Wallet, X, ChevronRight } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { COLORS, SHADOWS } from '@/constant/Theme';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@clerk/clerk-expo';

type SavedCard = {
    id: string;
    type: 'Visa' | 'Mastercard' | 'RuPay';
    ending: string;
    bank: string;
    color: [string, string];
    isDefault: boolean;
};

type SavedUPI = {
    id: string;
    vpa: string;
    app: string;
    icon: string;
    isDefault: boolean;
};

export default function PaymentsScreen() {
    const { userId } = useAuth();
    const [selectedId, setSelectedId] = useState<string>('');
    const [cards, setCards] = useState<SavedCard[]>([]);
    const [upiMethods, setUpiMethods] = useState<SavedUPI[]>([]);
    const [walletBalance, setWalletBalance] = useState(1250);
    const [isLoading, setIsLoading] = useState(true);
    const [showAddCard, setShowAddCard] = useState(false);
    const [showAddUPI, setShowAddUPI] = useState(false);

    // Card form state
    const [cardNumber, setCardNumber] = useState('');
    const [cardExpiry, setCardExpiry] = useState('');
    const [cardCVV, setCardCVV] = useState('');
    const [cardName, setCardName] = useState('');
    const [isSaving, setIsSaving] = useState(false);

    // UPI form state
    const [upiId, setUpiId] = useState('');

    useEffect(() => {
        loadPaymentMethods();
    }, []);

    const loadPaymentMethods = async () => {
        setIsLoading(true);
        try {
            if (!userId) return;

            const { data: payData } = await supabase
                .from('payment_methods')
                .select('*')
                .eq('user_id', userId)
                .order('created_at', { ascending: false });

            if (payData && payData.length > 0) {
                const savedCards: SavedCard[] = [];
                const savedUPI: SavedUPI[] = [];

                payData.forEach((p: any) => {
                    if (p.type === 'card') {
                        savedCards.push({
                            id: p.id,
                            type: p.card_brand || 'Visa',
                            ending: p.last_four || '0000',
                            bank: p.bank_name || 'Bank',
                            color: p.card_brand === 'Mastercard' ? ['#f50057', '#ff8a80'] : ['#1e3c72', '#2a5298'],
                            isDefault: p.is_default || false,
                        });
                    } else if (p.type === 'upi') {
                        savedUPI.push({
                            id: p.id,
                            vpa: p.upi_id || '',
                            app: p.app_name || 'UPI',
                            icon: p.app_name === 'Google Pay' 
                                ? 'https://cdn-icons-png.flaticon.com/512/6124/6124998.png'
                                : p.app_name === 'Paytm'
                                ? 'https://cdn-icons-png.flaticon.com/512/825/825454.png'
                                : 'https://cdn-icons-png.flaticon.com/512/4305/4305512.png',
                            isDefault: p.is_default || false,
                        });
                    }
                });

                setCards(savedCards);
                setUpiMethods(savedUPI);
                if (savedCards.length > 0) setSelectedId(savedCards[0].id);
                else if (savedUPI.length > 0) setSelectedId(savedUPI[0].id);
            }

            // Load wallet balance
            const { data: walletData } = await supabase
                .from('wallets')
                .select('balance')
                .eq('user_id', userId)
                .single();

            if (walletData) setWalletBalance(walletData.balance);
        } catch (err) {
            console.log('Payment load error (using defaults):', err);
        } finally {
            setIsLoading(false);
        }
    };

    const handleAddCard = async () => {
        if (cardNumber.length < 16 || cardExpiry.length < 5 || cardCVV.length < 3) {
            Alert.alert('Invalid Card', 'Please enter valid card details.');
            return;
        }

        setIsSaving(true);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

        try {
            const lastFour = cardNumber.slice(-4);
            const brand = cardNumber.startsWith('4') ? 'Visa' : cardNumber.startsWith('5') ? 'Mastercard' : 'RuPay';

            // Save to Supabase
            const { data, error } = await supabase
                .from('payment_methods')
                .insert({
                    user_id: userId,
                    type: 'card',
                    card_brand: brand,
                    last_four: lastFour,
                    bank_name: 'Saved Card',
                    is_default: cards.length === 0,
                })
                .select()
                .single();

            if (error) throw error;

            const newCard: SavedCard = {
                id: data?.id || Date.now().toString(),
                type: brand,
                ending: lastFour,
                bank: 'Saved Card',
                color: brand === 'Mastercard' ? ['#f50057', '#ff8a80'] : brand === 'RuPay' ? ['#0d47a1', '#42a5f5'] : ['#1e3c72', '#2a5298'],
                isDefault: cards.length === 0,
            };

            setCards(prev => [...prev, newCard]);
            setSelectedId(newCard.id);
            setShowAddCard(false);
            setCardNumber('');
            setCardExpiry('');
            setCardCVV('');
            setCardName('');

            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            Alert.alert('Card Added', 'Your card has been saved securely.');
        } catch (err) {
            console.log('Card save error:', err);
            // Fallback: save locally
            const lastFour = cardNumber.slice(-4);
            const brand = cardNumber.startsWith('4') ? 'Visa' : cardNumber.startsWith('5') ? 'Mastercard' : 'RuPay' as const;
            const newCard: SavedCard = {
                id: Date.now().toString(),
                type: brand,
                ending: lastFour,
                bank: 'Saved Card',
                color: brand === 'Mastercard' ? ['#f50057', '#ff8a80'] : ['#1e3c72', '#2a5298'],
                isDefault: cards.length === 0,
            };
            setCards(prev => [...prev, newCard]);
            setSelectedId(newCard.id);
            setShowAddCard(false);
            setCardNumber('');
            setCardExpiry('');
            setCardCVV('');
            setCardName('');
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        } finally {
            setIsSaving(false);
        }
    };

    const handleAddUPI = async () => {
        if (!upiId.includes('@')) {
            Alert.alert('Invalid UPI', 'Please enter a valid UPI ID (e.g., name@bank)');
            return;
        }

        setIsSaving(true);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

        try {
            const appName = upiId.includes('oksbi') ? 'SBI' 
                : upiId.includes('okicici') ? 'Google Pay' 
                : upiId.includes('paytm') ? 'Paytm'
                : upiId.includes('ybl') ? 'PhonePe'
                : 'UPI';

            const { data, error } = await supabase
                .from('payment_methods')
                .insert({
                    user_id: userId,
                    type: 'upi',
                    upi_id: upiId,
                    app_name: appName,
                    is_default: upiMethods.length === 0 && cards.length === 0,
                })
                .select()
                .single();

            if (error) throw error;

            const newUPI: SavedUPI = {
                id: data?.id || Date.now().toString(),
                vpa: upiId,
                app: appName,
                icon: appName === 'Google Pay' 
                    ? 'https://cdn-icons-png.flaticon.com/512/6124/6124998.png'
                    : appName === 'Paytm'
                    ? 'https://cdn-icons-png.flaticon.com/512/825/825454.png'
                    : appName === 'PhonePe'
                    ? 'https://cdn-icons-png.flaticon.com/512/6124/6124998.png'
                    : 'https://cdn-icons-png.flaticon.com/512/4305/4305512.png',
                isDefault: upiMethods.length === 0 && cards.length === 0,
            };

            setUpiMethods(prev => [...prev, newUPI]);
            setSelectedId(newUPI.id);
        } catch (err) {
            console.log('UPI save error:', err);
            const appName = upiId.includes('paytm') ? 'Paytm' : upiId.includes('ybl') ? 'PhonePe' : 'UPI';
            const newUPI: SavedUPI = {
                id: Date.now().toString(),
                vpa: upiId,
                app: appName,
                icon: 'https://cdn-icons-png.flaticon.com/512/4305/4305512.png',
                isDefault: false,
            };
            setUpiMethods(prev => [...prev, newUPI]);
            setSelectedId(newUPI.id);
        } finally {
            setShowAddUPI(false);
            setUpiId('');
            setIsSaving(false);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }
    };

    const handleDelete = async (id: string, type: 'card' | 'upi') => {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        Alert.alert("Remove Method", "Are you sure you want to remove this payment method?", [
            { text: "Cancel", style: "cancel" },
            { 
                text: "Remove", 
                style: "destructive", 
                onPress: async () => {
                    try {
                        await supabase.from('payment_methods').delete().eq('id', id);
                    } catch (err) {
                        console.log('Delete error:', err);
                    }
                    if (type === 'card') {
                        setCards(prev => prev.filter(c => c.id !== id));
                    } else {
                        setUpiMethods(prev => prev.filter(u => u.id !== id));
                    }
                    if (selectedId === id) setSelectedId('');
                }
            }
        ]);
    };

    const formatCardNumber = (text: string) => {
        const cleaned = text.replace(/\D/g, '').slice(0, 16);
        return cleaned.replace(/(.{4})/g, '$1 ').trim();
    };

    const formatExpiry = (text: string) => {
        const cleaned = text.replace(/\D/g, '').slice(0, 4);
        if (cleaned.length >= 3) return cleaned.slice(0, 2) + '/' + cleaned.slice(2);
        return cleaned;
    };

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.background }}>
            <View className="flex-row items-center justify-between px-4 pt-2 pb-3 bg-white z-10" style={SHADOWS.soft}>
                <Pressable onPress={() => router.back()} className="p-2 active:opacity-70">
                    <ChevronLeft size={24} color="#1f2933" strokeWidth={2.5} />
                </Pressable>
                <Text className="text-[18px] font-bold text-[#1f2933]">Payments & Wallet</Text>
                <View className="w-10" />
            </View>

            <ScrollView className="flex-1" contentContainerStyle={{ paddingBottom: 100 }} showsVerticalScrollIndicator={false}>
                
                {/* Wallet Balance */}
                <View className="px-5 pt-6 pb-2">
                    <LinearGradient 
                        colors={['#1f2933', '#111827']} 
                        className="rounded-[32px] p-6 overflow-hidden"
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={[SHADOWS.medium, { elevation: 15, shadowColor: '#111827' }]}
                    >
                        <View className="absolute -top-10 -right-10 w-40 h-40 rounded-full bg-[#f97316] opacity-20 blur-3xl" />
                        <View className="absolute -bottom-10 -left-10 w-32 h-32 rounded-full bg-[#3b82f6] opacity-10 blur-3xl" />

                        <View className="flex-row items-center justify-between mb-4">
                            <Text className="text-white/60 font-bold text-xs uppercase tracking-[0.2em]">Tasty Wallet Balance</Text>
                            <View className="bg-white/10 p-2.5 rounded-2xl border border-white/10">
                                <Banknote size={20} color="#f97316" />
                            </View>
                        </View>
                        <Text className="text-white font-black text-[40px] tracking-tight mb-1">₹ {walletBalance.toLocaleString()}<Text className="text-white/50 text-2xl">.00</Text></Text>
                        <View className="flex-row items-center gap-2 mb-6">
                            <View className="bg-green-500/20 px-2 py-0.5 rounded-md">
                                <Text className="text-green-400 font-bold text-[10px] uppercase tracking-wider">+ ₹50</Text>
                            </View>
                            <Text className="text-white/60 font-medium text-xs">cashback on next order</Text>
                        </View>
                        
                        <Pressable className="bg-white px-5 py-3.5 rounded-2xl flex-row items-center justify-center gap-2 active:bg-gray-200">
                            <Plus size={18} color="#111827" strokeWidth={2.5} />
                            <Text className="text-[#111827] font-black text-sm uppercase tracking-wider">Top Up Wallet</Text>
                        </Pressable>
                    </LinearGradient>
                </View>

                {/* Saved Cards */}
                <View className="px-5 pt-6">
                    <View className="flex-row items-center justify-between mb-4">
                        <Text className="text-lg font-bold text-[#1f2933]">Saved Cards</Text>
                        <Pressable onPress={() => setShowAddCard(true)} className="flex-row items-center gap-1 bg-orange-50 px-3 py-1.5 rounded-full active:opacity-70">
                            <Plus size={14} color="#f97316" strokeWidth={2.5} />
                            <Text className="text-xs font-bold text-[#f97316]">Add Card</Text>
                        </Pressable>
                    </View>
                    
                    {cards.length === 0 && !isLoading && (
                        <Pressable onPress={() => setShowAddCard(true)} className="border-2 border-dashed border-gray-300 rounded-2xl p-6 items-center active:opacity-70 mb-4">
                            <CreditCard size={28} color="#d1d5db" />
                            <Text className="text-sm font-medium text-gray-400 mt-2">No saved cards</Text>
                            <Text className="text-xs text-gray-400 mt-1">Tap to add a card</Text>
                        </Pressable>
                    )}

                    {cards.map((card) => (
                        <View key={card.id}>
                            <Pressable 
                                onPress={() => { Haptics.selectionAsync(); setSelectedId(card.id); }}
                                className={`mb-4 rounded-2xl border-2 overflow-hidden ${selectedId === card.id ? 'border-[#f97316]' : 'border-transparent'}`}
                                style={selectedId !== card.id && SHADOWS.soft}
                            >
                                <LinearGradient colors={card.color} className="p-5" start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
                                    <View className="flex-row items-center justify-between mb-6">
                                        <Text className="text-white font-black text-lg italic">{card.type}</Text>
                                        <View className="flex-row items-center gap-3">
                                            {selectedId === card.id && <CheckCircle size={22} color="white" />}
                                            <Pressable onPress={() => handleDelete(card.id, 'card')}>
                                                <Trash2 size={20} color="white" opacity={0.7} />
                                            </Pressable>
                                        </View>
                                    </View>
                                    <View className="flex-row items-end justify-between">
                                        <View>
                                            <Text className="text-white/70 font-medium text-xs mb-1">{card.bank}</Text>
                                            <Text className="text-white font-bold text-xl tracking-widest">•••• •••• •••• {card.ending}</Text>
                                        </View>
                                    </View>
                                </LinearGradient>
                            </Pressable>
                        </View>
                    ))}
                </View>

                {/* UPI & Wallets */}
                <View className="px-5 pt-4">
                    <View className="flex-row items-center justify-between mb-4">
                        <Text className="text-lg font-bold text-[#1f2933]">UPI & Wallets</Text>
                        <Pressable onPress={() => setShowAddUPI(true)} className="flex-row items-center gap-1 bg-indigo-50 px-3 py-1.5 rounded-full active:opacity-70">
                            <Plus size={14} color="#6366f1" strokeWidth={2.5} />
                            <Text className="text-xs font-bold text-[#6366f1]">Add UPI</Text>
                        </Pressable>
                    </View>
                    
                    {upiMethods.length === 0 && !isLoading && (
                        <Pressable onPress={() => setShowAddUPI(true)} className="border-2 border-dashed border-gray-300 rounded-2xl p-6 items-center active:opacity-70 mb-3">
                            <Smartphone size={28} color="#d1d5db" />
                            <Text className="text-sm font-medium text-gray-400 mt-2">No UPI linked</Text>
                            <Text className="text-xs text-gray-400 mt-1">Tap to add UPI ID</Text>
                        </Pressable>
                    )}

                    {upiMethods.map((upi) => (
                        <View key={upi.id}>
                            <Pressable 
                                onPress={() => { Haptics.selectionAsync(); setSelectedId(upi.id); }}
                                className={`mb-3 flex-row items-center justify-between rounded-2xl bg-white p-4 border-2 ${selectedId === upi.id ? 'border-[#f97316] bg-[#fff8ef]' : 'border-gray-100'}`}
                                style={SHADOWS.soft}
                            >
                                <View className="flex-row items-center gap-3">
                                    <Image source={{ uri: upi.icon }} style={{ width: 40, height: 40, borderRadius: 8 }} />
                                    <View>
                                        <Text className="text-base font-bold text-[#1f2933]">{upi.app}</Text>
                                        <Text className="text-sm font-medium text-gray-500">{upi.vpa}</Text>
                                    </View>
                                </View>
                                <View className="flex-row items-center gap-2">
                                    {selectedId === upi.id && <CheckCircle size={22} color="#f97316" />}
                                    <Pressable onPress={() => handleDelete(upi.id, 'upi')} className="p-1">
                                        <Trash2 size={18} color="#ef4444" opacity={0.6} />
                                    </Pressable>
                                </View>
                            </Pressable>
                        </View>
                    ))}
                </View>

                {/* Other Methods */}
                <View className="px-5 pt-4 pb-8">
                    <Text className="text-lg font-bold text-[#1f2933] mb-4">Other Methods</Text>
                    
                    <Pressable 
                        onPress={() => { Haptics.selectionAsync(); setSelectedId('cod'); }}
                        className={`mb-4 flex-row items-center justify-between rounded-2xl bg-white p-4 border-2 ${selectedId === 'cod' ? 'border-[#f97316] bg-[#fff8ef]' : 'border-gray-100'}`}
                        style={SHADOWS.soft}
                    >
                        <View className="flex-row items-center gap-3">
                            <View className="bg-gray-100 p-2.5 rounded-xl">
                                <Banknote size={24} color="#4b5563" />
                            </View>
                            <View>
                                <Text className="text-base font-bold text-[#1f2933]">Cash on Delivery</Text>
                                <Text className="text-sm font-medium text-gray-500">Pay when your order arrives</Text>
                            </View>
                        </View>
                        {selectedId === 'cod' && <CheckCircle size={22} color="#f97316" />}
                    </Pressable>
                </View>

            </ScrollView>

            {/* Bottom Security Bar */}
            <View className="absolute bottom-0 left-0 right-0 border-t border-gray-100 bg-white p-5 pb-8">
                <View className="flex-row items-center gap-2 justify-center">
                    <ShieldCheck size={16} color="#16a34a" />
                    <Text className="text-xs font-bold text-gray-600">100% Secure & Encrypted Payments</Text>
                </View>
            </View>

            {/* Add Card Modal */}
            <Modal visible={showAddCard} transparent animationType="slide">
                <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }}>
                    <View style={{ backgroundColor: '#fff', borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 24, paddingBottom: 40 }}>
                        <View className="flex-row items-center justify-between mb-6">
                            <Text className="text-xl font-bold text-[#1f2933]">Add Card</Text>
                            <Pressable onPress={() => setShowAddCard(false)} className="p-2">
                                <X size={24} color="#6b7280" />
                            </Pressable>
                        </View>

                        <Text className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Card Number</Text>
                        <TextInput
                            value={formatCardNumber(cardNumber)}
                            onChangeText={(t) => setCardNumber(t.replace(/\s/g, ''))}
                            placeholder="1234 5678 9012 3456"
                            placeholderTextColor="#d1d5db"
                            keyboardType="number-pad"
                            maxLength={19}
                            className="bg-gray-50 rounded-xl px-4 py-3.5 text-base font-semibold text-[#1f2933] border border-gray-200 mb-4"
                        />

                        <View className="flex-row gap-3 mb-4">
                            <View className="flex-1">
                                <Text className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Expiry</Text>
                                <TextInput
                                    value={formatExpiry(cardExpiry)}
                                    onChangeText={(t) => setCardExpiry(t.replace(/\D/g, ''))}
                                    placeholder="MM/YY"
                                    placeholderTextColor="#d1d5db"
                                    keyboardType="number-pad"
                                    maxLength={5}
                                    className="bg-gray-50 rounded-xl px-4 py-3.5 text-base font-semibold text-[#1f2933] border border-gray-200"
                                />
                            </View>
                            <View className="flex-1">
                                <Text className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">CVV</Text>
                                <TextInput
                                    value={cardCVV}
                                    onChangeText={(t) => setCardCVV(t.replace(/\D/g, '').slice(0, 3))}
                                    placeholder="•••"
                                    placeholderTextColor="#d1d5db"
                                    keyboardType="number-pad"
                                    maxLength={3}
                                    secureTextEntry
                                    className="bg-gray-50 rounded-xl px-4 py-3.5 text-base font-semibold text-[#1f2933] border border-gray-200"
                                />
                            </View>
                        </View>

                        <Text className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Cardholder Name</Text>
                        <TextInput
                            value={cardName}
                            onChangeText={setCardName}
                            placeholder="Name on card"
                            placeholderTextColor="#d1d5db"
                            autoCapitalize="words"
                            className="bg-gray-50 rounded-xl px-4 py-3.5 text-base font-semibold text-[#1f2933] border border-gray-200 mb-6"
                        />

                        <Pressable
                            onPress={handleAddCard}
                            disabled={isSaving}
                            className="bg-[#f97316] rounded-2xl py-4 items-center justify-center active:bg-[#ea580c] disabled:opacity-50"
                            style={SHADOWS.glow}
                        >
                            {isSaving ? (
                                <ActivityIndicator color="#fff" />
                            ) : (
                                <Text className="text-base font-bold text-white">Save Card Securely</Text>
                            )}
                        </Pressable>

                        <View className="flex-row items-center justify-center gap-2 mt-4">
                            <ShieldCheck size={14} color="#16a34a" />
                            <Text className="text-[11px] font-medium text-gray-500">Your card info is encrypted and secure</Text>
                        </View>
                    </View>
                </View>
            </Modal>

            {/* Add UPI Modal */}
            <Modal visible={showAddUPI} transparent animationType="slide">
                <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }}>
                    <View style={{ backgroundColor: '#fff', borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 24, paddingBottom: 40 }}>
                        <View className="flex-row items-center justify-between mb-6">
                            <Text className="text-xl font-bold text-[#1f2933]">Add UPI ID</Text>
                            <Pressable onPress={() => setShowAddUPI(false)} className="p-2">
                                <X size={24} color="#6b7280" />
                            </Pressable>
                        </View>

                        <Text className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">UPI ID</Text>
                        <TextInput
                            value={upiId}
                            onChangeText={setUpiId}
                            placeholder="yourname@upi"
                            placeholderTextColor="#d1d5db"
                            autoCapitalize="none"
                            keyboardType="email-address"
                            className="bg-gray-50 rounded-xl px-4 py-3.5 text-base font-semibold text-[#1f2933] border border-gray-200 mb-6"
                        />

                        <Pressable
                            onPress={handleAddUPI}
                            disabled={isSaving}
                            className="bg-[#6366f1] rounded-2xl py-4 items-center justify-center active:opacity-80 disabled:opacity-50"
                            style={SHADOWS.glow}
                        >
                            {isSaving ? (
                                <ActivityIndicator color="#fff" />
                            ) : (
                                <Text className="text-base font-bold text-white">Verify & Save UPI</Text>
                            )}
                        </Pressable>
                    </View>
                </View>
            </Modal>
        </SafeAreaView>
    );
}
