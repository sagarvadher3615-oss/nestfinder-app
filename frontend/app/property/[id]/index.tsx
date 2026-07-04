import { useEffect, useState } from "react";
import { View, Text, StyleSheet, ScrollView, Pressable, ActivityIndicator, Dimensions, Share, TextInput, KeyboardAvoidingView, Platform, Modal } from "react-native";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { api, Property, Review } from "@/src/lib/api";
import { useAuth } from "@/src/lib/auth";
import { useFavorites } from "@/src/lib/favorites";
import { useToast } from "@/src/lib/toast";
import { colors, spacing, radius, type } from "@/src/lib/theme";

const { width } = Dimensions.get("window");

export default function PropertyDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { ids: favIds, toggle: toggleFav } = useFavorites();
  const toast = useToast();
  const [prop, setProp] = useState<Property | null>(null);
  const [reviews, setReviews] = useState<{ average: number; count: number; reviews: Review[] }>({ average: 0, count: 0, reviews: [] });
  const [showRevModal, setShowRevModal] = useState(false);
  const [revRating, setRevRating] = useState(5);
  const [revComment, setRevComment] = useState("");
  const [revBusy, setRevBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [gIdx, setGIdx] = useState(0);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const [p, r] = await Promise.all([
          api.get(`/properties/${id}`),
          api.get(`/reviews/${id}`),
        ]);
        setProp(p);
        setReviews(r);
      } catch (e) { console.warn(e); }
      finally { setLoading(false); }
    })();
  }, [id]);

  const isOwner = user?.user_id === prop?.landlord_id;
  const fav = prop ? favIds.has(prop.property_id) : false;

  const onShare = async () => {
    if (!prop) return;
    const backend = process.env.EXPO_PUBLIC_BACKEND_URL;
    const link = `${backend}/property/${prop.property_id}`;
    try {
      if (Platform.OS === "web") {
        if (navigator.share) await navigator.share({ title: prop.title, text: prop.title, url: link });
        else { await navigator.clipboard?.writeText(link); toast.show("Link copied!", "success"); }
      } else {
        await Share.share({ message: `${prop.title} — ${prop.location}\n${link}`, url: link, title: prop.title });
      }
    } catch { /* user cancelled */ }
  };

  const onFav = async () => {
    if (!prop) return;
    try {
      const now = await toggleFav(prop.property_id);
      toast.show(now ? "Saved to favourites" : "Removed", "success");
    } catch (e: any) { toast.show(e.message || "Error", "error"); }
  };

  const submitReview = async () => {
    if (!prop) return;
    setRevBusy(true);
    try {
      await api.post("/reviews", { property_id: prop.property_id, rating: revRating, comment: revComment });
      const r = await api.get(`/reviews/${prop.property_id}`);
      setReviews(r);
      setShowRevModal(false);
      setRevComment("");
      setRevRating(5);
      toast.show("Review posted", "success");
    } catch (e: any) {
      toast.show(e.message || "Could not post review", "error");
    } finally { setRevBusy(false); }
  };

  const openChat = async () => {
    if (!prop) return;
    try {
      const t = await api.post("/chat/threads", { property_id: prop.property_id });
      router.push(`/chat/${t.thread_id}` as any);
    } catch (e: any) {
      toast.show(e.message || "Could not open chat", "error");
    }
  };

  const remove = async () => {
    if (!prop) return;
    setBusy(true);
    try { await api.del(`/properties/${prop.property_id}`); router.back(); }
    catch (e) { console.warn(e); }
    finally { setBusy(false); }
  };

  const cycleStatus = async () => {
    if (!prop) return;
    const order: Array<"available" | "rented" | "owned"> = ["available", "rented", "owned"];
    const next = order[(order.indexOf(prop.status) + 1) % 3];
    setBusy(true);
    try {
      const updated = await api.patch(`/properties/${prop.property_id}/status`, { status: next });
      setProp(updated);
    } catch (e) { console.warn(e); }
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
          <View style={[styles.topActions, { top: insets.top + 8 }]}>
            <Pressable style={styles.actionCircle} onPress={onShare} testID="detail-share-btn">
              <Ionicons name="share-outline" size={20} color="#fff" />
            </Pressable>
            {!isOwner && (
              <Pressable style={styles.actionCircle} onPress={onFav} testID="detail-fav-btn">
                <Ionicons name={fav ? "heart" : "heart-outline"} size={20} color={fav ? "#F04A4A" : "#fff"} />
              </Pressable>
            )}
          </View>
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
              <View style={styles.llNameRow}>
                <Text style={styles.llName}>{prop.landlord_name}</Text>
                {prop.landlord_verified && (
                  <View style={styles.verifiedTick}>
                    <Ionicons name="shield-checkmark" size={12} color="#fff" />
                  </View>
                )}
              </View>
              <View style={styles.verifyRow}>
                <Ionicons name={prop.landlord_verified ? "shield-checkmark" : "information-circle-outline"} size={12} color={prop.landlord_verified ? colors.success : colors.textMuted} />
                <Text style={[styles.verifyTxt, !prop.landlord_verified && { color: colors.textMuted }]}>
                  {prop.landlord_verified ? "Identity verified" : "Not yet verified"}
                </Text>
              </View>
            </View>
            {!isOwner && (
              <Pressable style={styles.msgBtn} onPress={openChat} testID="detail-message-btn">
                <Ionicons name="chatbubble-ellipses-outline" size={16} color={colors.brand} />
                <Text style={styles.msgBtnTxt}>Message</Text>
              </Pressable>
            )}
          </View>

          {/* Reviews */}
          <View style={styles.reviewsHeader}>
            <View style={{ flex: 1 }}>
              <Text style={styles.sectionTitle}>Reviews</Text>
              {reviews.count > 0 ? (
                <View style={styles.ratingRow}>
                  <Ionicons name="star" size={16} color="#C28E3A" />
                  <Text style={styles.ratingTxt}>{reviews.average.toFixed(1)}</Text>
                  <Text style={styles.ratingCount}>({reviews.count} review{reviews.count === 1 ? "" : "s"})</Text>
                </View>
              ) : (
                <Text style={styles.ratingCount}>No reviews yet</Text>
              )}
            </View>
            {!isOwner && (
              <Pressable style={styles.writeRevBtn} onPress={() => setShowRevModal(true)} testID="write-review-btn">
                <Ionicons name="create-outline" size={14} color={colors.brand} />
                <Text style={styles.writeRevTxt}>Write</Text>
              </Pressable>
            )}
          </View>
          {reviews.reviews.slice(0, 5).map(r => (
            <View key={r.review_id} style={styles.reviewItem} testID={`review-${r.review_id}`}>
              <View style={styles.reviewHead}>
                <Text style={styles.reviewAuthor}>{r.author_name}</Text>
                <View style={styles.reviewStars}>
                  {[1,2,3,4,5].map(n => (
                    <Ionicons key={n} name={n <= r.rating ? "star" : "star-outline"} size={12} color="#C28E3A" />
                  ))}
                </View>
              </View>
              {r.comment ? <Text style={styles.reviewComment}>{r.comment}</Text> : null}
            </View>
          ))}
        </View>
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: insets.bottom + 12 }]}>
        <View>
          <Text style={styles.priceLabel}>Monthly rent</Text>
          <Text style={styles.price}>₹{prop.price.toLocaleString("en-IN")}</Text>
        </View>
        {isOwner ? (
          <View style={styles.ownerActions}>
            <Pressable style={styles.statusToggle} onPress={cycleStatus} disabled={busy} testID="detail-status-toggle">
              <Ionicons name="swap-horizontal" size={16} color={colors.brand} />
              <Text style={styles.statusToggleTxt}>{prop.status === "available" ? "Available" : prop.status === "rented" ? "Rented" : "Occupied"}</Text>
            </Pressable>
            <Pressable style={styles.deleteBtn} onPress={remove} disabled={busy} testID="detail-delete-btn">
              {busy ? <ActivityIndicator color="#fff" /> : <><Ionicons name="trash-outline" size={18} color="#fff" /><Text style={styles.deleteTxt}>Delete</Text></>}
            </Pressable>
          </View>
        ) : prop.status !== "available" ? (
          <View style={styles.unavailBtn} testID="detail-unavailable">
            <Ionicons name="lock-closed" size={16} color={colors.textSecondary} />
            <Text style={styles.unavailTxt}>Not available</Text>
          </View>
        ) : (
          <Pressable style={styles.bookBtn} onPress={() => router.push(`/property/${prop.property_id}/book` as any)} testID="detail-book-btn">
            <Text style={styles.bookTxt}>Book Now</Text>
            <Ionicons name="arrow-forward" size={18} color="#fff" />
          </Pressable>
        )}
      </View>

      <Modal visible={showRevModal} transparent animationType="slide" onRequestClose={() => setShowRevModal(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.modalOverlay}>
          <Pressable style={StyleSheet.absoluteFillObject} onPress={() => setShowRevModal(false)} />
          <View style={styles.modalCard} testID="review-modal">
            <View style={styles.modalHead}>
              <Text style={styles.modalTitle}>Write a review</Text>
              <Pressable onPress={() => setShowRevModal(false)}>
                <Ionicons name="close" size={22} color={colors.onSurface} />
              </Pressable>
            </View>
            <Text style={styles.modalLabel}>Rating</Text>
            <View style={styles.starRow}>
              {[1,2,3,4,5].map(n => (
                <Pressable key={n} onPress={() => setRevRating(n)} testID={`star-${n}`}>
                  <Ionicons name={n <= revRating ? "star" : "star-outline"} size={32} color="#C28E3A" />
                </Pressable>
              ))}
            </View>
            <Text style={styles.modalLabel}>Comment (optional)</Text>
            <TextInput
              value={revComment}
              onChangeText={setRevComment}
              style={styles.modalInput}
              placeholder="Share your experience..."
              placeholderTextColor={colors.textMuted}
              multiline
              testID="review-comment"
            />
            <Pressable style={styles.modalSubmit} onPress={submitReview} disabled={revBusy} testID="review-submit">
              {revBusy ? <ActivityIndicator color="#fff" /> : <Text style={styles.modalSubmitTxt}>Post Review</Text>}
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      </Modal>
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
  badgeRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm, flexWrap: "wrap" },
  badge: { alignSelf: "flex-start", backgroundColor: colors.brandTertiary, paddingHorizontal: spacing.sm, paddingVertical: 4, borderRadius: radius.pill },
  badgeTxt: { fontSize: type.sm, color: colors.brand, fontWeight: "500" },
  statusBadge: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: spacing.sm, paddingVertical: 4, borderRadius: radius.pill },
  statusRented: { backgroundColor: "#A85751" },
  statusOwned: { backgroundColor: "#4A544C" },
  statusBadgeTxt: { color: "#fff", fontSize: type.sm, fontWeight: "500" },
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
  deleteBtn: { flexDirection: "row", alignItems: "center", gap: spacing.sm, backgroundColor: colors.error, paddingHorizontal: spacing.lg, paddingVertical: 14, borderRadius: radius.md },
  deleteTxt: { color: "#fff", fontSize: type.base, fontWeight: "500" },
  ownerActions: { flexDirection: "row", gap: spacing.sm, alignItems: "center" },
  statusToggle: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: spacing.md, paddingVertical: 12, borderRadius: radius.md, backgroundColor: colors.brandTertiary, borderWidth: 1, borderColor: colors.brand },
  statusToggleTxt: { color: colors.brand, fontSize: type.base, fontWeight: "500" },
  unavailBtn: { flexDirection: "row", alignItems: "center", gap: spacing.sm, backgroundColor: colors.surfaceTertiary, paddingHorizontal: spacing.xl, paddingVertical: 14, borderRadius: radius.md },
  unavailTxt: { color: colors.textSecondary, fontSize: type.lg, fontWeight: "500" },
  topActions: { position: "absolute", right: spacing.md, flexDirection: "row", gap: spacing.sm },
  actionCircle: { width: 40, height: 40, borderRadius: 20, backgroundColor: "rgba(0,0,0,0.4)", alignItems: "center", justifyContent: "center" },
  llNameRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  verifiedTick: { width: 18, height: 18, borderRadius: 9, backgroundColor: colors.success, alignItems: "center", justifyContent: "center" },
  reviewsHeader: { flexDirection: "row", alignItems: "flex-end", justifyContent: "space-between", marginTop: spacing.xl },
  ratingRow: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: spacing.xs },
  ratingTxt: { fontSize: type.lg, color: colors.onSurface, fontWeight: "500" },
  ratingCount: { fontSize: type.sm, color: colors.textSecondary },
  writeRevBtn: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: spacing.md, paddingVertical: 8, borderRadius: radius.pill, backgroundColor: colors.brandTertiary },
  writeRevTxt: { fontSize: type.sm, color: colors.brand, fontWeight: "500" },
  reviewItem: { backgroundColor: colors.surfaceSecondary, padding: spacing.md, borderRadius: radius.md, marginTop: spacing.sm },
  reviewHead: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 4 },
  reviewAuthor: { fontSize: type.base, color: colors.onSurface, fontWeight: "500" },
  reviewStars: { flexDirection: "row", gap: 2 },
  reviewComment: { fontSize: type.sm, color: colors.textSecondary, lineHeight: 20 },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },
  modalCard: { backgroundColor: colors.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: spacing.lg, paddingBottom: spacing.xl },
  modalHead: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: spacing.md },
  modalTitle: { fontSize: type.xl, fontWeight: "500", color: colors.onSurface },
  modalLabel: { fontSize: type.sm, color: colors.textSecondary, marginBottom: spacing.xs, marginTop: spacing.md },
  starRow: { flexDirection: "row", gap: spacing.sm, justifyContent: "center", paddingVertical: spacing.sm },
  modalInput: { backgroundColor: colors.surfaceTertiary, borderRadius: radius.md, padding: spacing.md, minHeight: 80, textAlignVertical: "top", fontSize: type.base, color: colors.onSurface },
  modalSubmit: { backgroundColor: colors.brand, borderRadius: radius.md, paddingVertical: 14, alignItems: "center", marginTop: spacing.md },
  modalSubmitTxt: { color: "#fff", fontSize: type.lg, fontWeight: "500" },
  msgBtn: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: spacing.md, paddingVertical: 8, borderRadius: radius.pill, borderWidth: 1, borderColor: colors.brand },
  msgBtnTxt: { color: colors.brand, fontSize: type.sm, fontWeight: "500" },
});
