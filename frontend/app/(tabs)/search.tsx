import { useEffect, useState, useCallback, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
  ScrollView,
  ActivityIndicator,
  Dimensions,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { api, Property } from "@/src/lib/api";
import { useFavorites } from "@/src/lib/favorites";
import { useToast } from "@/src/lib/toast";

const { width } = Dimensions.get("window");
const CARD_IMAGE_WIDTH = width - 32;
const CARD_IMAGE_HEIGHT = 180;

// ── Filter Chips ──────────────────────────────────────────────────────────────
const FILTER_CHIPS = [
  { key: "filters", label: "Filters", icon: "options-outline" as const },
  { key: "location", label: "Surat", icon: "location-outline" as const },
  { key: "price", label: "Price", icon: null },
  { key: "bhk", label: "3 BHK", icon: null },
  { key: "sort", label: "Sort", icon: null },
];

// ── Image Carousel inside each card ──────────────────────────────────────────
function ImageCarousel({ images }: { images: string[] }) {
  const [idx, setIdx] = useState(0);
  const total = images.length || 1;

  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const x = e.nativeEvent.contentOffset.x;
    const newIdx = Math.round(x / CARD_IMAGE_WIDTH);
    if (newIdx !== idx) setIdx(newIdx);
  };

  return (
    <View style={s.carouselWrap}>
      <ScrollView
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={onScroll}
        scrollEventThrottle={16}
        style={{ width: CARD_IMAGE_WIDTH, height: CARD_IMAGE_HEIGHT }}
      >
        {(images.length > 0 ? images : ["https://via.placeholder.com/400x250?text=No+Image"]).map(
          (uri, i) => (
            <Image
              key={i}
              source={uri}
              style={{ width: CARD_IMAGE_WIDTH, height: CARD_IMAGE_HEIGHT }}
              contentFit="cover"
              transition={150}
            />
          )
        )}
      </ScrollView>
      {/* Counter badge */}
      <View style={s.counterBadge}>
        <Text style={s.counterTxt}>
          {idx + 1} / {total}
        </Text>
      </View>
    </View>
  );
}

