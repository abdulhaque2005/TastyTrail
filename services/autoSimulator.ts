/**
 * Auto-Simulation Engine
 * 
 * This runs automatically after an order is placed. It progresses the order
 * through all lifecycle stages with realistic delays:
 * 
 *   confirmed → accepted → preparing → ready → rider_assigned → picked_up → out_for_delivery → nearby → delivered
 * 
 * During rider stages, the rider's GPS location is updated along the real road route
 * fetched from OSRM, making the tracking map look completely real.
 */

import { ORDER_FLOW, OrderStatus, RiderInfo } from '../lib/supabase';
import {
    updateOrderStatus,
    assignRider,
    updateRiderLocation,
    markDelivered,
    getSupabaseOrder,
} from './supabaseOrders';
import { fetchRoute, subsampleRoute, calculateBearing } from './routeService';

// Realistic rider data
const RIDERS: RiderInfo[] = [
    {
        id: 'rider_001',
        name: 'Rahul Kumar',
        phone: '+91 98765 43210',
        photo: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=200',
        vehicle: 'Bike',
        eta: 12,
    },
    {
        id: 'rider_002',
        name: 'Amit Singh',
        phone: '+91 87654 32109',
        photo: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?q=80&w=200',
        vehicle: 'Scooter',
        eta: 15,
    },
    {
        id: 'rider_003',
        name: 'Vikram Patel',
        phone: '+91 76543 21098',
        photo: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?q=80&w=200',
        vehicle: 'Bike',
        eta: 10,
    },
];

// Realistic restaurant locations (Indian cities)
const RESTAURANT_LOCATIONS = [
    { latitude: 28.6139, longitude: 77.2090 }, // Delhi
    { latitude: 19.0760, longitude: 72.8777 }, // Mumbai
    { latitude: 12.9716, longitude: 77.5946 }, // Bangalore
    { latitude: 17.3850, longitude: 78.4867 }, // Hyderabad
    { latitude: 26.9124, longitude: 75.7873 }, // Jaipur
];

// Realistic delays for each status transition (in milliseconds)
const STATUS_DELAYS: Record<string, number> = {
    confirmed: 3000,       // 3s - order confirmed instantly
    accepted: 8000,        // 8s - restaurant accepts
    preparing: 15000,      // 15s - food preparation starts
    ready: 12000,          // 12s - food is ready
    rider_assigned: 6000,  // 6s - rider gets assigned
    picked_up: 8000,       // 8s - rider picks up food
    out_for_delivery: 3000, // 3s - rider starts delivery
    nearby: 10000,         // 10s - rider is nearby
    delivered: 5000,       // 5s - delivered!
};

const STATUS_DESCRIPTIONS: Record<string, string> = {
    confirmed: 'Order confirmed by restaurant',
    accepted: 'Restaurant accepted your order',
    preparing: 'Chef is preparing your food 🍳',
    ready: 'Food is packed and ready for pickup',
    rider_assigned: 'Delivery partner is on the way to the restaurant',
    picked_up: 'Food picked up! On the way to you',
    out_for_delivery: 'Your food is out for delivery! 🚀',
    nearby: 'Delivery partner is almost there! 📍',
    delivered: 'Delivered! Enjoy your meal 🎉',
};

// Active simulation timers (keyed by orderId)
const activeSimulations = new Map<string, ReturnType<typeof setTimeout>>();

/**
 * Start auto-simulation for an order.
 * This should be called right after placing a Supabase order.
 */
export function startAutoSimulation(orderId: string): void {
    // Don't start if already simulating
    if (activeSimulations.has(orderId)) return;

    console.log(`[AutoSim] Starting simulation for order ${orderId}`);
    runSimulationStep(orderId, 0);
}

/**
 * Stop auto-simulation for an order.
 */
export function stopAutoSimulation(orderId: string): void {
    const timer = activeSimulations.get(orderId);
    if (timer) {
        clearTimeout(timer);
        activeSimulations.delete(orderId);
        console.log(`[AutoSim] Stopped simulation for order ${orderId}`);
    }
}

/**
 * Run a single step of the simulation, then schedule the next step.
 */
