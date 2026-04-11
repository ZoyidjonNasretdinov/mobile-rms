import React, { useState, useEffect } from "react";
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

const t = Translations.uz.inventory;
const API_BASE_URL = "http://192.168.43.160:3000";

export default function CreateInventoryScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const isEditing = !!params.id;

  const colorScheme = useColorScheme() ?? "light";
  const colors = Colors[colorScheme];
  const insets = useSafeAreaInsets();

  const [form, setForm] = useState({
    name: (params.name as string) || "",
    categoryId: (params.categoryId as string) || "",
    unit: (params.unit as string) || "kg",
    stock: (params.stock as string) || "",
    minStock: (params.minStock as string) || "10",
  });

  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [fetchingCats, setFetchingCats] = useState(true);

  const units = ["kg", "litr", "ta", "bog'", "blok"];

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const token = await Storage.getItem("access_token");
        const res = await axios.get(`${API_BASE_URL}/inventory/categories`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setCategories(res.data);
      } catch (error) {
        console.error("Fetch categories error:", error);
      } finally {
        setFetchingCats(false);
      }
    };
    fetchCategories();
  }, []);

  const handleSave = async () => {
    if (!form.name || !form.categoryId || !form.unit || !form.stock) {
      Alert.alert("Xato", "Barcha maydonlarni to'ldiring");
      return;
    }

    setLoading(true);
    try {
      const token = await Storage.getItem("access_token");
      const headers = { Authorization: `Bearer ${token}` };
      const data = {
        ...form,
        stock: parseFloat(form.stock),
        minStock: parseFloat(form.minStock),
      };

      if (isEditing) {
        await axios.patch(
          `${API_BASE_URL}/inventory/items/${params.id}`,
          data,
          { headers },
        );
      } else {
        await axios.post(`${API_BASE_URL}/inventory/items`, data, { headers });
      }

      Alert.alert(
        "Muvaffaqiyat",
        isEditing ? "O'zgarishlar saqlandi" : "Mahsulot qo'shildi",
      );
      router.back();
    } catch (error) {
      Alert.alert("Xato", "Saqlab bo'lmadi");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    Alert.alert(
      "O'chirish",
      "Haqiqatan ham ushbu mahsulotni o'chirmoqchimisiz?",
      [
        { text: "Bekor qilish", style: "cancel" },
        {
          text: "O'chirish",
          style: "destructive",
          onPress: async () => {
            try {
              const token = await Storage.getItem("access_token");
              await axios.delete(
                `${API_BASE_URL}/inventory/items/${params.id}`,
                {
                  headers: { Authorization: `Bearer ${token}` },
                },
              );
              router.back();
            } catch (error) {
              Alert.alert("Xato", "O'chirishda xatolik");
            }
          },
        },
      ],
    );
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
            style={styles.backButton}
          >
            <MaterialCommunityIcons
              name="arrow-left"
              size={24}
              color={colors.text}
            />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.text }]}>
            {isEditing ? "Tahrirlash" : "Mahsulot qo'shish"}
          </Text>
          {isEditing ? (
            <TouchableOpacity onPress={handleDelete}>
              <MaterialCommunityIcons
                name="trash-can-outline"
                size={24}
                color={colors.danger}
              />
            </TouchableOpacity>
          ) : (
            <View style={{ width: 40 }} />
          )}
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.formContainer}>
            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: colors.text }]}>
                Mahsulot nomi
              </Text>
              <View
                style={[
                  styles.inputWrapper,
                  { backgroundColor: colors.card, borderColor: colors.border },
                ]}
              >
                <MaterialCommunityIcons
                  name="package-variant"
                  size={20}
                  color={colors.secondary}
                />
                <TextInput
                  style={[styles.input, { color: colors.text }]}
                  placeholder="Masalan: Go'sht, Un, Yog'"
                  placeholderTextColor={colors.secondary}
                  value={form.name}
                  onChangeText={(val) => setForm({ ...form, name: val })}
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: colors.text }]}>
                Kategoriya
              </Text>
              {fetchingCats ? (
                <ActivityIndicator color={colors.primary} />
              ) : (
                <View style={styles.chipGrid}>
                  {categories.map((cat) => (
                    <TouchableOpacity
                      key={cat._id}
                      onPress={() => setForm({ ...form, categoryId: cat._id })}
                      style={[
                        styles.chip,
                        {
                          backgroundColor:
                            form.categoryId === cat._id
                              ? colors.primary
                              : colors.card,
                          borderColor:
                            form.categoryId === cat._id
                              ? colors.primary
                              : colors.border,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.chipText,
                          {
                            color:
                              form.categoryId === cat._id
                                ? "white"
                                : colors.text,
                          },
                        ]}
                      >
                        {cat.name}
                      </Text>
                    </TouchableOpacity>
                  ))}
                  {categories.length === 0 && (
                    <Text style={{ color: colors.secondary }}>
                      Kategoriyalar mavjud emas
                    </Text>
                  )}
                </View>
              )}
            </View>

            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: colors.text }]}>
                O'lchov birligi
              </Text>
              <View style={styles.chipGrid}>
                {units.map((u) => (
                  <TouchableOpacity
                    key={u}
                    onPress={() => setForm({ ...form, unit: u })}
                    style={[
                      styles.unitChip,
                      {
                        backgroundColor:
                          form.unit === u ? colors.accent : colors.card,
                        borderColor:
                          form.unit === u ? colors.accent : colors.border,
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

            <View style={styles.row}>
              <View style={[styles.inputGroup, { flex: 1 }]}>
                <Text style={[styles.label, { color: colors.text }]}>
                  Mavjud miqdor
                </Text>
                <View
                  style={[
                    styles.inputWrapper,
                    {
                      backgroundColor: colors.card,
                      borderColor: colors.border,
                    },
                  ]}
                >
                  <TextInput
                    style={[styles.input, { color: colors.text }]}
                    placeholder="0"
                    keyboardType="numeric"
                    placeholderTextColor={colors.secondary}
                    value={form.stock}
                    onChangeText={(val) => setForm({ ...form, stock: val })}
                  />
                </View>
              </View>

              <View style={[styles.inputGroup, { flex: 1 }]}>
                <Text style={[styles.label, { color: colors.text }]}>
                  Minimal miqdor
                </Text>
                <View
                  style={[
                    styles.inputWrapper,
                    {
                      backgroundColor: colors.card,
                      borderColor: colors.border,
                    },
                  ]}
                >
                  <TextInput
                    style={[styles.input, { color: colors.text }]}
                    placeholder="0"
                    keyboardType="numeric"
                    placeholderTextColor={colors.secondary}
                    value={form.minStock}
                    onChangeText={(val) => setForm({ ...form, minStock: val })}
                  />
                </View>
              </View>
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
  container: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 15,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "bold",
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 40,
  },
  formContainer: {
    gap: 24,
  },
  inputGroup: {
    gap: 10,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    height: 56,
    borderRadius: 16,
    borderWidth: 1,
    gap: 12,
  },
  input: {
    flex: 1,
    fontSize: 16,
  },
  row: {
    flexDirection: "row",
    gap: 16,
  },
  chipGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1.5,
  },
  unitChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1.5,
    minWidth: 50,
    alignItems: "center",
  },
  chipText: {
    fontSize: 13,
    fontWeight: "bold",
  },
  footer: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: "rgba(0,0,0,0.05)",
  },
  submitBtn: {
    height: 56,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
  },
  submitBtnText: {
    color: "white",
    fontSize: 16,
    fontWeight: "bold",
  },
});
