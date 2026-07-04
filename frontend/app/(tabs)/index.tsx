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
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const q = isLandlord ? "/properties/mine" : `/properties${filter !== "All" ? `?property_type=${encodeURIComponent(filter)}` : ""}`;
      const data = await api.get(q);
      setItems(data);
    } catch (e) { console.warn(e); }
    finally { setLoading(false); setRefreshing(false); }
  }, [filter, isLandlord]);

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
  centerBox: { flex: 1, alignItems: "center", justifyContent: "center", gap: spacing.sm, paddingHorizontal: spacing.xl },
  emptyTitle: { fontSize: type.lg, color: colors.onSurface, marginTop: spacing.md, fontWeight: "500" },
  emptySub: { fontSize: type.base, color: colors.textSecondary, textAlign: "center" },
  emptyBtn: { marginTop: spacing.md, backgroundColor: colors.brand, paddingHorizontal: spacing.xl, paddingVertical: 12, borderRadius: radius.md },
  emptyBtnTxt: { color: "#fff", fontSize: type.base, fontWeight: "500" },
});
