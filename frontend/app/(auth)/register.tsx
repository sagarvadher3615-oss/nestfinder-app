import { useState } from "react";
import { View, Text, StyleSheet, TextInput, Pressable, ScrollView, KeyboardAvoidingView, Platform, ActivityIndicator } from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "@/src/lib/auth";
import { colors, spacing, radius, type } from "@/src/lib/theme";

export default function Register() {
  const router = useRouter();
  const { register, loginWithGoogle } = useAuth();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"tenant" | "landlord">("tenant");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!name || !email || !password) { setErr("Please fill all required fields"); return; }
    setErr(""); setBusy(true);
    try {
      await register({ name, email: email.trim(), password, role, phone });
      router.replace("/(tabs)");
    } catch (e: any) {
      setErr(e.message || "Signup failed");
    } finally { setBusy(false); }
  };

  const google = async () => {
    setErr(""); setBusy(true);
    try {
      await loginWithGoogle(role);
      router.replace("/(tabs)");
    } catch (e: any) {
      setErr(e.message || "Google signup failed");
    } finally { setBusy(false); }
  };

  return (
    <SafeAreaView style={styles.c} testID="register-screen">
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <Pressable onPress={() => router.back()} style={styles.back} testID="register-back-btn">
            <Ionicons name="chevron-back" size={24} color={colors.onSurface} />
          </Pressable>
          <Text style={styles.title}>Create your account</Text>
          <Text style={styles.sub}>Find or list your next home in minutes</Text>

          <Text style={styles.label}>I am a</Text>
          <View style={styles.roleRow}>
            {(["tenant", "landlord"] as const).map(r => (
              <Pressable
                key={r}
                testID={`role-${r}-btn`}
                onPress={() => setRole(r)}
                style={[styles.roleBtn, role === r && styles.roleBtnActive]}
              >
                <Ionicons
                  name={r === "tenant" ? "search-outline" : "home-outline"}
                  size={20}
                  color={role === r ? colors.brand : colors.onSurfaceTertiary}
                />
                <Text style={[styles.roleTxt, role === r && styles.roleTxtActive]}>
                  {r === "tenant" ? "Tenant" : "Landlord"}
                </Text>
              </Pressable>
            ))}
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Full name</Text>
            <TextInput testID="register-name-input" style={styles.input} value={name} onChangeText={setName} placeholder="Your name" placeholderTextColor={colors.textMuted} />
          </View>
          <View style={styles.field}>
            <Text style={styles.label}>Email</Text>
            <TextInput testID="register-email-input" style={styles.input} value={email} onChangeText={setEmail} placeholder="you@example.com" placeholderTextColor={colors.textMuted} autoCapitalize="none" keyboardType="email-address" />
          </View>
          <View style={styles.field}>
            <Text style={styles.label}>Phone (optional)</Text>
            <TextInput testID="register-phone-input" style={styles.input} value={phone} onChangeText={setPhone} placeholder="+91 98765 43210" placeholderTextColor={colors.textMuted} keyboardType="phone-pad" />
          </View>
          <View style={styles.field}>
            <Text style={styles.label}>Password</Text>
            <TextInput testID="register-password-input" style={styles.input} value={password} onChangeText={setPassword} placeholder="At least 6 characters" placeholderTextColor={colors.textMuted} secureTextEntry />
          </View>

          {err ? <Text style={styles.err} testID="register-error">{err}</Text> : null}

          <Pressable style={styles.primary} onPress={submit} disabled={busy} testID="register-submit-btn">
            {busy ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryTxt}>Create Account</Text>}
          </Pressable>

          <View style={styles.divider}><View style={styles.line} /><Text style={styles.dividerTxt}>or</Text><View style={styles.line} /></View>

          <Pressable style={styles.google} onPress={google} disabled={busy} testID="register-google-btn">
            <Ionicons name="logo-google" size={18} color={colors.onSurface} />
            <Text style={styles.googleTxt}>Continue with Google</Text>
          </Pressable>

          <Pressable onPress={() => router.replace("/(auth)/login")} style={styles.footerLink} testID="register-to-login">
            <Text style={styles.footerTxt}>Already have an account? <Text style={{ color: colors.brand, fontWeight: "500" }}>Sign in</Text></Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  c: { flex: 1, backgroundColor: colors.surface },
  scroll: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xl },
  back: { paddingVertical: spacing.md, marginBottom: spacing.sm },
  title: { fontSize: 28, fontWeight: "500", color: colors.onSurface },
  sub: { fontSize: type.base, color: colors.textSecondary, marginTop: spacing.xs, marginBottom: spacing.xl },
  roleRow: { flexDirection: "row", gap: spacing.md, marginTop: spacing.xs, marginBottom: spacing.md },
  roleBtn: {
    flex: 1, flexDirection: "row", justifyContent: "center", alignItems: "center", gap: spacing.sm,
    paddingVertical: 14, backgroundColor: colors.surfaceTertiary, borderRadius: radius.md,
    borderWidth: 1, borderColor: "transparent",
  },
  roleBtnActive: { backgroundColor: colors.brandTertiary, borderColor: colors.brand },
  roleTxt: { fontSize: type.lg, color: colors.onSurfaceTertiary },
  roleTxtActive: { color: colors.brand, fontWeight: "500" },
  field: { marginBottom: spacing.md },
  label: { fontSize: type.sm, color: colors.textSecondary, marginBottom: spacing.xs },
  input: {
    backgroundColor: colors.surfaceTertiary, borderRadius: radius.md,
    paddingHorizontal: spacing.md, paddingVertical: 14, fontSize: type.lg, color: colors.onSurface,
  },
  err: { color: colors.error, fontSize: type.sm, marginBottom: spacing.sm },
  primary: { backgroundColor: colors.brand, borderRadius: radius.md, paddingVertical: 16, alignItems: "center", marginTop: spacing.md },
  primaryTxt: { color: "#fff", fontSize: type.lg, fontWeight: "500" },
  divider: { flexDirection: "row", alignItems: "center", marginVertical: spacing.lg, gap: spacing.md },
  line: { flex: 1, height: 1, backgroundColor: colors.border },
  dividerTxt: { color: colors.textSecondary, fontSize: type.sm },
  google: {
    flexDirection: "row", justifyContent: "center", alignItems: "center", gap: spacing.sm,
    borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, paddingVertical: 14,
  },
  googleTxt: { fontSize: type.lg, color: colors.onSurface },
  footerLink: { marginTop: spacing.xl, alignItems: "center" },
  footerTxt: { color: colors.textSecondary, fontSize: type.base },
});
