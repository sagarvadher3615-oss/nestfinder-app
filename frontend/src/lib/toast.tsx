import React, { createContext, useContext, useRef, useState, useCallback } from "react";
import { View, Text, StyleSheet, Animated, Platform } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors, spacing, radius, type } from "./theme";

type ToastKind = "success" | "error" | "info";
type ToastItem = { id: number; message: string; kind: ToastKind };

const Ctx = createContext<{ show: (m: string, k?: ToastKind) => void }>({ show: () => {} });

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const insets = useSafeAreaInsets();
  const idRef = useRef(0);
  const anims = useRef<Record<number, Animated.Value>>({}).current;

  const show = useCallback((message: string, kind: ToastKind = "info") => {
    const id = ++idRef.current;
    const v = new Animated.Value(0);
    anims[id] = v;
    setItems(prev => [...prev, { id, message, kind }]);
    Animated.timing(v, { toValue: 1, duration: 220, useNativeDriver: Platform.OS !== "web" }).start();
    setTimeout(() => {
      Animated.timing(v, { toValue: 0, duration: 200, useNativeDriver: Platform.OS !== "web" }).start(() => {
        setItems(prev => prev.filter(i => i.id !== id));
        delete anims[id];
      });
    }, 2600);
  }, [anims]);

  const iconFor = (k: ToastKind) => k === "success" ? "checkmark-circle" : k === "error" ? "close-circle" : "information-circle";
  const bgFor = (k: ToastKind) => k === "success" ? colors.success : k === "error" ? colors.error : colors.brand;

  return (
    <Ctx.Provider value={{ show }}>
      {children}
      <View pointerEvents="box-none" style={[styles.wrap, { top: insets.top + 12 }]}>
        {items.map(it => (
          <Animated.View
            key={it.id}
            style={[
              styles.toast,
              { backgroundColor: bgFor(it.kind), opacity: anims[it.id], transform: [{ translateY: anims[it.id]?.interpolate({ inputRange: [0, 1], outputRange: [-20, 0] }) || 0 }] },
            ]}
            testID={`toast-${it.kind}`}
          >
            <Ionicons name={iconFor(it.kind)} size={18} color="#fff" />
            <Text style={styles.txt} numberOfLines={2}>{it.message}</Text>
          </Animated.View>
        ))}
      </View>
    </Ctx.Provider>
  );
}

export const useToast = () => useContext(Ctx);

const styles = StyleSheet.create({
  wrap: { position: "absolute", left: 0, right: 0, alignItems: "center", zIndex: 9999, gap: 8, paddingHorizontal: spacing.lg },
  toast: {
    flexDirection: "row", alignItems: "center", gap: spacing.sm,
    paddingHorizontal: spacing.md, paddingVertical: 12, borderRadius: radius.md,
    maxWidth: 400, minWidth: 240,
    shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 8, elevation: 4,
  },
  txt: { color: "#fff", fontSize: type.base, flex: 1 },
});
