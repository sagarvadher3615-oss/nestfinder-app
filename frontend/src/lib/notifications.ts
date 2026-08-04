import * as Notifications from "expo-notifications";
import { Platform } from "react-native";

// How notifications appear when app is in foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

// Request permission and get push token
export async function registerForPushNotifications(): Promise<string | null> {
  try {
    // Check existing permission
    const { status: existing } = await Notifications.getPermissionsAsync();
    let finalStatus = existing;

    // Ask for permission if not granted
    if (existing !== "granted") {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== "granted") {
      console.log("Push notification permission denied");
      return null;
    }

    // Android needs a notification channel
    if (Platform.OS === "android") {
      await Notifications.setNotificationChannelAsync("default", {
        name: "NestFinder",
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: "#5C715E",
        sound: "default",
      });

      await Notifications.setNotificationChannelAsync("messages", {
        name: "Messages",
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: "#5C715E",
        sound: "default",
      });

      await Notifications.setNotificationChannelAsync("bookings", {
        name: "Booking Updates",
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: "#5C715E",
        sound: "default",
      });
    }

    // Get Expo push token
    const token = await Notifications.getExpoPushTokenAsync();
    return token.data;
  } catch (e) {
    console.warn("Push notification setup failed:", e);
    return null;
  }
}

// Show a local notification immediately
export async function showLocalNotification(title: string, body: string, data?: any) {
  await Notifications.scheduleNotificationAsync({
    content: {
      title,
      body,
      data: data || {},
      sound: "default",
    },
    trigger: null, // show immediately
  });
}

// Notification helpers for specific events
export const notify = {
  bookingAccepted: (propertyTitle: string) =>
    showLocalNotification(
      "Booking Accepted! 🎉",
      `Your visit to "${propertyTitle}" has been confirmed.`,
      { type: "booking", status: "accepted" }
    ),

  bookingDeclined: (propertyTitle: string) =>
    showLocalNotification(
      "Booking Update",
      `Your booking for "${propertyTitle}" was not accepted.`,
      { type: "booking", status: "declined" }
    ),

  newMessage: (senderName: string, message: string) =>
    showLocalNotification(
      `New message from ${senderName} 💬`,
      message,
      { type: "message" }
    ),

  newBookingRequest: (tenantName: string, propertyTitle: string) =>
    showLocalNotification(
      "New Booking Request 🏠",
      `${tenantName} wants to visit "${propertyTitle}"`,
      { type: "booking_request" }
    ),
};
