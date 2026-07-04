import { View, Text, StyleSheet, Pressable, ScrollView, ActivityIndicator } from "react-native";
import { Image } from "expo-image";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useState, useEffect } from "react";
import * as ImagePicker from "expo-image-picker";
import { useAuth } from "@/src/lib/auth";
import { api } from "@/src/lib/api";
import { useToast } from "@/src/lib/toast";
import { colors, spacing, radius, type } from "@/src/lib/theme";

export default function Profile() {
  const { user, logout, refresh } = useAuth();
  const router = useRouter();
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const [kycBusy, setKycBusy] = useState(false);
  const [pollingKyc, setPollingKyc] = useState(false);

  useEffect(() => {
    if (!pollingKyc) return;
    const t = setInterval(async () => {
      try {
        const res = await api.get("/kyc/status");
        if (res.status === "verified") {
          await refresh();
          setPollingKyc(false);
          toast.show("You're verified! ✅", "success");
        }
      } catch { /* ignore */ }
    }, 2000);
    return () => clearInterval(t);
  }, [pollingKyc, refresh, toast]);

  if (!user) return null;

  const toggleRole = async () => {
    const next = user.role === "tenant" ? "landlord" : "tenant";
    setBusy(true);
    try {
      await api.patch("/auth/role", { role: next });
      await refresh();
      toast.show(`Switched to ${next}`, "success");
    } catch (e: any) { toast.show(e.message || "Error", "error"); }
    finally { setBusy(false); }
  };

  const submitKyc = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) { toast.show("Photo permission needed", "error"); return; }
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.4,
      base64: true,
    });
    if (res.canceled) return;
    const b64 = res.assets[0].base64;
    if (!b64) return;
    setKycBusy(true);
    try {
      await api.post("/kyc/submit", { document: b64 });
      await refresh();
      toast.show("ID submitted — verifying...", "info");
      setPollingKyc(true);
    } catch (e: any) { toast.show(e.message || "Error", "error"); }
    finally { setKycBusy(false); }
  };

  const kyc = user.kyc_status || "none";

  return (
    <SafeAreaView style={styles.c} edges={["top"]} testID="profile-screen">
      <ScrollView contentContainerStyle={{ paddingBottom: spacing.xl }}>
        <View style={styles.header}>
          <View style={styles.avatar}>
            {user.avatar ? (
              <Image source={user.avatar} style={{ width: 84, height: 84, borderRadius: 42 }} contentFit="cover" />
            ) : (
              <Text style={styles.avatarTxt}>{user.name.charAt(0).toUpperCase()}</Text>
            )}
          </View>
          <Text style={styles.name}>{user.name}</Text>
          <Text style={styles.email}>{user.email}</Text>
          <View style={styles.roleRowWrap}>
            <View style={styles.roleBadge}>
              <Ionicons name={user.role === "landlord" ? "business" : "search"} size={12} color={colors.brand} />
              <Text style={styles.roleTxt}>{user.role === "landlord" ? "Landlord" : "Tenant"}</Text>
            </View>
            {kyc === "verified" && (
              <View style={[styles.roleBadge, { backgroundColor: colors.success }]}>
                <Ionicons name="shield-checkmark" size={12} color="#fff" />
                <Text style={[styles.roleTxt, { color: "#fff" }]}>Verified</Text>
              </View>
            )}
            {kyc === "pending" && (
              <View style={[styles.roleBadge, { backgroundColor: "#F5E9D2" }]}>
                <ActivityIndicator size="small" color="#8A6620" />
                <Text style={[styles.roleTxt, { color: "#8A6620" }]}>Verifying...</Text>
              </View>
            )}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Account</Text>
          <Pressable style={styles.rowItem} onPress={() => router.push("/favorites" as any)} testID="profile-favorites">
            <Ionicons name="heart-outline" size={22} color={colors.onSurface} />
            <Text style={styles.rowTxt}>Saved Properties</Text>
            <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
          </Pressable>
          {user.role === "landlord" && (
            <Pressable style={styles.rowItem} onPress={() => router.push("/property/new")} testID="profile-add-property">
              <Ionicons name="add-circle-outline" size={22} color={colors.onSurface} />
              <Text style={styles.rowTxt}>Add New Property</Text>
              <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
            </Pressable>
          )}
          <Pressable style={styles.rowItem} onPress={() => router.push("/(tabs)/bookings")} testID="profile-bookings">
            <Ionicons name="calendar-outline" size={22} color={colors.onSurface} />
            <Text style={styles.rowTxt}>{user.role === "landlord" ? "Booking Requests" : "My Bookings"}</Text>
            <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
          </Pressable>
          <Pressable style={styles.rowItem} onPress={toggleRole} disabled={busy} testID="profile-switch-role">
            <Ionicons name="swap-horizontal-outline" size={22} color={colors.onSurface} />
            <Text style={styles.rowTxt}>Switch to {user.role === "tenant" ? "Landlord" : "Tenant"}</Text>
            {busy ? <ActivityIndicator color={colors.brand} /> : <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />}
          </Pressable>
        </View>

        {kyc !== "verified" && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Verification</Text>
            <Pressable style={styles.rowItem} onPress={submitKyc} disabled={kycBusy || kyc === "pending"} testID="profile-kyc-btn">
              <Ionicons name="shield-checkmark-outline" size={22} color={colors.brand} />
              <View style={{ flex: 1 }}>
                <Text style={[styles.rowTxt, { color: colors.brand, fontWeight: "500" }]}>
                  {kyc === "pending" ? "Verification in progress..." : "Get Verified"}
                </Text>
                <Text style={styles.rowSub}>Upload any ID photo · builds trust with tenants</Text>
              </View>
              {kycBusy || kyc === "pending" ? <ActivityIndicator color={colors.brand} /> : <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />}
            </Pressable>
          </View>
        )}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>About</Text>
          <View style={styles.rowItem}>
            <Ionicons name="shield-checkmark-outline" size={22} color={colors.onSurface} />
            <Text style={styles.rowTxt}>No broker, no commission</Text>
          </View>
          <View style={styles.rowItem}>
            <Ionicons name="checkmark-circle-outline" size={22} color={colors.onSurface} />
            <Text style={styles.rowTxt}>Verified listings</Text>
          </View>
        </View>

        <Pressable style={styles.logoutBtn} onPress={async () => { await logout(); router.replace("/onboarding"); }} testID="profile-logout">
          <Ionicons name="log-out-outline" size={20} color={colors.error} />
          <Text style={styles.logoutTxt}>Log out</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  c: { flex: 1, backgroundColor: colors.surface },
  header: { alignItems: "center", paddingTop: spacing.lg, paddingBottom: spacing.lg },
  avatar: {
    width: 84, height: 84, borderRadius: 42, backgroundColor: colors.brandTertiary,
    alignItems: "center", justifyContent: "center", overflow: "hidden",
  },
  avatarTxt: { fontSize: 34, color: colors.brand, fontWeight: "500" },
  name: { fontSize: type.xl, fontWeight: "500", color: colors.onSurface, marginTop: spacing.md },
  email: { fontSize: type.base, color: colors.textSecondary, marginTop: 2 },
  roleRowWrap: { flexDirection: "row", gap: spacing.sm, marginTop: spacing.sm, flexWrap: "wrap", justifyContent: "center" },
  roleBadge: {
    flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: colors.brandTertiary,
    paddingHorizontal: spacing.md, paddingVertical: 4, borderRadius: radius.pill,
  },
  roleTxt: { fontSize: type.sm, color: colors.brand, fontWeight: "500" },
  section: { marginTop: spacing.md, paddingHorizontal: spacing.lg },
  sectionTitle: { fontSize: type.sm, color: colors.textSecondary, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: spacing.sm },
  rowItem: {
    flexDirection: "row", alignItems: "center", gap: spacing.md,
    backgroundColor: colors.surfaceSecondary, borderRadius: radius.md,
    paddingHorizontal: spacing.md, paddingVertical: 14, marginBottom: spacing.xs,
  },
  rowTxt: { flex: 1, fontSize: type.base, color: colors.onSurface },
  rowSub: { fontSize: type.sm, color: colors.textSecondary, marginTop: 2 },
  logoutBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: spacing.sm,
    marginHorizontal: spacing.lg, marginTop: spacing.xl, paddingVertical: 14, borderRadius: radius.md,
    backgroundColor: colors.surfaceSecondary,
  },
  logoutTxt: { color: colors.error, fontSize: type.base, fontWeight: "500" },
});
