import { supabase, OrderItem, DeliveryInfo, SupabaseOrder, TimelineEvent, RiderLocation, RiderInfo } from '../lib/supabase';
import { RealtimeChannel } from '@supabase/supabase-js';

// ============================
// ORDER CRUD
// ============================

export async function placeSupabaseOrder(params: {
    userId: string;
    items: OrderItem[];
    totalAmount: number;
    paymentMethod: string;
    delivery: DeliveryInfo;
}): Promise<{ orderId: string; success: boolean }> {
    const status = params.paymentMethod === 'COD' ? 'confirmed' : 'pending_payment';

    const { data, error } = await supabase
        .from('orders')
        .insert({
            user_id: params.userId,
            items: params.items,
            total_amount: params.totalAmount,
            payment_method: params.paymentMethod,
            status,
            delivery: params.delivery,
            ordered_at: new Date().toISOString(),
        })
        .select('id')
        .single();

    if (error) throw new Error(`Failed to place order: ${error.message}`);

    // Create initial timeline entry
    await supabase.from('order_timeline').insert({
        order_id: data.id,
        status: 'confirmed',
        description: 'Order placed successfully',
        updated_by: 'system',
    });

    if (params.paymentMethod === 'COD') {
        await supabase.from('order_timeline').insert({
            order_id: data.id,
            status: 'confirmed',
            description: 'Payment on delivery confirmed',
            updated_by: 'system',
        });
    }

    return { orderId: data.id, success: true };
}

export async function getSupabaseOrders(userId: string): Promise<SupabaseOrder[]> {
    const { data, error } = await supabase
        .from('orders')
        .select('*')
        .eq('user_id', userId)
        .order('ordered_at', { ascending: false });

    if (error) throw new Error(`Failed to fetch orders: ${error.message}`);
    return (data || []) as SupabaseOrder[];
}

export async function getSupabaseOrder(orderId: string): Promise<SupabaseOrder | null> {
    const { data, error } = await supabase
        .from('orders')
        .select('*')
        .eq('id', orderId)
        .single();

    if (error) {
        console.error('Failed to fetch order:', error.message);
        return null;
    }
    return data as SupabaseOrder;
}

export async function getOrderTimeline(orderId: string): Promise<TimelineEvent[]> {
    const { data, error } = await supabase
        .from('order_timeline')
        .select('*')
        .eq('order_id', orderId)
        .order('created_at', { ascending: true });

    if (error) throw new Error(`Failed to fetch timeline: ${error.message}`);
    return (data || []) as TimelineEvent[];
}

export async function getRiderLocation(orderId: string): Promise<RiderLocation | null> {
    const { data, error } = await supabase
        .from('rider_locations')
        .select('*')
        .eq('order_id', orderId)
        .order('updated_at', { ascending: false })
        .limit(1)
        .single();

    if (error) return null;
    return data as RiderLocation;
}

// ============================
// ORDER STATUS UPDATES (for simulator / admin)
// ============================

export async function updateOrderStatus(params: {
    orderId: string;
    status: string;
    description?: string;
    updatedBy?: string;
}): Promise<void> {
    // Update order status
    const { error: orderError } = await supabase
        .from('orders')
        .update({ status: params.status })
        .eq('id', params.orderId);

    if (orderError) throw new Error(`Failed to update status: ${orderError.message}`);

    // Add timeline entry
    const { error: timelineError } = await supabase
        .from('order_timeline')
        .insert({
            order_id: params.orderId,
            status: params.status,
            description: params.description || `Status changed to ${params.status.replace(/_/g, ' ')}`,
            updated_by: params.updatedBy || 'system',
        });

    if (timelineError) console.error('Failed to add timeline entry:', timelineError.message);
}

