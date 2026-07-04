import { useEffect, useState, useCallback } from "react";
import { View, Text, StyleSheet, TextInput, FlatList, Pressable, ScrollView, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { api, Property } from "@/src/lib/api";
import { colors, spacing, radius, type, PROPERTY_TYPES } from "@/src/lib/theme";
import { PropertyCard } from "@/src/components/PropertyCard";

export default function SearchScreen() {
  const [q, setQ] = useState("");
  const [type_, setType] = useState("All");
  const [minP, setMinP] = useState("");
  const [maxP, setMaxP] = useState("");
  const [items, setItems] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (q) params.set("q", q);
      if (type_ !== "All") params.set("property_type", type_);
      if (minP) params.set("min_price", minP);
      if (maxP) params.set("max_price", maxP);
      const data = await api.get(`/properties${params.toString() ? `?${params}` : ""}`);
      setItems(data);
    } catch (e) { console.warn(e); }
    finally { setLoading(false); }
  }, [q, type_, minP, maxP]);

  useEffect(() => { load(); }, []);

  return (
    <SafeAreaView style={styles.c} edges={["top"]} testID="search-screen">
      <View style={styles.header}>
        <Text style={styles.title}>Search</Text>
      </View>

      <View style={styles.searchRow}>
        <View style={styles.searchBox}>
          <Ionicons name="search" size={18} color={colors.textSecondary} />
          <TextInput
            testID="search-input"
            value={q}
            onChangeText={setQ}
            style={styles.searchInput}
            placeholder="Location or property name"
            placeholderTextColor={colors.textMuted}
            returnKeyType="search"
            onSubmitEditing={load}
          />
          {q ? (
            <Pressable onPress={() => { setQ(""); }} testID="search-clear">
              <Ionicons name="close-circle" size={18} color={colors.textMuted} />
            </Pressable>
          ) : null}
        </View>
        <Pressable style={styles.goBtn} onPress={load} testID="search-go-btn">
          <Text style={styles.goTxt}>Go</Text>
        </Pressable>
      </View>

      <View style={styles.priceRow}>
        <TextInput
          testID="search-min-price"
          value={minP} onChangeText={setMinP}
          style={styles.priceInput} keyboardType="numeric"
          placeholder="Min ₹" placeholderTextColor={colors.textMuted}
        />
        <TextInput
          testID="search-max-price"
          value={maxP} onChangeText={setMaxP}
          style={styles.priceInput} keyboardType="numeric"
          placeholder="Max ₹" placeholderTextColor={colors.textMuted}
        />
      </View>

      <View style={styles.chipsWrap}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsContent}>
          {PROPERTY_TYPES.map(t => (
            <Pressable
              key={t}
              testID={`search-chip-${t}`}
              onPress={() => setType(t)}
              style={[styles.chip, type_ === t && styles.chipActive]}
            >
              <Text style={[styles.chipTxt, type_ === t && styles.chipTxtActive]}>{t}</Text>
            </Pressable>
          ))}
        </ScrollView>
      </View>

      {loading ? (
        <View style={styles.center}><ActivityIndicator color={colors.brand} /></View>
      ) : items.length === 0 ? (
        <View style={styles.center}>
          <Ionicons name="search-outline" size={48} color={colors.borderStrong} />
          <Text style={styles.empty}>No results</Text>
          <Text style={styles.emptySub}>Try adjusting filters</Text>
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={i => i.property_id}
          renderItem={({ item }) => <PropertyCard item={item} testIDPrefix="search-prop" />}
          contentContainerStyle={{ paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: spacing.xl }}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  c: { flex: 1, backgroundColor: colors.surface },
  header: { paddingHorizontal: spacing.lg, paddingTop: spacing.md },
  title: { fontSize: 24, fontWeight: "500", color: colors.onSurface },
  searchRow: { flexDirection: "row", gap: spacing.sm, paddingHorizontal: spacing.lg, marginTop: spacing.md },
  searchBox: {
    flex: 1, flexDirection: "row", alignItems: "center", gap: spacing.sm,
    backgroundColor: colors.surfaceTertiary, borderRadius: radius.md,
    paddingHorizontal: spacing.md,
  },
  searchInput: { flex: 1, paddingVertical: 12, fontSize: type.base, color: colors.onSurface },
  goBtn: { backgroundColor: colors.brand, paddingHorizontal: spacing.lg, borderRadius: radius.md, justifyContent: "center" },
  goTxt: { color: "#fff", fontWeight: "500" },
  priceRow: { flexDirection: "row", gap: spacing.sm, paddingHorizontal: spacing.lg, marginTop: spacing.sm },
  priceInput: {
    flex: 1, backgroundColor: colors.surfaceTertiary, borderRadius: radius.md,
    paddingHorizontal: spacing.md, paddingVertical: 10, fontSize: type.base, color: colors.onSurface,
  },
  chipsWrap: { height: 56, marginTop: spacing.sm },
  chipsContent: { gap: spacing.sm, paddingHorizontal: spacing.lg, alignItems: "center" },
  chip: { height: 36, paddingHorizontal: spacing.md, borderRadius: radius.pill, backgroundColor: colors.surfaceTertiary, alignItems: "center", justifyContent: "center", flexShrink: 0, borderWidth: 1, borderColor: "transparent" },
  chipActive: { backgroundColor: colors.brandTertiary, borderColor: colors.brand },
  chipTxt: { fontSize: type.sm, color: colors.onSurfaceTertiary },
  chipTxtActive: { color: colors.brand, fontWeight: "500" },
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: spacing.sm },
  empty: { fontSize: type.lg, color: colors.onSurface, fontWeight: "500", marginTop: spacing.sm },
  emptySub: { fontSize: type.base, color: colors.textSecondary },
});
