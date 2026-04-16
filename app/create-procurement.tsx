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
import { useRouter } from "expo-router";
// import { Translations } from "@/constants/translations";
import { Storage } from "@/utils/storage";
import axios from "axios";
import { CONFIG } from "@/constants/config";

const API_BASE_URL = CONFIG.API_BASE_URL;

const getCategoryIcon = (category?: string) => {
  const name = category?.toLowerCase().trim() || "";
  if (
    name.includes("go'sht") ||
    name.includes("gosht") ||
    name.includes("meat")
  )
    return "food-steak";
  if (name.includes("sabzavot") || name.includes("veg")) return "carrot";
  if (name.includes("meva") || name.includes("fruit")) return "fruit-cherries";
  if (
    name.includes("ichimlik") ||
    name.includes("drink") ||
    name.includes("suv")
  )
    return "bottle-wine-outline";
  if (name.includes("ziravor") || name.includes("spice"))
    return "shaker-outline";
  if (name.includes("non") || name.includes("bread")) return "bread-slice";
  if (name.includes("sut") || name.includes("dairy")) return "cheese";
  if (name.includes("tuxum") || name.includes("egg")) return "egg";
  if (name.includes("yog'") || name.includes("yog") || name.includes("oil"))
    return "oil";
  if (name.includes("shirinlik") || name.includes("sweet"))
    return "candy-outline";
  if (name.includes("un") || name.includes("flour")) return "grain";
  if (name.includes("guruch") || name.includes("rice")) return "rice";
  return "package-variant-closed";
};

