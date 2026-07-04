import { useEffect, useState, useRef } from "react";
import { View, Text, StyleSheet, Pressable, ActivityIndicator, Platform } from "react-native";
import { WebView, WebViewMessageEvent } from "react-native-webview";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { api, Property } from "@/src/lib/api";
import { colors, spacing, radius, type } from "@/src/lib/theme";

function buildHtml(props: Property[]) {
  const pts = props
    .filter(p => typeof p.lat === "number" && typeof p.lng === "number")
    .map(p => ({
      id: p.property_id,
      lat: p.lat,
      lng: p.lng,
      title: p.title.replace(/'/g, "\\'"),
      loc: p.location.replace(/'/g, "\\'"),
      price: p.price,
      status: p.status,
    }));
  const json = JSON.stringify(pts);
  return `<!DOCTYPE html>
<html><head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no"/>
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/>
<style>
  html,body,#map{margin:0;padding:0;height:100%;width:100%;background:#eef2ec;}
  .price-pin{background:#5C715E;color:#fff;padding:5px 10px;border-radius:16px;font:600 12px -apple-system,Roboto,sans-serif;box-shadow:0 2px 6px rgba(0,0,0,0.25);white-space:nowrap;border:2px solid #fff;}
  .price-pin.rented{background:#A85751;}
  .price-pin.owned{background:#4A544C;}
  .leaflet-popup-content-wrapper{border-radius:12px;}
  .leaflet-popup-content{margin:10px 12px;font:400 13px -apple-system,Roboto,sans-serif;}
  .popup-title{font-weight:600;margin-bottom:2px;color:#121412;}
  .popup-loc{color:#4A544C;font-size:11px;margin-bottom:4px;}
  .popup-price{color:#5C715E;font-weight:600;}
  .popup-btn{display:inline-block;margin-top:6px;background:#5C715E;color:#fff;padding:6px 12px;border-radius:8px;text-decoration:none;font-weight:500;}
</style>
</head><body>
<div id="map"></div>
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
<script>
  var pts = ${json};
  var map = L.map('map', { zoomControl: true }).setView([12.9716, 77.5946], 11);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; OSM', maxZoom: 19
  }).addTo(map);
  var group = [];
  pts.forEach(function(p){
    var icon = L.divIcon({
      className: '',
      html: '<div class="price-pin ' + p.status + '">₹' + (p.price/1000).toFixed(0) + 'k</div>',
      iconSize: [50, 26], iconAnchor: [25, 13]
    });
    var m = L.marker([p.lat, p.lng], { icon: icon }).addTo(map);
    m.bindPopup(
      '<div class="popup-title">' + p.title + '</div>' +
      '<div class="popup-loc">' + p.loc + '</div>' +
      '<div class="popup-price">₹' + p.price.toLocaleString('en-IN') + '/mo</div>' +
      '<a class="popup-btn" href="#" onclick="return sendMsg(\\''+p.id+'\\')">View →</a>'
    );
    group.push(m);
  });
  if (group.length) {
    var fg = L.featureGroup(group);
    map.fitBounds(fg.getBounds().pad(0.2));
  }
  function sendMsg(id){
    if (window.ReactNativeWebView) window.ReactNativeWebView.postMessage(JSON.stringify({type:'open',id:id}));
    else window.parent && window.parent.postMessage(JSON.stringify({type:'open',id:id}),'*');
    return false;
  }
</script>
</body></html>`;
}

export default function MapScreen() {
  const router = useRouter();
  const [props, setProps] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const data = await api.get("/properties?limit=100");
        setProps(data);
      } catch (e) { console.warn(e); }
      finally { setLoading(false); }
    })();
  }, []);

  const html = buildHtml(props);

  const onMessage = (e: WebViewMessageEvent | MessageEvent) => {
    try {
      const raw = (e as any).nativeEvent ? (e as WebViewMessageEvent).nativeEvent.data : (e as MessageEvent).data;
      const data = JSON.parse(raw);
      if (data.type === "open" && data.id) router.push(`/property/${data.id}` as any);
    } catch { /* ignore */ }
  };

  // On web, use an iframe with srcDoc
  useEffect(() => {
    if (Platform.OS !== "web") return;
    const listener = (e: MessageEvent) => onMessage(e);
    window.addEventListener("message", listener);
    return () => window.removeEventListener("message", listener);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [html]);

  return (
    <SafeAreaView style={styles.c} edges={["top"]} testID="map-screen">
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} testID="map-back-btn">
          <Ionicons name="chevron-back" size={24} color={colors.onSurface} />
        </Pressable>
        <Text style={styles.title}>Map View</Text>
        <View style={styles.countBadge}>
          <Text style={styles.countTxt}>{props.filter(p => p.lat && p.lng).length}</Text>
        </View>
      </View>
      {loading ? (
        <View style={styles.center}><ActivityIndicator color={colors.brand} /></View>
      ) : Platform.OS === "web" ? (
        <iframe
          srcDoc={html}
          style={{ flex: 1, border: 0, width: "100%", height: "100%" } as any}
          testID="map-iframe"
        />
      ) : (
        <WebView
          originWhitelist={["*"]}
          source={{ html }}
          onMessage={onMessage}
          style={{ flex: 1 }}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  c: { flex: 1, backgroundColor: colors.surface },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: spacing.lg, paddingVertical: spacing.md },
  title: { fontSize: type.xl, color: colors.onSurface, fontWeight: "500" },
  countBadge: { backgroundColor: colors.brandTertiary, paddingHorizontal: spacing.sm, paddingVertical: 2, borderRadius: radius.pill, minWidth: 30, alignItems: "center" },
  countTxt: { color: colors.brand, fontSize: type.sm, fontWeight: "500" },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
});
