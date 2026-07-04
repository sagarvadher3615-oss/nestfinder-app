import { useEffect, useState, useCallback } from "react";
import { View, Text, StyleSheet, FlatList, Pressable, ActivityIndicator, RefreshControl } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { api, ChatThread } from "@/src/lib/api";
import { colors, spacing, radius, type } from "@/src/lib/theme";

function timeAgo(iso: string) {
  const s = Math.max(1, Math.floor((Date.now() - new Date(iso).getTime()) / 1000));
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)}m`;
  if (s < 86400) return `${Math.floor(s / 3600)}h`;
  return `${Math.floor(s / 86400)}d`;
}

export default function ChatIndex() {
  const router = useRouter();
  const [threads, setThreads] = useState<ChatThread[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      setThreads(await api.get("/chat/threads"));
    } catch (e) { console.warn(e); }
    finally { setLoading(false); setRefreshing(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  return (
    <SafeAreaView style={styles.c} edges={["top"]} testID="chat-index-screen">
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} testID="chat-index-back">
          <Ionicons name="chevron-back" size={24} color={colors.onSurface} />
        </Pressable>
        <Text style={styles.title}>Messages</Text>
        <View style={{ width: 24 }} />
      </View>
      {loading ? (
        <View style={styles.center}><ActivityIndicator color={colors.brand} /></View>
      ) : threads.length === 0 ? (
        <View style={styles.center}>
          <Ionicons name="chatbubbles-outline" size={48} color={colors.borderStrong} />
          <Text style={styles.empty}>No conversations yet</Text>
          <Text style={styles.emptySub}>Message a landlord from a property to start chatting.</Text>
        </View>
      ) : (
        <FlatList
          data={threads}
          keyExtractor={i => i.thread_id}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={colors.brand} />}
          contentContainerStyle={{ paddingHorizontal: spacing.lg }}
          renderItem={({ item }) => (
            <Pressable style={styles.row} onPress={() => router.push(`/chat/${item.thread_id}` as any)} testID={`chat-thread-${item.thread_id}`}>
              <View style={styles.avatar}><Text style={styles.avatarTxt}>{(item.other_name || "?").charAt(0).toUpperCase()}</Text></View>
              <View style={{ flex: 1 }}>
                <View style={styles.rowHead}>
                  <View style={styles.nameRow}>
                    <Text style={styles.name} numberOfLines={1}>{item.other_name}</Text>
                    {item.other_verified && <Ionicons name="shield-checkmark" size={12} color={colors.success} />}
                  </View>
                  <Text style={styles.time}>{timeAgo(item.last_message_at)}</Text>
                </View>
                <Text style={styles.property} numberOfLines={1}>{item.property_title}</Text>
                <Text style={styles.last} numberOfLines={1}>{item.last_message || "Say hello 👋"}</Text>
              </View>
            </Pressable>
          )}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  c: { flex: 1, backgroundColor: colors.surface },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: spacing.lg, paddingVertical: spacing.md },
  title: { fontSize: type.xl, color: colors.onSurface, fontWeight: "500" },
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: spacing.sm, paddingHorizontal: spacing.xl },
  empty: { fontSize: type.lg, color: colors.onSurface, fontWeight: "500", marginTop: spacing.md },
  emptySub: { fontSize: type.base, color: colors.textSecondary, textAlign: "center" },
  row: { flexDirection: "row", gap: spacing.md, paddingVertical: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.border },
  avatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: colors.brandTertiary, alignItems: "center", justifyContent: "center" },
  avatarTxt: { fontSize: 20, color: colors.brand, fontWeight: "500" },
  rowHead: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  nameRow: { flexDirection: "row", alignItems: "center", gap: 4, flex: 1 },
  name: { fontSize: type.base, color: colors.onSurface, fontWeight: "500" },
  time: { fontSize: type.sm, color: colors.textMuted },
  property: { fontSize: type.sm, color: colors.brand, marginTop: 2 },
  last: { fontSize: type.sm, color: colors.textSecondary, marginTop: 2 },
});
