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
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { Storage } from "@/utils/storage";
import { Translations } from "@/constants/translations";
import axios from "axios";
import { CONFIG } from "@/constants/config";

const API_BASE_URL = CONFIG.API_BASE_URL;

interface MenuItemModalProps {
  visible: boolean;
  itemId: string | null;
  onClose: () => void;
  onSave: () => void;
}

export default function MenuItemModal({
  visible,
  itemId,
  onClose,
  onSave,
}: MenuItemModalProps) {
  const colorScheme = useColorScheme() ?? "light";
  const colors = Colors[colorScheme];
  const insets = useSafeAreaInsets();

  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(false);
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
    if (visible) {
      loadInitialData();
    } else {
      setForm({
        name: "",
        price: "",
        categoryId: "",
        isAvailable: true,
        description: "",
      });
      setRecipeIngredients([]);
    }
  }, [visible, itemId]);

  const loadInitialData = async () => {
    setFetching(true);
    try {
      const token = await Storage.getItem("access_token");
      const headers = { Authorization: `Bearer ${token}` };
      const [catRes, prodRes] = await Promise.all([
        axios.get(`${API_BASE_URL}/menu/categories`, { headers }),
        axios.get(`${API_BASE_URL}/inventory/products`, { headers }),
      ]);
      setCategories(catRes.data);
      setProducts(prodRes.data);

      if (itemId) {
        const itemRes = await axios.get(`${API_BASE_URL}/menu/items/${itemId}`, { headers });
        const recipeRes = await axios.get(`${API_BASE_URL}/menu/items/${itemId}/recipe`, { headers });
        const item = itemRes.data;
        if (item) {
          setForm({
            name: item.name,
            price: item.price.toString(),
            categoryId: item.categoryId?._id || item.categoryId,
            isAvailable: item.isAvailable,
            description: item.description || "",
          });
          if (recipeRes.data && recipeRes.data.ingredients) {
            setRecipeIngredients(
              recipeRes.data.ingredients.map((ing: any) => ({
                productId: ing.productId?._id || ing.productId,
                quantity: ing.quantity.toString(),
                unit: ing.unit || "",
                productName: ing.productId?.name || "Noma'lum mahsulot",
                pricePerUnit: ing.productId?.costPerUnit || 0,
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

      let currentId = itemId;
      if (itemId) {
        await axios.patch(`${API_BASE_URL}/menu/items/${itemId}`, data, { headers });
      } else {
        const res = await axios.post(`${API_BASE_URL}/menu/items`, data, { headers });
        currentId = res.data._id;
      }

      // Save Recipe
      await axios.post(
        `${API_BASE_URL}/menu/items/${currentId}/recipe`,
        {
          ingredients: recipeIngredients.map((ing) => ({
            productId: ing.productId,
            quantity: parseFloat(ing.quantity) || 0,
            unit: ing.unit,
          })),
        },
        { headers }
      );

      onSave();
      onClose();
    } catch (error) {
      Alert.alert("Xato", "Saqlashda xatolik yuz berdi");
    } finally {
      setLoading(false);
    }
  };

  const addIngredient = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setRecipeIngredients([
      ...recipeIngredients,
      { productId: "", quantity: "", productName: "", unit: "", pricePerUnit: 0 },
    ]);
  };

  const removeIngredient = (index: number) => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    setRecipeIngredients(recipeIngredients.filter((_, i) => i !== index));
  };

  const updateIngredient = (index: number, field: string, value: any) => {
    const newIngs = [...recipeIngredients];
    newIngs[index] = { ...newIngs[index], [field]: value };
    setRecipeIngredients(newIngs);
  };

  const openProductPicker = (index: number) => {
    setActiveIndex(index);
    setShowProductModal(true);
  };

  const selectProduct = (p: any) => {
    if (activeIndex !== null) {
      const newIngs = [...recipeIngredients];
      newIngs[activeIndex] = {
        ...newIngs[activeIndex],
        productId: p._id,
        productName: p.name,
        unit: p.unit === "kg" ? "gr" : p.unit === "litr" ? "ml" : p.unit,
        pricePerUnit: p.costPerUnit || 0,
      };
      setRecipeIngredients(newIngs);
      setShowProductModal(false);
      setProductSearch("");
    }
  };

  const totalRecipeCost = React.useMemo(() => {
    return recipeIngredients.reduce((total, ing) => {
      const product = products.find((p) => p._id === ing.productId);
      if (!product || !ing.quantity) return total;
      let qty = parseFloat(ing.quantity) || 0;
      if (ing.unit === "gr" && product.unit === "kg") qty /= 1000;
      if (ing.unit === "ml" && product.unit === "litr") qty /= 1000;
      return total + qty * (product.costPerUnit || 0);
    }, 0);
  }, [recipeIngredients, products]);

  const profitMargin = React.useMemo(() => {
    const price = parseFloat(form.price) || 0;
    if (price === 0) return 0;
    return ((price - totalRecipeCost) / price) * 100;
  }, [form.price, totalRecipeCost]);

  const filteredProducts = products.filter((p) =>
    p.name.toLowerCase().includes(productSearch.toLowerCase())
  );

  const renderContent = () => {
    if (fetching) {
      return (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={{ marginTop: 12, color: colors.secondary }}>Yuklanmoqda...</Text>
        </View>
      );
    }

    return (
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.formGroup}>
          <Text style={[styles.label, { color: colors.secondary }]}>Taom nomi</Text>
          <View style={[styles.inputWrapper, { backgroundColor: colors.input, borderColor: colors.border }]}>
            <MaterialCommunityIcons name="silverware-fork-knife" size={20} color={colors.primary} style={{ marginRight: 12 }} />
            <TextInput
              style={[styles.input, { color: colors.text }]}
              placeholder="Masalan: Lavash, Shashlik..."
              placeholderTextColor={colors.secondary + "80"}
              value={form.name}
              onChangeText={(val) => setForm({ ...form, name: val })}
            />
          </View>
        </View>

        <View style={styles.row}>
          <View style={[styles.formGroup, { flex: 1 }]}>
            <Text style={[styles.label, { color: colors.secondary }]}>Narxi (Sotuv)</Text>
            <View style={[styles.inputWrapper, { backgroundColor: colors.input, borderColor: colors.border }]}>
              <MaterialCommunityIcons name="cash" size={20} color={colors.success} style={{ marginRight: 10 }} />
              <TextInput
                style={[styles.input, { color: colors.text }]}
                placeholder="0"
                placeholderTextColor={colors.secondary + "80"}
                keyboardType="numeric"
                value={form.price}
                onChangeText={(val) => setForm({ ...form, price: val })}
              />
            </View>
          </View>

          <View style={[styles.formGroup, { flex: 1 }]}>
            <Text style={[styles.label, { color: colors.secondary }]}>Kategoriya</Text>
            <TouchableOpacity
              onPress={() => {}}
              style={[styles.inputWrapper, { backgroundColor: colors.input, borderColor: colors.border }]}
            >
              <MaterialCommunityIcons name="shape-outline" size={20} color={colors.primary} style={{ marginRight: 10 }} />
              <Text style={{ color: colors.text, fontWeight: "700" }}>
                {categories.find(c => c._id === form.categoryId)?.name || "Tanlang"}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={[styles.row, styles.availabilityRow]}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.label, { color: colors.text, textTransform: 'none', fontSize: 15 }]}>Mavjudlik holati</Text>
            <Text style={{ fontSize: 12, color: colors.secondary }}>Taom menyuda ko'rinadi</Text>
          </View>
          <Switch
            value={form.isAvailable}
            onValueChange={(val) => setForm({ ...form, isAvailable: val })}
            trackColor={{ false: colors.border, true: colors.primary + "40" }}
            thumbColor={form.isAvailable ? colors.primary : colors.secondary}
          />
        </View>

        <View style={styles.formGroup}>
          <Text style={[styles.label, { color: colors.secondary }]}>Tavsif (Ixtiyoriy)</Text>
          <View style={[styles.textAreaWrapper, { backgroundColor: colors.input, borderColor: colors.border }]}>
            <TextInput
              style={[styles.textArea, { color: colors.text }]}
              placeholder="Taom haqida qisqacha..."
              placeholderTextColor={colors.secondary + "80"}
              multiline
              numberOfLines={3}
              value={form.description}
              onChangeText={(val) => setForm({ ...form, description: val })}
            />
          </View>
        </View>

        <View style={styles.sectionHeader}>
          <View>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Retsept (Masalliqlar)</Text>
            <Text style={{ fontSize: 12, color: colors.secondary }}>Tannarxni aniqlash uchun</Text>
          </View>
          <TouchableOpacity
            onPress={addIngredient}
            style={[styles.addIngBtn, { backgroundColor: colors.primary }]}
          >
            <MaterialCommunityIcons name="plus" size={24} color="white" />
          </TouchableOpacity>
        </View>

        {recipeIngredients.map((ing, index) => (
          <View key={index} style={[styles.ingredientCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.ingCardHeader}>
              <TouchableOpacity
                onPress={() => openProductPicker(index)}
                style={[styles.ingSelectToggle, { backgroundColor: colors.background, borderColor: colors.border, borderWidth: 1 }]}
              >
                <MaterialCommunityIcons name="food-apple-outline" size={20} color={colors.primary} style={{ marginRight: 8 }} />
                <Text style={[styles.ingNameText, { color: ing.productName ? colors.text : colors.secondary }]} numberOfLines={1}>
                  {ing.productName || "Masalliq..."}
                </Text>
                <MaterialCommunityIcons name="chevron-down" size={20} color={colors.secondary} />
              </TouchableOpacity>
              <TouchableOpacity onPress={() => removeIngredient(index)} style={styles.removeIngBtn}>
                <MaterialCommunityIcons name="trash-can-outline" size={22} color={colors.danger} />
              </TouchableOpacity>
            </View>

            <View style={styles.ingCardFooter}>
              <View style={[styles.qtyInputWrapper, { backgroundColor: colors.background, borderColor: colors.border, borderWidth: 1 }]}>
                <TextInput
                  style={[styles.ingQtyInput, { color: colors.text }]}
                  placeholder="0.0"
                  placeholderTextColor={colors.secondary}
                  keyboardType="numeric"
                  value={ing.quantity.toString()}
                  onChangeText={(val) => updateIngredient(index, "quantity", val)}
                />
                <View style={[styles.unitBadge, { backgroundColor: colors.primary }]}>
                  <Text style={{ color: "white", fontWeight: "900", fontSize: 11 }}>{ing.unit || "ta"}</Text>
                </View>
              </View>

              <View style={styles.ingCostRow}>
                <Text style={{ color: colors.secondary, fontSize: 11, fontWeight: '700' }}>TANNARXI:</Text>
                <Text style={{ color: colors.success, fontWeight: "800", fontSize: 14 }}>
                  {(parseFloat(ing.quantity) * (ing.pricePerUnit || 0) / (ing.unit === "gr" || ing.unit === "ml" ? 1000 : 1)).toLocaleString()} UZS
                </Text>
              </View>
            </View>
          </View>
        ))}

        {recipeIngredients.length > 0 && (
          <View style={[styles.summaryCard, { backgroundColor: colorScheme === 'dark' ? colors.card : colors.primary + "08", borderColor: colors.primary + "20" }]}>
            <View style={styles.summaryRow}>
              <Text style={{ color: colors.secondary, fontWeight: '700' }}>UMUMIY TANNARX:</Text>
              <Text style={{ color: colors.text, fontWeight: "900", fontSize: 20 }}>{totalRecipeCost.toLocaleString()} UZS</Text>
            </View>
            <View style={[styles.summaryRow, { marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: colors.border }]}>
              <Text style={{ color: colors.secondary, fontWeight: '700' }}>FOYDA MARJASI:</Text>
              <Text style={{ color: profitMargin > 30 ? colors.success : colors.danger, fontWeight: "900", fontSize: 20 }}>
                {profitMargin.toFixed(1)}%
              </Text>
            </View>
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    );
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.modalOverlay}>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={[styles.modalContent, { backgroundColor: colors.background, paddingTop: insets.top || 20 }]}
        >
          <View style={styles.header}>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <MaterialCommunityIcons name="close" size={26} color={colors.text} />
            </TouchableOpacity>
            <Text style={[styles.headerTitle, { color: colors.text }]}>{itemId ? "Tahrirlash" : "Yangi taom"}</Text>
            <View style={{ width: 44 }} />
          </View>

          {renderContent()}

          <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 20) }]}>
            <TouchableOpacity
              style={[styles.submitBtn, { backgroundColor: colors.primary }]}
              onPress={handleSave}
              disabled={loading}
            >
              {loading ? <ActivityIndicator color="white" /> : <Text style={styles.submitBtnText}>Saqlash</Text>}
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>

        {/* Product Picker Modal */}
        <Modal visible={showProductModal} transparent animationType="fade">
          <View style={styles.pickerOverlay}>
            <View style={[styles.pickerContent, { backgroundColor: colors.card }]}>
              <View style={styles.pickerHeader}>
                <Text style={[styles.pickerTitle, { color: colors.text }]}>Masalliqni tanlang</Text>
                <TouchableOpacity onPress={() => setShowProductModal(false)}>
                  <MaterialCommunityIcons name="close" size={24} color={colors.text} />
                </TouchableOpacity>
              </View>
              <View style={[styles.pickerSearch, { backgroundColor: colors.background }]}>
                <MaterialCommunityIcons name="magnify" size={20} color={colors.secondary} />
                <TextInput
                  placeholder="Qidirish..."
                  placeholderTextColor={colors.secondary}
                  style={{ flex: 1, marginLeft: 8, color: colors.text }}
                  value={productSearch}
                  onChangeText={setProductSearch}
                />
              </View>
              <ScrollView>
                {filteredProducts.map((p) => (
                  <TouchableOpacity
                    key={p._id}
                    onPress={() => selectProduct(p)}
                    style={[styles.pickerItem, { borderBottomColor: colors.border }]}
                  >
                    <View>
                      <Text style={[styles.pickerItemName, { color: colors.text }]}>{p.name}</Text>
                      <Text style={{ color: colors.secondary, fontSize: 12 }}>
                        Qoldiq: {p.currentStock} {p.unit} • {p.costPerUnit?.toLocaleString()} UZS
                      </Text>
                    </View>
                    <MaterialCommunityIcons name="plus-circle" size={24} color={colors.primary} />
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          </View>
        </Modal>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.6)" },
  modalContent: { flex: 1, borderTopLeftRadius: 32, borderTopRightRadius: 32 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, paddingVertical: 15 },
  headerTitle: { fontSize: 20, fontWeight: "900" },
  closeButton: { padding: 4 },
  scrollContent: { paddingHorizontal: 20, gap: 24 },
  formGroup: { gap: 8 },
  label: { fontSize: 12, fontWeight: "800", textTransform: "uppercase", letterSpacing: 1, opacity: 0.6 },
  inputWrapper: { height: 60, borderRadius: 22, borderWidth: 1.5, paddingHorizontal: 16, flexDirection: "row", alignItems: "center" },
  input: { flex: 1, fontSize: 16, fontWeight: "700" },
  textAreaWrapper: { borderRadius: 22, borderWidth: 1.5, paddingHorizontal: 16, paddingVertical: 12 },
  textArea: { height: 80, fontSize: 16, fontWeight: "600", textAlignVertical: "top" },
  row: { flexDirection: "row", gap: 12 },
  availabilityRow: { paddingVertical: 10, alignItems: 'center' },
  sectionHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 10 },
  sectionTitle: { fontSize: 18, fontWeight: "900" },
  addIngBtn: { width: 44, height: 44, borderRadius: 15, justifyContent: "center", alignItems: "center", elevation: 4, shadowOpacity: 0.2, shadowRadius: 5 },
  ingredientCard: { padding: 16, borderRadius: 24, borderWidth: 1.5, gap: 12 },
  ingCardHeader: { flexDirection: "row", gap: 10, alignItems: "center" },
  ingSelectToggle: { flex: 1, height: 50, borderRadius: 15, flexDirection: "row", alignItems: "center", paddingHorizontal: 12, gap: 8 },
  ingNameText: { flex: 1, fontWeight: "700", fontSize: 15 },
  removeIngBtn: { width: 44, height: 44, justifyContent: "center", alignItems: "center" },
  ingCardFooter: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  qtyInputWrapper: { width: 140, height: 50, borderRadius: 15, flexDirection: "row", alignItems: "center", paddingHorizontal: 10 },
  ingQtyInput: { flex: 1, fontWeight: "800", fontSize: 16, textAlign: "center" },
  unitBadge: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10 },
  ingCostRow: { alignItems: "flex-end" },
  summaryCard: { padding: 20, borderRadius: 26, borderWidth: 1.5 },
  summaryRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  footer: { padding: 20, borderTopWidth: 1, borderTopColor: "rgba(0,0,0,0.05)" },
  submitBtn: { height: 64, borderRadius: 22, justifyContent: "center", alignItems: "center", elevation: 8, shadowOpacity: 0.3, shadowRadius: 10 },
  submitBtnText: { color: "white", fontSize: 18, fontWeight: "900" },
  centered: { flex: 1, justifyContent: "center", alignItems: "center" },
  pickerOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "center", padding: 20 },
  pickerContent: { borderRadius: 28, maxHeight: "80%", padding: 20, gap: 15 },
  pickerHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  pickerTitle: { fontSize: 18, fontWeight: "900" },
  pickerSearch: { height: 54, borderRadius: 18, flexDirection: "row", alignItems: "center", paddingHorizontal: 15 },
  pickerItem: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 15, borderBottomWidth: 1 },
  pickerItemName: { fontSize: 16, fontWeight: "700" },
});
