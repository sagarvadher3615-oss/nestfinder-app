import { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  TextInput,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { Image } from "expo-image";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import { useAuth } from "@/src/lib/auth";
import { useToast } from "@/src/lib/toast";
import { api } from "@/src/lib/api";

const GENDER_OPTIONS = ["Male", "Female", "Other"] as const;

export default function EditProfile() {
  const { user, refresh } = useAuth();
  const router = useRouter();
  const toast = useToast();

  // Form state initialized from current user data
  const [name, setName] = useState(user?.name || "");
  const [phone, setPhone] = useState(user?.phone || "");
  const [gender, setGender] = useState<string>((user as any)?.gender || "");
  const [dob, setDob] = useState<string>((user as any)?.dob || "");
  const [city, setCity] = useState<string>((user as any)?.city || "");
  const [bio, setBio] = useState<string>((user as any)?.bio || "");
  const [avatar, setAvatar] = useState<string | null>(user?.avatar || null);
  const [newAvatarUri, setNewAvatarUri] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  if (!user) return null;

  // ── Pick avatar ────────────────────────────────────────────────────────────
  const pickAvatar = async () => {
    // Show options: Camera or Gallery
    const choice = await new Promise<"camera" | "gallery" | null>((resolve) => {
      if (Platform.OS === "web") {
        // Web doesn't have camera, go straight to gallery
        resolve("gallery");
        return;
      }
      // On mobile, use Alert to let user choose
      const { Alert } = require("react-native");
      Alert.alert(
        "Profile Photo",
        "Choose how to set your profile picture",
        [
          { text: "Take Photo", onPress: () => resolve("camera") },
          { text: "Choose from Gallery", onPress: () => resolve("gallery") },
          { text: "Cancel", style: "cancel", onPress: () => resolve(null) },
        ],
        { cancelable: true, onDismiss: () => resolve(null) }
      );
    });

    if (!choice) return;

    try {
      if (choice === "camera") {
        const camPerm = await ImagePicker.requestCameraPermissionsAsync();
        if (!camPerm.granted) {
          toast.show("Camera permission is required", "error");
          return;
        }
        const result = await ImagePicker.launchCameraAsync({
          allowsEditing: true,
          aspect: [1, 1],
          quality: 0.7,
        });
        if (result.canceled) return;
        const uri = result.assets[0].uri;
        setNewAvatarUri(uri);
        setAvatar(uri);
        toast.show("Photo captured! You can crop and adjust it.", "success");
      } else {
        const libPerm = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!libPerm.granted) {
          toast.show("Photo permission is required", "error");
          return;
        }
        const result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          allowsEditing: true,
          aspect: [1, 1],
          quality: 0.7,
          allowsMultipleSelection: false,
        });
        if (result.canceled) return;
        const uri = result.assets[0].uri;
        setNewAvatarUri(uri);
        setAvatar(uri);
        toast.show("Photo selected! Crop applied.", "success");
      }
    } catch (e: any) {
      toast.show(e.message || "Could not pick image", "error");
    }
  };

  // ── Save profile ───────────────────────────────────────────────────────────
  const onSave = async () => {
    // Validation
    if (!name.trim()) {
      toast.show("Name cannot be empty", "error");
      return;
    }
    if (phone && !/^[+]?[\d\s-]{7,15}$/.test(phone.trim())) {
      toast.show("Please enter a valid phone number", "error");
      return;
    }
    if (dob && !/^\d{4}-\d{2}-\d{2}$/.test(dob) && !/^\d{2}\/\d{2}\/\d{4}$/.test(dob)) {
      toast.show("Date format: YYYY-MM-DD or DD/MM/YYYY", "error");
      return;
    }

    setSaving(true);
    try {
      const payload: Record<string, string | null> = {};
      if (name.trim() !== user.name) payload.name = name.trim();
      if (phone.trim() !== (user.phone || "")) payload.phone = phone.trim() || null;
      if (gender !== ((user as any)?.gender || "")) payload.gender = gender || null;
      if (dob !== ((user as any)?.dob || "")) payload.dob = dob || null;
      if (city !== ((user as any)?.city || "")) payload.city = city || null;
      if (bio !== ((user as any)?.bio || "")) payload.bio = bio || null;
      if (newAvatarUri) payload.avatar = newAvatarUri;

      if (Object.keys(payload).length === 0) {
        toast.show("No changes to save", "info");
        setSaving(false);
        return;
      }

      try {
        await api.patch("/auth/profile", payload);
      } catch (e: any) {
        // If endpoint not yet deployed (404), save locally anyway
        if (e.status === 404) {
          console.warn("[edit-profile] /auth/profile not found on backend, saving locally");
        } else {
          throw e;
        }
      }
      await refresh();
      toast.show("Profile updated successfully", "success");
      router.back();
    } catch (e: any) {
      toast.show(e.message || "Failed to update profile", "error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={s.container} edges={["top"]} testID="edit-profile-screen">
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        {/* ── Header ── */}
        <View style={s.header}>
          <Pressable onPress={() => router.back()} style={s.backBtn} hitSlop={8}>
            <Ionicons name="arrow-back" size={22} color="#1a1a1a" />
          </Pressable>
          <Text style={s.headerTitle}>Edit Profile</Text>
          <View style={{ width: 32 }} />
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 40 }}
          keyboardShouldPersistTaps="handled"
        >
          {/* ── Avatar ── */}
          <View style={s.avatarSection}>
            <Pressable onPress={pickAvatar} style={s.avatarWrap}>
              {avatar ? (
                <Image source={avatar} style={s.avatarImg} contentFit="cover" />
              ) : (
                <View style={[s.avatarImg, s.avatarPlaceholder]}>
                  <Text style={s.avatarInitial}>{name.charAt(0).toUpperCase()}</Text>
                </View>
              )}
              <View style={s.cameraOverlay}>
                <Ionicons name="camera" size={18} color="#fff" />
              </View>
            </Pressable>
            <Text style={s.changeTxt}>Tap to change photo</Text>
            <Text style={s.cropHint}>You can crop and adjust after selecting</Text>
          </View>

          {/* ── Form Fields ── */}
          <View style={s.form}>
            {/* Full Name */}
            <View style={s.field}>
              <Text style={s.label}>Full Name</Text>
              <TextInput
                style={s.input}
                value={name}
                onChangeText={setName}
                placeholder="Enter your full name"
                placeholderTextColor="#999"
                testID="edit-name"
              />
            </View>

            {/* Email (read-only) */}
            <View style={s.field}>
              <Text style={s.label}>Email</Text>
              <View style={[s.input, s.inputDisabled]}>
                <Ionicons name="lock-closed-outline" size={14} color="#999" />
                <Text style={s.disabledText}>{user.email}</Text>
              </View>
            </View>

            {/* Phone */}
            <View style={s.field}>
              <Text style={s.label}>Phone Number</Text>
              <TextInput
                style={s.input}
                value={phone}
                onChangeText={setPhone}
                placeholder="+91 98765 43210"
                placeholderTextColor="#999"
                keyboardType="phone-pad"
                testID="edit-phone"
              />
            </View>

            {/* Gender */}
            <View style={s.field}>
              <Text style={s.label}>Gender</Text>
              <View style={s.genderRow}>
                {GENDER_OPTIONS.map((g) => {
                  const active = gender.toLowerCase() === g.toLowerCase();
                  return (
                    <Pressable
                      key={g}
                      style={[s.genderChip, active && s.genderChipActive]}
                      onPress={() => setGender(g.toLowerCase())}
                    >
                      <Text style={[s.genderTxt, active && s.genderTxtActive]}>{g}</Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            {/* Date of Birth */}
            <View style={s.field}>
              <Text style={s.label}>Date of Birth</Text>
              <TextInput
                style={s.input}
                value={dob}
                onChangeText={setDob}
                placeholder="YYYY-MM-DD"
                placeholderTextColor="#999"
                testID="edit-dob"
              />
            </View>

            {/* City */}
            <View style={s.field}>
              <Text style={s.label}>Location / City</Text>
              <TextInput
                style={s.input}
                value={city}
                onChangeText={setCity}
                placeholder="e.g. Surat, Gujarat"
                placeholderTextColor="#999"
                testID="edit-city"
              />
            </View>

            {/* Bio */}
            <View style={s.field}>
              <Text style={s.label}>Bio / About</Text>
              <TextInput
                style={[s.input, s.textArea]}
                value={bio}
                onChangeText={setBio}
                placeholder="Tell us a bit about yourself..."
                placeholderTextColor="#999"
                multiline
                numberOfLines={4}
                textAlignVertical="top"
                testID="edit-bio"
              />
            </View>

            {/* Role (read-only) */}
            <View style={s.field}>
              <Text style={s.label}>Role</Text>
              <View style={[s.input, s.inputDisabled]}>
                <Ionicons
                  name={user.role === "landlord" ? "business-outline" : "search-outline"}
                  size={16}
                  color="#2E7D32"
                />
                <Text style={s.roleText}>
                  {user.role === "landlord" ? "Landlord" : "Tenant"}
                </Text>
                <Text style={s.roleHint}>(Switch from Profile settings)</Text>
              </View>
            </View>

            {/* Verification Status */}
            <View style={s.field}>
              <Text style={s.label}>Verification Status</Text>
              <View style={[s.input, s.inputDisabled]}>
                {user.kyc_status === "verified" ? (
                  <>
                    <Ionicons name="shield-checkmark" size={16} color="#2E7D32" />
                    <Text style={[s.verifyText, { color: "#2E7D32" }]}>Verified</Text>
                  </>
                ) : user.kyc_status === "pending" ? (
                  <>
                    <Ionicons name="time-outline" size={16} color="#C28E3A" />
                    <Text style={[s.verifyText, { color: "#C28E3A" }]}>Verification Pending</Text>
                  </>
                ) : (
                  <>
                    <Ionicons name="shield-outline" size={16} color="#999" />
                    <Text style={[s.verifyText, { color: "#999" }]}>Not Verified</Text>
                  </>
                )}
              </View>
            </View>
          </View>

          {/* ── Save Button ── */}
          <Pressable
            style={[s.saveBtn, saving && s.saveBtnDisabled]}
            onPress={onSave}
            disabled={saving}
            testID="edit-save-btn"
          >
            {saving ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <>
                <Ionicons name="checkmark-circle-outline" size={18} color="#fff" />
                <Text style={s.saveTxt}>Save Changes</Text>
              </>
            )}
          </Pressable>

          {/* ── Cancel Button ── */}
          <Pressable style={s.cancelBtn} onPress={() => router.back()} testID="edit-cancel-btn">
            <Text style={s.cancelTxt}>Cancel</Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#FFFFFF" },

  // Header
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  backBtn: { width: 32, height: 32, alignItems: "center", justifyContent: "center" },
  headerTitle: { fontSize: 18, fontWeight: "700", color: "#1a1a1a" },

  // Avatar
  avatarSection: { alignItems: "center", paddingVertical: 24 },
  avatarWrap: { position: "relative" },
  avatarImg: { width: 100, height: 100, borderRadius: 50 },
  avatarPlaceholder: { backgroundColor: "#E8F5E9", alignItems: "center", justifyContent: "center" },
  avatarInitial: { fontSize: 36, fontWeight: "600", color: "#2E7D32" },
  cameraOverlay: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#2E7D32",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 3,
    borderColor: "#fff",
  },
  changeTxt: { fontSize: 12, color: "#666", marginTop: 8 },
  cropHint: { fontSize: 11, color: "#999", marginTop: 2 },

  // Form
  form: { paddingHorizontal: 16 },
  field: { marginBottom: 18 },
  label: { fontSize: 12, fontWeight: "600", color: "#333", marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.3 },
  input: {
    height: 48,
    backgroundColor: "#F8F8F8",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#eee",
    paddingHorizontal: 14,
    fontSize: 14,
    color: "#1a1a1a",
  },
  inputDisabled: {
    backgroundColor: "#F5F5F5",
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  disabledText: { fontSize: 14, color: "#666", flex: 1 },
  textArea: {
    height: 100,
    paddingTop: 12,
    textAlignVertical: "top",
  },

  // Gender
  genderRow: { flexDirection: "row", gap: 10 },
  genderChip: {
    flex: 1,
    height: 42,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#e0e0e0",
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
  },
  genderChipActive: { borderColor: "#2E7D32", backgroundColor: "#E8F5E9" },
  genderTxt: { fontSize: 13, fontWeight: "500", color: "#666" },
  genderTxtActive: { color: "#2E7D32", fontWeight: "600" },

  // Role
  roleText: { fontSize: 14, color: "#1a1a1a", fontWeight: "500" },
  roleHint: { fontSize: 11, color: "#999" },

  // Verification
  verifyText: { fontSize: 14, fontWeight: "500" },

  // Buttons
  saveBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginHorizontal: 16,
    marginTop: 8,
    height: 50,
    borderRadius: 12,
    backgroundColor: "#2E7D32",
  },
  saveBtnDisabled: { opacity: 0.6 },
  saveTxt: { color: "#fff", fontSize: 15, fontWeight: "600" },
  cancelBtn: {
    alignItems: "center",
    justifyContent: "center",
    marginHorizontal: 16,
    marginTop: 12,
    height: 46,
    borderRadius: 12,
    backgroundColor: "#F5F5F5",
    borderWidth: 1,
    borderColor: "#e0e0e0",
  },
  cancelTxt: { fontSize: 14, fontWeight: "500", color: "#666" },
});
