import { Tabs, Redirect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "@/src/lib/auth";
import { View, ActivityIndicator, Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function TabsLayout() {
  const { user, loading } = useAuth();
  const insets = useSafeAreaInsets();

  if (loading) return (
    <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "#fff" }}>
      <ActivityIndicator color="#2E7D32" />
    </View>
  );
  if (!user) return <Redirect href="/onboarding" />;

  const isLandlord = user.role === "landlord";
  const bottomPad = 16;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: "#2E7D32",
        tabBarInactiveTintColor: "#999",
        tabBarStyle: {
          backgroundColor: "#FFFFFF",
          borderTopWidth: 1,
          borderTopColor: "#f0f0f0",
          height: 90,
          paddingTop: 8,
          paddingBottom: 34,
          paddingHorizontal: 4,
          elevation: 0,
        },
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: "500",
          marginTop: 2,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Home",
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? "home" : "home-outline"} size={22} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="search"
        options={{
          title: "Search",
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? "search" : "search-outline"} size={22} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="bookings"
        options={{
          title: isLandlord ? "Requests" : "Saved",
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? "heart" : "heart-outline"} size={22} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile",
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? "person" : "person-outline"} size={22} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
