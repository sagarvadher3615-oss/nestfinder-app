import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { useEffect, useRef } from "react";
import { Platform, View, StyleSheet } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import * as Notifications from "expo-notifications";

import { useIconFonts } from "@/src/hooks/use-icon-fonts";
import { AuthProvider } from "@/src/lib/auth";
import { ToastProvider } from "@/src/lib/toast";
import { FavoritesProvider } from "@/src/lib/favorites";
import { registerForPushNotifications } from "@/src/lib/notifications";
import { ThemeProvider } from "@/src/lib/theme-context";

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [loaded, error] = useIconFonts();
  const notifListener = useRef<any>(null);
  const responseListener = useRef<any>(null);

  useEffect(() => {
    if (loaded || error) SplashScreen.hideAsync();
  }, [loaded, error]);

  useEffect(() => {
    registerForPushNotifications();

    notifListener.current = Notifications.addNotificationReceivedListener(notification => {
      console.log("Notification received:", notification);
    });

    responseListener.current = Notifications.addNotificationResponseReceivedListener(response => {
      const data = response.notification.request.content.data;
      console.log("Notification tapped:", data);
    });

    return () => {
      if (notifListener.current) Notifications.removeNotificationSubscription(notifListener.current);
      if (responseListener.current) Notifications.removeNotificationSubscription(responseListener.current);
    };
  }, []);

  if (!loaded && !error) return null;

  const app = (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <ThemeProvider>
          <AuthProvider>
            <FavoritesProvider>
              <ToastProvider>
                <Stack screenOptions={{ headerShown: false, animation: "fade" }} />
              </ToastProvider>
            </FavoritesProvider>
          </AuthProvider>
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );

  // On web — center the app like a mobile frame
  if (Platform.OS === "web") {
    return (
      <View style={styles.webOuter}>
        <View style={styles.webPhone}>
          {app}
        </View>
      </View>
    );
  }

  return app;
}

const styles = StyleSheet.create({
  webOuter: {
    flex: 1,
    backgroundColor: "#1a1a1a",
    alignItems: "center",
    justifyContent: "center",
    minHeight: "100vh" as any,
  },
  webPhone: {
    width: 390,
    height: "100vh" as any,
    maxHeight: 844,
    overflow: "hidden" as any,
    backgroundColor: "#FAFAFA",
    borderRadius: 0,
    // Shadow to make it look like a phone
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 32,
    elevation: 20,
  },
});
