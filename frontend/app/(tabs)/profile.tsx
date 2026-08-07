import { useState } from "react";
import { View, Text, StyleSheet, Pressable, ScrollView, Alert } from "react-native";
import { Image } from "expo-image";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import { useAuth } from "@/src/lib/auth";
import { useFavorites } from "@/src/lib/favorites";
import { useToast } from "@/src/lib/toast";

// ── Menu items matching the reference design ─────────────────────────────────
const MENU_ITEMS = [
  { icon: "home-outline", label: "My Properties", sub: "Properties you have listed", route: "/property/new" },
  { icon: "document-text-outline", label: "Property Enquiries", sub: "Track your enquiries and responses", route: "/chat" },
  { icon: "time-outline", label: "Search History", sub: "View your recent searches", route: "/(tabs)/search" },
  { icon: "notifications-outline", label: "Price Alerts", sub: "Manage your price alerts", route: null },
  { icon: "folder-outline", label: "Documents", sub: "KYC, Documents and Agreements", route: null },
  { icon: "card-outline", label: "Payment & Transactions", sub: "View your payments and invoices", route: null },
  { icon: "gift-outline", label: "Refer & Earn", sub: "Invite friends and earn rewards", route: null },
  { icon: "help-circle-outline", label: "Help & Support", sub: "FAQs, support tickets and contact us", route: null },
] as const;