export async function assignRider(orderId: string, rider: RiderInfo): Promise<void> {
    // Update order with rider info
    await supabase
        .from('orders')
        .update({ 
            rider, 
            status: 'rider_assigned' 
        })
        .eq('id', orderId);

    // Add timeline entry
    await supabase.from('order_timeline').insert({
        order_id: orderId,
        status: 'rider_assigned',
        description: `${rider.name} is assigned to your order`,
        updated_by: 'system',
    });

    // Initialize rider location
    await supabase.from('rider_locations').upsert({
        order_id: orderId,
        rider_id: rider.id,
        latitude: 0,
        longitude: 0,
        heading: 0,
        speed: 0,
    }, { onConflict: 'order_id' });
}

export async function updateRiderLocation(params: {
    orderId: string;
    riderId: string;
    latitude: number;
    longitude: number;
    heading?: number;
    speed?: number;
}): Promise<void> {
    // Try update first, then insert if not exists
    const { data: existing } = await supabase
        .from('rider_locations')
        .select('id')
        .eq('order_id', params.orderId)
        .limit(1)
        .single();

    if (existing) {
        await supabase
            .from('rider_locations')
            .update({
                latitude: params.latitude,
                longitude: params.longitude,
                heading: params.heading || 0,
                speed: params.speed || 0,
            })
            .eq('order_id', params.orderId);
    } else {
        await supabase.from('rider_locations').insert({
            order_id: params.orderId,
            rider_id: params.riderId,
            latitude: params.latitude,
            longitude: params.longitude,
            heading: params.heading || 0,
            speed: params.speed || 0,
        });
    }
}

export async function markDelivered(orderId: string): Promise<void> {
    await supabase
        .from('orders')
        .update({
            status: 'delivered',
            delivery_proof: {
                deliveredAt: new Date().toISOString(),
                gpsVerified: true,
            },
        })
        .eq('id', orderId);

    await supabase.from('order_timeline').insert({
        order_id: orderId,
        status: 'delivered',
        description: 'Order delivered successfully! Enjoy your meal 🎉',
        updated_by: 'rider',
    });
}

// ============================
// REAL-TIME SUBSCRIPTIONS
// ============================

export function subscribeToOrder(
    orderId: string,
    onUpdate: (order: Partial<SupabaseOrder>) => void
): RealtimeChannel {
    return supabase
        .channel(`order-${orderId}`)
        .on(
            'postgres_changes',
            {
                event: 'UPDATE',
                schema: 'public',
                table: 'orders',
                filter: `id=eq.${orderId}`,
            },
            (payload) => {
                onUpdate(payload.new as Partial<SupabaseOrder>);
            }
        )
        .subscribe();
}

export function subscribeToTimeline(
    orderId: string,
    onNewEvent: (event: TimelineEvent) => void
): RealtimeChannel {
    return supabase
        .channel(`timeline-${orderId}`)
        .on(
            'postgres_changes',
            {
                event: 'INSERT',
                schema: 'public',
                table: 'order_timeline',
                filter: `order_id=eq.${orderId}`,
            },
            (payload) => {
                onNewEvent(payload.new as TimelineEvent);
            }
        )
        .subscribe();
}

export function subscribeToRiderLocation(
    orderId: string,
    onLocationUpdate: (location: RiderLocation) => void
): RealtimeChannel {
    return supabase
        .channel(`rider-loc-${orderId}`)
        .on(
            'postgres_changes',
            {
                event: '*',
                schema: 'public',
                table: 'rider_locations',
                filter: `order_id=eq.${orderId}`,
            },
            (payload) => {
                onLocationUpdate(payload.new as RiderLocation);
            }
        )
        .subscribe();
}

export function subscribeToAllOrders(
    userId: string,
    onUpdate: (order: Partial<SupabaseOrder>) => void
): RealtimeChannel {
    return supabase
        .channel(`user-orders-${userId}`)
        .on(
            'postgres_changes',
            {
                event: '*',
                schema: 'public',
                table: 'orders',
                filter: `user_id=eq.${userId}`,
            },
            (payload) => {
                onUpdate(payload.new as Partial<SupabaseOrder>);
            }
        )
        .subscribe();
}
