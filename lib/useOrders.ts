import { useState, useEffect, useCallback, useRef } from 'react';
import { SupabaseOrder } from './supabase';
import { getSupabaseOrders, subscribeToAllOrders } from '../services/supabaseOrders';
import { RealtimeChannel } from '@supabase/supabase-js';

type UseOrdersReturn = {
    orders: SupabaseOrder[];
    activeOrders: SupabaseOrder[];
    pastOrders: SupabaseOrder[];
    isLoading: boolean;
    error: string | null;
    refetch: () => Promise<void>;
};

const ACTIVE_STATUSES = [
    'pending_payment',
    'confirmed',
    'accepted',
    'preparing',
    'ready',
    'rider_assigned',
    'picked_up',
    'out_for_delivery',
    'nearby',
];

export function useOrders(userId: string | undefined): UseOrdersReturn {
    const [orders, setOrders] = useState<SupabaseOrder[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const channelRef = useRef<RealtimeChannel | null>(null);

    const fetchOrders = useCallback(async () => {
        if (!userId) return;

        try {
            setIsLoading(true);
            setError(null);
            const data = await getSupabaseOrders(userId);
            setOrders(data);
        } catch (err: any) {
            setError(err.message || 'Failed to load orders');
        } finally {
            setIsLoading(false);
        }
    }, [userId]);

    useEffect(() => {
        if (!userId) return;

        fetchOrders();

        // Subscribe to real-time updates for all user orders
        const channel = subscribeToAllOrders(userId, (_updatedOrder) => {
            // Refetch all orders when any order changes
            fetchOrders();
        });

        channelRef.current = channel;

        return () => {
            if (channelRef.current) {
                channelRef.current.unsubscribe();
                channelRef.current = null;
            }
        };
    }, [userId, fetchOrders]);

    const activeOrders = orders.filter(o => ACTIVE_STATUSES.includes(o.status));
    const pastOrders = orders.filter(o => !ACTIVE_STATUSES.includes(o.status));

    return {
        orders,
        activeOrders,
        pastOrders,
        isLoading,
        error,
        refetch: fetchOrders,
    };
}
