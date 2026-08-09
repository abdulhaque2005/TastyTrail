import { Platform } from "react-native";

// Lazy load expo-notifications to avoid Expo Go crash
async function getNotifications() {
    // In Expo Go SDK 53+, importing expo-notifications crashes the app automatically
    // due to DevicePushTokenAutoRegistration side effects.
    // For local development in Expo Go, we return null to bypass this.
    // Uncomment this for production builds (EAS Build):
    /*
    try {
        return await import("expo-notifications");
    } catch {
        return null;
    }
    */
    return null;
}

// Initialize notification handler (safe for Expo Go)
export async function initNotifications(): Promise<void> {
    const Notifications = (await getNotifications()) as any;
    if (!Notifications) return;

    Notifications.setNotificationHandler({
        handleNotification: async () => ({
            shouldShowAlert: true,
            shouldPlaySound: true,
            shouldSetBadge: true,
        }),
    });
}

export async function registerForPushNotifications(): Promise<string | null> {
    const Notifications = (await getNotifications()) as any;
    if (!Notifications) return null;

    try {
        const { status: existingStatus } = await Notifications.getPermissionsAsync();
        let finalStatus = existingStatus;

        if (existingStatus !== 'granted') {
            const { status } = await Notifications.requestPermissionsAsync();
            finalStatus = status;
        }

        if (finalStatus !== 'granted') return null;

        // Set notification channel for Android
        if (Platform.OS === 'android') {
            await Notifications.setNotificationChannelAsync('default', {
                name: 'TastyTrail',
                importance: Notifications.AndroidImportance.HIGH,
                vibrationPattern: [0, 250, 250, 250],
                lightColor: '#F97316',
            });
        }

        return null; // Push token needs development build, skip in Expo Go
    } catch {
        return null;
    }
}

// Schedule daily meal reminder at 12:00 PM (local notification - works in Expo Go)
export async function scheduleDailyMealReminder(): Promise<void> {
    const Notifications = (await getNotifications()) as any;
    if (!Notifications) return;

    try {
        // Cancel existing daily reminders first
        const scheduled = await Notifications.getAllScheduledNotificationsAsync();
        for (const n of scheduled) {
            if (n.content.data?.type === 'daily-reminder') {
                await Notifications.cancelScheduledNotificationAsync(n.identifier);
            }
        }

        await Notifications.scheduleNotificationAsync({
            content: {
                title: "🍽️ What's cooking today?",
                body: "Discover new recipes and find your next craving!",
                data: { type: 'daily-reminder' },
                sound: true,
            },
            trigger: {
                type: Notifications.SchedulableTriggerInputTypes.DAILY,
                hour: 12,
                minute: 0,
            },
        });
    } catch {
        // Silently fail - notifications are not critical
    }
}

// Send local notification when meal is saved
export async function sendSaveConfirmation(mealName: string): Promise<void> {
    const Notifications = (await getNotifications()) as any;
    if (!Notifications) return;

    try {
        await Notifications.scheduleNotificationAsync({
            content: {
                title: "❤️ Meal Saved!",
                body: `"${mealName}" has been added to your collection`,
                data: { type: 'save-confirmation' },
                sound: true,
            },
            trigger: null, // Send immediately
        });
    } catch {
        // Silently fail
    }
}