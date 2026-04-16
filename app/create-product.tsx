import React, { useState } from "react";
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  TextInput,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator,
} from "react-native";
import * as Haptics from "expo-haptics";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { useRouter, useLocalSearchParams } from "expo-router";
import { Translations } from "@/constants/translations";
import { Storage } from "@/utils/storage";
import axios from "axios";
import { CONFIG } from "@/constants/config";

// const t = Translations.uz.products;
const common = Translations.uz.common;
const API_BASE_URL = CONFIG.API_BASE_URL;

export default function CreateProductScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const isEditing = !!params.id;
  const insets = useSafeAreaInsets();

  const colorScheme = useColorScheme() ?? "light";
  const colors = Colors[colorScheme];

  const [form, setForm] = useState({
    name: (params.name as string) || "",
    category: (params.category as string) || "Boshqalar",
    unit: (params.unit as string) || "kg",
    minThreshold: (params.minThreshold as string) || "0",
  });

  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [fetchingCats, setFetchingCats] = useState(true);

  const units = ["kg", "litr", "ta", "bog'", "blok"];

  React.useEffect(() => {
    const fetchCategories = async () => {
      try {
        const token = await Storage.getItem("access_token");
        const res = await axios.get(`${API_BASE_URL}/inventory/categories`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setCategories(res.data);
        if (res.data.length > 0 && !isEditing) {
          setForm((f) => ({ ...f, category: res.data[0].name }));
        }
      } catch {
        console.error("Fetch categories error:");
      } finally {
        setFetchingCats(false);
      }
    };
    fetchCategories();
  }, []);

  const handleSave = async () => {
    if (!form.name || !form.category || !form.unit) {
      Alert.alert(common.error, "Barcha majburiy maydonlarni to'ldiring");
      return;
    }

    setLoading(true);
    try {
      const token = await Storage.getItem("access_token");
      const data = {
        ...form,
        minThreshold: Number(form.minThreshold) || 0,
      };

      if (isEditing) {
        await axios.put(
          `${API_BASE_URL}/inventory/products/${params.id}`,
          data,
          {
            headers: { Authorization: `Bearer ${token}` },
          },
        );
      } else {
        await axios.post(`${API_BASE_URL}/inventory/products`, data, {
          headers: { Authorization: `Bearer ${token}` },
        });
      }

      Alert.alert("Muvaffaqiyat", "Ma'lumotlar saqlandi");
      router.back();
    } catch {
      console.error("Save product error:");
      Alert.alert(common.error, "Saqlashda xatolik yuz berdi");
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
      edges={["top", "left", "right"]}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={[styles.backBtn, { backgroundColor: colors.card }]}
          >
            <MaterialCommunityIcons
              name="chevron-left"
              size={28}
              color={colors.text}
            />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.text }]}>
            {isEditing ? "Tahrirlash" : "Yangi mahsulot"}
          </Text>
          <View style={{ width: 44 }} />
        </View>

        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: colors.secondary }]}>
              Mahsulot nomi
            </Text>
            <View
              style={[
                styles.inputWrapper,
                { backgroundColor: colors.card, borderColor: colors.border },
              ]}
            >
              <MaterialCommunityIcons
                name="tag-outline"
                size={20}
                color={colors.secondary}
                style={{ marginRight: 10 }}
              />
              <TextInput
                style={[styles.input, { color: colors.text }]}
                placeholder="Masalan: Guruch, Mol go'shti..."
                placeholderTextColor={colors.secondary}
                value={form.name}
                onChangeText={(val) => setForm({ ...form, name: val })}
              />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: colors.secondary }]}>
              Kategoriya
            </Text>
            {fetchingCats ? (
              <ActivityIndicator color={colors.primary} />
            ) : (
              <View style={styles.chips}>
                {categories.map((cat) => (
                  <TouchableOpacity
                    key={cat._id || cat.name}
                    onPress={() => {
                      Haptics.selectionAsync();
                      setForm({ ...form, category: cat.name });
                    }}
                    style={[
                      styles.chip,
                      {
                        backgroundColor:
                          form.category === cat.name
                            ? colors.primary
                            : colors.card,
                        borderColor: "transparent",
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.chipText,
                        {
                          color:
                            form.category === cat.name ? "white" : colors.text,
                        },
                      ]}
                    >
                      {cat.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: colors.secondary }]}>
              {"O'lchov birligi"}
            </Text>
            <View style={styles.chips}>
              {units.map((u) => (
                <TouchableOpacity
                  key={u}
                  onPress={() => {
                    Haptics.selectionAsync();
                    setForm({ ...form, unit: u });
                  }}
                  style={[
                    styles.chip,
                    {
                      backgroundColor:
                        form.unit === u ? colors.primary : colors.card,
                      borderColor: "transparent",
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.chipText,
                      { color: form.unit === u ? "white" : colors.text },
                    ]}
                  >
                    {u}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: colors.secondary }]}>
              Minimum qoldiq (Ogohlantirish uchun)
            </Text>
            <View
              style={[
                styles.inputWrapper,
                { backgroundColor: colors.card, borderColor: colors.border },
              ]}
            >
              <MaterialCommunityIcons
                name="alert-outline"
                size={20}
                color={colors.secondary}
                style={{ marginRight: 10 }}
              />
              <TextInput
                style={[styles.input, { color: colors.text }]}
                placeholder="Masalan: 5, 10..."
                placeholderTextColor={colors.secondary}
                keyboardType="numeric"
                value={form.minThreshold}
                onChangeText={(val) => setForm({ ...form, minThreshold: val })}
              />
            </View>
          </View>
        </ScrollView>

        <View
          style={[
            styles.footer,
            { paddingBottom: Math.max(insets.bottom, 20) },
          ]}
        >
          <TouchableOpacity
            style={[styles.submitBtn, { backgroundColor: colors.primary }]}
            onPress={handleSave}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text style={styles.submitBtnText}>Saqlash</Text>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 24,
    paddingVertical: 20,
  },
  backBtn: {
    width: 44,
    height: 44,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 2,
  },
  headerTitle: { fontSize: 20, fontWeight: "800" },
  scroll: { paddingHorizontal: 24, paddingTop: 10, paddingBottom: 40, gap: 28 },
  inputGroup: { gap: 12 },
  label: {
    fontSize: 13,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  inputWrapper: {
    height: 58,
    borderRadius: 18,
    borderWidth: 1,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
  },
  input: { flex: 1, fontSize: 16, fontWeight: "500" },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 14,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 1,
  },
  chipText: { fontSize: 14, fontWeight: "700" },
  footer: {
    padding: 24,
    borderTopWidth: 1,
    borderTopColor: "rgba(0,0,0,0.03)",
  },
  submitBtn: {
    height: 60,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 5,
  },
  submitBtnText: { color: "white", fontSize: 16, fontWeight: "bold" },
});
