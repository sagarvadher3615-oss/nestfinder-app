import { useEffect, useState, useCallback } from "react";
import { View, Text, StyleSheet, FlatList, ActivityIndicator, Pressable, RefreshControl } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { api, Property } from "@/src/lib/api";
import { colors, spacing, type } from "@/src/lib/theme";
import { PropertyCard } from "@/src/components/PropertyCard";

export default function Favorites() {
  const router = useRouter();
  const [items, setItems] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await api.get("/favorites");
      setItems(res.properties || []);
    } catch (e) { console.warn(e); }
    finally { setLoading(false); setRefreshing(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  return (
    <SafeAreaView style={styles.c} edges={["top"]} testID="favorites-screen">
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} testID="fav-back-btn">
          <Ionicons name="chevron-back" size={24} color={colors.onSurface} />
        </Pressable>
        <Text style={styles.title}>Saved</Text>
        <View style={{ width: 24 }} />
      </View>

      {loading ? (
        <View style={styles.center}><ActivityIndicator color={colors.brand} /></View>
      ) : items.length === 0 ? (
        <View style={styles.center}>
          <Ionicons name="heart-outline" size={48} color={colors.borderStrong} />
          <Text style={styles.empty}>No favourites yet</Text>
          <Text style={styles.emptySub}>Tap the heart on any property to save it here.</Text>
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={i => i.property_id}
          renderItem={({ item }) => <PropertyCard item={item} testIDPrefix="fav-prop" />}
          contentContainerStyle={{ paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: spacing.xl }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={colors.brand} />}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  c: { flex: 1, backgroundColor: colors.surface },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: spacing.lg, paddingVertical: spacing.md },
  title: { fontSize: type.xl, color: colors.onSurface, fontWeight: "500" },
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: spacing.sm, paddingHorizontal: spacing.xl },
  empty: { fontSize: type.lg, color: colors.onSurface, fontWeight: "500", marginTop: spacing.md },
  emptySub: { fontSize: type.base, color: colors.textSecondary, textAlign: "center" },
});
