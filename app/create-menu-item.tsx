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
  Switch,
  Modal,
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
import { Storage } from "@/utils/storage";
import { Translations } from "@/constants/translations";
import axios from "axios";

const API_BASE_URL = "http://192.168.43.160:3000";
const t = Translations.uz.menu;
const common = Translations.uz.common;

export default function CreateMenuItemScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const colorScheme = useColorScheme() ?? "light";
  const colors = Colors[colorScheme];
  const insets = useSafeAreaInsets();

  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(!!id);
  const [categories, setCategories] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [recipeIngredients, setRecipeIngredients] = useState<any[]>([]);

  const [form, setForm] = useState({
    name: "",
    price: "",
    categoryId: "",
    isAvailable: true,
    description: "",
  });

  const [productSearch, setProductSearch] = useState("");
  const [showProductModal, setShowProductModal] = useState(false);
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  useEffect(() => {
    const loadInitialData = async () => {
      try {
        const token = await Storage.getItem("access_token");
        const headers = { Authorization: `Bearer ${token}` };
        const [catRes, prodRes] = await Promise.all([
          axios.get(`${API_BASE_URL}/menu/categories`, { headers }),
          axios.get(`${API_BASE_URL}/inventory/products`, { headers }),
        ]);
        setCategories(catRes.data);
        setProducts(prodRes.data);

        if (id) {
          const [itemRes, recipeRes] = await Promise.all([
            axios.get(`${API_BASE_URL}/menu/items`, { headers }),
            axios.get(`${API_BASE_URL}/menu/items/${id}/recipe`, { headers }),
          ]);
          const item = itemRes.data.find((i: any) => i._id === id);
          if (item) {
            setForm({
              name: item.name,
              price: item.price.toString(),
              categoryId: item.categoryId?._id || item.categoryId,
              isAvailable: item.isAvailable,
              description: item.description || "",
            });
            if (recipeRes.data) {
              setRecipeIngredients(
                recipeRes.data.ingredients.map((ing: any) => ({
                  productId: ing.productId?._id || ing.productId,
                  quantity: ing.quantity.toString(),
                  unit: ing.unit || "",
                  productName: ing.productId?.name || "",
                })),
              );
            }
          }
        }
      } catch (error) {
        console.error("Load menu item error:", error);
      } finally {
        setFetching(false);
      }
    };
    loadInitialData();
  }, [id]);

  const handleSave = async () => {
    if (!form.name || !form.price || !form.categoryId) {
      Alert.alert("Xato", "Barcha majburiy maydonlarni to'ldiring");
      return;
    }

    setLoading(true);
    try {
      const token = await Storage.getItem("access_token");
      const headers = { Authorization: `Bearer ${token}` };
      const data = {
        ...form,
        price: parseFloat(form.price),
      };

      let itemId = id;
      if (id) {
        await axios.patch(`${API_BASE_URL}/menu/items/${id}`, data, {
          headers,
        });
      } else {
        const res = await axios.post(`${API_BASE_URL}/menu/items`, data, {
          headers,
        });
        itemId = res.data._id;
      }

      // Save Recipe
      if (itemId) {
        await axios.post(
          `${API_BASE_URL}/menu/items/${itemId}/recipe`,
          {
            ingredients: recipeIngredients.map((ing) => ({
              productId: ing.productId,
              quantity: parseFloat(ing.quantity),
              unit: ing.unit,
            })),
          },
          { headers },
        );
      }

      router.back();
    } catch (error) {
      console.error("Save menu item error:", error);
      Alert.alert("Xato", "Saqlashda xatolik yuz berdi");
    } finally {
      setLoading(false);
    }
  };

  const addIngredient = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setRecipeIngredients([
      ...recipeIngredients,
      { productId: "", quantity: "", productName: "", unit: "" },
    ]);
  };

  const updateIngredient = (index: number, field: string, value: any) => {
    const newIngs = [...recipeIngredients];
    if (field === "productId") {
      const product = products.find((p) => p._id === value);
      newIngs[index] = {
        ...newIngs[index],
        productId: value,
        productName: product?.name || "",
        unit:
          product?.unit === "kg"
            ? "gr"
            : product?.unit === "litr"
              ? "ml"
              : product?.unit || "",
      };
    } else {
      newIngs[index] = { ...newIngs[index], [field]: value };
    }
    setRecipeIngredients(newIngs);
  };

  const removeIngredient = (index: number) => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    setRecipeIngredients(recipeIngredients.filter((_, i) => i !== index));
  };

  const filteredProducts = products.filter((p) =>
    p.name.toLowerCase().includes(productSearch.toLowerCase()),
  );

  const openProductPicker = (index: number) => {
    setActiveIndex(index);
    setShowProductModal(true);
  };

  const selectProduct = (productId: string) => {
    if (activeIndex !== null) {
      Haptics.selectionAsync();
      updateIngredient(activeIndex, "productId", productId);
      setShowProductModal(false);
      setProductSearch("");
      setActiveIndex(null);
    }
  };

  if (fetching) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
      edges={["top"]}
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
            {id ? "Tahrirlash" : "Yangi taom"}
          </Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.formGroup}>
            <Text style={[styles.label, { color: colors.text }]}>
              Taom nomi
            </Text>
            <TextInput
              style={[
                styles.input,
                {
                  color: colors.text,
                  backgroundColor: colors.card,
                  borderColor: colors.border,
                },
              ]}
              placeholder="Masalan: Lavash, Shashlik..."
              value={form.name}
              onChangeText={(val) => setForm({ ...form, name: val })}
            />
          </View>

          <View style={styles.formGroup}>
            <Text style={[styles.label, { color: colors.text }]}>Narxi</Text>
            <TextInput
              style={[
                styles.input,
                {
                  color: colors.text,
                  backgroundColor: colors.card,
                  borderColor: colors.border,
                },
              ]}
              placeholder="0"
              keyboardType="numeric"
              value={form.price}
              onChangeText={(val) => setForm({ ...form, price: val })}
            />
          </View>

          <View style={styles.formGroup}>
            <Text style={[styles.label, { color: colors.text }]}>
              Kategoriya
            </Text>
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
                      borderColor: colors.border,
                    },
                  ]}
                >
                  <Text
                    style={{
                      color:
                        form.categoryId === cat._id ? "white" : colors.text,
                    }}
                  >
                    {cat.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={[styles.row, styles.availabilityRow]}>
            <Text style={[styles.label, { color: colors.text }]}>
              Mavjudlik holati
            </Text>
            <Switch
              value={form.isAvailable}
              onValueChange={(val) => setForm({ ...form, isAvailable: val })}
              trackColor={{ false: colors.border, true: colors.primary + "50" }}
              thumbColor={form.isAvailable ? colors.primary : colors.secondary}
            />
          </View>

          <View style={styles.formGroup}>
            <Text style={[styles.label, { color: colors.text }]}>
              Tavsif (Ixtiyoriy)
            </Text>
            <TextInput
              style={[
                styles.textArea,
                {
                  color: colors.text,
                  backgroundColor: colors.card,
                  borderColor: colors.border,
                },
              ]}
              placeholder="Tarkibi, vazni va boshqalar..."
              multiline
              numberOfLines={4}
              value={form.description}
              onChangeText={(val) => setForm({ ...form, description: val })}
            />
          </View>

          <View style={styles.recipeSection}>
            <View style={styles.recipeHeader}>
              <Text style={[styles.label, { color: colors.text }]}>
                Retsept (Masalliqlar)
              </Text>
              <TouchableOpacity
                onPress={addIngredient}
                style={[
                  styles.addIngBtn,
                  { backgroundColor: colors.primary + "15" },
                ]}
              >
                <MaterialCommunityIcons
                  name="plus"
                  size={20}
                  color={colors.primary}
                />
                <Text style={{ color: colors.primary, fontWeight: "bold" }}>
                  Qo'shish
                </Text>
              </TouchableOpacity>
            </View>

            {recipeIngredients.map((ing, index) => (
              <View
                key={index}
                style={[
                  styles.ingredientCard,
                  { backgroundColor: colors.card, borderColor: colors.border },
                ]}
              >
                <View style={styles.ingMain}>
                  <TouchableOpacity
                    onPress={() => openProductPicker(index)}
                    style={[
                      styles.ingSelectToggle,
                      { backgroundColor: colors.background },
                    ]}
                  >
                    <Text
                      style={[
                        styles.ingNameText,
                        {
                          color: ing.productName
                            ? colors.text
                            : colors.secondary,
                        },
                      ]}
                    >
                      {ing.productName || "Masalliqni tanlang..."}
                    </Text>
                    <MaterialCommunityIcons
                      name="chevron-down"
                      size={20}
                      color={colors.secondary}
                    />
                  </TouchableOpacity>

                  <View style={styles.qtyContainer}>
                    <TextInput
                      style={[
                        styles.ingQtyInput,
                        {
                          color: colors.text,
                          backgroundColor: colors.background,
                        },
                      ]}
                      placeholder="0.0"
                      keyboardType="numeric"
                      value={ing.quantity}
                      onChangeText={(val) =>
                        updateIngredient(index, "quantity", val)
                      }
                    />
                    <TouchableOpacity
                      onPress={() => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        let nextUnit = ing.unit;
                        if (ing.unit === "gr") nextUnit = "kg";
                        else if (ing.unit === "kg") nextUnit = "gr";
                        else if (ing.unit === "ml") nextUnit = "litr";
                        else if (ing.unit === "litr") nextUnit = "ml";
                        updateIngredient(index, "unit", nextUnit);
                      }}
                      style={[
                        styles.unitBadgeBtn,
                        { backgroundColor: colors.primary + "10" },
                      ]}
                    >
                      <Text
                        style={[styles.unitLabel, { color: colors.primary }]}
                      >
                        {ing.unit || "ta"}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>

                <TouchableOpacity
                  onPress={() => removeIngredient(index)}
                  style={styles.removeIngBtn}
                >
                  <MaterialCommunityIcons
                    name="trash-can-outline"
                    size={22}
                    color={colors.danger}
                  />
                </TouchableOpacity>
              </View>
            ))}
            {recipeIngredients.length === 0 && (
              <Text
                style={{
                  color: colors.secondary,
                  fontStyle: "italic",
                  textAlign: "center",
                  marginTop: 10,
                }}
              >
                Hali masalliqlar qo'shilmagan
              </Text>
            )}
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

        {/* Product Selection Modal */}
        <Modal visible={showProductModal} transparent animationType="slide">
          <View style={styles.modalOverlay}>
            <View
              style={[styles.modalContent, { backgroundColor: colors.card }]}
            >
              <View style={styles.modalHeader}>
                <Text style={[styles.modalTitle, { color: colors.text }]}>
                  Masalliqni tanlang
                </Text>
                <TouchableOpacity onPress={() => setShowProductModal(false)}>
                  <MaterialCommunityIcons
                    name="close"
                    size={24}
                    color={colors.text}
                  />
                </TouchableOpacity>
              </View>

              <View
                style={[
                  styles.modalSearch,
                  { backgroundColor: colors.background },
                ]}
              >
                <MaterialCommunityIcons
                  name="magnify"
                  size={20}
                  color={colors.secondary}
                />
                <TextInput
                  placeholder="Qidirish..."
                  placeholderTextColor={colors.secondary}
                  style={[styles.modalSearchInput, { color: colors.text }]}
                  value={productSearch}
                  onChangeText={setProductSearch}
                />
              </View>

              <ScrollView style={styles.productList}>
                {filteredProducts.map((p) => (
                  <TouchableOpacity
                    key={p._id}
                    onPress={() => selectProduct(p._id)}
                    style={[
                      styles.productRow,
                      { borderBottomColor: colors.border },
                    ]}
                  >
                    <View>
                      <Text
                        style={[styles.productName, { color: colors.text }]}
                      >
                        {p.name}
                      </Text>
                      <Text
                        style={[
                          styles.productUnit,
                          { color: colors.secondary },
                        ]}
                      >
                        {p.unit}
                      </Text>
                    </View>
                    <MaterialCommunityIcons
                      name="plus"
                      size={20}
                      color={colors.primary}
                    />
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          </View>
        </Modal>
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
    padding: 20,
  },
  backButton: { padding: 8 },
  headerTitle: { fontSize: 18, fontWeight: "bold" },
  scrollContent: { padding: 20, gap: 20 },
  centered: { flex: 1, justifyContent: "center", alignItems: "center" },
  formGroup: { gap: 8 },
  label: { fontSize: 14, fontWeight: "600" },
  input: {
    height: 50,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 15,
    fontSize: 16,
  },
  textArea: {
    height: 100,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 15,
    paddingTop: 12,
    fontSize: 16,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  availabilityRow: { paddingVertical: 10 },
  chipGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
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
  submitBtnText: { color: "white", fontSize: 16, fontWeight: "bold" },
  recipeSection: { marginTop: 10, paddingBottom: 20 },
  recipeHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 15,
  },
  addIngBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 4,
  },
  ingredientCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 12,
    gap: 12,
  },
  ingMain: {
    flex: 1,
    flexDirection: "row",
    gap: 10,
    alignItems: "center",
  },
  ingSelectToggle: {
    flex: 1,
    height: 44,
    borderRadius: 10,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  ingNameText: { fontSize: 14, fontWeight: "500" },
  qtyContainer: {
    width: 100,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  ingQtyInput: {
    flex: 1,
    height: 44,
    borderRadius: 10,
    textAlign: "center",
    fontSize: 14,
    fontWeight: "bold",
  },
  unitLabel: { fontSize: 12, fontWeight: "600" },
  removeIngBtn: {
    padding: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    padding: 24,
    minHeight: "60%",
    maxHeight: "85%",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  modalTitle: { fontSize: 18, fontWeight: "bold" },
  modalSearch: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 15,
    height: 50,
    borderRadius: 15,
    marginBottom: 20,
  },
  modalSearchInput: { flex: 1, marginLeft: 10, fontSize: 15 },
  productList: { flex: 1 },
  productRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 15,
    borderBottomWidth: 1,
  },
  productName: { fontSize: 16, fontWeight: "600" },
  productUnit: { fontSize: 12, marginTop: 2 },
  unitBadgeBtn: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    minWidth: 36,
    alignItems: "center",
  },
});
