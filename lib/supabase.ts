import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;

if (!supabaseUrl || !supabaseAnonKey) {
    console.warn('Supabase credentials not found. Order tracking will not work.');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    realtime: {
        params: {
            eventsPerSecond: 10,
        },
    },
});

// ============================
// TYPE DEFINITIONS
// ============================

export type OrderItem = {
    mealId: string;
    name: string;
    imageUrl?: string;
    price: number;
    quantity: number;
    category?: string;
};

export type DeliveryInfo = {
    fullAddress: string;
    buildingName?: string;
    floor?: string;
    roomNumber?: string;
    deliveryType?: string;
    deliveryNote?: string;
    phone?: string;
    latitude?: number;
    longitude?: number;
    landmarkPhotos?: string[];
};

export type RiderInfo = {
    id: string;
    name: string;
    phone: string;
    photo?: string;
    vehicle?: string;
    eta?: number;
};

export type DeliveryProof = {
    photo?: string;
    deliveredAt?: string;
    gpsVerified?: boolean;
};

export type OrderStatus =
    | 'pending_payment'
    | 'confirmed'
    | 'accepted'
    | 'preparing'
    | 'ready'
    | 'rider_assigned'
    | 'picked_up'
    | 'out_for_delivery'
    | 'nearby'
    | 'delivered';

export type SupabaseOrder = {
    id: string;
    user_id: string;
    items: OrderItem[];
    total_amount: number;
    payment_method: string;
    status: OrderStatus;
    delivery: DeliveryInfo | null;
    rider: RiderInfo | null;
    delivery_proof: DeliveryProof | null;
    ordered_at: string;
    created_at: string;
    updated_at: string;
};

export type TimelineEvent = {
    id: string;
    order_id: string;
    status: string;
    description: string | null;
    updated_by: string;
    created_at: string;
};

export type RiderLocation = {
    id: string;
    order_id: string;
    rider_id: string;
    latitude: number;
    longitude: number;
    heading: number;
    speed: number;
    updated_at: string;
};

// Status display helpers
export const STATUS_CONFIG: Record<string, { label: string; color: string; emoji: string }> = {
    pending_payment: { label: 'Payment Pending', color: '#9ca3af', emoji: '💳' },
    confirmed: { label: 'Order Confirmed', color: '#3b82f6', emoji: '✅' },
    accepted: { label: 'Restaurant Accepted', color: '#6366f1', emoji: '👨‍🍳' },
    preparing: { label: 'Preparing Food', color: '#f59e0b', emoji: '🍳' },
    ready: { label: 'Ready for Pickup', color: '#f59e0b', emoji: '📦' },
    rider_assigned: { label: 'Rider Assigned', color: '#8b5cf6', emoji: '🏍️' },
    picked_up: { label: 'Picked Up', color: '#8b5cf6', emoji: '🛵' },
    out_for_delivery: { label: 'Out for Delivery', color: '#ec4899', emoji: '🚀' },
    nearby: { label: 'Almost There!', color: '#ec4899', emoji: '📍' },
    delivered: { label: 'Delivered', color: '#10b981', emoji: '🎉' },
};

export const ORDER_FLOW: OrderStatus[] = [
    'confirmed',
    'accepted',
    'preparing',
    'ready',
    'rider_assigned',
    'picked_up',
    'out_for_delivery',
    'nearby',
    'delivered',
];
