import { useEffect, useRef } from "react";
import { View, Text, StyleSheet, Animated, Easing } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useAuth } from "@/src/lib/auth";
import { colors } from "@/src/lib/theme";

export default function Index() {
  const router = useRouter();
  const { user, loading } = useAuth();

  const scale = useRef(new Animated.Value(0.85)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const dotOpacity = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(scale, { toValue: 1, duration: 620, easing: Easing.out(Easing.back(1.4)), useNativeDriver: true }),
      Animated.timing(opacity, { toValue: 1, duration: 500, useNativeDriver: true }),
    ]).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(dotOpacity, { toValue: 1, duration: 700, useNativeDriver: true }),
        Animated.timing(dotOpacity, { toValue: 0.3, duration: 700, useNativeDriver: true }),
      ])
    ).start();
  }, [dotOpacity, opacity, scale]);

  useEffect(() => {
    if (loading) return;
    // small delay so the splash animation is visible
    const t = setTimeout(() => {
      if (user) router.replace("/(tabs)");
      else router.replace("/onboarding");
    }, 600);
    return () => clearTimeout(t);
  }, [loading, user, router]);

  return (
    <View style={styles.c} testID="splash-screen">
      <LinearGradient
        colors={["#5C715E", "#2C3B30"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFillObject}
      />
      <Animated.View style={[styles.logoWrap, { transform: [{ scale }], opacity }]}>
        <View style={styles.logoBox}>
          <Ionicons name="home" size={44} color="#5C715E" />
          <View style={styles.dotAccent} />
        </View>
        <Text style={styles.brand}>NestFinder</Text>
        <Text style={styles.tagline}>Rent smarter · Skip the broker</Text>
      </Animated.View>

      <Animated.View style={[styles.loader, { opacity: dotOpacity }]}>
        <View style={styles.dot} />
        <View style={styles.dot} />
        <View style={styles.dot} />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  c: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.brand },
  logoWrap: { alignItems: "center", gap: 16 },
  logoBox: {
    width: 96, height: 96, borderRadius: 24, backgroundColor: "#FAFAFA",
    alignItems: "center", justifyContent: "center", position: "relative",
    shadowColor: "#000", shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.25, shadowRadius: 16,
    elevation: 6,
  },
  dotAccent: {
    position: "absolute", top: 14, right: 14, width: 10, height: 10, borderRadius: 5,
    backgroundColor: "#C28E3A",
  },
  brand: { fontSize: 34, color: "#FFFFFF", fontWeight: "500", letterSpacing: 0.5, marginTop: 4 },
  tagline: { fontSize: 13, color: "rgba(255,255,255,0.75)", letterSpacing: 0.3 },
  loader: { position: "absolute", bottom: 80, flexDirection: "row", gap: 8 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: "#FAFAFA" },
});
