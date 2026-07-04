import { useEffect, useState, useCallback } from "react";
import { View, Text, StyleSheet, FlatList, Pressable, ActivityIndicator, RefreshControl } from "react-native";
import { Image } from "expo-image";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "@/src/lib/auth";
import { api, Booking } from "@/src/lib/api";
import { colors, spacing, radius, type } from "@/src/lib/theme";

const STATUS_COLOR: Record<string, { bg: string; fg: string }> = {
  pending: { bg: "#F5E9D2", fg: "#8A6620" },
  accepted: { bg: "#DCEBDF", fg: "#3B6444" },
  declined: { bg: "#F1DEDC", fg: "#8B4741" },
  cancelled: { bg: "#E5E5E5", fg: "#6A6E6B" },
};

export default function BookingsScreen() {
  const { user } = useAuth();
  const isLandlord = user?.role === "landlord";
  const [items, setItems] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await api.get(isLandlord ? "/bookings/landlord" : "/bookings/mine");
      setItems(data);
    } catch (e) { console.warn(e); }
    finally { setLoading(false); setRefreshing(false); }
  }, [isLandlord]);

  useEffect(() => { load(); }, [load]);

  const setStatus = async (id: string, status: "accepted" | "declined" | "cancelled") => {
    try {
      const updated = await api.patch(`/bookings/${id}`, { status });
      setItems(prev => prev.map(b => b.booking_id === id ? updated : b));
    } catch (e: any) {
      console.warn(e.message);
    }
  };

  return (
    <SafeAreaView style={styles.c} edges={["top"]} testID="bookings-screen">
      <View style={styles.header}>
        <Text style={styles.title}>{isLandlord ? "Booking Requests" : "My Bookings"}</Text>
        <Text style={styles.sub}>{isLandlord ? "Manage incoming requests" : "Track your booking status"}</Text>
      </View>

      {loading ? (
        <View style={styles.center}><ActivityIndicator color={colors.brand} /></View>
      ) : items.length === 0 ? (
        <View style={styles.center}>
          <Ionicons name="calendar-outline" size={48} color={colors.borderStrong} />
          <Text style={styles.empty}>No bookings yet</Text>
          <Text style={styles.emptySub}>{isLandlord ? "You'll see incoming requests here." : "Book a property to see it here."}</Text>
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={i => i.booking_id}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={colors.brand} />}
          contentContainerStyle={{ paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: spacing.xl }}
          renderItem={({ item }) => {
            const sc = STATUS_COLOR[item.status];
            return (
              <View style={styles.row} testID={`booking-row-${item.booking_id}`}>
                <Image source={item.property_image} style={styles.thumb} contentFit="cover" />
                <View style={{ flex: 1 }}>
                  <Text style={styles.rowTitle} numberOfLines={1}>{item.property_title}</Text>
                  <Text style={styles.rowSub}>
                    {isLandlord ? `${item.tenant_name} · ${item.tenant_phone}` : `Move-in: ${item.move_in_date}`}
                  </Text>
                  <Text style={styles.rowSub}>{isLandlord ? `Move-in: ${item.move_in_date}` : `Requested ${new Date(item.created_at).toLocaleDateString()}`}</Text>
                  <View style={[styles.badge, { backgroundColor: sc.bg }]}>
                    <Text style={[styles.badgeTxt, { color: sc.fg }]}>{item.status.toUpperCase()}</Text>
                  </View>
                  {isLandlord && item.status === "pending" && (
                    <View style={styles.actions}>
                      <Pressable style={[styles.actionBtn, styles.acceptBtn]} onPress={() => setStatus(item.booking_id, "accepted")} testID={`accept-${item.booking_id}`}>
                        <Text style={styles.acceptTxt}>Accept</Text>
                      </Pressable>
                      <Pressable style={[styles.actionBtn, styles.declineBtn]} onPress={() => setStatus(item.booking_id, "declined")} testID={`decline-${item.booking_id}`}>
                        <Text style={styles.declineTxt}>Decline</Text>
                      </Pressable>
                    </View>
                  )}
                  {!isLandlord && item.status === "pending" && (
                    <Pressable style={[styles.actionBtn, styles.declineBtn, { marginTop: 8, alignSelf: "flex-start" }]} onPress={() => setStatus(item.booking_id, "cancelled")} testID={`cancel-${item.booking_id}`}>
                      <Text style={styles.declineTxt}>Cancel Request</Text>
                    </Pressable>
                  )}
                </View>
              </View>
            );
          }}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  c: { flex: 1, backgroundColor: colors.surface },
  header: { paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: spacing.sm },
  title: { fontSize: 24, color: colors.onSurface, fontWeight: "500" },
  sub: { fontSize: type.base, color: colors.textSecondary, marginTop: 2 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: spacing.sm },
  empty: { fontSize: type.lg, color: colors.onSurface, fontWeight: "500", marginTop: spacing.sm },
  emptySub: { fontSize: type.base, color: colors.textSecondary, textAlign: "center", paddingHorizontal: spacing.xl },
  row: {
    flexDirection: "row", gap: spacing.md, backgroundColor: colors.surfaceSecondary,
    padding: spacing.md, borderRadius: radius.lg, marginBottom: spacing.sm,
  },
  thumb: { width: 72, height: 72, borderRadius: radius.md, backgroundColor: colors.surfaceTertiary },
  rowTitle: { fontSize: type.lg, color: colors.onSurface, fontWeight: "500" },
  rowSub: { fontSize: type.sm, color: colors.textSecondary, marginTop: 2 },
  badge: { alignSelf: "flex-start", paddingHorizontal: spacing.sm, paddingVertical: 3, borderRadius: radius.pill, marginTop: spacing.sm },
  badgeTxt: { fontSize: 10, fontWeight: "500", letterSpacing: 0.5 },
  actions: { flexDirection: "row", gap: spacing.sm, marginTop: spacing.sm },
  actionBtn: { paddingHorizontal: spacing.md, paddingVertical: 8, borderRadius: radius.md },
  acceptBtn: { backgroundColor: colors.brand },
  acceptTxt: { color: "#fff", fontSize: type.sm, fontWeight: "500" },
  declineBtn: { backgroundColor: colors.surfaceTertiary },
  declineTxt: { color: colors.onSurface, fontSize: type.sm, fontWeight: "500" },
});
