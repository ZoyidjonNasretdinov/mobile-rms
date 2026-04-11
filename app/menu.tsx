import React, { useState, useEffect, useMemo } from "react";
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  RefreshControl,
  ActivityIndicator,
  Modal,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { useRouter } from "expo-router";
import { Translations } from "@/constants/translations";
import { Storage } from "@/utils/storage";
import axios from "axios";
import { CONFIG } from "@/constants/config";

const API_BASE_URL = CONFIG.API_BASE_URL;
const t = Translations.uz.menu;
const common = Translations.uz.common;

export default function MenuScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme() ?? "light";
  const colors = Colors[colorScheme];

  const [categories, setCategories] = useState<any[]>([]);
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);

  const [catModal, setCatModal] = useState(false);
  const [newCatName, setNewCatName] = useState("");
  const [editingCatId, setEditingCatId] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      const token = await Storage.getItem("access_token");
      const headers = { Authorization: `Bearer ${token}` };
      const [catRes, itemRes] = await Promise.all([
        axios.get(`${API_BASE_URL}/menu/categories`, { headers }),
        axios.get(`${API_BASE_URL}/menu/items`, { headers }),
      ]);
      setCategories(catRes.data);
      setItems(itemRes.data);
      if (catRes.data.length > 0 && !activeCategory) {
        setActiveCategory(catRes.data[0]._id);
      }
    } catch (error) {
      console.error("Fetch menu error:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  const handleSaveCategory = async () => {
    if (!newCatName) return;
    try {
      const token = await Storage.getItem("access_token");
      const headers = { Authorization: `Bearer ${token}` };
      if (editingCatId) {
        await axios.patch(
          `${API_BASE_URL}/menu/categories/${editingCatId}`,
          { name: newCatName },
          { headers },
        );
      } else {
        await axios.post(
          `${API_BASE_URL}/menu/categories`,
          { name: newCatName },
          { headers },
        );
      }
      setNewCatName("");
      setEditingCatId(null);
      fetchData();
    } catch (error) {
      Alert.alert("Xato", "Kategoriyani saqlab bo'lmadi");
    }
  };

  const handleDeleteCategory = async (id: string) => {
    Alert.alert("O'chirish", "Haqiqatan ham bu kategoriyani o'chirasizmi?", [
      { text: "Bekor qilish", style: "cancel" },
      {
        text: "O'chirish",
        style: "destructive",
        onPress: async () => {
          try {
            const token = await Storage.getItem("access_token");
            await axios.delete(`${API_BASE_URL}/menu/categories/${id}`, {
              headers: { Authorization: `Bearer ${token}` },
            });
            fetchData();
          } catch (error) {
            Alert.alert("Xato", "O'chirib bo'lmadi");
          }
        },
      },
    ]);
  };

  const handleDeleteItem = async (id: string) => {
    Alert.alert("O'chirish", "Haqiqatan ham bu taomni o'chirasizmi?", [
      { text: "Bekor qilish", style: "cancel" },
      {
        text: "O'chirish",
        style: "destructive",
        onPress: async () => {
          try {
            const token = await Storage.getItem("access_token");
            await axios.delete(`${API_BASE_URL}/menu/items/${id}`, {
              headers: { Authorization: `Bearer ${token}` },
            });
            fetchData();
          } catch (error) {
            Alert.alert("Xato", "O'chirib bo'lmadi");
          }
        },
      },
    ]);
  };

  const filteredItems = useMemo(() => {
    if (!activeCategory) return items;
    return items.filter((i) => i.categoryId?._id === activeCategory);
  }, [items, activeCategory]);

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
      edges={["top", "left", "right"]}
    >
      <View style={styles.header}>
        <View>
          <Text style={[styles.welcomeText, { color: colors.secondary }]}>
            Restoran
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
            onPress={() => router.push("/create-menu-item")}
            style={[styles.addBtn, { backgroundColor: colors.primary }]}
          >
            <MaterialCommunityIcons name="plus" size={24} color="white" />
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.catScrollWrapper}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.catRowContainer}
        >
          {categories.map((cat) => (
            <TouchableOpacity
              key={cat._id}
              onPress={() => setActiveCategory(cat._id)}
              style={[
                styles.catChip,
                {
                  backgroundColor:
                    activeCategory === cat._id ? colors.primary : colors.card,
                },
              ]}
            >
              <Text
                style={[
                  styles.catChipText,
                  {
                    color:
                      activeCategory === cat._id ? "white" : colors.secondary,
                  },
                ]}
              >
                {cat.name}
              </Text>
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
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={colors.primary}
            />
          }
        >
          {filteredItems.map((item) => (
            <TouchableOpacity
              key={item._id}
              activeOpacity={0.7}
              onPress={() =>
                router.push({
                  pathname: "/create-menu-item",
                  params: { id: item._id },
                })
              }
              style={[styles.itemCard, { backgroundColor: colors.card }]}
            >
              <View style={styles.itemMain}>
                <View
                  style={[
                    styles.itemIcon,
                    { backgroundColor: colors.accent + "10" },
                  ]}
                >
                  <MaterialCommunityIcons
                    name="silverware-variant"
                    size={24}
                    color={colors.accent}
                  />
                </View>
                <View style={styles.itemInfo}>
                  <Text style={[styles.itemName, { color: colors.text }]}>
                    {item.name}
                  </Text>
                  <Text style={[styles.itemPrice, { color: colors.secondary }]}>
                    {item.price.toLocaleString()} {common.currency}
                  </Text>
                </View>
                <TouchableOpacity
                  style={styles.deleteBtn}
                  onPress={() => handleDeleteItem(item._id)}
                >
                  <MaterialCommunityIcons
                    name="trash-can-outline"
                    size={20}
                    color={colors.danger}
                  />
                </TouchableOpacity>
              </View>

              <View style={styles.itemFooter}>
                <View
                  style={[
                    styles.statusBadge,
                    {
                      backgroundColor: item.isAvailable
                        ? colors.success + "10"
                        : colors.danger + "10",
                    },
                  ]}
                >
                  <View
                    style={[
                      styles.statusDot,
                      {
                        backgroundColor: item.isAvailable
                          ? colors.success
                          : colors.danger,
                      },
                    ]}
                  />
                  <Text
                    style={{
                      color: item.isAvailable ? colors.success : colors.danger,
                      fontSize: 11,
                      fontWeight: "bold",
                    }}
                  >
                    {item.isAvailable ? t.available : t.unavailable}
                  </Text>
                </View>
                <Text style={[styles.tapToEdit, { color: colors.primary }]}>
                  Tahrirlash
                </Text>
              </View>
            </TouchableOpacity>
          ))}
          {filteredItems.length === 0 && (
            <View style={styles.emptyContainer}>
              <View
                style={[
                  styles.emptyIconCircle,
                  { backgroundColor: colors.card },
                ]}
              >
                <MaterialCommunityIcons
                  name="silverware-variant"
                  size={48}
                  color={colors.border}
                />
              </View>
              <Text style={[styles.emptyText, { color: colors.text }]}>
                Taomlar topilmadi
              </Text>
              <Text style={[styles.emptySubText, { color: colors.secondary }]}>
                Ushbu kategoriyada hali taomlar qo'shilmagan
              </Text>
            </View>
          )}
        </ScrollView>
      )}

      {/* Category Modal */}
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
                  {t.categories}
                </Text>
                <TouchableOpacity
                  onPress={() => {
                    setCatModal(false);
                    setEditingCatId(null);
                    setNewCatName("");
                  }}
                >
                  <MaterialCommunityIcons
                    name="close"
                    size={24}
                    color={colors.text}
                  />
                </TouchableOpacity>
              </View>
              <View style={{ maxHeight: 300, marginBottom: 20 }}>
                <ScrollView showsVerticalScrollIndicator={false}>
                  {categories.map((c) => (
                    <View key={c._id} style={styles.catEditRow}>
                      <Text
                        style={[styles.catEditName, { color: colors.text }]}
                      >
                        {c.name}
                      </Text>
                      <View style={{ flexDirection: "row", gap: 12 }}>
                        <TouchableOpacity
                          onPress={() => {
                            setEditingCatId(c._id);
                            setNewCatName(c.name);
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
                >
                  <MaterialCommunityIcons
                    name={editingCatId ? "check" : "plus"}
                    size={24}
                    color="white"
                  />
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
  catScrollWrapper: { marginBottom: 10 },
  catRowContainer: { paddingHorizontal: 24, gap: 12 },
  catChip: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
  },
  catChipText: { fontSize: 14, fontWeight: "700" },
  scrollContent: { paddingHorizontal: 24, paddingBottom: 40 },
  centered: { flex: 1, justifyContent: "center", alignItems: "center" },
  itemCard: {
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
  itemMain: { flexDirection: "row", alignItems: "center", gap: 16 },
  itemIcon: {
    width: 56,
    height: 56,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
  },
  itemInfo: { flex: 1 },
  itemName: { fontSize: 18, fontWeight: "700", marginBottom: 4 },
  itemPrice: { fontSize: 15, fontWeight: "600" },
  deleteBtn: {
    width: 36,
    height: 36,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(255, 59, 48, 0.05)",
  },
  itemFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: "rgba(0,0,0,0.03)",
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
  },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  tapToEdit: { fontSize: 12, fontWeight: "600" },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "center",
    padding: 24,
  },
  modalContent: {
    borderRadius: 32,
    padding: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 10,
  },
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
  emptyContainer: {
    alignItems: "center",
    marginTop: 60,
    paddingHorizontal: 40,
  },
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
});