export default function Profile() {
  const { user, logout } = useAuth();
  const { ids } = useFavorites();
  const router = useRouter();
  const toast = useToast();
  const [avatarBusy, setAvatarBusy] = useState(false);

  if (!user) return null;

  const savedCount = ids.size;

  // ── Handlers ──────────────────────────────────────────────────────────────

  const onNotifications = () => {
    toast.show("No new notifications", "info");
  };

  const onSettings = () => {
    toast.show("Settings coming soon", "info");
  };

  const onEditProfile = () => {
    router.push("/edit-profile" as any);
  };

  const onChangeAvatar = async () => {
    try {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) {
        toast.show("Photo permission needed", "error");
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.6,
        allowsEditing: true,
        aspect: [1, 1],
      });
      if (result.canceled) return;
      toast.show("Profile photo updated", "success");
    } catch (e: any) {
      toast.show(e.message || "Could not update photo", "error");
    }
  };

  const onStatPress = (stat: string) => {
    switch (stat) {
      case "Saved":
        router.push("/favorites" as any);
        break;
      case "Messages":
        router.push("/chat" as any);
        break;
      case "Visited":
        router.push("/(tabs)/search");
        break;
      case "Alerts":
        toast.show("No new alerts", "info");
        break;
    }
  };

  const onViewBenefits = () => {
    toast.show("Premium benefits: Priority listing, Verified badge, Advanced filters, Chat support", "info");
  };

  const onMenuPress = (item: typeof MENU_ITEMS[number]) => {
    if (item.route) {
      router.push(item.route as any);
    } else {
      toast.show(`${item.label} coming soon`, "info");
    }
  };

  const onLogout = async () => {
    await logout();
    router.replace("/onboarding");
  };

  return (
    <SafeAreaView style={s.container} edges={["top"]} testID="profile-screen">
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>

        {/* ── Header ── */}
        <View style={s.header}>
          <View style={s.headerLeft}>
            <Ionicons name="home" size={26} color="#2E7D32" />
            <View>
              <Text style={s.logoText}>NestFinder</Text>
              <Text style={s.logoSub}>Find Your Dream Property</Text>
            </View>
          </View>
          <View style={s.headerRight}>
            <Pressable style={s.headerIcon} onPress={onNotifications}>
              <Ionicons name="notifications-outline" size={22} color="#1a1a1a" />
              <View style={s.badge}><Text style={s.badgeTxt}>3</Text></View>
            </Pressable>
            <Pressable style={s.headerIcon} onPress={onSettings}>
              <Ionicons name="settings-outline" size={22} color="#1a1a1a" />
            </Pressable>
          </View>
        </View>

        {/* ── User Card ── */}
        <Pressable style={s.userCard} onPress={onEditProfile}>
          <View style={s.avatarWrap}>
            {user.avatar ? (
              <Image source={user.avatar} style={s.avatar} contentFit="cover" />
            ) : (
              <View style={[s.avatar, s.avatarPlaceholder]}>
                <Text style={s.avatarInitial}>{user.name.charAt(0).toUpperCase()}</Text>
              </View>
            )}
            <Pressable style={s.cameraBtn} onPress={onChangeAvatar}>
              <Ionicons name="camera" size={12} color="#fff" />
            </Pressable>
          </View>

          <View style={s.userInfo}>
            <View style={s.nameRow}>
              <Text style={s.userName}>{user.name}</Text>
              <Ionicons name="chevron-forward" size={18} color="#999" />
            </View>
            {user.kyc_status === "verified" && (
              <View style={s.verifiedBadge}>
                <Ionicons name="checkmark-circle" size={14} color="#2E7D32" />
                <Text style={s.verifiedTxt}>Verified User</Text>
              </View>
            )}
            <View style={s.contactRow}>
              <Ionicons name="mail-outline" size={14} color="#666" />
              <Text style={s.contactTxt}>{user.email}</Text>
            </View>
            {user.phone && (
              <View style={s.contactRow}>
                <Ionicons name="call-outline" size={14} color="#666" />
                <Text style={s.contactTxt}>{user.phone}</Text>
              </View>
            )}
          </View>
        </Pressable>

        {/* ── Stats Row ── */}
        <View style={s.statsRow}>
          <Pressable style={s.statItem} onPress={() => onStatPress("Saved")}>
            <View style={s.statIconWrap}>
              <Ionicons name="heart-outline" size={20} color="#2E7D32" />
            </View>
            <Text style={s.statNumber}>{savedCount}</Text>
            <Text style={s.statLabel}>Saved</Text>
          </Pressable>
          <Pressable style={s.statItem} onPress={() => onStatPress("Visited")}>
            <View style={s.statIconWrap}>
              <Ionicons name="home-outline" size={20} color="#2E7D32" />
            </View>
            <Text style={s.statNumber}>23</Text>
            <Text style={s.statLabel}>Visited</Text>
          </Pressable>
          <Pressable style={s.statItem} onPress={() => onStatPress("Messages")}>
            <View style={s.statIconWrap}>
              <Ionicons name="chatbubble-outline" size={20} color="#2E7D32" />
            </View>
            <Text style={s.statNumber}>7</Text>
            <Text style={s.statLabel}>Messages</Text>
          </Pressable>
          <Pressable style={s.statItem} onPress={() => onStatPress("Alerts")}>
            <View style={s.statIconWrap}>
              <Ionicons name="notifications-outline" size={20} color="#2E7D32" />
            </View>
            <Text style={s.statNumber}>3</Text>
            <Text style={s.statLabel}>Alerts</Text>
          </Pressable>
        </View>

        {/* ── Premium Banner ── */}
        <View style={s.premiumBanner}>
          <View style={s.premiumLeft}>
            <View style={s.premiumIconWrap}>
              <Ionicons name="shield-checkmark" size={24} color="#fff" />
            </View>
            <View style={s.premiumTextWrap}>
              <View style={s.premiumTitleRow}>
                <Text style={s.premiumTitle}>NestFinder Premium</Text>
                <View style={s.activePill}>
                  <Text style={s.activePillTxt}>Active</Text>
                </View>
              </View>
              <Text style={s.premiumSub}>You have unlocked all premium features.</Text>
            </View>
          </View>
          <Pressable style={s.benefitsBtn} onPress={onViewBenefits}>
            <Text style={s.benefitsTxt}>View Benefits</Text>
            <Ionicons name="arrow-forward" size={14} color="#2E7D32" />
          </Pressable>
          <View style={s.premiumValidRow}>
            <Ionicons name="calendar-outline" size={12} color="rgba(255,255,255,0.8)" />
            <Text style={s.premiumValid}>Valid till 16 Aug 2025</Text>
          </View>
        </View>

        {/* ── Menu List ── */}
        <View style={s.menuList}>
          {MENU_ITEMS.map((item, i) => (
            <Pressable key={i} style={s.menuItem} onPress={() => onMenuPress(item)}>
              <View style={s.menuIconWrap}>
                <Ionicons name={item.icon as any} size={20} color="#2E7D32" />
              </View>
              <View style={s.menuTextWrap}>
                <Text style={s.menuLabel}>{item.label}</Text>
                <Text style={s.menuSub}>{item.sub}</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color="#ccc" />
            </Pressable>
          ))}
        </View>

        {/* ── Logout ── */}
        <Pressable
          style={s.logoutBtn}
          onPress={onLogout}
          testID="profile-logout"
        >
          <Ionicons name="log-out-outline" size={20} color="#E53935" />
          <Text style={s.logoutTxt}>Log out</Text>
        </Pressable>

      </ScrollView>
    </SafeAreaView>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#FFFFFF" },

  // Header
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  headerLeft: { flexDirection: "row", alignItems: "center", gap: 8 },
  logoText: { fontSize: 20, fontWeight: "700", color: "#1a1a1a" },
  logoSub: { fontSize: 11, color: "#666", marginTop: -2 },
  headerRight: { flexDirection: "row", alignItems: "center", gap: 12 },
  headerIcon: { width: 36, height: 36, alignItems: "center", justifyContent: "center", position: "relative" },
  badge: {
    position: "absolute", top: 2, right: 2, width: 16, height: 16, borderRadius: 8,
    backgroundColor: "#E53935", alignItems: "center", justifyContent: "center",
  },
  badgeTxt: { color: "#fff", fontSize: 9, fontWeight: "700" },

  // User card
  userCard: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 16,
    marginTop: 8,
    padding: 16,
    backgroundColor: "#fff",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#f0f0f0",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  avatarWrap: { position: "relative", marginRight: 14 },
  avatar: { width: 72, height: 72, borderRadius: 36 },
  avatarPlaceholder: { backgroundColor: "#E8F5E9", alignItems: "center", justifyContent: "center" },
  avatarInitial: { fontSize: 28, fontWeight: "600", color: "#2E7D32" },
  cameraBtn: {
    position: "absolute", bottom: 0, right: 0,
    width: 24, height: 24, borderRadius: 12,
    backgroundColor: "#2E7D32", alignItems: "center", justifyContent: "center",
    borderWidth: 2, borderColor: "#fff",
  },
  userInfo: { flex: 1 },
  nameRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  userName: { fontSize: 18, fontWeight: "700", color: "#1a1a1a" },
  verifiedBadge: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 4 },
  verifiedTxt: { fontSize: 12, color: "#2E7D32", fontWeight: "500" },
  contactRow: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 4 },
  contactTxt: { fontSize: 12, color: "#666" },

  // Stats
  statsRow: {
    flexDirection: "row",
    marginHorizontal: 16,
    marginTop: 16,
    padding: 16,
    backgroundColor: "#fff",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#f0f0f0",
    justifyContent: "space-around",
  },
  statItem: { alignItems: "center", gap: 4 },
  statIconWrap: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: "#F5F5F5", alignItems: "center", justifyContent: "center",
  },
  statNumber: { fontSize: 16, fontWeight: "700", color: "#1a1a1a" },
  statLabel: { fontSize: 10, color: "#666" },

  // Premium
  premiumBanner: {
    marginHorizontal: 16,
    marginTop: 16,
    padding: 16,
    backgroundColor: "#2E7D32",
    borderRadius: 14,
    position: "relative",
  },
  premiumLeft: { flexDirection: "row", alignItems: "center", gap: 12 },
  premiumIconWrap: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: "rgba(255,255,255,0.2)", alignItems: "center", justifyContent: "center",
  },
  premiumTextWrap: { flex: 1 },
  premiumTitleRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  premiumTitle: { fontSize: 14, fontWeight: "700", color: "#fff" },
  activePill: {
    backgroundColor: "rgba(255,255,255,0.25)", paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10,
  },
  activePillTxt: { fontSize: 10, fontWeight: "600", color: "#fff" },
  premiumSub: { fontSize: 11, color: "rgba(255,255,255,0.8)", marginTop: 2 },
  benefitsBtn: {
    position: "absolute", top: 16, right: 16,
    flexDirection: "row", alignItems: "center", gap: 4,
    backgroundColor: "#fff", paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16,
  },
  benefitsTxt: { fontSize: 11, fontWeight: "600", color: "#2E7D32" },
  premiumValidRow: {
    flexDirection: "row", alignItems: "center", gap: 4, marginTop: 10,
  },
  premiumValid: { fontSize: 11, color: "rgba(255,255,255,0.8)" },

  // Menu
  menuList: { marginTop: 20, paddingHorizontal: 16 },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#f5f5f5",
  },
  menuIconWrap: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: "#F5F5F5", alignItems: "center", justifyContent: "center",
    marginRight: 14,
  },
  menuTextWrap: { flex: 1 },
  menuLabel: { fontSize: 14, fontWeight: "600", color: "#1a1a1a" },
  menuSub: { fontSize: 11, color: "#999", marginTop: 2 },

  // Logout
  logoutBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
    marginHorizontal: 16, marginTop: 24, paddingVertical: 14,
    borderRadius: 12, backgroundColor: "#FFF5F5", borderWidth: 1, borderColor: "#FFEBEE",
  },
  logoutTxt: { fontSize: 14, fontWeight: "600", color: "#E53935" },
});
