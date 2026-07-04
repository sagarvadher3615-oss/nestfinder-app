import { useEffect, useMemo, useState } from "react";
import { View, Text, StyleSheet, Pressable, Platform } from "react-native";
import { WebView, WebViewMessageEvent } from "react-native-webview";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { pickedLocation } from "@/src/lib/picked-location";
import { colors, spacing, radius, type } from "@/src/lib/theme";

function buildHtml(initLat: number, initLng: number, hasInit: boolean) {
  return `<!DOCTYPE html>
<html><head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no"/>
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/>
<style>
  html,body,#map{margin:0;padding:0;height:100%;width:100%;background:#eef2ec;}
  .hint{position:absolute;top:12px;left:12px;right:12px;background:rgba(18,20,18,0.85);color:#fff;padding:10px 14px;border-radius:12px;font:500 13px -apple-system,Roboto,sans-serif;text-align:center;z-index:1000;box-shadow:0 2px 8px rgba(0,0,0,0.25);}
</style>
</head><body>
<div id="map"></div>
<div class="hint" id="hint">Tap on the map to drop a pin</div>
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
<script>
  var start = [${initLat}, ${initLng}];
  var map = L.map('map').setView(start, ${hasInit ? 14 : 5});
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '&copy; OSM', maxZoom: 19 }).addTo(map);
  var marker = null;
  ${hasInit ? "marker = L.marker(start, {draggable:true}).addTo(map); marker.on('dragend', function(e){post(e.target.getLatLng());}); post({lat: start[0], lng: start[1]});" : ""}
  map.on('click', function(e){
    if (marker) { marker.setLatLng(e.latlng); }
    else { marker = L.marker(e.latlng, {draggable:true}).addTo(map); marker.on('dragend', function(ev){post(ev.target.getLatLng());}); }
    document.getElementById('hint').innerText = 'Pin placed · drag to fine-tune';
    post(e.latlng);
  });
  function post(latlng){
    var payload = JSON.stringify({type:'pick', lat: latlng.lat, lng: latlng.lng});
    if (window.ReactNativeWebView) window.ReactNativeWebView.postMessage(payload);
    else window.parent && window.parent.postMessage(payload, '*');
  }
</script>
</body></html>`;
}

export default function PickLocation() {
  const router = useRouter();
  const params = useLocalSearchParams<{ lat?: string; lng?: string }>();
  const [coord, setCoord] = useState<{ lat: number; lng: number } | null>(() => {
    if (params.lat && params.lng) return { lat: parseFloat(params.lat), lng: parseFloat(params.lng) };
    return null;
  });

  const initLat = coord?.lat ?? 20.5937;
  const initLng = coord?.lng ?? 78.9629;  // India centroid
  const html = useMemo(() => buildHtml(initLat, initLng, !!coord), [initLat, initLng, !!coord]);

  const onMessage = (evt: WebViewMessageEvent | MessageEvent) => {
    try {
      const raw = (evt as any).nativeEvent ? (evt as WebViewMessageEvent).nativeEvent.data : (evt as MessageEvent).data;
      const data = JSON.parse(raw);
      if (data.type === "pick") setCoord({ lat: data.lat, lng: data.lng });
    } catch { /* ignore */ }
  };

  useEffect(() => {
    if (Platform.OS !== "web") return;
    const listener = (e: MessageEvent) => onMessage(e);
    window.addEventListener("message", listener);
    return () => window.removeEventListener("message", listener);
  }, []);

  const confirm = () => {
    if (!coord) return;
    pickedLocation.set(coord);
    router.back();
  };

  const clear = () => {
    pickedLocation.set(null);
    setCoord(null);
    router.back();
  };

  return (
    <SafeAreaView style={styles.c} edges={["top"]} testID="pick-location-screen">
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} testID="pick-loc-back">
          <Ionicons name="close" size={24} color={colors.onSurface} />
        </Pressable>
        <Text style={styles.title}>Pick location</Text>
        <View style={{ width: 24 }} />
      </View>

      {Platform.OS === "web" ? (
        <iframe srcDoc={html} style={{ flex: 1, border: 0, width: "100%", height: "100%" } as any} />
      ) : (
        <WebView originWhitelist={["*"]} source={{ html }} onMessage={onMessage} style={{ flex: 1 }} />
      )}

      <View style={styles.footer}>
        {coord ? (
          <View style={styles.coordBox}>
            <Ionicons name="location" size={14} color={colors.brand} />
            <Text style={styles.coordTxt}>{coord.lat.toFixed(5)}, {coord.lng.toFixed(5)}</Text>
          </View>
        ) : (
          <Text style={styles.helperTxt}>Tap anywhere on the map to place a pin</Text>
        )}
        <View style={styles.actions}>
          {coord && (
            <Pressable style={styles.clearBtn} onPress={clear} testID="pick-loc-clear">
              <Text style={styles.clearTxt}>Remove</Text>
            </Pressable>
          )}
          <Pressable
            style={[styles.confirmBtn, !coord && { opacity: 0.4 }]}
            onPress={confirm}
            disabled={!coord}
            testID="pick-loc-confirm"
          >
            <Text style={styles.confirmTxt}>Use this location</Text>
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  c: { flex: 1, backgroundColor: colors.surface },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: spacing.lg, paddingVertical: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.border },
  title: { fontSize: type.xl, color: colors.onSurface, fontWeight: "500" },
  footer: { padding: spacing.lg, gap: spacing.md, borderTopWidth: 1, borderTopColor: colors.border, backgroundColor: colors.surface },
  coordBox: { flexDirection: "row", alignItems: "center", gap: 6, alignSelf: "flex-start", backgroundColor: colors.brandTertiary, paddingHorizontal: spacing.md, paddingVertical: 6, borderRadius: radius.pill },
  coordTxt: { fontSize: type.sm, color: colors.brand, fontWeight: "500" },
  helperTxt: { fontSize: type.sm, color: colors.textSecondary, textAlign: "center" },
  actions: { flexDirection: "row", gap: spacing.sm },
  clearBtn: { paddingHorizontal: spacing.lg, paddingVertical: 12, borderRadius: radius.md, backgroundColor: colors.surfaceTertiary, alignItems: "center", justifyContent: "center" },
  clearTxt: { color: colors.onSurface, fontSize: type.base, fontWeight: "500" },
  confirmBtn: { flex: 1, backgroundColor: colors.brand, paddingVertical: 14, borderRadius: radius.md, alignItems: "center" },
  confirmTxt: { color: "#fff", fontSize: type.lg, fontWeight: "500" },
});
