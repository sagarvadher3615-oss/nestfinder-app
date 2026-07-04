import { useEffect, useState } from "react";
import { View, Text, StyleSheet, ScrollView, Pressable, ActivityIndicator, Dimensions } from "react-native";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { api, Property } from "@/src/lib/api";
import { useAuth } from "@/src/lib/auth";
import { colors, spacing, radius, type } from "@/src/lib/theme";

const { width } = Dimensions.get("window");

export default function PropertyDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const [prop, setProp] = useState<Property | null>(null);
  const [loading, setLoading] = useState(true);
  const [gIdx, setGIdx] = useState(0);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    (async () => {
      try { setProp(await api.get(`/properties/${id}`)); }
      catch (e) { console.warn(e); }
      finally { setLoading(false); }
    })();
  }, [id]);

  const isOwner = user?.user_id === prop?.landlord_id;

  const remove = async () => {
    if (!prop) return;
    setBusy(true);
    try { await api.del(`/properties/${prop.property_id}`); router.back(); }
    catch (e) { console.warn(e); }
    finally { setBusy(false); }
  };

  if (loading) return <View style={styles.center}><ActivityIndicator color={colors.brand} /></View>;
  if (!prop) return <View style={styles.center}><Text>Property not found</Text></View>;

  return (
    <View style={styles.c} testID="property-detail-screen">
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 140 }}>
        <View style={styles.gallery}>
          <ScrollView
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onMomentumScrollEnd={e => setGIdx(Math.round(e.nativeEvent.contentOffset.x / width))}
          >
            {(prop.images.length ? prop.images : [""]).map((img, i) => (
              <Image key={i} source={img} style={{ width, height: 320 }} contentFit="cover" />
            ))}
          </ScrollView>
          <LinearGradient
            colors={["rgba(0,0,0,0.4)", "transparent"]}
            style={{ position: "absolute", top: 0, left: 0, right: 0, height: 100 }}
          />
          <Pressable style={[styles.backBtn, { top: insets.top + 8 }]} onPress={() => router.back()} testID="detail-back-btn">
            <Ionicons name="chevron-back" size={22} color="#fff" />
          </Pressable>
          {prop.images.length > 1 && (
            <View style={styles.dots}>
              {prop.images.map((_, i) => (
                <View key={i} style={[styles.dot, gIdx === i && styles.dotActive]} />
              ))}
            </View>
          )}
        </View>

        <View style={styles.body}>
          <View style={styles.badge}><Text style={styles.badgeTxt}>{prop.property_type}</Text></View>
          <Text style={styles.title} testID="detail-title">{prop.title}</Text>
          <View style={styles.locRow}>
            <Ionicons name="location-outline" size={16} color={colors.textSecondary} />
            <Text style={styles.locTxt}>{prop.location}</Text>
          </View>

          <View style={styles.stats}>
            <View style={styles.stat}><Ionicons name="bed-outline" size={20} color={colors.brand} /><Text style={styles.statLabel}>{prop.bedrooms} Bed</Text></View>
            <View style={styles.divider} />
            <View style={styles.stat}><Ionicons name="water-outline" size={20} color={colors.brand} /><Text style={styles.statLabel}>{prop.bathrooms} Bath</Text></View>
            <View style={styles.divider} />
            <View style={styles.stat}><Ionicons name="pricetag-outline" size={20} color={colors.brand} /><Text style={styles.statLabel}>Monthly</Text></View>
          </View>

          <Text style={styles.sectionTitle}>About this place</Text>
          <Text style={styles.desc}>{prop.description || "No description provided."}</Text>

          {prop.amenities.length > 0 && (
            <>
              <Text style={styles.sectionTitle}>Amenities</Text>
              <View style={styles.amenities}>
                {prop.amenities.map(a => (
                  <View key={a} style={styles.amChip}>
                    <Ionicons name="checkmark" size={14} color={colors.brand} />
                    <Text style={styles.amTxt}>{a}</Text>
                  </View>
                ))}
              </View>
            </>
          )}

          <Text style={styles.sectionTitle}>Listed by</Text>
          <View style={styles.landlord}>
            <View style={styles.llAvatar}><Text style={styles.llAvatarTxt}>{prop.landlord_name.charAt(0)}</Text></View>
            <View style={{ flex: 1 }}>
              <Text style={styles.llName}>{prop.landlord_name}</Text>
              <View style={styles.verifyRow}>
                <Ionicons name="shield-checkmark" size={12} color={colors.success} />
                <Text style={styles.verifyTxt}>Verified landlord</Text>
              </View>
            </View>
          </View>
        </View>
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: insets.bottom + 12 }]}>
        <View>
          <Text style={styles.priceLabel}>Monthly rent</Text>
          <Text style={styles.price}>₹{prop.price.toLocaleString("en-IN")}</Text>
        </View>
        {isOwner ? (
          <Pressable style={styles.deleteBtn} onPress={remove} disabled={busy} testID="detail-delete-btn">
            {busy ? <ActivityIndicator color="#fff" /> : <><Ionicons name="trash-outline" size={18} color="#fff" /><Text style={styles.deleteTxt}>Delete</Text></>}
          </Pressable>
        ) : (
          <Pressable style={styles.bookBtn} onPress={() => router.push(`/property/${prop.property_id}/book` as any)} testID="detail-book-btn">
            <Text style={styles.bookTxt}>Book Now</Text>
            <Ionicons name="arrow-forward" size={18} color="#fff" />
          </Pressable>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  c: { flex: 1, backgroundColor: colors.surface },
  center: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.surface },
  gallery: { position: "relative" },
  backBtn: {
    position: "absolute", left: spacing.md, width: 40, height: 40, borderRadius: 20,
    backgroundColor: "rgba(0,0,0,0.4)", alignItems: "center", justifyContent: "center",
  },
  dots: { position: "absolute", bottom: spacing.md, alignSelf: "center", flexDirection: "row", gap: 6 },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: "rgba(255,255,255,0.5)" },
  dotActive: { backgroundColor: "#fff", width: 18 },
  body: { padding: spacing.lg, marginTop: -20, backgroundColor: colors.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24 },
  badge: { alignSelf: "flex-start", backgroundColor: colors.brandTertiary, paddingHorizontal: spacing.sm, paddingVertical: 4, borderRadius: radius.pill },
  badgeTxt: { fontSize: type.sm, color: colors.brand, fontWeight: "500" },
  title: { fontSize: 24, color: colors.onSurface, fontWeight: "500", marginTop: spacing.sm },
  locRow: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: spacing.xs },
  locTxt: { fontSize: type.base, color: colors.textSecondary },
  stats: {
    flexDirection: "row", backgroundColor: colors.surfaceSecondary, borderRadius: radius.md,
    padding: spacing.md, marginTop: spacing.lg, alignItems: "center", justifyContent: "space-around",
  },
  stat: { alignItems: "center", gap: 4 },
  statLabel: { fontSize: type.sm, color: colors.textSecondary },
  divider: { width: 1, height: 28, backgroundColor: colors.border },
  sectionTitle: { fontSize: type.lg, color: colors.onSurface, fontWeight: "500", marginTop: spacing.xl, marginBottom: spacing.sm },
  desc: { fontSize: type.base, color: colors.textSecondary, lineHeight: 22 },
  amenities: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  amChip: { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: colors.surfaceTertiary, paddingHorizontal: spacing.md, paddingVertical: 8, borderRadius: radius.pill },
  amTxt: { fontSize: type.sm, color: colors.onSurface },
  landlord: { flexDirection: "row", alignItems: "center", gap: spacing.md, backgroundColor: colors.surfaceSecondary, padding: spacing.md, borderRadius: radius.md },
  llAvatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.brandTertiary, alignItems: "center", justifyContent: "center" },
  llAvatarTxt: { fontSize: 18, color: colors.brand, fontWeight: "500" },
  llName: { fontSize: type.base, color: colors.onSurface, fontWeight: "500" },
  verifyRow: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 2 },
  verifyTxt: { fontSize: type.sm, color: colors.success },
  footer: {
    position: "absolute", left: 0, right: 0, bottom: 0,
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    backgroundColor: colors.surfaceSecondary, paddingHorizontal: spacing.lg, paddingTop: spacing.md,
    borderTopWidth: 1, borderTopColor: colors.border,
  },
  priceLabel: { fontSize: type.sm, color: colors.textSecondary },
  price: { fontSize: 22, color: colors.onSurface, fontWeight: "500" },
  bookBtn: { flexDirection: "row", alignItems: "center", gap: spacing.sm, backgroundColor: colors.brand, paddingHorizontal: spacing.xl, paddingVertical: 14, borderRadius: radius.md },
  bookTxt: { color: "#fff", fontSize: type.lg, fontWeight: "500" },
  deleteBtn: { flexDirection: "row", alignItems: "center", gap: spacing.sm, backgroundColor: colors.error, paddingHorizontal: spacing.xl, paddingVertical: 14, borderRadius: radius.md },
  deleteTxt: { color: "#fff", fontSize: type.lg, fontWeight: "500" },
});
