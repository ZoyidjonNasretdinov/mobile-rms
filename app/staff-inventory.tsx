import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  TextInput,
  Dimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { useRouter, useLocalSearchParams } from "expo-router";
import { Storage } from "@/utils/storage";
import axios from "axios";
import { CONFIG } from "@/constants/config";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const API_BASE_URL = CONFIG.API_BASE_URL;

export default function StaffInventoryScreen() {
  const router = useRouter();
  const { dept: paramDept } = useLocalSearchParams();
  const colorScheme = useColorScheme() ?? "light";
  const colors = Colors[colorScheme];

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [deptTabs, setDeptTabs] = useState<Record<string, "Stock" | "History">>(
    {},
  );
  const [pendingTransfers, setPendingTransfers] = useState<any[]>([]);
  const [myStock, setMyStock] = useState<any[]>([]);
  const [transferHistory, setTransferHistory] = useState<any[]>([]);
  const [inventorySearch, setInventorySearch] = useState("");
  const [user, setUser] = useState<any>(null);
  const userRef = useRef<any>(null);

  const fetchInventory = useCallback(async () => {
    try {
      const token = await Storage.getItem("access_token");
      const userStr = await Storage.getItem("user");
      let currentUser = userRef.current;

      if (userStr && !currentUser) {
        currentUser = JSON.parse(userStr);
        setUser(currentUser);
        userRef.current = currentUser;
      }

      if (!currentUser) return;

      const roles = paramDept
        ? [paramDept as string]
        : [currentUser.role, ...(currentUser.extraRoles || [])].filter(Boolean);

      const results = await Promise.all(
        roles.map(async (role) => {
          const dept = role.toLowerCase();
          const [transfersRes, stockRes, historyRes] = await Promise.all([
            axios.get(`${API_BASE_URL}/inventory/transfers/${dept}`, {
              headers: { Authorization: `Bearer ${token}` },
            }),
            axios.get(`${API_BASE_URL}/inventory/staff/${dept}`, {
              headers: { Authorization: `Bearer ${token}` },
            }),
            axios.get(`${API_BASE_URL}/inventory/transfers/history/${dept}`, {
              headers: { Authorization: `Bearer ${token}` },
            }),
          ]);
          return {
            dept,
            transfers: transfersRes.data,
            stock: stockRes.data,
            history: historyRes.data,
          };
        }),
      );

      const allTransfers = results.flatMap((r) => r.transfers);
      const allStock = results.flatMap((r) =>
        r.stock.map((s: any) => ({ ...s, dept: r.dept })),
      );
      const allHistory = results
        .flatMap((r) => r.history.map((h: any) => ({ ...h, dept: r.dept })))
        .sort(
          (a: any, b: any) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
        );

      setPendingTransfers(allTransfers);
      setMyStock(allStock);
      setTransferHistory(allHistory);
    } catch (error) {
      console.error("Staff Inventory fetch error:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchInventory();
  }, [fetchInventory]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchInventory();
  };

  const handleConfirmTransfer = async (transferId: string, status: string) => {
    // Optimistic UI update to prevent double clicking and 400 error
    setPendingTransfers(prev => prev.filter(t => t._id !== transferId));
    
    try {
      const token = await Storage.getItem("access_token");
      await axios.post(
        `${API_BASE_URL}/inventory/transfers/${transferId}/confirm`,
        { status },
        { headers: { Authorization: `Bearer ${token}` } },
      );
      fetchInventory();
    } catch (error) {
      // Revert if error occurs
      fetchInventory();
      console.error("Confirm transfer error:", error);
    }
  };

  const grouped = myStock.reduce((acc: any, item: any) => {
    const dept = item.dept || "noma'lum";
    if (!acc[dept]) acc[dept] = [];
    acc[dept].push(item);
    return acc;
  }, {});

  const depts = [
    ...(user?.role ? [user.role.toLowerCase()] : []),
    ...(user?.extraRoles?.map((r: string) => r.toLowerCase()) || []),
  ]
    .filter((v, i, a) => a.indexOf(v) === i)
    .filter((d) => !paramDept || d === (paramDept as string).toLowerCase());

  const toggleDeptTab = (dept: string, tab: "Stock" | "History") => {
    setDeptTabs((prev) => ({ ...prev, [dept]: tab }));
  };

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
    >
      <View style={styles.header}>
        <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
            <MaterialCommunityIcons
              name="arrow-left"
              size={28}
              color={colors.text}
            />
          </TouchableOpacity>
          <View style={[styles.titleIcon, { backgroundColor: colors.accent }]}>
            <MaterialCommunityIcons
              name="store-outline"
              size={24}
              color="white"
            />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.headerTitle, { color: colors.text }]} numberOfLines={1}>
              {paramDept
                ? `${(paramDept as string).charAt(0).toUpperCase()}${(paramDept as string).slice(1)} Ombori`
                : "Mini Omborxona"}
            </Text>
            <Text style={[styles.headerSubtitle, { color: colors.secondary }]}>
              {myStock.length} xil mahsulot
            </Text>
          </View>
        </View>
      </View>

      {/* Global Tabs Removed */}

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
            style={[styles.searchInput, { color: colors.text }]}
            placeholder="Mahsulotlarni qidirish..."
            placeholderTextColor={colors.secondary}
            value={inventorySearch}
            onChangeText={setInventorySearch}
          />
          {inventorySearch !== "" && (
            <TouchableOpacity onPress={() => setInventorySearch("")}>
              <MaterialCommunityIcons
                name="close-circle"
                size={20}
                color={colors.secondary}
              />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {loading ? (
        <ActivityIndicator
          size="large"
          color={colors.primary}
          style={{ marginTop: 50 }}
        />
      ) : (
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        >
          {/* 1. Pending Transfers (Priority Inbox) */}
          {pendingTransfers.length > 0 && (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={[styles.sectionTitle, { color: colors.text }]}>
                  Tasdiq kutilayotgan o'tkazmalar
                </Text>
                <View
                  style={[
                    styles.badge,
                    { backgroundColor: colors.accent + "15" },
                  ]}
                >
                  <Text style={[styles.badgeText, { color: colors.accent }]}>
                    {pendingTransfers.length} ta
                  </Text>
                </View>
              </View>
              {pendingTransfers.map((t) => (
                <View
                  key={t._id}
                  style={[styles.card, { backgroundColor: colors.card }]}
                >
                  <View style={styles.cardInfo}>
                    <Text style={[styles.cardName, { color: colors.text }]}>
                      {t.productId?.name}
                    </Text>
                    <Text style={{ color: colors.secondary, fontSize: 12 }}>
                      Yuboruvchi: {t.sender || "Asosiy Ombor"}
                    </Text>
                    <Text style={{ color: colors.secondary, fontSize: 11 }}>
                      Bo'lim: {t.to?.toUpperCase()}
                    </Text>
                  </View>
                  <View style={styles.cardActions}>
                    <View
                      style={[
                        styles.qtyBadge,
                        { backgroundColor: colors.primary + "15" },
                      ]}
                    >
                      <Text style={[styles.qtyText, { color: colors.primary }]}>
                        {t.quantity} {t.productId?.unit}
                      </Text>
                    </View>
                    <TouchableOpacity
                      style={[
                        styles.actionBtn,
                        { backgroundColor: colors.success + "15" },
                      ]}
                      onPress={() => handleConfirmTransfer(t._id, "ACCEPTED")}
                    >
                      <MaterialCommunityIcons
                        name="check"
                        size={20}
                        color={colors.success}
                      />
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[
                        styles.actionBtn,
                        { backgroundColor: colors.danger + "15" },
                      ]}
                      onPress={() => handleConfirmTransfer(t._id, "REJECTED")}
                    >
                      <MaterialCommunityIcons
                        name="close"
                        size={20}
                        color={colors.danger}
                      />
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
            </View>
          )}

          {/* 2. Department Sections */}
          {depts.length === 0 ? (
            <View style={styles.empty}>
              <MaterialCommunityIcons
                name="package-variant"
                size={64}
                color={colors.secondary + "30"}
              />
              <Text style={[styles.emptyText, { color: colors.secondary }]}>
                Bo'limlar toplimadi
              </Text>
            </View>
          ) : (
            depts.map((dept) => {
              const currentTab = deptTabs[dept] || "Stock";
              const deptStock = grouped[dept] || [];
              const deptHistory = transferHistory.filter(
                (h) => h.to?.toLowerCase() === dept,
              );

              return (
                <View key={dept} style={styles.deptSection}>
                  <View style={styles.deptHeader}>
                    <Text style={[styles.deptTitle, { color: colors.text }]}>
                      {dept.toUpperCase()} Bo'limi
                    </Text>

                    <View
                      style={[
                        styles.miniTabs,
                        {
                          backgroundColor: colors.card,
                          borderColor: colors.border,
                        },
                      ]}
                    >
                      <TouchableOpacity
                        style={[
                          styles.miniTabItem,
                          currentTab === "Stock" && {
                            backgroundColor: colors.primary,
                          },
                        ]}
                        onPress={() => toggleDeptTab(dept, "Stock")}
                      >
                        <Text
                          style={[
                            styles.miniTabLabel,
                            {
                              color:
                                currentTab === "Stock"
                                  ? "white"
                                  : colors.secondary,
                            },
                          ]}
                        >
                          Qoldiq
                        </Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[
                          styles.miniTabItem,
                          currentTab === "History" && {
                            backgroundColor: colors.primary,
                          },
                        ]}
                        onPress={() => toggleDeptTab(dept, "History")}
                      >
                        <Text
                          style={[
                            styles.miniTabLabel,
                            {
                              color:
                                currentTab === "History"
                                  ? "white"
                                  : colors.secondary,
                            },
                          ]}
                        >
                          Tarix
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>

                  {currentTab === "Stock" ? (
                    <View style={styles.grid}>
                      {deptStock.length === 0 ? (
                        <Text
                          style={[
                            styles.emptyHint,
                            { color: colors.secondary },
                          ]}
                        >
                          Bu bo'limda mahsulot yo'q
                        </Text>
                      ) : (
                        deptStock
                          .filter((s: any) =>
                            s.productId?.name
                              ?.toLowerCase()
                              .includes(inventorySearch.toLowerCase()),
                          )
                          .map((s: any) => {
                            const minThreshold = s.productId?.minThreshold || 0;
                            const isLow = s.quantity < minThreshold;
                            return (
                              <View
                                key={s._id}
                                style={[
                                  styles.gridItem,
                                  {
                                    backgroundColor: colors.card,
                                    borderColor: isLow
                                      ? colors.danger + "30"
                                      : colors.border + "50",
                                  },
                                ]}
                              >
                                <View
                                  style={[
                                    styles.iconBox,
                                    {
                                      backgroundColor: isLow
                                        ? colors.danger + "10"
                                        : colors.primary + "05",
                                    },
                                  ]}
                                >
                                  <MaterialCommunityIcons
                                    name={
                                      isLow
                                        ? "alert-circle-outline"
                                        : "package-variant-closed"
                                    }
                                    size={20}
                                    color={
                                      isLow ? colors.danger : colors.primary
                                    }
                                  />
                                </View>
                                <Text
                                  style={[
                                    styles.itemName,
                                    { color: colors.text },
                                  ]}
                                  numberOfLines={1}
                                >
                                  {s.productId?.name}
                                </Text>
                                <View style={styles.itemFooter}>
                                  <Text
                                    style={[
                                      styles.itemQty,
                                      {
                                        color: isLow
                                          ? colors.danger
                                          : colors.text,
                                      },
                                    ]}
                                  >
                                    {Number(s.quantity).toLocaleString(
                                      undefined,
                                      {
                                        maximumFractionDigits: 3,
                                      },
                                    )}
                                  </Text>
                                  <Text
                                    style={[
                                      styles.itemUnit,
                                      { color: colors.secondary },
                                    ]}
                                  >
                                    {s.productId?.unit}
                                  </Text>
                                </View>
                                {isLow && (
                                  <View
                                    style={[
                                      styles.lowTag,
                                      { backgroundColor: colors.danger },
                                    ]}
                                  >
                                    <Text style={styles.lowText}>KAM</Text>
                                  </View>
                                )}
                              </View>
                            );
                          })
                      )}
                    </View>
                  ) : (
                    <View style={styles.historyList}>
                      {deptHistory.length === 0 ? (
                        <Text
                          style={[
                            styles.emptyHint,
                            { color: colors.secondary },
                          ]}
                        >
                          Tarix hali bo'sh
                        </Text>
                      ) : (
                        deptHistory.map((h) => (
                          <View
                            key={h._id}
                            style={[
                              styles.historyCard,
                              { backgroundColor: colors.card },
                            ]}
                          >
                            <View style={styles.historyInfo}>
                              <Text
                                style={[
                                  styles.historyName,
                                  { color: colors.text },
                                ]}
                              >
                                {h.productId?.name}
                              </Text>
                              <View
                                style={{
                                  flexDirection: "row",
                                  alignItems: "center",
                                  gap: 4,
                                }}
                              >
                                <MaterialCommunityIcons
                                  name="clock-outline"
                                  size={12}
                                  color={colors.secondary}
                                />
                                <Text
                                  style={{
                                    color: colors.secondary,
                                    fontSize: 11,
                                  }}
                                >
                                  {new Date(h.updatedAt).toLocaleString([], {
                                    month: "short",
                                    day: "numeric",
                                    hour: "2-digit",
                                    minute: "2-digit",
                                  })}
                                </Text>
                              </View>
                              <Text
                                style={{
                                  color: colors.secondary,
                                  fontSize: 11,
                                  fontStyle: "italic",
                                }}
                              >
                                {h.status === "ACCEPTED"
                                  ? `Tasdiqladi: ${h.confirmedBy || "Xodim"}`
                                  : `Rad etdi: ${h.confirmedBy || "Xodim"}`}
                              </Text>
                            </View>
                            <View style={styles.historyRight}>
                              <Text
                                style={[
                                  styles.qtyText,
                                  { color: colors.primary, fontSize: 13 },
                                ]}
                              >
                                {h.quantity} {h.productId?.unit}
                              </Text>
                              <View
                                style={[
                                  styles.statusTag,
                                  {
                                    backgroundColor:
                                      h.status === "ACCEPTED"
                                        ? colors.success + "15"
                                        : colors.danger + "15",
                                  },
                                ]}
                              >
                                <Text
                                  style={{
                                    fontSize: 9,
                                    fontWeight: "bold",
                                    color:
                                      h.status === "ACCEPTED"
                                        ? colors.success
                                        : colors.danger,
                                  }}
                                >
                                  {h.status === "ACCEPTED" ? "QABUL" : "RAD"}
                                </Text>
                              </View>
                            </View>
                          </View>
                        ))
                      )}
                    </View>
                  )}
                </View>
              );
            })
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 20,
  },
  backBtn: { padding: 4, marginRight: 10 },
  titleIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  headerTitle: { fontSize: 22, fontWeight: "bold" },
  headerSubtitle: { fontSize: 13, marginTop: 2, fontWeight: "500" },
  tabsContainer: {
    flexDirection: "row",
    paddingHorizontal: 20,
    gap: 12,
    marginBottom: 15,
  },
  tabItem: {
    flex: 1,
    height: 44,
    borderRadius: 12,
    backgroundColor: "rgba(0,0,0,0.03)",
    justifyContent: "center",
    alignItems: "center",
  },
  tabLabel: { fontSize: 14, fontWeight: "bold" },
  searchContainer: { paddingHorizontal: 20, marginBottom: 10 },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    height: 50,
    borderRadius: 15,
    borderWidth: 1,
    paddingHorizontal: 15,
  },
  searchInput: { flex: 1, marginLeft: 10, fontSize: 16 },
  scrollContent: { paddingHorizontal: 20, paddingBottom: 40 },
  section: { marginBottom: 25 },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 15,
  },
  sectionTitle: { fontSize: 18, fontWeight: "bold" },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  badgeText: { fontSize: 12, fontWeight: "bold" },
  deptSection: {
    marginBottom: 30,
    backgroundColor: "rgba(0,0,0,0.02)",
    borderRadius: 20,
    padding: 15,
  },
  deptHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  deptTitle: { fontSize: 20, fontWeight: "800" },
  miniTabs: {
    flexDirection: "row",
    borderRadius: 10,
    padding: 3,
    borderWidth: 1,
  },
  miniTabItem: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  miniTabLabel: { fontSize: 13, fontWeight: "bold" },
  emptyHint: {
    textAlign: "center",
    marginTop: 10,
    fontStyle: "italic",
    fontSize: 14,
    flex: 1,
  },
  historyList: { gap: 10 },
  card: {
    borderRadius: 15,
    padding: 15,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  cardInfo: { flex: 1, gap: 4 },
  cardName: { fontSize: 16, fontWeight: "bold" },
  cardActions: { flexDirection: "row", alignItems: "center", gap: 8 },
  qtyBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  qtyText: { fontSize: 14, fontWeight: "bold" },
  actionBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  gridItem: {
    width: (SCREEN_WIDTH - 52) / 2,
    padding: 16,
    borderRadius: 20,
    borderWidth: 1,
    position: "relative",
    overflow: "hidden",
  },
  iconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 10,
  },
  itemName: { fontSize: 14, fontWeight: "600", marginBottom: 8 },
  itemFooter: { flexDirection: "row", alignItems: "baseline", gap: 4 },
  itemQty: { fontSize: 18, fontWeight: "bold" },
  itemUnit: { fontSize: 12, fontWeight: "500" },
  lowTag: {
    position: "absolute",
    top: 10,
    right: -15,
    paddingHorizontal: 20,
    paddingVertical: 2,
    transform: [{ rotate: "45deg" }],
  },
  lowText: {
    color: "white",
    fontSize: 8,
    fontWeight: "bold",
    textAlign: "center",
  },
  historyCard: {
    borderRadius: 15,
    padding: 15,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.05)",
  },
  historyInfo: { flex: 1, gap: 4 },
  historyName: { fontSize: 16, fontWeight: "bold" },
  historyRight: { alignItems: "flex-end", gap: 8 },
  statusTag: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  empty: { alignItems: "center", marginTop: 100 },
  emptyText: { fontSize: 16, marginTop: 15, fontWeight: "500" },
});