async function runSimulationStep(orderId: string, stepIndex: number): Promise<void> {
    // Skip 'confirmed' since the order is already created with that status
    const stepsToRun = ORDER_FLOW.slice(1); // accepted → delivered

    if (stepIndex >= stepsToRun.length) {
        activeSimulations.delete(orderId);
        console.log(`[AutoSim] Simulation complete for order ${orderId}`);
        return;
    }

    const nextStatus = stepsToRun[stepIndex];
    const delay = STATUS_DELAYS[nextStatus] || 5000;

    const timer = setTimeout(async () => {
        try {
            const order = await getSupabaseOrder(orderId);
            if (!order || order.status === 'delivered') {
                activeSimulations.delete(orderId);
                return;
            }

            console.log(`[AutoSim] ${orderId} → ${nextStatus}`);

            if (nextStatus === 'rider_assigned') {
                // Pick a random rider
                const rider = RIDERS[Math.floor(Math.random() * RIDERS.length)];

                // Pick a restaurant location near the delivery location (or random)
                let restaurantLoc = RESTAURANT_LOCATIONS[Math.floor(Math.random() * RESTAURANT_LOCATIONS.length)];

                // If the order has delivery coordinates, pick a restaurant ~2-4km away
                if (order.delivery?.latitude && order.delivery?.longitude) {
                    const offset = (Math.random() * 0.02) + 0.01; // ~1-3 km offset
                    const angle = Math.random() * Math.PI * 2;
                    restaurantLoc = {
                        latitude: order.delivery.latitude + offset * Math.cos(angle),
                        longitude: order.delivery.longitude + offset * Math.sin(angle),
                    };
                }

                await assignRider(orderId, rider);
                await updateRiderLocation({
                    orderId,
                    riderId: rider.id,
                    latitude: restaurantLoc.latitude,
                    longitude: restaurantLoc.longitude,
                    heading: 0,
                    speed: 0,
                });
            } else if (nextStatus === 'picked_up') {
                // Start the rider moving toward the customer
                await updateOrderStatus({
                    orderId,
                    status: nextStatus,
                    description: STATUS_DESCRIPTIONS[nextStatus],
                    updatedBy: 'rider',
                });

                // Fetch the real road route and start moving the rider
                if (order.delivery?.latitude && order.delivery?.longitude && order.rider) {
                    const currentRiderLoc = await import('./supabaseOrders').then(m => m.getRiderLocation(orderId));
                    if (currentRiderLoc && currentRiderLoc.latitude !== 0) {
                        startRiderMovement(orderId, order.rider.id, {
                            latitude: currentRiderLoc.latitude,
                            longitude: currentRiderLoc.longitude,
                        }, {
                            latitude: order.delivery.latitude,
                            longitude: order.delivery.longitude,
                        });
                    }
                }

                // Move to next step
                runSimulationStep(orderId, stepIndex + 1);
                return; // Don't update status again below
            } else if (nextStatus === 'delivered') {
                await markDelivered(orderId);
            } else {
                const updatedBy = ['accepted', 'preparing', 'ready'].includes(nextStatus)
                    ? 'restaurant'
                    : 'rider';

                await updateOrderStatus({
                    orderId,
                    status: nextStatus,
                    description: STATUS_DESCRIPTIONS[nextStatus],
                    updatedBy,
                });
            }

            // Schedule next step
            runSimulationStep(orderId, stepIndex + 1);
        } catch (err) {
            console.error(`[AutoSim] Error at step ${nextStatus}:`, err);
            // Retry after a short delay
            runSimulationStep(orderId, stepIndex);
        }
    }, delay);

    activeSimulations.set(orderId, timer);
}

/**
 * Move the rider along the real road route, updating GPS coordinates in Supabase.
 * This creates the smooth "bike driving on roads" effect on the tracking map.
 */
async function startRiderMovement(
    orderId: string,
    riderId: string,
    from: { latitude: number; longitude: number },
    to: { latitude: number; longitude: number },
): Promise<void> {
    try {
        // Fetch real road route from OSRM
        const route = await fetchRoute(from, to);

        // Subsample to ~30 points for smooth animation (every ~2 seconds)
        const routePoints = subsampleRoute(route.coordinates, 30);

        // Move rider along each point
        for (let i = 0; i < routePoints.length; i++) {
            const point = routePoints[i];
            const nextPoint = routePoints[Math.min(i + 1, routePoints.length - 1)];
            const heading = calculateBearing(point, nextPoint);

            // Calculate realistic speed (15-35 km/h in city)
            const speed = 15 + Math.random() * 20;

            await updateRiderLocation({
                orderId,
                riderId,
                latitude: point.latitude,
                longitude: point.longitude,
                heading,
                speed,
            });

            // Wait 2 seconds between position updates
            await new Promise(resolve => setTimeout(resolve, 2000));

            // Check if simulation was stopped
            if (!activeSimulations.has(orderId)) return;
        }

        // Update ETA as rider approaches
        const order = await getSupabaseOrder(orderId);
        if (order && order.rider) {
            // Update order with reduced ETA
            const { supabase } = await import('../lib/supabase');
            await supabase
                .from('orders')
                .update({
                    rider: { ...order.rider, eta: 1 },
                })
                .eq('id', orderId);
        }
    } catch (err) {
        console.error(`[AutoSim] Rider movement error:`, err);
    }
}
