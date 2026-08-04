import { Tabs, Redirect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "@/src/lib/auth";
import { colors } from "@/src/lib/theme";
import { View, ActivityIndicator, Platform, StyleSheet } from "react-native";

export default function TabsLayout() {
  const { user, loading } = useAuth();
  if (loading) return <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.surface }}><ActivityIndicator color={colors.brand} /></View>;
  if (!user) return <Redirect href="/onboarding" />;

  const isLandlord = user.role === "landlord";

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.brand,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarStyle: {
          backgroundColor: colors.surfaceSecondary,
          borderTopWidth: 0,
          elevation: 0,
          height: Platform.OS === "ios" ? 88 : 68,
          paddingTop: 10,
          paddingBottom: Platform.OS === "ios" ? 28 : 10,
          paddingHorizontal: 8,
          // Shadow for floating effect
          shadowColor: "#000",
          shadowOffset: { width: 0, height: -4 },
          shadowOpacity: 0.06,
          shadowRadius: 12,
          // Subtle top border replaced with shadow
          borderTopLeftRadius: 20,
          borderTopRightRadius: 20,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: "600",
          marginTop: 2,
        },
        tabBarItemStyle: {
          paddingVertical: 4,
          borderRadius: 12,
        },
        tabBarIconStyle: {
          marginBottom: 0,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: isLandlord ? "Listings" : "Home",
          tabBarIcon: ({ color, focused }) => (
            <View style={[styles.iconWrap, focused && styles.iconWrapActive]}>
              <Ionicons name={focused ? (isLandlord ? "business" : "home") : (isLandlord ? "business-outline" : "home-outline")} size={22} color={color} />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="search"
        options={{
          title: "Search",
          tabBarIcon: ({ color, focused }) => (
            <View style={[styles.iconWrap, focused && styles.iconWrapActive]}>
              <Ionicons name={focused ? "search" : "search-outline"} size={22} color={color} />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="bookings"
        options={{
          title: isLandlord ? "Requests" : "Bookings",
          tabBarIcon: ({ color, focused }) => (
            <View style={[styles.iconWrap, focused && styles.iconWrapActive]}>
              <Ionicons name={focused ? "calendar" : "calendar-outline"} size={22} color={color} />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile",
          tabBarIcon: ({ color, focused }) => (
            <View style={[styles.iconWrap, focused && styles.iconWrapActive]}>
              <Ionicons name={focused ? "person-circle" : "person-circle-outline"} size={24} color={color} />
            </View>
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  iconWrap: {
    width: 44,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 16,
  },
  iconWrapActive: {
    backgroundColor: "#ECF0ED",
  },
});
