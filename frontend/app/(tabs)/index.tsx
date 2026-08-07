import { useEffect, useState, useCallback, useRef } from "react";
import { View, Text, StyleSheet, FlatList, Pressable, ScrollView, RefreshControl, ActivityIndicator, Dimensions, Image, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "@/src/lib/auth";
import { api, Property } from "@/src/lib/api";
import { PropertyCard } from "@/src/components/PropertyCard";
import { useFavorites } from "@/src/lib/favorites";
import { useToast } from "@/src/lib/toast";
import { useScrollToTop } from "@react-navigation/native";

const { width } = Dimensions.get("window");

// Hero banner slides
const BANNERS = [
  {
    tag: "Find. Visit. Own.",
    title: "Find Your\nDream Property",
    desc: "Explore thousands of verified\nproperties across India.",
    cta: "Explore Now",
    image: "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=800",
  },
  {
    tag: "Rent Smart.",
    title: "Monthly Rentals\nMade Easy",
    desc: "Verified landlords, no brokers,\nno hidden charges.",
    cta: "Browse Rentals",
    image: "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=800",
  },
  {
    tag: "PG & Hostels",
    title: "Find Your\nPerfect PG",
    desc: "Safe, affordable PG/Hostels\nfor students & working pros.",
    cta: "Find PG",
    image: "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=800",
  },
];

// Category items
const CATEGORIES = [
  { icon: "home-outline", label: "Buy", color: "#E8F5E9", filter: "buy" },
  { icon: "key-outline", label: "Rent", color: "#FFF3E0", filter: "rent" },
  { icon: "people-outline", label: "PG/Co-living", color: "#E3F2FD", filter: "pg" },
  { icon: "business-outline", label: "Commercial", color: "#F3E5F5", filter: "commercial" },
  { icon: "map-outline", label: "Plots", color: "#E0F7FA", filter: "plot" },
  { icon: "sparkles-outline", label: "New Projects", color: "#FCE4EC", filter: "new" },
];

// Popular locations
const LOCATIONS = [
  { name: "Bangalore", count: "320+", image: "https://images.unsplash.com/photo-1596176530529-78163a4f7af2?w=400" },
  { name: "Mumbai", count: "280+", image: "https://images.unsplash.com/photo-1570168007204-dfb528c6958f?w=400" },
  { name: "Pune", count: "210+", image: "https://images.unsplash.com/photo-1625244724120-1fd1d34d00f6?w=400" },
  { name: "Surat", count: "180+", image: "https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=400" },
  { name: "Delhi", count: "350+", image: "https://images.unsplash.com/photo-1587474260584-136574528ed5?w=400" },
];

// Trust badges
const TRUST_BADGES = [
  { icon: "shield-checkmark-outline", label: "Verified\nProperties" },
  { icon: "people-outline", label: "Verified\nAgents" },
  { icon: "pricetag-outline", label: "Best Price\nGuarantee" },
  { icon: "headset-outline", label: "24/7 Customer\nSupport" },
];

export default function Home() {
  const { user } = useAuth();
  const router = useRouter();
  const { ids, toggle } = useFavorites();
  const toast = useToast();
  const isLandlord = user?.role === "landlord";

  const [items, setItems] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [bannerIdx, setBannerIdx] = useState(0);

  const scrollRef = useRef<ScrollView>(null);
  useScrollToTop(scrollRef);

  const load = useCallback(async () => {
    try {
      const data = await api.get("/properties?limit=10&sort=newest");
      setItems(data);
    } catch (e) { console.warn(e); }
    finally { setLoading(false); setRefreshing(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const onRefresh = () => { setRefreshing(true); load(); };

  // Toggle favorite for a property
  const onFav = async (propertyId: string) => {
    try {
      const now = await toggle(propertyId);
      toast.show(now ? "Saved to favourites" : "Removed from favourites", "success");
    } catch (err: any) {
      toast.show(err.message || "Could not update", "error");
    }
  };

  // Navigate to notifications
  const onNotifications = () => {
    toast.show("No new notifications", "info");
  };

  // Navigate to search with category filter
  const onCategory = (filter: string) => {
    router.push("/(tabs)/search");
  };

  // Banner CTA actions
  const onBannerCta = (idx: number) => {
    router.push("/(tabs)/search");
  };

  // Landlord view — keep the old simple listing
  if (isLandlord) {
    return (
      <SafeAreaView style={styles.c} edges={["top"]}>
        <View style={styles.landlordHeader}>
          <Text style={styles.landlordTitle}>Your Listings</Text>
          <Pressable style={styles.addBtn} onPress={() => router.push("/property/new")} testID="landlord-add-btn">
            <Ionicons name="add" size={22} color="#fff" />
          </Pressable>
        </View>
        {loading ? (
          <View style={styles.center}><ActivityIndicator color="#2E7D32" /></View>
        ) : (
          <FlatList
            data={items}
            keyExtractor={i => i.property_id}
            renderItem={({ item }) => <PropertyCard item={item} />}
            contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 80 }}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#2E7D32" />}
          />
        )}
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.c} edges={["top"]} testID="home-screen">
      <ScrollView
        ref={scrollRef as any}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#2E7D32" />}
        contentContainerStyle={{ paddingBottom: 100 }}
      >

        {/* ── Header ── */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Ionicons name="home" size={28} color="#2E7D32" />
            <View>
              <Text style={styles.logoText}>NestFinder</Text>
              <Text style={styles.logoSub}>Find Your Dream Property</Text>
            </View>
          </View>
          <Pressable style={styles.bellBtn} onPress={onNotifications}>
            <Ionicons name="notifications-outline" size={24} color="#1a1a1a" />
            <View style={styles.bellBadge}><Text style={styles.bellBadgeTxt}>5</Text></View>
          </Pressable>
        </View>

        {/* ── Search Bar ── */}
        <Pressable style={styles.searchBar} onPress={() => router.push("/(tabs)/search")}>
          <Ionicons name="search" size={20} color="#999" />
          <Text style={styles.searchPlaceholder}>Search location, property or keyword...</Text>
          <Pressable style={styles.filterBtn} onPress={() => router.push("/(tabs)/search")}>
            <Ionicons name="options-outline" size={18} color="#fff" />
          </Pressable>
        </Pressable>

        {/* ── Hero Banner Carousel ── */}
        <View style={styles.bannerWrap}>
          <ScrollView
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onMomentumScrollEnd={e => setBannerIdx(Math.round(e.nativeEvent.contentOffset.x / (width - 32)))}
          >
            {BANNERS.map((b, i) => (
              <View key={i} style={[styles.bannerSlide, { width: width - 32 }]}>
                <Image source={{ uri: b.image }} style={styles.bannerImage} />
                <View style={styles.bannerOverlay} />
                <View style={styles.bannerContent}>
                  <View style={styles.bannerTag}><Text style={styles.bannerTagTxt}>{b.tag}</Text></View>
                  <Text style={styles.bannerTitle}>{b.title}</Text>
                  <Text style={styles.bannerDesc}>{b.desc}</Text>
                  <Pressable style={styles.bannerCta} onPress={() => onBannerCta(i)}>
                    <Text style={styles.bannerCtaTxt}>{b.cta}</Text>
                    <Ionicons name="arrow-forward" size={16} color="#1a1a1a" />
                  </Pressable>
                </View>
              </View>
            ))}
          </ScrollView>
          <View style={styles.dots}>
            {BANNERS.map((_, i) => (
              <View key={i} style={[styles.dot, bannerIdx === i && styles.dotActive]} />
            ))}
          </View>
        </View>

        {/* ── Categories ── */}
        <View style={styles.catRow}>
          {CATEGORIES.map((cat, i) => (
            <Pressable key={i} style={styles.catItem} onPress={() => onCategory(cat.filter)}>
              <View style={[styles.catIcon, { backgroundColor: cat.color }]}>
                <Ionicons name={cat.icon as any} size={24} color="#2E7D32" />
              </View>
              <Text style={styles.catLabel}>{cat.label}</Text>
            </Pressable>
          ))}
        </View>

        {/* ── Featured Properties ── */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Featured Properties</Text>
          <Pressable onPress={() => router.push("/(tabs)/search")}>
            <Text style={styles.seeAll}>See All</Text>
          </Pressable>
        </View>

        {loading ? (
          <ActivityIndicator color="#2E7D32" style={{ marginVertical: 20 }} />
        ) : (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, gap: 12 }}>
            {items.slice(0, 5).map(item => {
              const isFav = ids.has(item.property_id);
              return (
                <Pressable key={item.property_id} style={styles.featCard} onPress={() => router.push(`/property/${item.property_id}` as any)}>
                  <Image source={{ uri: item.images[0] || "https://via.placeholder.com/200" }} style={styles.featImage} />
                  <View style={styles.featBadge}><Text style={styles.featBadgeTxt}>Featured</Text></View>
                  <Pressable
                    style={[styles.featHeart, isFav && styles.featHeartActive]}
                    onPress={() => onFav(item.property_id)}
                    hitSlop={8}
                  >
                    <Ionicons name={isFav ? "heart" : "heart-outline"} size={18} color={isFav ? "#E53935" : "#fff"} />
                  </Pressable>
                  <View style={styles.featInfo}>
                    <Text style={styles.featPrice}>₹{item.price.toLocaleString("en-IN")}</Text>
                    <Text style={styles.featName} numberOfLines={1}>{item.title}</Text>
                    <View style={styles.featLocRow}>
                      <Ionicons name="location-outline" size={12} color="#666" />
                      <Text style={styles.featLoc} numberOfLines={1}>{item.location}</Text>
                    </View>
                    <View style={styles.featStats}>
                      <View style={styles.featStat}>
                        <Ionicons name="bed-outline" size={14} color="#666" />
                        <Text style={styles.featStatTxt}>{item.bedrooms} Beds</Text>
                      </View>
                      <View style={styles.featStat}>
                        <Ionicons name="water-outline" size={14} color="#666" />
                        <Text style={styles.featStatTxt}>{item.bathrooms} Baths</Text>
                      </View>
                      <View style={styles.featStat}>
                        <Ionicons name="resize-outline" size={14} color="#666" />
                        <Text style={styles.featStatTxt}>1450 Sq.ft</Text>
                      </View>
                    </View>
                    <Pressable style={styles.viewBtn} onPress={() => router.push(`/property/${item.property_id}` as any)}>
                      <Text style={styles.viewBtnTxt}>View Details</Text>
                      <Ionicons name="arrow-forward" size={14} color="#fff" />
                    </Pressable>
                  </View>
                </Pressable>
              );
            })}
          </ScrollView>
        )}

        {/* ── Why Choose NestFinder ── */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Why Choose NestFinder?</Text>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, gap: 10 }}>
          {TRUST_BADGES.map((badge, i) => (
            <View key={i} style={styles.trustCard}>
              <View style={styles.trustIcon}>
                <Ionicons name={badge.icon as any} size={24} color="#2E7D32" />
              </View>
              <Text style={styles.trustLabel}>{badge.label}</Text>
            </View>
          ))}
        </ScrollView>

        {/* ── Popular Locations ── */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Popular Locations</Text>
          <Pressable onPress={() => router.push("/(tabs)/search")}>
            <Text style={styles.seeAll}>See All</Text>
          </Pressable>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, gap: 12 }}>
          {LOCATIONS.map((loc, i) => (
            <Pressable key={i} style={styles.locCard} onPress={() => router.push("/(tabs)/search")}>
              <Image source={{ uri: loc.image }} style={styles.locImage} />
              <View style={styles.locOverlay} />
              <View style={styles.locTextWrap}>
                <Text style={styles.locName}>{loc.name}</Text>
                <Text style={styles.locCount}>{loc.count} Properties</Text>
              </View>
            </Pressable>
          ))}
        </ScrollView>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  c: { flex: 1, backgroundColor: "#FFFFFF" },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },

  // Header
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingVertical: 12 },
  headerLeft: { flexDirection: "row", alignItems: "center", gap: 8 },
  logoText: { fontSize: 20, fontWeight: "700", color: "#1a1a1a" },
  logoSub: { fontSize: 11, color: "#666", marginTop: -2 },
  bellBtn: { width: 40, height: 40, alignItems: "center", justifyContent: "center", position: "relative" },
  bellBadge: { position: "absolute", top: 4, right: 4, width: 16, height: 16, borderRadius: 8, backgroundColor: "#E53935", alignItems: "center", justifyContent: "center" },
  bellBadgeTxt: { color: "#fff", fontSize: 9, fontWeight: "700" },

  // Search
  searchBar: { flexDirection: "row", alignItems: "center", marginHorizontal: 16, marginBottom: 16, backgroundColor: "#F5F5F5", borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, gap: 10 },
  searchPlaceholder: { flex: 1, fontSize: 13, color: "#999" },
  filterBtn: { width: 34, height: 34, borderRadius: 8, backgroundColor: "#2E7D32", alignItems: "center", justifyContent: "center" },

  // Banner
  bannerWrap: { marginHorizontal: 16, marginBottom: 20, borderRadius: 16, overflow: "hidden" },
  bannerSlide: { height: 180, borderRadius: 16, overflow: "hidden", position: "relative" },
  bannerImage: { width: "100%", height: "100%", position: "absolute" },
  bannerOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0,0,0,0.35)" },
  bannerContent: { flex: 1, justifyContent: "center", paddingHorizontal: 20 },
  bannerTag: { backgroundColor: "#2E7D32", paddingHorizontal: 10, paddingVertical: 3, borderRadius: 4, alignSelf: "flex-start", marginBottom: 8 },
  bannerTagTxt: { color: "#fff", fontSize: 10, fontWeight: "600" },
  bannerTitle: { color: "#fff", fontSize: 22, fontWeight: "700", lineHeight: 28, marginBottom: 4 },
  bannerDesc: { color: "rgba(255,255,255,0.85)", fontSize: 12, lineHeight: 18, marginBottom: 12 },
  bannerCta: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: "#fff", paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, alignSelf: "flex-start" },
  bannerCtaTxt: { fontSize: 12, fontWeight: "600", color: "#1a1a1a" },
  dots: { flexDirection: "row", justifyContent: "center", gap: 6, marginTop: 10 },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: "#ccc" },
  dotActive: { backgroundColor: "#2E7D32", width: 18 },

  // Categories
  catRow: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", paddingHorizontal: 16, marginBottom: 24 },
  catItem: { width: (width - 32) / 6 - 2, alignItems: "center", marginBottom: 8 },
  catIcon: { width: 48, height: 48, borderRadius: 12, alignItems: "center", justifyContent: "center", marginBottom: 6 },
  catLabel: { fontSize: 9, color: "#333", textAlign: "center", fontWeight: "500" },

  // Section headers
  sectionHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 16, marginBottom: 12, marginTop: 8 },
  sectionTitle: { fontSize: 16, fontWeight: "700", color: "#1a1a1a" },
  seeAll: { fontSize: 13, color: "#E53935", fontWeight: "500" },

  // Featured card
  featCard: { width: 280, backgroundColor: "#fff", borderRadius: 14, overflow: "hidden", borderWidth: 1, borderColor: "#eee", shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 3 },
  featImage: { width: "100%", height: 150 },
  featBadge: { position: "absolute", top: 10, left: 10, backgroundColor: "#2E7D32", paddingHorizontal: 8, paddingVertical: 3, borderRadius: 4 },
  featBadgeTxt: { color: "#fff", fontSize: 10, fontWeight: "600" },
  featHeart: { position: "absolute", top: 10, right: 10, width: 32, height: 32, borderRadius: 16, backgroundColor: "rgba(0,0,0,0.3)", alignItems: "center", justifyContent: "center" },
  featHeartActive: { backgroundColor: "#fff" },
  featInfo: { padding: 12 },
  featPrice: { fontSize: 18, fontWeight: "700", color: "#2E7D32" },
  featName: { fontSize: 14, fontWeight: "600", color: "#1a1a1a", marginTop: 2 },
  featLocRow: { flexDirection: "row", alignItems: "center", gap: 3, marginTop: 3 },
  featLoc: { fontSize: 11, color: "#666" },
  featStats: { flexDirection: "row", gap: 12, marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: "#f0f0f0" },
  featStat: { flexDirection: "row", alignItems: "center", gap: 4 },
  featStatTxt: { fontSize: 11, color: "#666" },
  viewBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, backgroundColor: "#2E7D32", borderRadius: 8, paddingVertical: 10, marginTop: 12 },
  viewBtnTxt: { color: "#fff", fontSize: 13, fontWeight: "600" },

  // Trust badges
  trustCard: { width: 90, alignItems: "center", backgroundColor: "#fff", borderRadius: 12, paddingVertical: 14, paddingHorizontal: 8, borderWidth: 1, borderColor: "#eee" },
  trustIcon: { width: 40, height: 40, borderRadius: 20, backgroundColor: "#E8F5E9", alignItems: "center", justifyContent: "center", marginBottom: 8 },
  trustLabel: { fontSize: 10, color: "#333", textAlign: "center", fontWeight: "500", lineHeight: 14 },

  // Popular locations
  locCard: { width: 130, height: 160, borderRadius: 12, overflow: "hidden", position: "relative" },
  locImage: { width: "100%", height: "100%", position: "absolute" },
  locOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0,0,0,0.3)" },
  locTextWrap: { position: "absolute", bottom: 10, left: 10 },
  locName: { color: "#fff", fontSize: 14, fontWeight: "700" },
  locCount: { color: "rgba(255,255,255,0.85)", fontSize: 10, marginTop: 2 },

  // Landlord fallback
  landlordHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingVertical: 12 },
  landlordTitle: { fontSize: 24, fontWeight: "600", color: "#1a1a1a" },
  addBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: "#2E7D32", alignItems: "center", justifyContent: "center" },
});
