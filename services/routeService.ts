/**
 * Route Service - Uses OSRM (Open Source Routing Machine) to fetch real road routes.
 * OSRM is 100% free and requires no API key.
 * It returns actual road-based polylines that we decode into lat/lng coordinates.
 */

type LatLng = { latitude: number; longitude: number };

/**
 * Decode an encoded polyline string (Google's polyline encoding algorithm)
 * into an array of LatLng points.
 */
export function decodePolyline(encoded: string): LatLng[] {
    const points: LatLng[] = [];
    let index = 0;
    let lat = 0;
    let lng = 0;

    while (index < encoded.length) {
        let b: number;
        let shift = 0;
        let result = 0;

        do {
            b = encoded.charCodeAt(index++) - 63;
            result |= (b & 0x1f) << shift;
            shift += 5;
        } while (b >= 0x20);

        const dlat = (result & 1) ? ~(result >> 1) : (result >> 1);
        lat += dlat;

        shift = 0;
        result = 0;

        do {
            b = encoded.charCodeAt(index++) - 63;
            result |= (b & 0x1f) << shift;
            shift += 5;
        } while (b >= 0x20);

        const dlng = (result & 1) ? ~(result >> 1) : (result >> 1);
        lng += dlng;

        points.push({
            latitude: lat / 1e5,
            longitude: lng / 1e5,
        });
    }

    return points;
}

/**
 * Calculate the distance between two lat/lng points (Haversine formula)
 */
export function haversineDistance(p1: LatLng, p2: LatLng): number {
    const R = 6371e3; // metres
    const phi1 = (p1.latitude * Math.PI) / 180;
    const phi2 = (p2.latitude * Math.PI) / 180;
    const deltaPhi = ((p2.latitude - p1.latitude) * Math.PI) / 180;
    const deltaLambda = ((p2.longitude - p1.longitude) * Math.PI) / 180;

    const a =
        Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
        Math.cos(phi1) * Math.cos(phi2) *
        Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}

/**
 * Calculate bearing between two points (for rider heading direction)
 */
export function calculateBearing(from: LatLng, to: LatLng): number {
    const lat1 = (from.latitude * Math.PI) / 180;
    const lat2 = (to.latitude * Math.PI) / 180;
    const dLng = ((to.longitude - from.longitude) * Math.PI) / 180;

    const y = Math.sin(dLng) * Math.cos(lat2);
    const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLng);

    return ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360;
}

export type RouteResult = {
    coordinates: LatLng[];
    distanceKm: number;
    durationMinutes: number;
};

/**
 * Fetch a real road-based route between two points using OSRM.
 * Falls back to a simple interpolated straight line if OSRM is unreachable.
 */
export async function fetchRoute(
    origin: LatLng,
    destination: LatLng
): Promise<RouteResult> {
    try {
        // OSRM uses lng,lat format (reversed from our lat,lng)
        const url = `https://router.project-osrm.org/route/v1/driving/${origin.longitude},${origin.latitude};${destination.longitude},${destination.latitude}?overview=full&geometries=polyline`;

        const response = await fetch(url);
        const data = await response.json();

        if (data.code === 'Ok' && data.routes && data.routes.length > 0) {
            const route = data.routes[0];
            const coordinates = decodePolyline(route.geometry);
            const distanceKm = route.distance / 1000;
            const durationMinutes = route.duration / 60;

            return { coordinates, distanceKm, durationMinutes };
        }

        throw new Error('No route found');
    } catch (err) {
        console.warn('OSRM route fetch failed, using fallback interpolation:', err);
        return generateFallbackRoute(origin, destination);
    }
}

/**
 * Generate a fallback route by interpolating between origin and destination
 * with slight randomization to simulate roads.
 */
function generateFallbackRoute(origin: LatLng, destination: LatLng): RouteResult {
    const steps = 20;
    const coordinates: LatLng[] = [];

    for (let i = 0; i <= steps; i++) {
        const t = i / steps;
        // Add slight random offset to simulate a road (not a straight line)
        const jitter = i > 0 && i < steps ? (Math.random() - 0.5) * 0.0005 : 0;

        coordinates.push({
            latitude: origin.latitude + (destination.latitude - origin.latitude) * t + jitter,
            longitude: origin.longitude + (destination.longitude - origin.longitude) * t + jitter,
        });
    }

    const distanceKm = haversineDistance(origin, destination) / 1000;
    const durationMinutes = (distanceKm / 25) * 60; // Assume ~25 km/h average speed

    return { coordinates, distanceKm, durationMinutes };
}

/**
 * Subsample a route to get evenly spaced points for animation.
 * Used to create smooth rider movement along the route.
 */
export function subsampleRoute(coordinates: LatLng[], numPoints: number): LatLng[] {
    if (coordinates.length <= numPoints) return coordinates;

    const result: LatLng[] = [];
    const step = (coordinates.length - 1) / (numPoints - 1);

    for (let i = 0; i < numPoints; i++) {
        const idx = Math.min(Math.round(i * step), coordinates.length - 1);
        result.push(coordinates[idx]);
    }

    return result;
}
