import { useEffect, useState, useRef, useCallback } from "react";
import { View, Text, StyleSheet, FlatList, Pressable, TextInput, KeyboardAvoidingView, Platform, ActivityIndicator } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { api, ChatMessage } from "@/src/lib/api";
import { useAuth } from "@/src/lib/auth";
import { colors, spacing, radius, type } from "@/src/lib/theme";

export default function ChatThreadScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [thread, setThread] = useState<any>(null);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const listRef = useRef<FlatList>(null);

  const fetchMessages = useCallback(async () => {
    try {
      const res = await api.get(`/chat/threads/${id}/messages`);
      setMessages(res.messages || []);
      setThread(res.thread);
    } catch (e) { console.warn(e); }
    finally { setLoading(false); }
  }, [id]);

  useEffect(() => {
    fetchMessages();
    const t = setInterval(fetchMessages, 5000);
    return () => clearInterval(t);
  }, [fetchMessages]);

  useEffect(() => {
    if (messages.length > 0) setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100);
  }, [messages.length]);

  const send = async () => {
    const v = text.trim();
    if (!v || sending) return;
    setSending(true);
    setText("");
    try {
      const msg = await api.post(`/chat/threads/${id}/messages`, { text: v });
      setMessages(prev => [...prev, msg]);
    } catch (e) {
      console.warn(e);
      setText(v);
    } finally { setSending(false); }
  };

  const otherName = thread ? (user?.user_id === thread.tenant_id ? "Landlord" : "Tenant") : "";

  return (
    <SafeAreaView style={styles.c} edges={["top"]} testID="chat-thread-screen">
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} testID="chat-back-btn">
          <Ionicons name="chevron-back" size={24} color={colors.onSurface} />
        </Pressable>
        <View style={{ flex: 1, marginLeft: spacing.sm }}>
          <Text style={styles.title} numberOfLines={1}>{thread?.property_title || "Chat"}</Text>
          <Text style={styles.subtitle}>{otherName}</Text>
        </View>
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }} keyboardVerticalOffset={insets.top}>
        {loading ? (
          <View style={styles.center}><ActivityIndicator color={colors.brand} /></View>
        ) : (
          <FlatList
            ref={listRef}
            data={messages}
            keyExtractor={i => i.message_id}
            contentContainerStyle={{ padding: spacing.md, gap: spacing.sm, flexGrow: 1, justifyContent: messages.length ? "flex-end" : "center" }}
            ListEmptyComponent={<Text style={styles.emptyChat}>Say hello 👋</Text>}
            renderItem={({ item }) => {
              const mine = item.sender_id === user?.user_id;
              return (
                <View style={[styles.bubbleWrap, mine ? styles.mineWrap : styles.theirWrap]} testID={`msg-${item.message_id}`}>
                  <View style={[styles.bubble, mine ? styles.mine : styles.their]}>
                    <Text style={[styles.msgTxt, mine && { color: "#fff" }]}>{item.text}</Text>
                  </View>
                </View>
              );
            }}
          />
        )}
        <View style={[styles.inputRow, { paddingBottom: insets.bottom + 8 }]}>
          <TextInput
            testID="chat-input"
            value={text}
            onChangeText={setText}
            style={styles.input}
            placeholder="Type a message..."
            placeholderTextColor={colors.textMuted}
            multiline
            onSubmitEditing={send}
          />
          <Pressable style={[styles.sendBtn, !text.trim() && { opacity: 0.4 }]} onPress={send} disabled={!text.trim() || sending} testID="chat-send-btn">
            <Ionicons name="send" size={18} color="#fff" />
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  c: { flex: 1, backgroundColor: colors.surface },
  header: { flexDirection: "row", alignItems: "center", paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderBottomWidth: 1, borderBottomColor: colors.border },
  title: { fontSize: type.lg, color: colors.onSurface, fontWeight: "500" },
  subtitle: { fontSize: type.sm, color: colors.textSecondary },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  emptyChat: { textAlign: "center", color: colors.textMuted, fontSize: type.base },
  bubbleWrap: { flexDirection: "row" },
  mineWrap: { justifyContent: "flex-end" },
  theirWrap: { justifyContent: "flex-start" },
  bubble: { maxWidth: "78%", paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: radius.lg },
  mine: { backgroundColor: colors.brand, borderBottomRightRadius: 4 },
  their: { backgroundColor: colors.surfaceTertiary, borderBottomLeftRadius: 4 },
  msgTxt: { fontSize: type.base, color: colors.onSurface, lineHeight: 20 },
  inputRow: { flexDirection: "row", alignItems: "flex-end", gap: spacing.sm, paddingHorizontal: spacing.md, paddingTop: spacing.sm, borderTopWidth: 1, borderTopColor: colors.border, backgroundColor: colors.surface },
  input: { flex: 1, backgroundColor: colors.surfaceTertiary, borderRadius: radius.lg, paddingHorizontal: spacing.md, paddingVertical: 10, fontSize: type.base, color: colors.onSurface, maxHeight: 120 },
  sendBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.brand, alignItems: "center", justifyContent: "center" },
});
