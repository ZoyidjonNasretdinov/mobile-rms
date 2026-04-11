import React, { useState, useCallback, useMemo } from "react";
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  RefreshControl,
  Modal,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { useRouter, useFocusEffect } from "expo-router";
import { Translations } from "@/constants/translations";
import { Storage } from "@/utils/storage";
import axios from "axios";
import { CONFIG } from "@/constants/config";
import * as Haptics from "expo-haptics";
import { socketService } from "@/utils/socket";

const t = Translations.uz.products;
const common = Translations.uz.common;
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

export default function ProductsScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme() ?? "light";
  const colors = Colors[colorScheme];

  const [products, setProducts] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("Barchasi");
  const [catModal, setCatModal] = useState(false);
  const [newCatName, setNewCatName] = useState("");
  const [editingCatId, setEditingCatId] = useState<string | null>(null);
  const [savingCat, setSavingCat] = useState(false);
  const [selectedIcon, setSelectedIcon] = useState("package-variant-closed");

  const iconList = [
    "food-steak",
    "carrot",
    "fruit-cherries",
    "bottle-wine-outline",
    "shaker-outline",
    "bread-slice",
    "cheese",
    "egg",
    "oil",
    "candy-outline",
    "grain",
    "rice",
    "fish",
    "leaf",
    "box-variant",
    "package-variant-closed",
  ];

  const fetchProducts = async () => {
    try {
      const token = await Storage.getItem("access_token");
      const headers = { Authorization: `Bearer ${token}` };
      const [prodRes, catRes] = await Promise.all([
        axios.get(`${API_BASE_URL}/inventory/products`, { headers }),
        axios.get(`${API_BASE_URL}/inventory/categories`, { headers }),
      ]);
      setProducts(prodRes.data);
      setCategories(catRes.data);
    } catch (error) {
      console.error("Fetch products error:", error);
      Alert.alert(common.error, "Ma'lumotlarni yuklab bo'mladi");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleSaveCategory = async () => {
    if (!newCatName.trim()) return;
    setSavingCat(true);
    try {
      const token = await Storage.getItem("access_token");
      const headers = { Authorization: `Bearer ${token}` };
      if (editingCatId) {
        await axios.patch(
          `${API_BASE_URL}/inventory/categories/${editingCatId}`,
          { name: newCatName, icon: selectedIcon },
          { headers },
        );
      } else {
        await axios.post(
          `${API_BASE_URL}/inventory/categories`,
          { name: newCatName, icon: selectedIcon },
          { headers },
        );
      }
      setNewCatName("");
      setEditingCatId(null);
      setSelectedIcon("package-variant-closed");
      fetchProducts();
    } catch (error) {
      Alert.alert(common.error, "Kategoriyani saqlab bo'lmadi");
    } finally {
      setSavingCat(false);
    }
  };

  const handleDeleteCategory = (id: string) => {
    Alert.alert(
      common.delete,
      "Haqiqatan ham ushbu kategoriyani o'chirmoqchimisiz? Bu mahsulotlarga ta'sir qilishi mumkin.",
      [
        { text: common.cancel, style: "cancel" },
        {
          text: common.delete,
          style: "destructive",
          onPress: async () => {
            try {
              const token = await Storage.getItem("access_token");
              await axios.delete(`${API_BASE_URL}/inventory/categories/${id}`, {
                headers: { Authorization: `Bearer ${token}` },
              });
              fetchProducts();
            } catch (error) {
              Alert.alert(common.error, "O'chirishda xatolik");
            }
          },
        },
      ],
    );
  };

  useFocusEffect(
    useCallback(() => {
      fetchProducts();

      const socket = socketService.getSocket();
      const handleUpdate = () => fetchProducts();

      socket.on("stockUpdated", handleUpdate);
      socket.on("transferCreated", handleUpdate);
      socket.on("transferUpdated", handleUpdate);

      return () => {
        socket.off("stockUpdated", handleUpdate);
        socket.off("transferCreated", handleUpdate);
        socket.off("transferUpdated", handleUpdate);
      };
    }, []),
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchProducts();
  };

  const handleDelete = (id: string) => {
    Alert.alert(
      common.delete,
      "Haqiqatan ham ushbu mahsulotni o'chirmoqchimisiz?",
      [
        { text: common.cancel, style: "cancel" },
        {
          text: common.delete,
          style: "destructive",
          onPress: async () => {
            try {
              const token = await Storage.getItem("access_token");
              await axios.delete(`${API_BASE_URL}/inventory/products/${id}`, {
                headers: { Authorization: `Bearer ${token}` },
              });
              fetchProducts();
            } catch (error) {
              Alert.alert(common.error, "O'chirishda xatolik");
            }
          },
        },
      ],
    );
  };

  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const matchesSearch = p.name
        .toLowerCase()
        .includes(searchQuery.toLowerCase());
      const matchesCategory =
        selectedCategory === "Barchasi" || p.category === selectedCategory;
      return matchesSearch && matchesCategory;
    });
  }, [products, searchQuery, selectedCategory]);

  const ProductCard = ({ product }: { product: any }) => {
    const categoryObj = categories.find((c) => c.name === product.category);
    const iconName = categoryObj?.icon || getCategoryIcon(product.category);

    return (
      <TouchableOpacity
        activeOpacity={0.7}
        style={[styles.card, { backgroundColor: colors.card }]}
        onPress={() =>
          router.push({
            pathname: "/create-product",
            params: {
              id: product._id,
              name: product.name,
              category: product.category,
              unit: product.unit,
            },
          })
        }
      >
        <View style={styles.cardHeader}>
          <View
            style={[styles.iconBox, { backgroundColor: colors.primary + "10" }]}
          >
            <MaterialCommunityIcons
              name={iconName as any}
              size={28}
              color={colors.primary}
            />
          </View>
          <View style={styles.titleInfo}>
            <Text style={[styles.name, { color: colors.text }]}>
              {product.name}
            </Text>
            <View style={styles.metaRow}>
              <View
                style={[
                  styles.badge,
                  { backgroundColor: colors.secondary + "15" },
                ]}
              >
                <Text style={[styles.badgeText, { color: colors.secondary }]}>
                  {product.category || "Kategoriyasiz"}
                </Text>
              </View>
              <Text style={[styles.unitText, { color: colors.secondary }]}>
                • {product.unit}
              </Text>
            </View>
          </View>
          <TouchableOpacity
            style={styles.deleteBtn}
            onPress={() => handleDelete(product._id)}
          >
            <MaterialCommunityIcons
              name="trash-can-outline"
              size={20}
              color={colors.danger}
            />
          </TouchableOpacity>
        </View>

        <View style={styles.cardFooter}>
          <Text style={[styles.tapToEdit, { color: colors.primary }]}>
            Tahrirlash uchun bosing
          </Text>
          <MaterialCommunityIcons
            name="chevron-right"
            size={18}
            color={colors.primary}
          />
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
    >
      <View style={styles.header}>
        <View>
          <Text style={[styles.welcomeText, { color: colors.secondary }]}>
            Omborxona
          </Text>
          <Text style={[styles.headerTitle, { color: colors.text }]}>
            {t.title}
          </Text>
        </View>
        <View style={styles.headerRight}>
          <TouchableOpacity
            onPress={() => setCatModal(true)}
            style={[styles.headerBtn, { backgroundColor: colors.card }]}
          >
            <MaterialCommunityIcons
              name="shape-outline"
              size={24}
              color={colors.primary}
            />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.addBtn, { backgroundColor: colors.primary }]}
            onPress={() => router.push("/create-product")}
          >
            <MaterialCommunityIcons name="plus" size={24} color="white" />
          </TouchableOpacity>
        </View>
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
            placeholder={t.searchPlaceholder}
            placeholderTextColor={colors.secondary}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
      </View>

      <View style={styles.categoriesSection}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoriesScroll}
        >
          {[
            "Barchasi",
            ...categories.map((c) => ({ name: c.name, icon: c.icon })),
          ].map((cat: any) => (
            <TouchableOpacity
              key={cat.name || cat}
              onPress={() => setSelectedCategory(cat.name || cat)}
              style={[
                styles.categoryTab,
                {
                  backgroundColor:
                    selectedCategory === (cat.name || cat)
                      ? colors.primary
                      : colors.card,
                },
              ]}
            >
              <View
                style={{ flexDirection: "row", alignItems: "center", gap: 6 }}
              >
                {(cat.icon || (cat !== "Barchasi" && getCategoryIcon(cat))) && (
                  <MaterialCommunityIcons
                    name={(cat.icon || getCategoryIcon(cat)) as any}
                    size={16}
                    color={
                      selectedCategory === (cat.name || cat)
                        ? "white"
                        : colors.secondary
                    }
                  />
                )}
                <Text
                  style={[
                    styles.categoryTabText,
                    {
                      color:
                        selectedCategory === (cat.name || cat)
                          ? "white"
                          : colors.secondary,
                    },
                  ]}
                >
                  {cat.name || cat}
                </Text>
              </View>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={colors.primary}
            />
          }
        >
          {filteredProducts.length === 0 ? (
            <View style={styles.empty}>
              <View
                style={[
                  styles.emptyIconCircle,
                  { backgroundColor: colors.card },
                ]}
              >
                <MaterialCommunityIcons
                  name="package-variant"
                  size={48}
                  color={colors.border}
                />
              </View>
              <Text style={[styles.emptyText, { color: colors.text }]}>
                Mahsulotlar topilmadi
              </Text>
              <Text style={[styles.emptySubText, { color: colors.secondary }]}>
                Qidiruv shartlarini o'zgartirib ko'ring yoki yangi mahsulot
                qo'shing
              </Text>
            </View>
          ) : (
            filteredProducts.map((p) => <ProductCard key={p._id} product={p} />)
          )}
        </ScrollView>
      )}

      {/* Category Management Modal */}
      <Modal visible={catModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            style={{ width: "100%" }}
          >
            <View
              style={[styles.modalContent, { backgroundColor: colors.card }]}
            >
              <View style={styles.modalHeader}>
                <Text style={[styles.modalTitle, { color: colors.text }]}>
                  Kategoriyalar
                </Text>
                <TouchableOpacity
                  onPress={() => {
                    setCatModal(false);
                    setEditingCatId(null);
                    setNewCatName("");
                    setSelectedIcon("package-variant-closed");
                  }}
                >
                  <MaterialCommunityIcons
                    name="close"
                    size={24}
                    color={colors.text}
                  />
                </TouchableOpacity>
              </View>

              <View style={{ maxHeight: 200, marginBottom: 20 }}>
                <ScrollView showsVerticalScrollIndicator={false}>
                  {categories.map((c) => (
                    <View key={c._id} style={styles.catEditRow}>
                      <View
                        style={{
                          flexDirection: "row",
                          alignItems: "center",
                          gap: 10,
                        }}
                      >
                        <MaterialCommunityIcons
                          name={(c.icon || "package-variant-closed") as any}
                          size={20}
                          color={colors.primary}
                        />
                        <Text
                          style={[styles.catEditName, { color: colors.text }]}
                        >
                          {c.name}
                        </Text>
                      </View>
                      <View style={{ flexDirection: "row", gap: 12 }}>
                        <TouchableOpacity
                          onPress={() => {
                            setEditingCatId(c._id);
                            setNewCatName(c.name);
                            setSelectedIcon(c.icon || "package-variant-closed");
                          }}
                          style={[
                            styles.catIconBtn,
                            { backgroundColor: colors.primary + "10" },
                          ]}
                        >
                          <MaterialCommunityIcons
                            name="pencil"
                            size={18}
                            color={colors.primary}
                          />
                        </TouchableOpacity>
                        <TouchableOpacity
                          onPress={() => handleDeleteCategory(c._id)}
                          style={[
                            styles.catIconBtn,
                            { backgroundColor: colors.danger + "10" },
                          ]}
                        >
                          <MaterialCommunityIcons
                            name="trash-can-outline"
                            size={18}
                            color={colors.danger}
                          />
                        </TouchableOpacity>
                      </View>
                    </View>
                  ))}
                  {categories.length === 0 && (
                    <Text
                      style={{
                        textAlign: "center",
                        color: colors.secondary,
                        marginTop: 20,
                      }}
                    >
                      Kategoriyalar yo'q
                    </Text>
                  )}
                </ScrollView>
              </View>

              <View style={{ marginBottom: 20 }}>
                <Text
                  style={{
                    fontSize: 13,
                    fontWeight: "700",
                    color: colors.secondary,
                    marginBottom: 12,
                    textTransform: "uppercase",
                  }}
                >
                  Icon tanlang
                </Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={{ gap: 12 }}
                >
                  {iconList.map((icon) => (
                    <TouchableOpacity
                      key={icon}
                      onPress={() => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        setSelectedIcon(icon);
                      }}
                      style={[
                        styles.iconPickerItem,
                        {
                          backgroundColor:
                            selectedIcon === icon
                              ? colors.primary
                              : colors.background,
                          borderColor:
                            selectedIcon === icon
                              ? colors.primary
                              : colors.border,
                        },
                      ]}
                    >
                      <MaterialCommunityIcons
                        name={icon as any}
                        size={24}
                        color={
                          selectedIcon === icon ? "white" : colors.secondary
                        }
                      />
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>

              <View style={styles.catInputRow}>
                <TextInput
                  style={[
                    styles.catInput,
                    {
                      color: colors.text,
                      borderColor: colors.border,
                      backgroundColor: colors.background,
                    },
                  ]}
                  placeholder="Kategoriya nomi..."
                  placeholderTextColor={colors.secondary}
                  value={newCatName}
                  onChangeText={setNewCatName}
                />
                <TouchableOpacity
                  style={[
                    styles.catAddBtn,
                    { backgroundColor: colors.primary },
                  ]}
                  onPress={handleSaveCategory}
                  disabled={savingCat}
                >
                  {savingCat ? (
                    <ActivityIndicator color="white" size="small" />
                  ) : (
                    <MaterialCommunityIcons
                      name={editingCatId ? "check" : "plus"}
                      size={24}
                      color="white"
                    />
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>
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
  welcomeText: {
    fontSize: 13,
    fontWeight: "600",
    marginBottom: 4,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  headerTitle: { fontSize: 28, fontWeight: "800" },
  backBtn: { padding: 8, marginLeft: -8 },
  addBtn: {
    width: 52,
    height: 52,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 5,
  },
  searchBox: { paddingHorizontal: 24, marginBottom: 20 },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    height: 54,
    borderRadius: 18,
    borderWidth: 1,
  },
  searchInput: { flex: 1, marginLeft: 12, fontSize: 16, fontWeight: "500" },
  categoriesSection: { marginBottom: 20 },
  categoriesScroll: { paddingHorizontal: 24, gap: 12 },
  categoryTab: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  categoryTabText: { fontSize: 14, fontWeight: "700" },
  list: { paddingHorizontal: 24, paddingBottom: 40 },
  centered: { flex: 1, justifyContent: "center", alignItems: "center" },
  card: {
    borderRadius: 24,
    padding: 20,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.05,
    shadowRadius: 15,
    elevation: 3,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.03)",
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
  },
  iconBox: {
    width: 56,
    height: 56,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
  },
  titleInfo: { flex: 1 },
  name: { fontSize: 18, fontWeight: "700", marginBottom: 6 },
  metaRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  badgeText: { fontSize: 11, fontWeight: "700", textTransform: "uppercase" },
  unitText: { fontSize: 13, fontWeight: "500" },
  deleteBtn: {
    width: 36,
    height: 36,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(255, 59, 48, 0.05)",
  },
  cardFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: "rgba(0,0,0,0.03)",
  },
  tapToEdit: { fontSize: 12, fontWeight: "600" },
  empty: { alignItems: "center", marginTop: 60, paddingHorizontal: 40 },
  emptyIconCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
  },
  emptyText: { fontSize: 20, fontWeight: "800", marginBottom: 10 },
  emptySubText: {
    fontSize: 14,
    textAlign: "center",
    lineHeight: 20,
    opacity: 0.7,
  },
  headerRight: { flexDirection: "row", alignItems: "center", gap: 12 },
  headerBtn: {
    width: 52,
    height: 52,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "center",
    padding: 24,
  },
  modalContent: { borderRadius: 32, padding: 24 },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 24,
  },
  modalTitle: { fontSize: 22, fontWeight: "800" },
  catEditRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(0,0,0,0.03)",
  },
  catEditName: { fontSize: 16, fontWeight: "600" },
  catIconBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  catInputRow: { flexDirection: "row", gap: 12, marginTop: 10 },
  catInput: {
    flex: 1,
    height: 54,
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 16,
    fontSize: 15,
    fontWeight: "500",
  },
  catAddBtn: {
    width: 54,
    height: 54,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
  },
  iconPickerItem: {
    width: 50,
    height: 50,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
  },
});
