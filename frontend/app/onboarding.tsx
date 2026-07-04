import { View, Text, StyleSheet, Pressable, Dimensions } from "react-native";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { colors, spacing, radius, type } from "@/src/lib/theme";

const HERO = "https://images.pexels.com/photos/18153132/pexels-photo-18153132.jpeg?w=1200";

export default function Onboarding() {
  const router = useRouter();
  return (
    <View style={styles.c} testID="onboarding-screen">
      <Image source={HERO} style={StyleSheet.absoluteFillObject} contentFit="cover" />
      <LinearGradient
        colors={["transparent", "rgba(18,20,18,0.4)", "rgba(18,20,18,0.95)"]}
        locations={[0, 0.4, 1]}
        style={StyleSheet.absoluteFillObject}
      />
      <SafeAreaView style={styles.overlay}>
        <View style={styles.top}>
          <Text style={styles.logo}>NestFinder</Text>
        </View>
        <View style={styles.bottom}>
          <Text style={styles.title}>Rent smarter.{"\n"}Skip the broker.</Text>
          <Text style={styles.sub}>
            Verified monthly rentals directly from landlords. No commissions, no fake listings.
          </Text>
          <Pressable
            testID="onboarding-signup-btn"
            style={styles.primaryBtn}
            onPress={() => router.push("/(auth)/register")}
          >
            <Text style={styles.primaryTxt}>Get Started</Text>
          </Pressable>
          <Pressable
            testID="onboarding-login-btn"
            style={styles.secondaryBtn}
            onPress={() => router.push("/(auth)/login")}
          >
            <Text style={styles.secondaryTxt}>I already have an account</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  c: { flex: 1, backgroundColor: colors.surfaceInverse },
  overlay: { flex: 1, justifyContent: "space-between", paddingHorizontal: spacing.lg },
  top: { paddingTop: spacing.md },
  logo: { color: "#fff", fontSize: type.xl, fontWeight: "500", letterSpacing: 0.5 },
  bottom: { paddingBottom: spacing.lg, gap: spacing.md },
  title: { color: "#fff", fontSize: 34, lineHeight: 40, fontWeight: "500" },
  sub: { color: "rgba(255,255,255,0.85)", fontSize: type.lg, lineHeight: 22, marginBottom: spacing.md },
  primaryBtn: {
    backgroundColor: colors.brand, paddingVertical: 16, borderRadius: radius.md, alignItems: "center",
  },
  primaryTxt: { color: colors.onSurfaceInverse, fontSize: type.lg, fontWeight: "500" },
  secondaryBtn: { paddingVertical: 14, alignItems: "center" },
  secondaryTxt: { color: "#fff", fontSize: type.base, textDecorationLine: "underline" },
});
