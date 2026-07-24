import { isRunningInExpoGo } from "expo";
import { Platform } from "react-native";
import * as Notifications from "expo-notifications";

function canUseNotifications(): boolean {
  return !(isRunningInExpoGo() && Platform.OS === "android");
}

async function loadNotification() {
  if (!canUseNotifications()) {
    return null;
  }

  try {
    return await import("expo-notifications");
  } catch {
    return null;
  }
}

export async function initNotifications(): Promise<void> {
  const Notifications = await loadNotification();

  if (!Notifications) {
    return;
  }

  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });
}