// ── Main Search Screen ───────────────────────────────────────────────────────
export default function SearchScreen() {
  const router = useRouter();
  const { ids, toggle } = useFavorites();
  const toast = useToast();

  const [items, setItems] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeChip, setActiveChip] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.get("/properties?sort=newest");
      setItems(data);
    } catch (e) {
      console.warn(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const onFav = async (propertyId: string) => {
    try {
      const now = await toggle(propertyId);
      toast.show(now ? "Saved to favourites" : "Removed from favourites", "success");
    } catch (err: any) {
      toast.show(err.message || "Could not update", "error");
    }
  };

  const resultCount = items.length > 0 ? `${items.length}+ Properties Found` : "No Properties Found";

  // ── Render a single property card ──
  const renderCard = ({ item }: { item: Property }) => {
    const isFav = ids.has(item.property_id);
    return (
      <Pressable
        style={s.card}
        onPress={() => router.push(`/property/${item.property_id}` as any)}
        testID={`search-card-${item.property_id}`}
      >
        {/* Image carousel */}
        <View style={s.cardImageWrap}>
          <ImageCarousel images={item.images} />
          {/* Featured badge */}
          {item.landlord_verified && (
            <View style={s.featuredBadge}>
              <Text style={s.featuredTxt}>Featured</Text>
            </View>
          )}
          {/* Heart */}
          <Pressable
            style={s.heartBtn}
            onPress={() => onFav(item.property_id)}
            hitSlop={8}
          >
            <Ionicons
              name={isFav ? "heart" : "heart-outline"}
              size={20}
              color={isFav ? "#E53935" : "#666"}
            />
          </Pressable>
        </View>

        {/* Card body */}
        <View style={s.cardBody}>
          {/* Price + Heart row */}
          <View style={s.priceRow}>
            <Text style={s.price}>₹{item.price.toLocaleString("en-IN")}</Text>
          </View>

          {/* Title */}
          <Text style={s.cardTitle} numberOfLines={1}>
            {item.bedrooms} BHK {item.property_type}
          </Text>

          {/* Location */}
          <View style={s.locRow}>
            <Ionicons name="location-outline" size={13} color="#666" />
            <Text style={s.locText} numberOfLines={1}>
              {item.location}
            </Text>
          </View>

          {/* Specs row */}
          <View style={s.specsRow}>
            <View style={s.specItem}>
              <Ionicons name="bed-outline" size={14} color="#666" />
              <Text style={s.specTxt}>{item.bedrooms} Beds</Text>
            </View>
            <View style={s.specItem}>
              <Ionicons name="water-outline" size={14} color="#666" />
              <Text style={s.specTxt}>{item.bathrooms} Baths</Text>
            </View>
            <View style={s.specItem}>
              <Ionicons name="resize-outline" size={14} color="#666" />
              <Text style={s.specTxt}>1450 Sq.ft</Text>
            </View>
            <View style={s.specItem}>
              <Ionicons name="car-outline" size={14} color="#666" />
              <Text style={s.specTxt}>1 Parking</Text>
            </View>
          </View>

          {/* Verified badge */}
          {item.landlord_verified && (
            <View style={s.verifiedRow}>
              <Ionicons name="checkmark-circle" size={14} color="#2E7D32" />
              <Text style={s.verifiedTxt}>Verified</Text>
            </View>
          )}
        </View>
      </Pressable>
    );
  };

  return (
    <SafeAreaView style={s.container} edges={["top"]} testID="search-screen">
      {/* ── Header ── */}
      <View style={s.header}>
        <Pressable onPress={() => router.back()} style={s.backBtn} hitSlop={8}>
          <Ionicons name="arrow-back" size={22} color="#1a1a1a" />
        </Pressable>
        <View style={s.headerCenter}>
          <Text style={s.headerTitle}>Buy Properties</Text>
          <Text style={s.headerSub}>{resultCount}</Text>
        </View>
        <Pressable style={s.searchIconBtn} hitSlop={8}>
          <Ionicons name="search" size={22} color="#1a1a1a" />
        </Pressable>
      </View>

      {/* ── Filter Chips ── */}
      <View style={s.chipsWrap}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={s.chipsContent}
        >
          {FILTER_CHIPS.map((chip) => {
            const active = activeChip === chip.key;
            return (
              <Pressable
                key={chip.key}
                style={[s.chip, active && s.chipActive]}
                onPress={() => setActiveChip(active ? null : chip.key)}
              >
                {chip.icon && (
                  <Ionicons
                    name={chip.icon}
                    size={14}
                    color={active ? "#2E7D32" : "#333"}
                    style={{ marginRight: 4 }}
                  />
                )}
                <Text style={[s.chipTxt, active && s.chipTxtActive]}>
                  {chip.label}
                </Text>
                {chip.key !== "filters" && (
                  <Ionicons
                    name="chevron-down"
                    size={12}
                    color={active ? "#2E7D32" : "#666"}
                    style={{ marginLeft: 2 }}
                  />
                )}
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      {/* ── Property List ── */}
      {loading ? (
        <View style={s.center}>
          <ActivityIndicator color="#2E7D32" size="large" />
        </View>
      ) : items.length === 0 ? (
        <View style={s.center}>
          <Ionicons name="search-outline" size={48} color="#ccc" />
          <Text style={s.emptyTitle}>No results</Text>
          <Text style={s.emptySub}>Try adjusting your filters</Text>
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(i) => i.property_id}
          renderItem={renderCard}
          contentContainerStyle={s.listContent}
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* ── Bottom Action Bar ── */}
      <View style={s.bottomBar}>
        <Pressable style={s.mapBtn}>
          <Ionicons name="grid-outline" size={16} color="#1a1a1a" />
          <Text style={s.mapBtnTxt}>Map View</Text>
        </Pressable>
        <Pressable style={s.saveBtn}>
          <Ionicons name="notifications-outline" size={16} color="#fff" />
          <Text style={s.saveBtnTxt}>Save Search</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#FFFFFF" },
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 8 },
  emptyTitle: { fontSize: 16, fontWeight: "600", color: "#1a1a1a", marginTop: 8 },
  emptySub: { fontSize: 13, color: "#666" },

  // Header
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  backBtn: { width: 32, height: 32, alignItems: "center", justifyContent: "center" },
  headerCenter: { flex: 1 },
  headerTitle: { fontSize: 18, fontWeight: "700", color: "#1a1a1a" },
  headerSub: { fontSize: 12, color: "#666", marginTop: 1 },
  searchIconBtn: { width: 32, height: 32, alignItems: "center", justifyContent: "center" },

  // Chips
  chipsWrap: { paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: "#f0f0f0" },
  chipsContent: { paddingHorizontal: 16, gap: 8, alignItems: "center" },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    height: 34,
    paddingHorizontal: 12,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#e0e0e0",
    backgroundColor: "#fff",
  },
  chipActive: { borderColor: "#2E7D32", backgroundColor: "#E8F5E9" },
  chipTxt: { fontSize: 12, fontWeight: "500", color: "#333" },
  chipTxtActive: { color: "#2E7D32" },

  // List
  listContent: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 80 },

  // Card
  card: {
    backgroundColor: "#fff",
    borderRadius: 12,
    marginBottom: 16,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#f0f0f0",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  cardImageWrap: { position: "relative" },
  carouselWrap: { position: "relative", overflow: "hidden", borderTopLeftRadius: 12, borderTopRightRadius: 12 },
  counterBadge: {
    position: "absolute",
    bottom: 10,
    left: 10,
    backgroundColor: "rgba(0,0,0,0.6)",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  counterTxt: { color: "#fff", fontSize: 11, fontWeight: "500" },
  featuredBadge: {
    position: "absolute",
    top: 10,
    left: 10,
    backgroundColor: "#2E7D32",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 4,
  },
  featuredTxt: { color: "#fff", fontSize: 10, fontWeight: "600" },
  heartBtn: {
    position: "absolute",
    top: 10,
    right: 10,
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },

  // Card body
  cardBody: { padding: 14 },
  priceRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  price: { fontSize: 18, fontWeight: "700", color: "#2E7D32" },
  cardTitle: { fontSize: 15, fontWeight: "600", color: "#1a1a1a", marginTop: 4 },
  locRow: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 4 },
  locText: { fontSize: 12, color: "#666", flex: 1 },
  specsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#f5f5f5",
  },
  specItem: { flexDirection: "row", alignItems: "center", gap: 4 },
  specTxt: { fontSize: 11, color: "#666" },
  verifiedRow: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 10 },
  verifiedTxt: { fontSize: 12, color: "#2E7D32", fontWeight: "500" },

  // Bottom action bar
  bottomBar: {
    flexDirection: "row",
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: "#f0f0f0",
    backgroundColor: "#fff",
  },
  mapBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    height: 44,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#e0e0e0",
    backgroundColor: "#fff",
  },
  mapBtnTxt: { fontSize: 13, fontWeight: "600", color: "#1a1a1a" },
  saveBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    height: 44,
    borderRadius: 10,
    backgroundColor: "#E53935",
  },
  saveBtnTxt: { fontSize: 13, fontWeight: "600", color: "#fff" },
});
