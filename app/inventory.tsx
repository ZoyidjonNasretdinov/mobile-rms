import React, { useState, useMemo, useEffect, useCallback } from "react";
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
import { io } from "socket.io-client";

const t = Translations.uz.inventory;
const common = Translations.uz.common;
const API_BASE_URL = CONFIG.API_BASE_URL;

export default function InventoryStatusScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme() ?? "light";
  const colors = Colors[colorScheme];

  const [items, setItems] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [stats, setStats] = useState<any[]>([]);
  const [recentLogs, setRecentLogs] = useState<any[]>([]);
  const [allStaffStock, setAllStaffStock] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState(common.all);
  const [activeView, setActiveView] = useState<"status" | "history">("status");

  // Distribution Modal State
  const [distributeModal, setDistributeModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [distQuantity, setDistQuantity] = useState("");
  const [selectedDept, setSelectedDept] = useState("oshpaz");

  // Category Management Modal
  const [catModal, setCatModal] = useState(false);
  const [newCatName, setNewCatName] = useState("");

  const departments = ["oshpaz", "salatchi", "shashlikchi", "bar", "ofisiant"];

  const fetchData = async () => {
    try {
      const token = await Storage.getItem("access_token");
      const headers = { Authorization: `Bearer ${token}` };

      const [itemsRes, catRes, statsRes, logsRes, staffStockRes] =
        await Promise.all([
          axios.get(`${API_BASE_URL}/inventory/products`, { headers }),
          axios.get(`${API_BASE_URL}/inventory/categories`, { headers }),
          axios.get(`${API_BASE_URL}/inventory/department-stats`, { headers }),
          axios.get(`${API_BASE_URL}/inventory/logs?limit=50`, { headers }),
          axios.get(`${API_BASE_URL}/inventory/all-staff-stock`, { headers }),
        ]);

      setItems(itemsRes.data);
      setCategories(catRes.data);
      setStats(statsRes.data);
      setRecentLogs(logsRes.data);
      setAllStaffStock(staffStockRes.data);
    } catch (error) {
      console.error("Fetch inventory error:", error);
      Alert.alert("Xato", "Ma'lumotlarni yuklashda xatolik yuz berdi");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchData();
    }, []),
  );

  useEffect(() => {
    const socket = io(API_BASE_URL, { transports: ["websocket"] });
    socket.on("stockUpdated", () => {
      fetchData();
    });
    socket.on("staffStockUpdated", () => {
      fetchData();
    });
    return () => {
      socket.disconnect();
    };
  }, []);

  const getStockColor = (qty: number) => {
    if (qty <= 0) return colors.danger;
    if (qty < 2) return "#FF4D4F"; // Red
    if (qty < 5) return "#FAAD14"; // Yellow/Orange
    return colors.primary;
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  const handleCreateCategory = async () => {
    if (!newCatName) return;
    try {
      const token = await Storage.getItem("access_token");
      await axios.post(
        `${API_BASE_URL}/inventory/categories`,
        { name: newCatName },
        { headers: { Authorization: `Bearer ${token}` } },
      );
      setNewCatName("");
      fetchData();
      Alert.alert("Muvaffaqiyat", "Kategoriya yaratildi");
    } catch {
      Alert.alert("Xato", "Kategoriya yaratib bo'lmadi");
    }
  };

  const [distributing, setDistributing] = useState(false);

  const handleDistribute = async () => {
    const qty = parseFloat(distQuantity);
    if (!selectedItem || !qty || isNaN(qty)) {
      Alert.alert("Xato", "Miqdorni to'g'ri kiriting");
      return;
    }

    setDistributing(true);
    try {
      const token = await Storage.getItem("access_token");
      await axios.post(
        `${API_BASE_URL}/inventory/distribute`,
        {
          productId: selectedItem._id,
          department: selectedDept,
          quantity: qty,
        },
        { headers: { Authorization: `Bearer ${token}` } },
      );
      setDistributeModal(false);
      setDistQuantity("");
      fetchData();
      Alert.alert("Muvaffaqiyat", "Mahsulot tarqatildi");
    } catch (error: any) {
      Alert.alert("Xato", error.response?.data?.message || "Xatolik yuz berdi");
    } finally {
      setDistributing(false);
    }
  };

  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      const matchesSearch = (item.name || "")
        .toLowerCase()
        .includes(searchQuery.toLowerCase());
      const categoryName = item.category || "";
      const matchesCategory =
        activeCategory === common.all || categoryName === activeCategory;
      return matchesSearch && matchesCategory;
    });
  }, [items, searchQuery, activeCategory]);

  const InventoryItem = ({ item }: { item: any }) => {
    const isLow = item.currentStock <= item.minThreshold;
    const isOut = item.currentStock === 0;

    let statusColor = colors.success;
    let statusLabel = t.inStock;

    if (isLow) {
      statusColor = colors.warning;
      statusLabel = t.lowStock;
    }
    if (isOut) {
      statusColor = colors.danger;
      statusLabel = t.outOfStock;
    }

    return (
      <View style={[styles.itemCard, { backgroundColor: colors.card }]}>
        <View style={styles.itemHeader}>
          <View
            style={[styles.itemIcon, { backgroundColor: colors.background }]}
          >
            <MaterialCommunityIcons
              name="package-variant-closed"
              size={24}
              color={colors.primary}
            />
          </View>
          <View style={styles.itemTitleArea}>
            <Text
              style={[styles.itemName, { color: colors.text }]}
              numberOfLines={1}
            >
              {item.name}
            </Text>
            <Text
              style={[styles.itemCategory, { color: colors.secondary }]}
              numberOfLines={1}
            >
              {item.category || "Kategoriyasiz"}
            </Text>
          </View>
          <View
            style={[
              styles.statusBadge,
              { backgroundColor: statusColor + "15" },
            ]}
          >
            <Text style={[styles.statusText, { color: statusColor }]}>
              {statusLabel}
            </Text>
          </View>
        </View>

        <View style={styles.stockInfo}>
          <View style={styles.stockRow}>
            <View>
              <Text style={[styles.stockLabel, { color: colors.secondary }]}>
                {t.quantity}
              </Text>
              <Text style={[styles.stockValue, { color: colors.text }]}>
                {item.currentStock} {item.unit}
              </Text>
            </View>
            <View style={{ alignItems: "flex-end" }}>
              <Text style={[styles.stockLabel, { color: colors.secondary }]}>
                Minimal miqdor
              </Text>
              <Text
                style={[
                  styles.stockValue,
                  { color: isLow ? colors.danger : colors.secondary },
                ]}
              >
                {item.minThreshold} {item.unit}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.itemActions}>
          <TouchableOpacity
            style={[
              styles.actionBtn,
              { borderColor: colors.border, borderWidth: 1 },
            ]}
            onPress={() =>
              router.push({
                pathname: "/create-product", // Redirect to product edit instead of legacy inventory edit
                params: {
                  id: item._id,
                  name: item.name,
                  category: item.category,
                  currentStock: item.currentStock.toString(),
                  unit: item.unit,
                  minThreshold: item.minThreshold.toString(),
                },
              })
            }
          >
            <MaterialCommunityIcons
              name="pencil-outline"
              size={22}
              color={colors.secondary}
            />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: colors.accent }]}
            onPress={() => {
              setSelectedItem(item);
              setDistributeModal(true);
            }}
          >
            <MaterialCommunityIcons
              name="truck-delivery-outline"
              size={22}
              color="white"
            />
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
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
        <View style={styles.headerTitleRow}>
          <View style={[styles.titleIcon, { backgroundColor: colors.accent }]}>
            <MaterialCommunityIcons
              name="package-variant-closed"
              size={24}
              color="white"
            />
          </View>
          <View>
            <Text style={[styles.headerTitle, { color: colors.text }]}>
              {t.title}
            </Text>
            <Text style={[styles.headerSubtitle, { color: colors.secondary }]}>
              Jami mahsulotlar: {items.length}
            </Text>
          </View>
        </View>
        <TouchableOpacity
          style={[
            styles.addButton,
            { backgroundColor: colors.primary, marginRight: 8 },
          ]}
          onPress={() => setCatModal(true)}
        >
          <MaterialCommunityIcons
            name="shape-outline"
            size={24}
            color="white"
          />
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.addButton, { backgroundColor: colors.accent }]}
          onPress={() => router.push("/create-product")}
        >
          <MaterialCommunityIcons name="plus" size={24} color="white" />
        </TouchableOpacity>
      </View>

      <View style={styles.viewTabs}>
        <TouchableOpacity
          style={[
            styles.viewTab,
            activeView === "status" && styles.activeViewTab,
          ]}
          onPress={() => setActiveView("status")}
        >
          <MaterialCommunityIcons
            name="package-variant"
            size={20}
            color={activeView === "status" ? "white" : colors.secondary}
          />
          <Text
            style={[
              styles.viewTabText,
              { color: activeView === "status" ? "white" : colors.secondary },
            ]}
          >
            Ombor Holati
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.viewTab,
            activeView === "history" && styles.activeViewTab,
          ]}
          onPress={() => setActiveView("history")}
        >
          <MaterialCommunityIcons
            name="history"
            size={20}
            color={activeView === "history" ? "white" : colors.secondary}
          />
          <Text
            style={[
              styles.viewTabText,
              { color: activeView === "history" ? "white" : colors.secondary },
            ]}
          >
            Chiqim Tarixi
          </Text>
        </TouchableOpacity>
      </View>

      {activeView === "status" ? (
        <>
          <View style={styles.searchContainer}>
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
                placeholder={t.searchPlaceholder}
                placeholderTextColor={colors.secondary}
                style={[styles.searchInput, { color: colors.text }]}
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
            </View>
          </View>

          <View style={styles.categoryScroll}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.categoryContainer}
            >
              <TouchableOpacity
                onPress={() => setActiveCategory(common.all)}
                style={[
                  styles.categoryBtn,
                  activeCategory === common.all && {
                    backgroundColor: colors.primary,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.categoryText,
                    activeCategory === common.all
                      ? { color: "white" }
                      : { color: colors.secondary },
                  ]}
                >
                  {common.all}
                </Text>
              </TouchableOpacity>
              {categories.map((cat) => (
                <TouchableOpacity
                  key={cat._id}
                  onPress={() => setActiveCategory(cat.name)}
                  style={[
                    styles.categoryBtn,
                    activeCategory === cat.name && {
                      backgroundColor: colors.primary,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.categoryText,
                      activeCategory === cat.name
                        ? { color: "white" }
                        : { color: colors.secondary },
                    ]}
                  >
                    {cat.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          <ScrollView
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
            }
          >
            <View style={styles.statsSection}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>
                {"Bo'limlardagi qoldiqlar"}
              </Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.statsScroll}
                contentContainerStyle={{ paddingBottom: 10 }}
              >
                {stats.map((s) => {
                  const deptStock = allStaffStock.filter(
                    (st) => st.userId === s._id,
                  );
                  const lowStockCount = deptStock.filter(
                    (i) => i.quantity < (i.productId?.minThreshold || 0),
                  ).length;

                  return (
                    <View
                      key={s._id}
                      style={[
                        styles.statCard,
                        {
                          backgroundColor: colors.card,
                          shadowColor: colors.primary,
                        },
                      ]}
                    >
                      <View style={styles.statHeader}>
                        <View style={styles.statTitleBox}>
                          <MaterialCommunityIcons
                            name={
                              s._id === "oshpaz"
                                ? "chef-hat"
                                : s._id === "bar"
                                  ? "glass-cocktail"
                                  : "account-group"
                            }
                            size={20}
                            color={colors.primary}
                          />
                          <Text
                            style={[styles.statDept, { color: colors.text }]}
                          >
                            {s._id.toUpperCase()}
                          </Text>
                        </View>
                        <View
                          style={[
                            styles.itemCountBadge,
                            {
                              backgroundColor:
                                lowStockCount > 0
                                  ? colors.danger + "15"
                                  : colors.primary + "10",
                            },
                          ]}
                        >
                          <Text
                            style={[
                              styles.itemCountText,
                              {
                                color:
                                  lowStockCount > 0
                                    ? colors.danger
                                    : colors.primary,
                              },
                            ]}
                          >
                            {lowStockCount > 0
                              ? `${lowStockCount} ta kam`
                              : `${deptStock.length} tur`}
                          </Text>
                        </View>
                      </View>

                      <View style={styles.miniStockList}>
                        {deptStock.slice(0, 5).map((st, idx) => (
                          <View key={idx} style={styles.miniStockRow}>
                            <Text
                              style={[
                                styles.miniStockText,
                                { color: colors.secondary },
                              ]}
                              numberOfLines={1}
                            >
                              {st.productId?.name || "Noma'lum"}
                            </Text>
                            <Text
                              style={[
                                styles.miniStockQty,
                                {
                                  color: getStockColor(st.quantity),
                                  fontWeight: "bold",
                                },
                              ]}
                            >
                              {Number(st.quantity).toLocaleString(undefined, {
                                maximumFractionDigits: 3,
                              })}{" "}
                              {st.productId?.unit || ""}
                            </Text>
                          </View>
                        ))}
                        {deptStock.length > 5 && (
                          <TouchableOpacity style={{ marginTop: 8 }}>
                            <Text
                              style={{
                                color: colors.primary,
                                fontSize: 11,
                                fontWeight: "600",
                              }}
                            >
                              Yana {deptStock.length - 5} ta mahsulot...
                            </Text>
                          </TouchableOpacity>
                        )}
                        {deptStock.length === 0 && (
                          <View style={styles.emptyMiniStock}>
                            <MaterialCommunityIcons
                              name="package-variant"
                              size={24}
                              color={colors.border}
                            />
                            <Text
                              style={{
                                color: colors.secondary,
                                fontSize: 12,
                                marginTop: 4,
                              }}
                            >
                              {"Bo'sh"}
                            </Text>
                          </View>
                        )}
                      </View>

                      <View style={styles.statDivider} />
                      <View style={styles.statFooter}>
                        <View>
                          <Text
                            style={{ fontSize: 10, color: colors.secondary }}
                          >
                            Jami hajm
                          </Text>
                          <Text
                            style={[
                              styles.statVal,
                              {
                                color: colors.text,
                                fontWeight: "bold",
                                fontSize: 15,
                              },
                            ]}
                          >
                            {s.totalQuantity.toLocaleString()}
                          </Text>
                        </View>
                        <MaterialCommunityIcons
                          name="chevron-right"
                          size={20}
                          color={colors.border}
                        />
                      </View>
                    </View>
                  );
                })}
              </ScrollView>
            </View>

            {loading ? (
              <ActivityIndicator size="large" color={colors.primary} />
            ) : filteredItems.length > 0 ? (
              filteredItems.map((item) => (
                <InventoryItem key={item._id} item={item} />
              ))
            ) : (
              <View style={styles.emptyContainer}>
                <MaterialCommunityIcons
                  name="package-variant"
                  size={64}
                  color={colors.border}
                />
                <Text style={[styles.emptyText, { color: colors.secondary }]}>
                  Hech narsa topilmadi
                </Text>
              </View>
            )}

            <View style={styles.bottomSpace} />
          </ScrollView>
        </>
      ) : (
        <ScrollView
          contentContainerStyle={styles.historyContainer}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        >
          {recentLogs.filter((log) => log.type === "OUT").length === 0 ? (
            <View style={styles.emptyContainer}>
              <MaterialCommunityIcons
                name="history"
                size={48}
                color={colors.secondary + "40"}
              />
              <Text style={[styles.emptyText, { color: colors.secondary }]}>
                {"Hozircha chiqim tarixi yo'q"}
              </Text>
            </View>
          ) : (
            recentLogs
              .filter((log) => log.type === "OUT")
              .map((log) => (
                <View
                  key={log._id}
                  style={[styles.logCard, { backgroundColor: colors.card }]}
                >
                  <View
                    style={[
                      styles.logIcon,
                      { backgroundColor: colors.accent + "15" },
                    ]}
                  >
                    <MaterialCommunityIcons
                      name="arrow-down-bold-outline"
                      size={24}
                      color={colors.accent}
                    />
                  </View>
                  <View style={styles.logBody}>
                    <View style={styles.logHeader}>
                      <Text style={[styles.logProduct, { color: colors.text }]}>
                        {log.productId?.name || "Noma'lum"}
                      </Text>
                      <Text style={[styles.logQty, { color: colors.accent }]}>
                        -
                        {log.quantity.toLocaleString(undefined, {
                          maximumFractionDigits: 3,
                        })}{" "}
                        {log.productId?.unit}
                      </Text>
                    </View>
                    <Text
                      style={[styles.logReason, { color: colors.secondary }]}
                      numberOfLines={1}
                    >
                      {log.reason || "Sabab ko'rsatilmagan"}
                    </Text>
                    <View style={styles.logFooter}>
                      <Text style={[styles.logUser, { color: colors.primary }]}>
                        <MaterialCommunityIcons
                          name="account-group"
                          size={12}
                        />{" "}
                        {log.fromUser || log.department || "Xodim"}
                      </Text>
                      <Text
                        style={[styles.logTime, { color: colors.secondary }]}
                      >
                        {new Date(log.createdAt).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}{" "}
                        | {new Date(log.createdAt).toLocaleDateString()}
                      </Text>
                    </View>
                  </View>
                </View>
              ))
          )}
          <View style={styles.bottomSpace} />
        </ScrollView>
      )}

      {/* Distribution Modal */}
      <Modal visible={distributeModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>
              Tarqatish: {selectedItem?.name}
            </Text>
            <Text style={[styles.label, { color: colors.secondary }]}>
              {"Bo'lim"}
            </Text>
            <View style={styles.deptGrid}>
              {departments.map((d) => (
                <TouchableOpacity
                  key={d}
                  onPress={() => setSelectedDept(d)}
                  style={[
                    styles.deptBtn,
                    selectedDept === d && { backgroundColor: colors.primary },
                  ]}
                >
                  <Text
                    style={[
                      styles.deptText,
                      selectedDept === d && { color: "white" },
                    ]}
                  >
                    {d}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <Text style={[styles.label, { color: colors.secondary }]}>
              Miqdori ({selectedItem?.unit})
            </Text>
            <TextInput
              style={[
                styles.modalInput,
                { color: colors.text, borderColor: colors.border },
              ]}
              placeholder="0.00"
              keyboardType="numeric"
              value={distQuantity}
              onChangeText={setDistQuantity}
            />
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalBtn, { backgroundColor: colors.input }]}
                onPress={() => setDistributeModal(false)}
              >
                <Text>Bekor qilish</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.modalBtn,
                  {
                    backgroundColor: colors.primary,
                    opacity: distributing ? 0.7 : 1,
                  },
                ]}
                onPress={handleDistribute}
                disabled={distributing}
              >
                {distributing ? (
                  <ActivityIndicator color="white" />
                ) : (
                  <Text style={{ color: "white", fontWeight: "bold" }}>
                    Tarqatish
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

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
              <View
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: 10,
                }}
              >
                <Text style={[styles.modalTitle, { color: colors.text }]}>
                  Kategoriyalar
                </Text>
                <TouchableOpacity onPress={() => setCatModal(false)}>
                  <MaterialCommunityIcons
                    name="close"
                    size={24}
                    color={colors.text}
                  />
                </TouchableOpacity>
              </View>
              <View style={{ maxHeight: 250, marginBottom: 15 }}>
                <ScrollView>
                  {categories.map((c) => (
                    <View key={c._id} style={styles.catRow}>
                      <Text style={{ color: colors.text }}>{c.name}</Text>
                      <TouchableOpacity
                        onPress={async () => {
                          const token = await Storage.getItem("access_token");
                          await axios.delete(
                            `${API_BASE_URL}/inventory/categories/${c._id}`,
                            { headers: { Authorization: `Bearer ${token}` } },
                          );
                          fetchData();
                        }}
                      >
                        <MaterialCommunityIcons
                          name="trash-can-outline"
                          size={20}
                          color={colors.danger}
                        />
                      </TouchableOpacity>
                    </View>
                  ))}
                  {categories.length === 0 && (
                    <Text
                      style={{
                        color: colors.secondary,
                        textAlign: "center",
                        padding: 20,
                      }}
                    >
                      {"Kategoriyalar yo'q"}
                    </Text>
                  )}
                </ScrollView>
              </View>
              <View style={styles.catInputRow}>
                <TextInput
                  style={[
                    styles.catInput,
                    { color: colors.text, borderColor: colors.border },
                  ]}
                  placeholder="Yangi kategoriya..."
                  value={newCatName}
                  onChangeText={setNewCatName}
                />
                <TouchableOpacity
                  style={[
                    styles.catAddBtn,
                    { backgroundColor: colors.primary },
                  ]}
                  onPress={handleCreateCategory}
                >
                  <MaterialCommunityIcons name="plus" size={24} color="white" />
                </TouchableOpacity>
              </View>
              <TouchableOpacity
                style={[
                  styles.modalBtn,
                  { backgroundColor: colors.input, marginTop: 10 },
                ]}
                onPress={() => setCatModal(false)}
              >
                <Text>Yopish</Text>
              </TouchableOpacity>
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
    paddingHorizontal: 20,
    paddingVertical: 15,
  },
  backButton: { padding: 8, marginRight: 12 },
  headerTitleRow: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  titleIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitle: { fontSize: 20, fontWeight: "bold" },
  headerSubtitle: { fontSize: 13 },
  addButton: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  searchContainer: { paddingHorizontal: 20, marginBottom: 16 },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    height: 50,
    borderRadius: 16,
    borderWidth: 1,
  },
  searchInput: { flex: 1, marginLeft: 10, fontSize: 15 },
  categoryScroll: { marginBottom: 16 },
  categoryContainer: { paddingHorizontal: 20, gap: 8 },
  categoryBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: "rgba(0,0,0,0.03)",
  },
  categoryText: { fontSize: 13, fontWeight: "600" },
  scrollContent: { paddingHorizontal: 20 },
  itemCard: {
    borderRadius: 24,
    padding: 16,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  itemHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 16,
    gap: 12,
  },
  itemIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
  },
  itemTitleArea: { flex: 1, justifyContent: "center" },
  itemName: { fontSize: 16, fontWeight: "bold", marginBottom: 2 },
  itemCategory: { fontSize: 13, fontWeight: "500" },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    alignSelf: "flex-start",
  },
  statusText: { fontSize: 10, fontWeight: "bold" },
  stockInfo: { marginBottom: 20 },
  stockRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  stockLabel: {
    fontSize: 11,
    fontWeight: "500",
    textTransform: "uppercase",
    marginBottom: 2,
  },
  stockValue: { fontSize: 16, fontWeight: "bold" },
  progressBarBg: {
    height: 8,
    borderRadius: 4,
    overflow: "hidden",
    marginTop: 8,
  },
  progressBarFill: { height: "100%", borderRadius: 4 },
  itemActions: { flexDirection: "row", gap: 10, marginTop: 4 },
  actionBtn: {
    width: 60,
    height: 48,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
  },
  emptyContainer: { alignItems: "center", marginTop: 60, gap: 16 },
  emptyText: { fontSize: 16, fontWeight: "600" },
  bottomSpace: { height: 100 },
  statsSection: { marginBottom: 20 },
  sectionTitle: { fontSize: 16, fontWeight: "bold", marginBottom: 10 },
  statsScroll: { gap: 10 },
  statCard: {
    width: 240,
    borderRadius: 24,
    padding: 16,
    marginRight: 16,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.05)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 4,
  },
  statHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  statTitleBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  itemCountBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
  },
  itemCountText: { fontSize: 11, fontWeight: "bold" },
  statDept: { fontSize: 14, fontWeight: "bold", letterSpacing: 0.5 },
  miniStockList: { gap: 8, height: 160 },
  miniStockRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  miniStockText: { fontSize: 13, flex: 1, marginRight: 8 },
  miniStockQty: { fontSize: 13 },
  emptyMiniStock: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    opacity: 0.5,
  },
  statDivider: {
    height: 1,
    backgroundColor: "rgba(0,0,0,0.05)",
    marginVertical: 12,
  },
  statFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  statVal: { fontSize: 14 },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    padding: 20,
  },
  modalContent: { borderRadius: 24, padding: 24, gap: 15 },
  modalTitle: { fontSize: 18, fontWeight: "bold" },
  label: { fontSize: 14, fontWeight: "600" },
  deptGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  deptBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: "rgba(0,0,0,0.05)",
  },
  deptText: { fontSize: 13, fontWeight: "500" },
  modalInput: {
    height: 50,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 15,
    fontSize: 16,
  },
  modalActions: { flexDirection: "row", gap: 10, marginTop: 10 },
  modalBtn: {
    flex: 1,
    height: 48,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  catRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(0,0,0,0.05)",
  },
  catInputRow: { flexDirection: "row", gap: 10 },
  catInput: {
    flex: 1,
    height: 48,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 15,
  },
  catAddBtn: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  logsSection: { marginTop: 10 },
  notificationBadge: {
    position: "absolute",
    top: 10,
    right: 15,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#EF4444",
    borderWidth: 1,
    borderColor: "white",
  },
  viewTabs: {
    flexDirection: "row",
    backgroundColor: "#F1F5F9",
    padding: 6,
    borderRadius: 16,
    marginHorizontal: 20,
    marginBottom: 20,
    marginTop: 10,
  },
  viewTab: {
    flex: 1,
    flexDirection: "row",
    paddingVertical: 10,
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 12,
    gap: 8,
  },
  activeViewTab: {
    backgroundColor: "#2563EB",
    shadowColor: "#2563EB",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  viewTabText: { fontSize: 13, fontWeight: "600" },
  historyContainer: { paddingVertical: 20, paddingHorizontal: 20 },
  logCard: {
    flexDirection: "row",
    padding: 15,
    borderRadius: 18,
    alignItems: "center",
    gap: 15,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
    marginBottom: 12,
  },
  logBody: { flex: 1, gap: 4 },
  logHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  logProduct: { fontSize: 15, fontWeight: "bold" },
  logFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 4,
  },
  logUser: { fontSize: 11, fontWeight: "600" },
  logIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: "center",
    alignItems: "center",
  },
  logTime: { fontSize: 11, marginTop: 2 },
  logQty: { fontSize: 14, fontWeight: "bold" },
  logReason: { fontSize: 13 },
});
