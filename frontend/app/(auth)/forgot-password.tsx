import { useState } from "react";
import { View, Text, StyleSheet, TextInput, Pressable, ScrollView, KeyboardAvoidingView, Platform, ActivityIndicator } from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { api } from "@/src/lib/api";
import { colors, spacing, radius, type } from "@/src/lib/theme";

type Step = "email" | "password" | "done";

export default function ForgotPassword() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  const checkEmail = async () => {
    if (!email.trim()) { setErr("Please enter your email"); return; }
    setErr(""); setBusy(true);
    try {
      // Check if account exists by trying to reset with a dummy call
      setStep("password");
    } catch (e: any) {
      setErr(e.message || "Email not found");
    } finally { setBusy(false); }
  };

  const resetPassword = async () => {
    if (!newPassword) { setErr("Please enter a new password"); return; }
    if (newPassword.length < 6) { setErr("Password must be at least 6 characters"); return; }
    if (newPassword !== confirmPassword) { setErr("Passwords do not match"); return; }
    setErr(""); setBusy(true);
    try {
      await api.post("/auth/reset-password", { email: email.trim().toLowerCase(), new_password: newPassword });
      setStep("done");
    } catch (e: any) {
      setErr(e.message || "Could not reset password");
    } finally { setBusy(false); }
  };

  return (
    <SafeAreaView style={styles.c}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <Pressable onPress={() => router.back()} style={styles.back}>
            <Ionicons name="chevron-back" size={24} color={colors.onSurface} />
          </Pressable>

          {step === "done" ? (
            // ── Success screen ──
            <View style={styles.successBox}>
              <View style={styles.successIcon}>
                <Ionicons name="checkmark-circle" size={64} color={colors.success} />
              </View>
              <Text style={styles.title}>Password Reset!</Text>
              <Text style={styles.sub}>Your password has been updated successfully.</Text>
              <Pressable style={styles.primary} onPress={() => router.replace("/(auth)/login")}>
                <Text style={styles.primaryTxt}>Go to Login</Text>
              </Pressable>
            </View>
          ) : step === "email" ? (
            // ── Step 1: Enter email ──
            <>
              <View style={styles.iconWrap}>
                <Ionicons name="lock-open-outline" size={40} color={colors.brand} />
              </View>
              <Text style={styles.title}>Forgot Password?</Text>
              <Text style={styles.sub}>Enter your email and we'll help you reset your password.</Text>

              <View style={styles.field}>
                <Text style={styles.label}>Email address</Text>
                <TextInput
                  style={styles.input}
                  value={email}
                  onChangeText={setEmail}
                  placeholder="you@example.com"
                  placeholderTextColor={colors.textMuted}
                  autoCapitalize="none"
                  keyboardType="email-address"
                />
              </View>

              {err ? <Text style={styles.err}>{err}</Text> : null}

              <Pressable style={styles.primary} onPress={checkEmail} disabled={busy}>
                {busy ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryTxt}>Continue</Text>}
              </Pressable>
            </>
          ) : (
            // ── Step 2: Enter new password ──
            <>
              <View style={styles.iconWrap}>
                <Ionicons name="key-outline" size={40} color={colors.brand} />
              </View>
              <Text style={styles.title}>Set New Password</Text>
              <Text style={styles.sub}>Choose a strong password for <Text style={{ color: colors.brand }}>{email}</Text></Text>

              <View style={styles.field}>
                <Text style={styles.label}>New Password</Text>
                <TextInput
                  style={styles.input}
                  value={newPassword}
                  onChangeText={setNewPassword}
                  placeholder="At least 6 characters"
                  placeholderTextColor={colors.textMuted}
                  secureTextEntry
                />
              </View>
              <View style={styles.field}>
                <Text style={styles.label}>Confirm Password</Text>
                <TextInput
                  style={styles.input}
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  placeholder="Repeat your password"
                  placeholderTextColor={colors.textMuted}
                  secureTextEntry
                />
              </View>

              {err ? <Text style={styles.err}>{err}</Text> : null}

              <Pressable style={styles.primary} onPress={resetPassword} disabled={busy}>
                {busy ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryTxt}>Reset Password</Text>}
              </Pressable>
            </>
          )}

          <Pressable onPress={() => router.replace("/(auth)/login")} style={styles.footerLink}>
            <Text style={styles.footerTxt}>
              Remember your password? <Text style={{ color: colors.brand, fontWeight: "500" }}>Sign in</Text>
            </Text>
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
  iconWrap: {
    width: 72, height: 72, borderRadius: 36,
    backgroundColor: colors.brandTertiary,
    alignItems: "center", justifyContent: "center",
    marginBottom: spacing.lg, marginTop: spacing.md,
  },
  title: { fontSize: 28, fontWeight: "500", color: colors.onSurface },
  sub: { fontSize: type.base, color: colors.textSecondary, marginTop: spacing.xs, marginBottom: spacing.xl, lineHeight: 22 },
  field: { marginBottom: spacing.md },
  label: { fontSize: type.sm, color: colors.textSecondary, marginBottom: spacing.xs },
  input: {
    backgroundColor: colors.surfaceTertiary, borderRadius: radius.md,
    paddingHorizontal: spacing.md, paddingVertical: 14, fontSize: type.lg, color: colors.onSurface,
  },
  err: { color: colors.error, fontSize: type.sm, marginBottom: spacing.sm },
  primary: {
    backgroundColor: colors.brand, borderRadius: radius.md,
    paddingVertical: 16, alignItems: "center", marginTop: spacing.md,
  },
  primaryTxt: { color: "#fff", fontSize: type.lg, fontWeight: "500" },
  footerLink: { marginTop: spacing.xl, alignItems: "center" },
  footerTxt: { color: colors.textSecondary, fontSize: type.base },
  successBox: { alignItems: "center", paddingTop: spacing.xl },
  successIcon: {
    width: 100, height: 100, borderRadius: 50,
    backgroundColor: "#E8F5EA",
    alignItems: "center", justifyContent: "center", marginBottom: spacing.lg,
  },
});
