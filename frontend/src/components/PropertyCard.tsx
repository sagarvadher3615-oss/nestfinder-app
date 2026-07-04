import { View, Text, StyleSheet, Pressable, FlatList } from "react-native";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { Property } from "@/src/lib/api";
import { colors, spacing, radius, type } from "@/src/lib/theme";

export function PropertyCard({ item, testIDPrefix = "prop" }: { item: Property; testIDPrefix?: string }) {
  const router = useRouter();
  return (
    <Pressable
      testID={`${testIDPrefix}-card-${item.property_id}`}
      style={styles.card}
      onPress={() => router.push(`/property/${item.property_id}` as any)}
    >
      <View style={styles.imgWrap}>
        <Image source={item.images[0]} style={styles.img} contentFit="cover" transition={200} />
        <LinearGradient
          colors={["transparent", "rgba(18,20,18,0.75)"]}
          locations={[0.5, 1]}
          style={StyleSheet.absoluteFillObject}
        />
        <View style={styles.badge}><Text style={styles.badgeTxt}>{item.property_type}</Text></View>
        <View style={styles.imgBottom}>
          <Text style={styles.imgTitle} numberOfLines={1}>{item.title}</Text>
          <View style={styles.locRow}>
            <Ionicons name="location-outline" size={12} color="rgba(255,255,255,0.9)" />
            <Text style={styles.imgLoc} numberOfLines={1}>{item.location}</Text>
          </View>
        </View>
      </View>
      <View style={styles.cardBody}>
        <View style={styles.iconRow}>
          <View style={styles.chipInline}><Ionicons name="bed-outline" size={14} color={colors.textSecondary} /><Text style={styles.chipInlineTxt}>{item.bedrooms} bed</Text></View>
          <View style={styles.chipInline}><Ionicons name="water-outline" size={14} color={colors.textSecondary} /><Text style={styles.chipInlineTxt}>{item.bathrooms} bath</Text></View>
        </View>
        <View style={styles.priceRow}>
          <Text style={styles.price}>₹{item.price.toLocaleString("en-IN")}</Text>
          <Text style={styles.priceUnit}>/mo</Text>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surfaceSecondary, borderRadius: radius.lg,
    marginBottom: spacing.md, overflow: "hidden",
    shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 2,
  },
  imgWrap: { width: "100%", aspectRatio: 4 / 3, backgroundColor: colors.surfaceTertiary },
  img: { width: "100%", height: "100%" },
  badge: {
    position: "absolute", top: spacing.md, left: spacing.md, backgroundColor: "rgba(255,255,255,0.95)",
    paddingHorizontal: spacing.sm, paddingVertical: 4, borderRadius: radius.pill,
  },
  badgeTxt: { fontSize: type.sm, color: colors.brand, fontWeight: "500" },
  imgBottom: { position: "absolute", left: spacing.md, right: spacing.md, bottom: spacing.md },
  imgTitle: { color: "#fff", fontSize: type.lg, fontWeight: "500" },
  locRow: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 2 },
  imgLoc: { color: "rgba(255,255,255,0.9)", fontSize: type.sm, flex: 1 },
  cardBody: { padding: spacing.md, flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  iconRow: { flexDirection: "row", gap: spacing.md },
  chipInline: { flexDirection: "row", alignItems: "center", gap: 4 },
  chipInlineTxt: { fontSize: type.sm, color: colors.textSecondary },
  priceRow: { flexDirection: "row", alignItems: "baseline" },
  price: { fontSize: type.xl, color: colors.onSurface, fontWeight: "500" },
  priceUnit: { fontSize: type.sm, color: colors.textSecondary, marginLeft: 2 },
});