export default function CreateProcurementScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme() ?? "light";
  const colors = Colors[colorScheme];
  const insets = useSafeAreaInsets();

  const [items, setItems] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  // const [fetchingData, setFetchingData] = useState(true);
  const [showProductModal, setShowProductModal] = useState(false);
  const [productSearch, setProductSearch] = useState("");

  const [form, setForm] = useState({
    item: "",
    itemId: "",
    price: "",
    quantity: "",
    unit: "ta",
    category: "",
    supplier: "",
    source: "cashier",
  });

  const sources = [
    { label: "Kassir", value: "cashier" },
    { label: "Direktor", value: "owner" },
    { label: "Hamkor 1", value: "partner1" },
    { label: "Hamkor 2", value: "partner2" },
  ];

  // const units = ["kg", "litr", "ta", "bog'", "blok", "metr"];

  useEffect(() => {
    const fetchData = async () => {
      try {
        const token = await Storage.getItem("access_token");
        const headers = { Authorization: `Bearer ${token}` };
        const [itemsRes, catRes] = await Promise.all([
          axios.get(`${API_BASE_URL}/inventory/products`, { headers }),
          axios.get(`${API_BASE_URL}/inventory/categories`, { headers }),
        ]);
        setItems(itemsRes.data);
        setCategories(catRes.data);
      } catch (error) {
        console.error("Fetch data error:", error);
      } finally {
        // setFetchingData(false);
      }
    };
    fetchData();
  }, []);

  const handleSave = async () => {
    if (!form.item || !form.price || !form.quantity || !form.category) {
      Alert.alert("Xato", "Barcha majdonlarni to'ldiring");
      return;
    }

    const parsedPrice = parseFloat(form.price);
    const parsedQty = parseFloat(form.quantity);

    if (isNaN(parsedPrice) || isNaN(parsedQty)) {
      Alert.alert("Xato", "Narxi va miqdori raqam bo'lishi kerak");
      return;
    }

    setLoading(true);
    try {
      const token = await Storage.getItem("access_token");
      await axios.post(
        `${API_BASE_URL}/procurement`,
        {
          ...form,
          price: parsedPrice,
          quantity: parsedQty,
        },
        { headers: { Authorization: `Bearer ${token}` } },
      );
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert("Muvaffaqiyat", "Xarid saqlandi");
      router.back();
    } catch (error: any) {
      console.error(
        "Procurement Create Error:",
        error.response?.data || error.message,
      );
      const errMsg =
        error.response?.data?.message || "Saqlashda xatolik yuz berdi";
      Alert.alert("Xato", Array.isArray(errMsg) ? errMsg.join(", ") : errMsg);
    } finally {
      setLoading(false);
    }
  };

  const selectInventoryItem = (item: any) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setForm({
      ...form,
      item: item.name,
      itemId: item._id,
      unit: item.unit,
      category: item.category,
    });
    setShowProductModal(false);
  };

  useEffect(() => {
    // Auto-match name to product
    if (form.item && !form.itemId) {
      const match = items.find(
        (i) => i.name.toLowerCase() === form.item.toLowerCase(),
      );
      if (match) {
        setForm((prev) => ({
          ...prev,
          itemId: match._id,
          unit: match.unit,
          category: match.category,
        }));
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
    }
  }, [form.item, items]);

  const filteredItems = items.filter((i) =>
    i.name.toLowerCase().includes(productSearch.toLowerCase()),
  );

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
            style={[styles.headerBtn, { backgroundColor: colors.card }]}
          >
            <MaterialCommunityIcons
              name="arrow-left"
              size={24}
              color={colors.text}
            />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.text }]}>
            Yangi xarid
          </Text>
          <View style={{ width: 44 }} />
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.formSection}>
            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: colors.secondary }]}>
                Mahsulot nomi
              </Text>
              <View
                style={[
                  styles.productSelectorGroup,
                  {
                    backgroundColor: colors.card,
                    borderColor: form.itemId ? colors.primary : colors.border,
                  },
                ]}
              >
                <TextInput
                  style={[styles.nameInput, { color: colors.text }]}
                  placeholder="Mahsulot nomini kiriting..."
                  placeholderTextColor={colors.secondary}
                  value={form.item}
                  onChangeText={(val) => {
                    // Reset itemId if name changes and we aren't picking from list
                    setForm({ ...form, item: val, itemId: "" });
                  }}
                />
                <TouchableOpacity
                  onPress={() => setShowProductModal(true)}
                  style={[
                    styles.listBtn,
                    { backgroundColor: colors.accent + "15" },
                  ]}
                >
                  <MaterialCommunityIcons
                    name="format-list-bulleted"
                    size={20}
                    color={colors.accent}
                  />
                </TouchableOpacity>
              </View>
              {form.itemId ? (
                <View style={styles.linkedBadge}>
                  <MaterialCommunityIcons
                    name="check-circle"
                    size={14}
                    color={colors.success}
                  />
                  <Text style={[styles.linkedText, { color: colors.success }]}>
                    {"Omborga bog'langan"}
                  </Text>
                </View>
              ) : (
                <Text style={[styles.hintText, { color: colors.secondary }]}>
                  Ombordan tanlang yoki nomini kiriting
                </Text>
              )}
            </View>

            <View style={styles.row}>
              <View style={[styles.inputGroup, { flex: 1 }]}>
                <Text style={[styles.label, { color: colors.secondary }]}>
                  Miqdori
                </Text>
                <View
                  style={[
                    styles.inputContainer,
                    {
                      backgroundColor: colors.card,
                      borderColor: colors.border,
                    },
                  ]}
                >
                  <TextInput
                    style={[styles.input, { color: colors.text }]}
                    placeholder="0"
                    placeholderTextColor={colors.secondary}
                    keyboardType="numeric"
                    value={form.quantity}
                    onChangeText={(val) => setForm({ ...form, quantity: val })}
                  />
                  <Text style={[styles.unitBadge, { color: colors.primary }]}>
                    {form.unit}
                  </Text>
                </View>
              </View>
              <View style={[styles.inputGroup, { flex: 1.2 }]}>
                <Text style={[styles.label, { color: colors.secondary }]}>
                  Narxi (Jami)
                </Text>
                <View
                  style={[
                    styles.inputContainer,
                    {
                      backgroundColor: colors.card,
                      borderColor: colors.border,
                    },
                  ]}
                >
                  <TextInput
                    style={[styles.input, { color: colors.text }]}
                    placeholder="0"
                    placeholderTextColor={colors.secondary}
                    keyboardType="numeric"
                    value={form.price}
                    onChangeText={(val) => setForm({ ...form, price: val })}
                  />
                  <Text style={[styles.unitBadge, { color: colors.secondary }]}>
                    UZS
                  </Text>
                </View>
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: colors.secondary }]}>
                Kategoriya
              </Text>
              <View style={styles.chipGrid}>
                {categories.map((c) => (
                  <TouchableOpacity
                    key={c._id}
                    onPress={() => {
                      setForm({ ...form, category: c.name });
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    }}
                    style={[
                      styles.catChip,
                      {
                        backgroundColor:
                          form.category === c.name
                            ? colors.primary
                            : colors.card,
                      },
                    ]}
                  >
                    <MaterialCommunityIcons
                      name={getCategoryIcon(c.name) as any}
                      size={16}
                      color={form.category === c.name ? "white" : colors.text}
                      style={{ marginRight: 6 }}
                    />
                    <Text
                      style={{
                        color: form.category === c.name ? "white" : colors.text,
                        fontSize: 12,
                        fontWeight: "600",
                      }}
                    >
                      {c.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: colors.text }]}>
                {"To'lov manbasi"}
              </Text>
              <View style={styles.chipGrid}>
                {sources.map((s) => (
                  <TouchableOpacity
                    key={s.value}
                    onPress={() => setForm({ ...form, source: s.value })}
                    style={[
                      styles.sourceChip,
                      {
                        backgroundColor:
                          form.source === s.value
                            ? colors.secondary
                            : colors.card,
                      },
                    ]}
                  >
                    <Text
                      style={{
                        color: form.source === s.value ? "white" : colors.text,
                      }}
                    >
                      {s.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: colors.secondary }]}>
                Yetkazib beruvchi / Joy
              </Text>
              <View
                style={[
                  styles.inputContainer,
                  { backgroundColor: colors.card, borderColor: colors.border },
                ]}
              >
                <MaterialCommunityIcons
                  name="map-marker-outline"
                  size={20}
                  color={colors.secondary}
                />
                <TextInput
                  style={[styles.input, { color: colors.text, marginLeft: 8 }]}
                  placeholder="Masalan: Chorsu bozori"
                  placeholderTextColor={colors.secondary}
                  value={form.supplier}
                  onChangeText={(val) => setForm({ ...form, supplier: val })}
                />
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

        {/* Product Selection Modal */}
        <Modal visible={showProductModal} animationType="slide">
          <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
            <View style={styles.modalHeader}>
              <TouchableOpacity
                onPress={() => setShowProductModal(false)}
                style={[styles.headerBtn, { backgroundColor: colors.card }]}
              >
                <MaterialCommunityIcons
                  name="close"
                  size={24}
                  color={colors.text}
                />
              </TouchableOpacity>
              <Text style={[styles.modalTitle, { color: colors.text }]}>
                Mahsulotni tanlang
              </Text>
              <View style={{ width: 44 }} />
            </View>

            <View style={styles.searchBox}>
              <View
                style={[
                  styles.searchBar,
                  { backgroundColor: colors.card, borderColor: colors.border },
                ]}
              >
                <MaterialCommunityIcons
                  name="magnify"
                  size={20}
                  color={colors.secondary}
                />
                <TextInput
                  style={[styles.searchInput, { color: colors.text }]}
                  placeholder="Mahsulot qidirish..."
                  placeholderTextColor={colors.secondary}
                  value={productSearch}
                  onChangeText={setProductSearch}
                />
              </View>
            </View>

            <ScrollView contentContainerStyle={styles.productList}>
              {filteredItems.map((item) => (
                <TouchableOpacity
                  key={item._id}
                  onPress={() => selectInventoryItem(item)}
                  style={[
                    styles.productOption,
                    { backgroundColor: colors.card },
                  ]}
                >
                  <View
                    style={[
                      styles.optionIcon,
                      { backgroundColor: colors.primary + "10" },
                    ]}
                  >
                    <MaterialCommunityIcons
                      name={
                        (categories.find((c) => c.name === item.category)
                          ?.icon || getCategoryIcon(item.category)) as any
                      }
                      size={24}
                      color={colors.primary}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.optionName, { color: colors.text }]}>
                      {item.name}
                    </Text>
                    <Text style={{ color: colors.secondary, fontSize: 12 }}>
                      {item.category} • {item.unit}
                    </Text>
                  </View>
                  <MaterialCommunityIcons
                    name="chevron-right"
                    size={20}
                    color={colors.border}
                  />
                </TouchableOpacity>
              ))}
              {filteredItems.length === 0 && (
                <View style={styles.emptyResults}>
                  <MaterialCommunityIcons
                    name="package-variant-closed-remove"
                    size={64}
                    color={colors.border}
                  />
                  <Text style={{ color: colors.secondary, marginTop: 12 }}>
                    Hech narsa topilmadi
                  </Text>
                </View>
              )}
            </ScrollView>
          </SafeAreaView>
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
    paddingHorizontal: 24,
    paddingVertical: 16,
  },
  headerBtn: {
    width: 44,
    height: 44,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 1,
  },
  headerTitle: { fontSize: 20, fontWeight: "800" },
  scrollContent: { paddingHorizontal: 24, paddingBottom: 40 },
  formSection: { gap: 24 },
  label: {
    fontSize: 13,
    fontWeight: "700",
    marginBottom: 8,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  inputGroup: { gap: 4 },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    height: 56,
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 16,
  },
  input: { flex: 1, fontSize: 16, fontWeight: "500" },
  unitBadge: { fontSize: 14, fontWeight: "700", marginLeft: 8 },
  productSelectorGroup: {
    flexDirection: "row",
    alignItems: "center",
    height: 64,
    borderRadius: 18,
    borderWidth: 1.5,
    paddingHorizontal: 16,
    gap: 12,
  },
  nameInput: {
    flex: 1,
    fontSize: 16,
    fontWeight: "600",
  },
  listBtn: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  linkedBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 6,
    paddingLeft: 4,
  },
  linkedText: {
    fontSize: 12,
    fontWeight: "700",
  },
  hintText: {
    fontSize: 11,
    marginTop: 6,
    paddingLeft: 4,
    fontStyle: "italic",
  },
  selectorInfo: { flexDirection: "row", alignItems: "center", gap: 12 },
  selectorText: { fontSize: 16, fontWeight: "600" },
  row: { flexDirection: "row", gap: 16 },
  chipGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  unitChip: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 12,
    minWidth: 60,
    alignItems: "center",
  },
  sourceChip: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12 },
  catChip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    flexDirection: "row",
    alignItems: "center",
  },
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
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 5,
  },
  submitBtnText: { color: "white", fontSize: 18, fontWeight: "bold" },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 24,
  },
  modalTitle: { fontSize: 20, fontWeight: "800" },
  searchBox: { paddingHorizontal: 24, marginBottom: 16 },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    height: 56,
    borderRadius: 18,
    borderWidth: 1,
    paddingHorizontal: 16,
  },
  searchInput: { flex: 1, marginLeft: 12, fontSize: 16, fontWeight: "500" },
  productList: { paddingHorizontal: 24, gap: 12, paddingBottom: 40 },
  productOption: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderRadius: 18,
    gap: 16,
  },
  optionIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
  },
  optionName: { fontSize: 16, fontWeight: "700" },
  emptyResults: { alignItems: "center", marginTop: 100 },
});
