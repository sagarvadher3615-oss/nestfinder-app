import { useState } from "react";
import { View, Text, StyleSheet, TextInput, Pressable, ScrollView, KeyboardAvoidingView, Platform, ActivityIndicator } from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "@/src/lib/auth";
import { colors, spacing, radius, type } from "@/src/lib/theme";

export default function Login() {
  const router = useRouter();
  const { loginWithPassword } = useAuth();
  const [email, setEmail] = useState("tenant@nestfinder.app");
  const [password, setPassword] = useState("Demo123!");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    setErr(""); setBusy(true);
    try {
      await loginWithPassword(email.trim(), password);
      router.replace("/(tabs)");
    } catch (e: any) {
      setErr(e.message || "Login failed");
    } finally { setBusy(false); }
  };

  return (
    <SafeAreaView style={styles.c} testID="login-screen">
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <Pressable onPress={() => router.back()} style={styles.back} testID="login-back-btn">
            <Ionicons name="chevron-back" size={24} color={colors.onSurface} />
          </Pressable>
          <Text style={styles.title}>Welcome back</Text>
          <Text style={styles.sub}>Sign in to your NestFinder account</Text>

          <View style={styles.field}>
            <Text style={styles.label}>Email</Text>
            <TextInput
              testID="login-email-input"
              style={styles.input}
              value={email}
              onChangeText={setEmail}
              placeholder="you@example.com"
              placeholderTextColor={colors.textMuted}
              autoCapitalize="none"
              keyboardType="email-address"
            />
          </View>
          <View style={styles.field}>
            <Text style={styles.label}>Password</Text>
            <TextInput
              testID="login-password-input"
              style={styles.input}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              placeholder="••••••••"
              placeholderTextColor={colors.textMuted}
            />
          </View>

          {err ? <Text style={styles.err} testID="login-error">{err}</Text> : null}

          <Pressable style={styles.primary} onPress={submit} disabled={busy} testID="login-submit-btn">
            {busy ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryTxt}>Sign In</Text>}
          </Pressable>

          <Pressable onPress={() => router.push("/(auth)/forgot-password" as any)} style={styles.forgotLink}>
            <Text style={styles.forgotTxt}>Forgot your password?</Text>
          </Pressable>

          <Pressable onPress={() => router.replace("/(auth)/register")} style={styles.footerLink} testID="login-to-register">
            <Text style={styles.footerTxt}>
              Don&apos;t have an account? <Text style={{ color: colors.brand, fontWeight: "500" }}>Sign up</Text>
            </Text>
          </Pressable>

          <View style={styles.demoBox}>
            <Text style={styles.demoTitle}>Demo accounts</Text>
            <Text style={styles.demoTxt}>Tenant: tenant@nestfinder.app / Demo123!</Text>
            <Text style={styles.demoTxt}>Landlord: landlord@nestfinder.app / Demo123!</Text>
          </View>
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
  field: { marginBottom: spacing.md },
  label: { fontSize: type.sm, color: colors.textSecondary, marginBottom: spacing.xs },
  input: {
    backgroundColor: colors.surfaceTertiary, borderRadius: radius.md,
    paddingHorizontal: spacing.md, paddingVertical: 14, fontSize: type.lg, color: colors.onSurface,
  },
  err: { color: colors.error, fontSize: type.sm, marginBottom: spacing.sm },
  primary: {
    backgroundColor: colors.brand, borderRadius: radius.md, paddingVertical: 16, alignItems: "center", marginTop: spacing.md,
  },
  primaryTxt: { color: "#fff", fontSize: type.lg, fontWeight: "500" },
  footerLink: { marginTop: spacing.xl, alignItems: "center" },
  footerTxt: { color: colors.textSecondary, fontSize: type.base },
  forgotLink: { alignItems: "center", marginTop: spacing.md },
  forgotTxt: { color: colors.brand, fontSize: type.base, fontWeight: "500" },
  demoBox: {
    marginTop: spacing.xl, padding: spacing.md, backgroundColor: colors.brandTertiary,
    borderRadius: radius.md,
  },
  demoTitle: { fontSize: type.sm, fontWeight: "500", color: colors.onBrandSecondary, marginBottom: spacing.xs },
  demoTxt: { fontSize: type.sm, color: colors.onSurfaceTertiary },
});
