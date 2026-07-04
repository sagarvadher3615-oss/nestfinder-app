import { useEffect, useState, useCallback } from "react";
import { View, Text, StyleSheet, FlatList, Pressable, ScrollView, RefreshControl, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "@/src/lib/auth";
import { api, Property } from "@/src/lib/api";
import { colors, spacing, radius, type, PROPERTY_TYPES } from "@/src/lib/theme";
import { PropertyCard } from "@/src/components/PropertyCard";

export default function Home() {
  const { user } = useAuth();
  const router = useRouter();
  const isLandlord = user?.role === "landlord";

  const [items, setItems] = useState<Property[]>([]);
  const [filter, setFilter] = useState("All");
  const [sort, setSort] = useState<"newest" | "price_asc" | "price_desc">("newest");
  const [availableOnly, setAvailableOnly] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      let path: string;
      if (isLandlord) {
        path = "/properties/mine";
      } else {
        const params = new URLSearchParams();
        if (filter !== "All") params.set("property_type", filter);
        params.set("sort", sort);
        if (availableOnly) params.set("available_only", "true");
        path = `/properties?${params.toString()}`;
      }
      const data = await api.get(path);
      setItems(data);
    } catch (e) { console.warn(e); }
    finally { setLoading(false); setRefreshing(false); }
  }, [filter, sort, availableOnly, isLandlord]);

  useEffect(() => { load(); }, [load]);

  const onRefresh = () => { setRefreshing(true); load(); };

  return (
    <SafeAreaView style={styles.c} edges={["top"]} testID="home-screen">
      <View style={styles.header}>
        <View>
          <Text style={styles.hello}>Hi {user?.name?.split(" ")[0]} 👋</Text>
          <Text style={styles.headerTitle}>{isLandlord ? "Your listings" : "Find your next nest"}</Text>
        </View>
        {isLandlord && (
          <Pressable style={styles.addBtn} onPress={() => router.push("/property/new")} testID="landlord-add-btn">
            <Ionicons name="add" size={22} color="#fff" />
          </Pressable>
        )}
      </View>

      {!isLandlord && (
        <Pressable style={styles.searchBar} onPress={() => router.push("/(tabs)/search")} testID="home-search-bar">
          <Ionicons name="search" size={18} color={colors.textSecondary} />
          <Text style={styles.searchTxt}>Search by location or title</Text>
        </Pressable>
      )}

      {!isLandlord && (
        <View style={styles.chipsWrap}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.chipsContent}
          >
            {PROPERTY_TYPES.map(t => (
              <Pressable
                key={t}
                testID={`chip-${t}`}
                onPress={() => setFilter(t)}
                style={[styles.chip, filter === t && styles.chipActive]}
              >
                <Text style={[styles.chipTxt, filter === t && styles.chipTxtActive]}>{t}</Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>
      )}

      {!isLandlord && (
        <View style={styles.sortWrap}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsContent}>
            <Pressable testID="sort-newest" onPress={() => setSort("newest")} style={[styles.sortChip, sort === "newest" && styles.sortChipActive]}>
              <Ionicons name="time-outline" size={14} color={sort === "newest" ? colors.brand : colors.textSecondary} />
              <Text style={[styles.sortTxt, sort === "newest" && styles.sortTxtActive]}>Newest</Text>
            </Pressable>
            <Pressable testID="sort-price-asc" onPress={() => setSort("price_asc")} style={[styles.sortChip, sort === "price_asc" && styles.sortChipActive]}>
              <Ionicons name="arrow-up" size={14} color={sort === "price_asc" ? colors.brand : colors.textSecondary} />
              <Text style={[styles.sortTxt, sort === "price_asc" && styles.sortTxtActive]}>Price low</Text>
            </Pressable>
            <Pressable testID="sort-price-desc" onPress={() => setSort("price_desc")} style={[styles.sortChip, sort === "price_desc" && styles.sortChipActive]}>
              <Ionicons name="arrow-down" size={14} color={sort === "price_desc" ? colors.brand : colors.textSecondary} />
              <Text style={[styles.sortTxt, sort === "price_desc" && styles.sortTxtActive]}>Price high</Text>
            </Pressable>
            <Pressable testID="filter-available-only" onPress={() => setAvailableOnly(v => !v)} style={[styles.sortChip, availableOnly && styles.sortChipActive]}>
              <Ionicons name={availableOnly ? "checkmark-circle" : "ellipse-outline"} size={14} color={availableOnly ? colors.brand : colors.textSecondary} />
              <Text style={[styles.sortTxt, availableOnly && styles.sortTxtActive]}>Available only</Text>
            </Pressable>
          </ScrollView>
        </View>
      )}

      {loading ? (
        <View style={styles.centerBox}><ActivityIndicator color={colors.brand} /></View>
      ) : items.length === 0 ? (
        <View style={styles.centerBox}>
          <Ionicons name="home-outline" size={48} color={colors.borderStrong} />
          <Text style={styles.emptyTitle}>{isLandlord ? "No listings yet" : "No properties found"}</Text>
          <Text style={styles.emptySub}>{isLandlord ? "Add your first property to get started." : "Try clearing filters."}</Text>
          {isLandlord && (
            <Pressable style={styles.emptyBtn} onPress={() => router.push("/property/new")} testID="empty-add-property">
              <Text style={styles.emptyBtnTxt}>+ Add Property</Text>
            </Pressable>
          )}
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={i => i.property_id}
          renderItem={({ item }) => <PropertyCard item={item} />}
          contentContainerStyle={{ paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: spacing.xl }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.brand} />}
          testID="properties-list"
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  c: { flex: 1, backgroundColor: colors.surface },
  header: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: spacing.sm,
  },
  hello: { fontSize: type.sm, color: colors.textSecondary },
  headerTitle: { fontSize: 24, color: colors.onSurface, fontWeight: "500", marginTop: 2 },
  addBtn: {
    width: 44, height: 44, borderRadius: 22, backgroundColor: colors.brand,
    alignItems: "center", justifyContent: "center",
  },
  searchBar: {
    marginHorizontal: spacing.lg, marginTop: spacing.md,
    flexDirection: "row", alignItems: "center", gap: spacing.sm,
    backgroundColor: colors.surfaceTertiary, borderRadius: radius.md, paddingHorizontal: spacing.md, paddingVertical: 12,
  },
  searchTxt: { color: colors.textSecondary, fontSize: type.base },
  chipsWrap: { height: 56, marginTop: spacing.sm },
  chipsContent: { gap: spacing.sm, paddingHorizontal: spacing.lg, alignItems: "center" },
  chip: {
    height: 36, paddingHorizontal: spacing.md, borderRadius: radius.pill,
    backgroundColor: colors.surfaceTertiary, alignItems: "center", justifyContent: "center",
    flexShrink: 0, borderWidth: 1, borderColor: "transparent",
  },
  chipActive: { backgroundColor: colors.brandTertiary, borderColor: colors.brand },
  chipTxt: { fontSize: type.sm, color: colors.onSurfaceTertiary },
  chipTxtActive: { color: colors.brand, fontWeight: "500" },
  sortWrap: { height: 44, marginTop: 2, marginBottom: spacing.xs },
  sortChip: {
    flexDirection: "row", alignItems: "center", gap: 4,
    height: 32, paddingHorizontal: spacing.md, borderRadius: radius.pill,
    backgroundColor: colors.surfaceSecondary, borderWidth: 1, borderColor: colors.border,
    flexShrink: 0,
  },
  sortChipActive: { backgroundColor: colors.brandTertiary, borderColor: colors.brand },
  sortTxt: { fontSize: type.sm, color: colors.textSecondary },
  sortTxtActive: { color: colors.brand, fontWeight: "500" },
  centerBox: { flex: 1, alignItems: "center", justifyContent: "center", gap: spacing.sm, paddingHorizontal: spacing.xl },
  emptyTitle: { fontSize: type.lg, color: colors.onSurface, marginTop: spacing.md, fontWeight: "500" },
  emptySub: { fontSize: type.base, color: colors.textSecondary, textAlign: "center" },
  emptyBtn: { marginTop: spacing.md, backgroundColor: colors.brand, paddingHorizontal: spacing.xl, paddingVertical: 12, borderRadius: radius.md },
  emptyBtnTxt: { color: "#fff", fontSize: type.base, fontWeight: "500" },
});
