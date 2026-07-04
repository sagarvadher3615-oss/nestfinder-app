import { useState } from "react";
import { View, Text, StyleSheet, TextInput, Pressable, ScrollView, KeyboardAvoidingView, Platform, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "@/src/lib/auth";
import { api } from "@/src/lib/api";
import { colors, spacing, radius, type } from "@/src/lib/theme";

export default function BookProperty() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuth();
  const [name, setName] = useState(user?.name || "");
  const [phone, setPhone] = useState(user?.phone || "");
  const [date, setDate] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  const submit = async () => {
    if (!name || !phone || !date) { setErr("Please fill all fields"); return; }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) { setErr("Date must be YYYY-MM-DD"); return; }
    setErr(""); setBusy(true);
    try {
      await api.post("/bookings", { property_id: id, tenant_name: name, tenant_phone: phone, move_in_date: date });
      setDone(true);
    } catch (e: any) {
      setErr(e.message || "Booking failed");
    } finally { setBusy(false); }
  };

  if (done) {
    return (
      <SafeAreaView style={styles.c} testID="booking-success-screen">
        <View style={styles.successBox}>
          <View style={styles.successIcon}><Ionicons name="checkmark" size={44} color="#fff" /></View>
          <Text style={styles.successTitle}>Request Sent!</Text>
          <Text style={styles.successSub}>The landlord will review your request and get back to you shortly.</Text>
          <Pressable style={styles.primary} onPress={() => router.replace("/(tabs)/bookings")} testID="view-bookings-btn">
            <Text style={styles.primaryTxt}>View My Bookings</Text>
          </Pressable>
          <Pressable style={styles.secondary} onPress={() => router.replace("/(tabs)")}>
            <Text style={styles.secondaryTxt}>Back to Home</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.c} testID="booking-form-screen">
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <Pressable onPress={() => router.back()} style={styles.back} testID="booking-back-btn">
            <Ionicons name="chevron-back" size={24} color={colors.onSurface} />
          </Pressable>
          <Text style={styles.title}>Request to book</Text>
          <Text style={styles.sub}>Share your details and preferred move-in date.</Text>

          <View style={styles.field}>
            <Text style={styles.label}>Your name</Text>
            <TextInput testID="booking-name" style={styles.input} value={name} onChangeText={setName} placeholder="Full name" placeholderTextColor={colors.textMuted} />
          </View>
          <View style={styles.field}>
            <Text style={styles.label}>Phone</Text>
            <TextInput testID="booking-phone" style={styles.input} value={phone} onChangeText={setPhone} placeholder="+91 ..." placeholderTextColor={colors.textMuted} keyboardType="phone-pad" />
          </View>
          <View style={styles.field}>
            <Text style={styles.label}>Move-in date (YYYY-MM-DD)</Text>
            <TextInput testID="booking-date" style={styles.input} value={date} onChangeText={setDate} placeholder="2026-07-01" placeholderTextColor={colors.textMuted} />
          </View>

          {err ? <Text style={styles.err} testID="booking-error">{err}</Text> : null}

          <Pressable style={styles.primary} onPress={submit} disabled={busy} testID="booking-submit-btn">
            {busy ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryTxt}>Confirm Booking</Text>}
          </Pressable>
          <Text style={styles.hint}>No payment now. The landlord will accept or decline your request.</Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  c: { flex: 1, backgroundColor: colors.surface },
  scroll: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xl },
  back: { paddingVertical: spacing.md },
  title: { fontSize: 28, fontWeight: "500", color: colors.onSurface },
  sub: { fontSize: type.base, color: colors.textSecondary, marginTop: spacing.xs, marginBottom: spacing.xl },
  field: { marginBottom: spacing.md },
  label: { fontSize: type.sm, color: colors.textSecondary, marginBottom: spacing.xs },
  input: { backgroundColor: colors.surfaceTertiary, borderRadius: radius.md, paddingHorizontal: spacing.md, paddingVertical: 14, fontSize: type.lg, color: colors.onSurface },
  err: { color: colors.error, fontSize: type.sm, marginBottom: spacing.sm },
  primary: { backgroundColor: colors.brand, borderRadius: radius.md, paddingVertical: 16, alignItems: "center", marginTop: spacing.md },
  primaryTxt: { color: "#fff", fontSize: type.lg, fontWeight: "500" },
  secondary: { paddingVertical: 14, alignItems: "center", marginTop: spacing.sm },
  secondaryTxt: { color: colors.brand, fontSize: type.base },
  hint: { marginTop: spacing.md, textAlign: "center", color: colors.textMuted, fontSize: type.sm },
  successBox: { flex: 1, alignItems: "center", justifyContent: "center", padding: spacing.xl, gap: spacing.md },
  successIcon: { width: 80, height: 80, borderRadius: 40, backgroundColor: colors.success, alignItems: "center", justifyContent: "center" },
  successTitle: { fontSize: 26, fontWeight: "500", color: colors.onSurface },
  successSub: { fontSize: type.base, color: colors.textSecondary, textAlign: "center" },
});
