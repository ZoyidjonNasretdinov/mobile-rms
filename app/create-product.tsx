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
    currentStock: (params.currentStock as string) || "0",
    costPerUnit: (params.costPerUnit as string) || "0",
    icon: (params.icon as string) || "package-variant-closed",
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
          {
            ...data,
            costPerUnit: Number(form.costPerUnit) || 0,
            currentStock: Number(form.currentStock) || 0,
          },
          {
            headers: { Authorization: `Bearer ${token}` },
          },
        );
      } else {
        await axios.post(
          `${API_BASE_URL}/inventory/products`,
          {
            ...data,
            costPerUnit: Number(form.costPerUnit) || 0,
            currentStock: Number(form.currentStock) || 0,
          },
          {
            headers: { Authorization: `Bearer ${token}` },
          },
        );
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

  const handleDelete = async () => {
    Alert.alert(
      "O'chirish",
      "Haqiqatan ham ushbu mahsulotni o'chirib tashlamoqchimisiz? Bu amalni ortga qaytarib bo'lmaydi.",
      [
        { text: "Bekor qilish", style: "cancel" },
        {
          text: "O'chirish",
          style: "destructive",
          onPress: async () => {
            setLoading(true);
            try {
              const token = await Storage.getItem("access_token");
              await axios.delete(
                `${API_BASE_URL}/inventory/products/${params.id}`,
                {
                  headers: { Authorization: `Bearer ${token}` },
                },
              );
              Alert.alert("Muvaffaqiyat", "Mahsulot o'chirildi");
              router.back();
            } catch {
              Alert.alert("Xato", "O'chirishda xatolik yuz berdi");
            } finally {
              setLoading(false);
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
                { backgroundColor: colors.input, borderColor: colors.border },
              ]}
            >
              <MaterialCommunityIcons
                name="cube-outline"
                size={22}
                color={colors.primary}
                style={{ marginRight: 12 }}
              />
              <TextInput
                style={[styles.input, { color: colors.text }]}
                placeholder="Masalan: Guruch, Go'sht..."
                placeholderTextColor={colors.secondary + "90"}
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
                            : colors.input,
                        borderWidth: 1,
                        borderColor: form.category === cat.name ? colors.primary : colors.border,
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
                        form.unit === u ? colors.primary : colors.input,
                      borderWidth: 1,
                      borderColor: form.unit === u ? colors.primary : colors.border,
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
              Minimum qoldiq (Ogohlantirish)
            </Text>
            <View
              style={[
                styles.inputWrapper,
                { backgroundColor: colors.input, borderColor: colors.border },
              ]}
            >
              <MaterialCommunityIcons
                name="bell-ring-outline"
                size={22}
                color={colors.warning}
                style={{ marginRight: 12 }}
              />
              <TextInput
                style={[styles.input, { color: colors.text }]}
                placeholder="0"
                placeholderTextColor={colors.secondary + "90"}
                keyboardType="numeric"
                value={form.minThreshold}
                onChangeText={(val) => setForm({ ...form, minThreshold: val })}
              />
              <Text style={{ color: colors.secondary, fontWeight: "800", fontSize: 13 }}>{form.unit.toUpperCase()}</Text>
            </View>
          </View>

          <View style={styles.rowInputs}>
            <View style={[styles.inputGroup, { flex: 1 }]}>
              <Text style={[styles.label, { color: colors.secondary }]}>
                Hozirgi qoldiq
              </Text>
              <View
                style={[
                  styles.inputWrapper,
                  { backgroundColor: colors.input, borderColor: colors.border },
                ]}
              >
                <MaterialCommunityIcons
                  name="database-outline"
                  size={18}
                  color={colors.primary}
                  style={{ marginRight: 8 }}
                />
                <TextInput
                  style={[styles.input, { color: colors.text }]}
                  placeholder="0"
                  placeholderTextColor={colors.secondary + "90"}
                  keyboardType="numeric"
                  value={form.currentStock}
                  onChangeText={(val) =>
                    setForm({ ...form, currentStock: val })
                  }
                />
              </View>
            </View>
            <View style={[styles.inputGroup, { flex: 1 }]}>
              <Text style={[styles.label, { color: colors.secondary }]}>
                Narxi (1 {form.unit})
              </Text>
              <View
                style={[
                  styles.inputWrapper,
                  { backgroundColor: colors.input, borderColor: colors.border },
                ]}
              >
                <MaterialCommunityIcons
                  name="cash"
                  size={18}
                  color={colors.success}
                  style={{ marginRight: 8 }}
                />
                <TextInput
                  style={[styles.input, { color: colors.text }]}
                  placeholder="0"
                  placeholderTextColor={colors.secondary + "90"}
                  keyboardType="numeric"
                  value={form.costPerUnit}
                  onChangeText={(val) => setForm({ ...form, costPerUnit: val })}
                />
              </View>
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: colors.secondary }]}>
              Mahsulot belgisi (Icon)
            </Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.iconGrid}
            >
              {[
                "package-variant-closed", "food-steak", "carrot", "leaf",
                "grain", "baguette", "oil", "cheese", "tea", "fruit-citrus",
                "egg", "tomato", "chili-hot", "potato", "cucumber",
                "bottle-wine", "fire", "flask-outline",
              ].map((ic) => (
                <TouchableOpacity
                  key={ic}
                  onPress={() => {
                    Haptics.selectionAsync();
                    setForm({ ...form, icon: ic });
                  }}
                  style={[
                    styles.iconBtn,
                    {
                      backgroundColor:
                        form.icon === ic ? colors.primary : colors.input,
                      borderWidth: 1,
                      borderColor: form.icon === ic ? colors.primary : colors.border,
                    },
                  ]}
                >
                  <MaterialCommunityIcons
                    name={ic as any}
                    size={24}
                    color={form.icon === ic ? "white" : colors.secondary}
                  />
                </TouchableOpacity>
              ))}
            </ScrollView>
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
              <Text style={styles.submitBtnText}>Mahsulotni saqlash</Text>
            )}
          </TouchableOpacity>

          {isEditing && (
            <TouchableOpacity
              style={[styles.deleteBtn, { marginTop: 12 }]}
              onPress={handleDelete}
              disabled={loading}
            >
              <MaterialCommunityIcons name="trash-can-outline" size={20} color={colors.danger} />
              <Text style={[styles.deleteBtnText, { color: colors.danger, marginLeft: 8 }]}>
                O'chirish
              </Text>
            </TouchableOpacity>
          )}
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
    borderRadius: 15,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 3,
  },
  headerTitle: { fontSize: 22, fontWeight: "900" },
  scroll: { paddingHorizontal: 24, paddingTop: 10, paddingBottom: 40, gap: 24 },
  inputGroup: { gap: 10 },
  label: {
    fontSize: 12,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 1,
    opacity: 0.6,
  },
  inputWrapper: {
    height: 62,
    borderRadius: 22,
    borderWidth: 1.5,
    paddingHorizontal: 18,
    flexDirection: "row",
    alignItems: "center",
  },
  input: { flex: 1, fontSize: 16, fontWeight: "700" },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  chip: {
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 2,
  },
  chipText: { fontSize: 14, fontWeight: "800" },
  footer: {
    padding: 24,
    borderTopWidth: 1,
    borderTopColor: "rgba(0,0,0,0.05)",
  },
  submitBtn: {
    height: 64,
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 8,
  },
  submitBtnText: { color: "white", fontSize: 18, fontWeight: "bold" },
  rowInputs: { flexDirection: "row", gap: 12 },
  iconGrid: { paddingVertical: 5, gap: 12 },
  iconBtn: {
    width: 54,
    height: 54,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 2,
  },
  deleteBtn: {
    height: 50,
    flexDirection: 'row',
    justifyContent: "center",
    alignItems: "center",
  },
  deleteBtnText: {
    fontSize: 15,
    fontWeight: "800",
  },
});
