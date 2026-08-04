import { Tabs, Redirect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "@/src/lib/auth";
import { colors } from "@/src/lib/theme";
import { View, ActivityIndicator, Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function TabsLayout() {
  const { user, loading } = useAuth();
  const insets = useSafeAreaInsets();

  if (loading) return (
    <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.surface }}>
      <ActivityIndicator color={colors.brand} />
    </View>
  );
  if (!user) return <Redirect href="/onboarding" />;

  const isLandlord = user.role === "landlord";

  // Bottom gap below the tab icons.
  //   - Web: fixed 4px — very close to the browser edge, matches Instagram.
  //   - Native: respect the phone's home-indicator safe area, min 8px.
  const bottomPad = Platform.OS === "web" ? 5 : Math.max(insets.bottom, 8);

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.brand,
        tabBarInactiveTintColor: colors.onSurface,
        tabBarShowLabel: false,
        tabBarStyle: {
          backgroundColor: colors.surfaceSecondary,
          borderTopWidth: 0,
          elevation: 0,
          height: 48 + bottomPad,
          paddingTop: 5,
          paddingBottom: bottomPad,
          paddingHorizontal: 8,
          shadowColor: "#000",
          shadowOffset: { width: 0, height: -4 },
          shadowOpacity: 0.06,
          shadowRadius: 12,
        },
        tabBarItemStyle: {
          paddingVertical: 4,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? (isLandlord ? "business" : "home") : (isLandlord ? "business-outline" : "home-outline")}
              size={28}
              color={color}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="search"
        options={{
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? "search" : "search-outline"}
              size={28}
              color={color}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="bookings"
        options={{
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? "calendar" : "calendar-outline"}
              size={28}
              color={color}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? "person-circle" : "person-circle-outline"}
              size={30}
              color={color}
            />
          ),
        }}
      />
    </Tabs>
  );
}
