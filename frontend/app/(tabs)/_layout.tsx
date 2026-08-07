import { Tabs, Redirect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "@/src/lib/auth";
import { View, ActivityIndicator, Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const TAB_BAR_HEIGHT = 64;
const TAB_BAR_VERTICAL_PADDING = 6;

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
  const bottomInset = Platform.OS === "web" ? 0 : insets.bottom;
  const tabBarHeight = TAB_BAR_HEIGHT + bottomInset;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarHideOnKeyboard: true,
        tabBarActiveTintColor: "#2E7D32",
        tabBarInactiveTintColor: "#999",
        sceneStyle: {
          backgroundColor: "#FFFFFF",
          paddingBottom: tabBarHeight,
        },
        tabBarStyle: {
          position: "absolute",
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: 1000,
          width: "100%",
          height: tabBarHeight,
          margin: 0,
          paddingTop: TAB_BAR_VERTICAL_PADDING,
          paddingBottom: TAB_BAR_VERTICAL_PADDING + bottomInset,
          paddingHorizontal: 0,
          backgroundColor: "#FFFFFF",
          borderTopWidth: 0,
          borderWidth: 0,
          borderRadius: 0,
          elevation: 0,
          shadowColor: "transparent",
          shadowOffset: { width: 0, height: 0 },
          shadowOpacity: 0,
          shadowRadius: 0,
        },
        tabBarItemStyle: {
          margin: 0,
          padding: 0,
        },
        tabBarIconStyle: {
          margin: 0,
        },
        tabBarLabelStyle: {
          fontSize: 10,
          lineHeight: 12,
          fontWeight: "500",
          marginTop: 2,
          marginBottom: 0,
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
