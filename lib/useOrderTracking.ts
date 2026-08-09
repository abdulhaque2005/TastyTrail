import { useState, useEffect, useCallback, useRef } from 'react';
import { SupabaseOrder, TimelineEvent, RiderLocation } from './supabase';
import {
    getSupabaseOrder,
    getOrderTimeline,
    getRiderLocation,
    subscribeToOrder,
    subscribeToTimeline,
    subscribeToRiderLocation,
} from '../services/supabaseOrders';
import { RealtimeChannel } from '@supabase/supabase-js';

type UseOrderTrackingReturn = {
    order: SupabaseOrder | null;
    timeline: TimelineEvent[];
    riderLocation: RiderLocation | null;
    isLoading: boolean;
    error: string | null;
    refetch: () => Promise<void>;
};

export function useOrderTracking(orderId: string | undefined): UseOrderTrackingReturn {
    const [order, setOrder] = useState<SupabaseOrder | null>(null);
    const [timeline, setTimeline] = useState<TimelineEvent[]>([]);
    const [riderLocation, setRiderLocation] = useState<RiderLocation | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    
    const channelsRef = useRef<RealtimeChannel[]>([]);

    const fetchData = useCallback(async () => {
        if (!orderId) return;
        
        try {
            setIsLoading(true);
            setError(null);

            const [orderData, timelineData, locationData] = await Promise.all([
                getSupabaseOrder(orderId),
                getOrderTimeline(orderId),
                getRiderLocation(orderId),
            ]);

            setOrder(orderData);
            setTimeline(timelineData);
            setRiderLocation(locationData);
        } catch (err: any) {
            setError(err.message || 'Failed to load order');
        } finally {
            setIsLoading(false);
        }
    }, [orderId]);

    useEffect(() => {
        if (!orderId) return;

        fetchData();

        // Subscribe to real-time updates
        const orderChannel = subscribeToOrder(orderId, (updatedOrder) => {
            setOrder(prev => prev ? { ...prev, ...updatedOrder } : null);
        });

        const timelineChannel = subscribeToTimeline(orderId, (newEvent) => {
            setTimeline(prev => [...prev, newEvent]);
        });

        const riderChannel = subscribeToRiderLocation(orderId, (location) => {
            setRiderLocation(location);
        });

        channelsRef.current = [orderChannel, timelineChannel, riderChannel];

        return () => {
            channelsRef.current.forEach(channel => {
                channel.unsubscribe();
            });
            channelsRef.current = [];
        };
    }, [orderId, fetchData]);

    return {
        order,
        timeline,
        riderLocation,
        isLoading,
        error,
        refetch: fetchData,
    };
}
