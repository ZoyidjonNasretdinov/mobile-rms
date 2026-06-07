import React, { useState, useEffect } from "react";
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { useRouter } from "expo-router";
import axios from "axios";
import { CONFIG } from "@/constants/config";
import { Storage } from "@/utils/storage";
import * as ImagePicker from "expo-image-picker";

const API_BASE_URL = CONFIG.API_BASE_URL;

export default function SystemSettingsScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme() ?? "light";
  const colors = Colors[colorScheme];

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [restaurantName, setRestaurantName] = useState("");
  const [restaurantLogo, setRestaurantLogo] = useState(""); // Base64 string

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}/settings`);
      if (res.data) {
        setRestaurantName(res.data.restaurantName || "RMS");
        setRestaurantLogo(res.data.restaurantLogo || "");
      }
    } catch (e) {
      console.log("Settings fetch error:", e);
    } finally {
      setLoading(false);
    }
  };

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.5,
      base64: true,
    });

    if (!result.canceled && result.assets[0].base64) {
      setRestaurantLogo(`data:image/jpeg;base64,${result.assets[0].base64}`);
    }
  };

  const saveSettings = async () => {
    try {
      setSaving(true);
      const token = await Storage.getItem("access_token");
      await axios.put(
        `${API_BASE_URL}/settings`,
        { restaurantName, restaurantLogo },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      Alert.alert("Muvaffaqiyatli", "Tizim sozlamalari saqlandi");
    } catch (e) {
      console.log("Settings save error:", e);
      Alert.alert("Xato", "Sozlamalarni saqlashda xatolik yuz berdi");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <MaterialCommunityIcons name="arrow-left" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Tizim Sozlamalari</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <Text style={[styles.label, { color: colors.secondary }]}>Restoran Nomi</Text>
        <TextInput
          style={[styles.input, { backgroundColor: colors.card, color: colors.text, borderColor: colors.border }]}
          value={restaurantName}
          onChangeText={setRestaurantName}
          placeholder="Restoran nomi"
          placeholderTextColor={colors.secondary}
        />

        <Text style={[styles.label, { color: colors.secondary, marginTop: 20 }]}>Logotip (Ixtiyoriy)</Text>
        <TouchableOpacity
          style={[styles.imagePicker, { backgroundColor: colors.card, borderColor: colors.border }]}
          onPress={pickImage}
        >
          {restaurantLogo ? (
            <MaterialCommunityIcons name="image-check" size={40} color={colors.success} />
          ) : (
            <MaterialCommunityIcons name="image-plus" size={40} color={colors.primary} />
          )}
          <Text style={[styles.imagePickerText, { color: colors.text }]}>
            {restaurantLogo ? "Rasm tanlandi (O'zgartirish)" : "Rasm tanlash"}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.saveBtn, { backgroundColor: colors.primary, opacity: saving ? 0.7 : 1 }]}
          onPress={saveSettings}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text style={styles.saveBtnText}>Saqlash</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  centered: { flex: 1, justifyContent: "center", alignItems: "center" },
  header: { flexDirection: "row", alignItems: "center", padding: 20 },
  backButton: { padding: 8, marginRight: 10 },
  headerTitle: { fontSize: 20, fontWeight: "bold" },
  content: { padding: 20 },
  label: { fontSize: 14, fontWeight: "600", marginBottom: 8, marginLeft: 4 },
  input: {
    height: 56,
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 16,
    fontSize: 16,
  },
  imagePicker: {
    height: 120,
    borderWidth: 1,
    borderStyle: "dashed",
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    gap: 10,
  },
  imagePickerText: { fontSize: 14, fontWeight: "600" },
  saveBtn: {
    height: 56,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 30,
  },
  saveBtnText: { color: "white", fontSize: 16, fontWeight: "bold" },
});
