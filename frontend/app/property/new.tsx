import { useState, useCallback, useEffect } from "react";
import { View, Text, StyleSheet, TextInput, Pressable, ScrollView, KeyboardAvoidingView, Platform, ActivityIndicator, Alert } from "react-native";
import { Image } from "expo-image";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import * as Location from "expo-location";
import { api } from "@/src/lib/api";
import { colors, spacing, radius, type } from "@/src/lib/theme";

const TYPES = ["1BHK", "2BHK", "3BHK", "Single Room", "PG/Hostel"];
const AMENITIES_ALL = ["WiFi", "AC", "Kitchen", "Parking", "Balcony", "Gym", "Swimming Pool", "Security", "Meals", "Laundry", "Furnished", "Power Backup", "Lift"];
const STATUSES: { value: "available" | "rented" | "owned"; label: string; sub: string }[] = [
  { value: "available", label: "Available", sub: "Open for bookings" },
  { value: "rented", label: "Rented Out", sub: "Already leased" },
  { value: "owned", label: "Occupied", sub: "I live here / off market" },
];

export default function NewProperty() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [location, setLocation] = useState("");
  const [price, setPrice] = useState("");
  const [ptype, setPtype] = useState("1BHK");
  const [beds, setBeds] = useState("1");
  const [baths, setBaths] = useState("1");
  const [desc, setDesc] = useState("");
  const [amenities, setAmenities] = useState<string[]>([]);
  const [images, setImages] = useState<string[]>([]);
  const [status, setStatus] = useState<"available" | "rented" | "owned">("available");
  const [coord, setCoord] = useState<{ lat: number; lng: number } | null>(null);
  const [locLoading, setLocLoading] = useState(false);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  // Auto-detect GPS location on mount
  useEffect(() => {
    (async () => {
      setLocLoading(true);
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status === "granted") {
          const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
          setCoord({ lat: loc.coords.latitude, lng: loc.coords.longitude });
        }
      } catch (e) {
        console.warn("Location error:", e);
      } finally {
        setLocLoading(false);
      }
    })();
  }, []);

  const refreshLocation = async () => {
    setLocLoading(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Permission denied", "Please allow location access in your device settings.");
        return;
      }
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      setCoord({ lat: loc.coords.latitude, lng: loc.coords.longitude });
    } catch (e) {
      Alert.alert("Error", "Could not get location. Please try again.");
    } finally {
      setLocLoading(false);
    }
  };

  const pick = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) { setErr("Photo library permission needed"); return; }
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.5,
      base64: true,
      allowsMultipleSelection: true,
      selectionLimit: 5,
    });
    if (res.canceled) return;
    const urls = res.assets.map(a => a.base64 ? `data:${a.mimeType || "image/jpeg"};base64,${a.base64}` : a.uri);
    setImages(prev => [...prev, ...urls].slice(0, 6));
  };

  const toggleAm = (a: string) => setAmenities(p => p.includes(a) ? p.filter(x => x !== a) : [...p, a]);

  const submit = async () => {
    if (!title || !location || !price) { setErr("Title, location, and price are required"); return; }
    if (isNaN(Number(price))) { setErr("Price must be a number"); return; }
    setErr(""); setBusy(true);
    try {
      await api.post("/properties", {
        title, location,
        price: Number(price),
        property_type: ptype,
        bedrooms: Number(beds) || 1,
        bathrooms: Number(baths) || 1,
        description: desc,
        amenities,
        images,
        status,
        lat: coord?.lat ?? null,
        lng: coord?.lng ?? null,
      });
      router.replace("/(tabs)");
    } catch (e: any) {
      setErr(e.message || "Could not save");
    } finally { setBusy(false); }
  };

  return (
    <SafeAreaView style={styles.c} testID="add-property-screen">
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <View style={styles.headerRow}>
            <Pressable onPress={() => router.back()} testID="new-back-btn">
              <Ionicons name="chevron-back" size={24} color={colors.onSurface} />
            </Pressable>
            <Text style={styles.title}>Add Property</Text>
            <View style={{ width: 24 }} />
          </View>

          <Text style={styles.label}>Photos ({images.length}/6)</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.photoRow}>
            <Pressable style={styles.addPhoto} onPress={pick} testID="add-photo-btn">
              <Ionicons name="camera-outline" size={26} color={colors.brand} />
              <Text style={styles.addPhotoTxt}>Add</Text>
            </Pressable>
            {images.map((img, i) => (
              <View key={i} style={styles.photoItem}>
                <Image source={img} style={{ width: 96, height: 96, borderRadius: radius.md }} contentFit="cover" />
                <Pressable style={styles.removePhoto} onPress={() => setImages(images.filter((_, idx) => idx !== i))} testID={`remove-photo-${i}`}>
                  <Ionicons name="close" size={14} color="#fff" />
                </Pressable>
              </View>
            ))}
          </ScrollView>

          <View style={styles.field}>
            <Text style={styles.label}>Title</Text>
            <TextInput testID="new-title" style={styles.input} value={title} onChangeText={setTitle} placeholder="e.g. Cozy 1BHK near metro" placeholderTextColor={colors.textMuted} />
          </View>
          <View style={styles.field}>
            <Text style={styles.label}>Location</Text>
            <TextInput testID="new-location" style={styles.input} value={location} onChangeText={setLocation} placeholder="Area, City" placeholderTextColor={colors.textMuted} />
          </View>

          {/* GPS Location Status */}
          <Pressable
            style={[styles.locBox, coord && styles.locBoxOn]}
            onPress={refreshLocation}
            testID="location-status-btn"
          >
            {locLoading ? (
              <ActivityIndicator size="small" color={colors.brand} />
            ) : (
              <Ionicons
                name={coord ? "location" : "location-outline"}
                size={18}
                color={coord ? colors.brand : colors.onSurfaceTertiary}
              />
            )}
            <View style={{ flex: 1 }}>
              <Text style={[styles.locTxt, coord && { color: colors.brand, fontWeight: "500" }]}>
                {locLoading ? "Detecting your location..." : coord ? "Location detected ✓" : "Location not detected"}
              </Text>
              {coord && (
                <Text style={styles.locSub}>{coord.lat.toFixed(4)}, {coord.lng.toFixed(4)} · tap to refresh</Text>
              )}
            </View>
            {!locLoading && (
              <Ionicons name="refresh-outline" size={16} color={colors.textMuted} />
            )}
          </Pressable>
          <View style={styles.field}>
            <Text style={styles.label}>Monthly rent (₹)</Text>
            <TextInput testID="new-price" style={styles.input} value={price} onChangeText={setPrice} placeholder="20000" placeholderTextColor={colors.textMuted} keyboardType="numeric" />
          </View>

          <Text style={styles.label}>Property type</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsContent} style={{ height: 56 }}>
            {TYPES.map(t => (
              <Pressable key={t} onPress={() => setPtype(t)} style={[styles.chip, ptype === t && styles.chipActive]} testID={`type-${t}`}>
                <Text style={[styles.chipTxt, ptype === t && styles.chipTxtActive]}>{t}</Text>
              </Pressable>
            ))}
          </ScrollView>

          <Text style={styles.label}>Listing status</Text>
          <View style={styles.statusCol}>
            {STATUSES.map(s => {
              const on = status === s.value;
              return (
                <Pressable key={s.value} onPress={() => setStatus(s.value)} style={[styles.statusRow, on && styles.statusRowActive]} testID={`status-${s.value}`}>
                  <View style={[styles.statusDot, on && styles.statusDotActive]}>
                    {on && <View style={styles.statusDotInner} />}
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.statusLabel, on && { color: colors.brand, fontWeight: "500" }]}>{s.label}</Text>
                    <Text style={styles.statusSub}>{s.sub}</Text>
                  </View>
                </Pressable>
              );
            })}
          </View>

          <View style={styles.row2}>
            <View style={{ flex: 1 }}>
              <Text style={styles.label}>Bedrooms</Text>
              <TextInput testID="new-beds" style={styles.input} value={beds} onChangeText={setBeds} keyboardType="numeric" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.label}>Bathrooms</Text>
              <TextInput testID="new-baths" style={styles.input} value={baths} onChangeText={setBaths} keyboardType="numeric" />
            </View>
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Description</Text>
            <TextInput testID="new-desc" style={[styles.input, { minHeight: 96, textAlignVertical: "top" }]} value={desc} onChangeText={setDesc} placeholder="Tell tenants about the place..." placeholderTextColor={colors.textMuted} multiline />
          </View>

          <Text style={styles.label}>Amenities</Text>
          <View style={styles.amGrid}>
            {AMENITIES_ALL.map(a => {
              const on = amenities.includes(a);
              return (
                <Pressable key={a} onPress={() => toggleAm(a)} style={[styles.amChip, on && styles.amChipOn]} testID={`amenity-${a}`}>
                  {on && <Ionicons name="checkmark" size={14} color={colors.brand} />}
                  <Text style={[styles.amTxt, on && { color: colors.brand, fontWeight: "500" }]}>{a}</Text>
                </Pressable>
              );
            })}
          </View>

          {err ? <Text style={styles.err} testID="new-error">{err}</Text> : null}

          <Pressable style={styles.primary} onPress={submit} disabled={busy} testID="new-submit-btn">
            {busy ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryTxt}>Publish Listing</Text>}
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  c: { flex: 1, backgroundColor: colors.surface },
  scroll: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xl },
  headerRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: spacing.md },
  title: { fontSize: type.xl, color: colors.onSurface, fontWeight: "500" },
  field: { marginBottom: spacing.md },
  label: { fontSize: type.sm, color: colors.textSecondary, marginBottom: spacing.xs, marginTop: spacing.sm },
  input: { backgroundColor: colors.surfaceTertiary, borderRadius: radius.md, paddingHorizontal: spacing.md, paddingVertical: 14, fontSize: type.lg, color: colors.onSurface },
  row2: { flexDirection: "row", gap: spacing.md, marginBottom: spacing.sm },
  chipsContent: { gap: spacing.sm, alignItems: "center", paddingRight: spacing.lg },
  chip: { height: 36, paddingHorizontal: spacing.md, borderRadius: radius.pill, backgroundColor: colors.surfaceTertiary, alignItems: "center", justifyContent: "center", flexShrink: 0, borderWidth: 1, borderColor: "transparent" },
  chipActive: { backgroundColor: colors.brandTertiary, borderColor: colors.brand },
  chipTxt: { fontSize: type.sm, color: colors.onSurfaceTertiary },
  chipTxtActive: { color: colors.brand, fontWeight: "500" },
  amGrid: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm, marginTop: spacing.xs },
  amChip: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: spacing.md, paddingVertical: 8, borderRadius: radius.pill, backgroundColor: colors.surfaceTertiary },
  amChipOn: { backgroundColor: colors.brandTertiary },
  amTxt: { fontSize: type.sm, color: colors.onSurface },
  err: { color: colors.error, fontSize: type.sm, marginTop: spacing.md },
  primary: { backgroundColor: colors.brand, borderRadius: radius.md, paddingVertical: 16, alignItems: "center", marginTop: spacing.lg },
  primaryTxt: { color: "#fff", fontSize: type.lg, fontWeight: "500" },
  photoRow: { marginBottom: spacing.md, marginTop: spacing.xs },
  addPhoto: { width: 96, height: 96, borderRadius: radius.md, backgroundColor: colors.surfaceTertiary, alignItems: "center", justifyContent: "center", marginRight: spacing.sm, borderWidth: 1, borderColor: colors.brand, borderStyle: "dashed", gap: 4 },
  addPhotoTxt: { fontSize: type.sm, color: colors.brand },
  photoItem: { marginRight: spacing.sm, position: "relative" },
  removePhoto: { position: "absolute", top: 4, right: 4, width: 20, height: 20, borderRadius: 10, backgroundColor: "rgba(0,0,0,0.6)", alignItems: "center", justifyContent: "center" },
  statusCol: { gap: spacing.sm, marginTop: spacing.xs, marginBottom: spacing.sm },
  statusRow: { flexDirection: "row", alignItems: "center", gap: spacing.md, padding: spacing.md, borderRadius: radius.md, backgroundColor: colors.surfaceTertiary, borderWidth: 1, borderColor: "transparent" },
  statusRowActive: { backgroundColor: colors.brandTertiary, borderColor: colors.brand },
  statusDot: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: colors.borderStrong, alignItems: "center", justifyContent: "center" },
  statusDotActive: { borderColor: colors.brand },
  statusDotInner: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.brand },
  statusLabel: { fontSize: type.base, color: colors.onSurface },
  statusSub: { fontSize: type.sm, color: colors.textSecondary, marginTop: 2 },
  locBox: {
    flexDirection: "row", alignItems: "center", gap: spacing.sm,
    padding: spacing.md, borderRadius: radius.md, backgroundColor: colors.surfaceTertiary,
    borderWidth: 1, borderColor: "transparent", marginBottom: spacing.sm,
  },
  locBoxOn: { backgroundColor: colors.brandTertiary, borderColor: colors.brand },
  locTxt: { fontSize: type.base, color: colors.onSurfaceTertiary },
  locSub: { fontSize: type.sm, color: colors.brand, marginTop: 2 },
});
