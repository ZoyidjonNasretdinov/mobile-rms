import React, { useState, useEffect } from "react";
import {
  StyleSheet,
  View,
  Text,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  TextInput,
  ScrollView,
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
import { socketService } from "@/utils/socket";
import { useFocusEffect } from "expo-router";
import { useCallback } from "react";

const API_BASE_URL = CONFIG.API_BASE_URL;
const common = Translations.uz.common;

export default function OrdersScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme() ?? "light";
  const colors = Colors[colorScheme];

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [orders, setOrders] = useState<any[]>([]);
  const [tables, setTables] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [viewMode, setViewMode] = useState<"all" | "today" | "tables">("all");
  const [selectedTable, setSelectedTable] = useState<string | null>(null);
  const [selectedFloor, setSelectedFloor] = useState<number | "All">("All");

  const fetchOrders = async () => {
    try {
      const token = await Storage.getItem("access_token");

      // Fetch Tables
      const tablesRes = await axios.get(`${API_BASE_URL}/tables`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setTables(tablesRes.data);

      // Fetch Orders
      let url = `${API_BASE_URL}/orders`;
      if (viewMode === "today" || viewMode === "tables") {
        const now = new Date();
        const startOfDay = new Date(
          now.getFullYear(),
          now.getMonth(),
          now.getDate(),
        ).toISOString();
        const endOfDay = new Date(
          now.getFullYear(),
          now.getMonth(),
          now.getDate(),
          23,
          59,
          59,
        ).toISOString();
        url += `?startDate=${startOfDay}&endDate=${endOfDay}`;
      }

      const response = await axios.get(url, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setOrders(response.data);
    } catch (error) {
      console.error("Fetch orders error:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchOrders();

      const socket = socketService.getSocket();
      const handleUpdate = () => fetchOrders();

      socket.on("orderCreated", handleUpdate);
      socket.on("orderUpdated", handleUpdate);

      return () => {
        socket.off("orderCreated", handleUpdate);
        socket.off("orderUpdated", handleUpdate);
      };
    }, [viewMode]),
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchOrders();
  };

  const filteredOrders = orders.filter((o) => {
    const s = search.toLowerCase();
    const matchesSearch =
      o.tableName?.toLowerCase().includes(s) ||
      o.waiterName?.toLowerCase().includes(s) ||
      o.waiterId?.fullName?.toLowerCase().includes(s) ||
      o.status?.toLowerCase().includes(s);

    if (viewMode === "tables" && selectedTable) {
      return matchesSearch && o.tableName === selectedTable;
    }

    return matchesSearch;
  });

  const floors = Array.from(new Set(tables.map((t: any) => t.floor || 1))).sort(
    (a, b) => a - b,
  );

  const displayTables = tables
    .filter((t) => selectedFloor === "All" || t.floor === selectedFloor)
    .sort((a, b) => parseInt(a.number) - parseInt(b.number));

  const OrderCard = ({ item }: { item: any }) => {
    const date = new Date(item.createdAt);
    const timeStr = date.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });

    let statusColor = colors.primary;
    if (item.status === "Paid") statusColor = colors.success;
    if (item.status === "Cancelled") statusColor = colors.danger;
    if (item.status === "Active") statusColor = colors.accent;

    return (
      <View style={[styles.orderCard, { backgroundColor: colors.card }]}>
        <View style={styles.cardHeader}>
          <View>
            <Text style={[styles.tableLabel, { color: colors.secondary }]}>
              Stol
            </Text>
            <Text style={[styles.tableName, { color: colors.text }]}>
              {item.tableName}
            </Text>
            <View style={styles.waiterBadge}>
              <MaterialCommunityIcons
                name="account-outline"
                size={10}
                color={colors.secondary}
              />
              <Text style={[styles.waiterText, { color: colors.secondary }]}>
                {item.waiterName || "Noma'lum"}
              </Text>
            </View>
          </View>
          <View
            style={[
              styles.statusBadge,
              { backgroundColor: statusColor + "15" },
            ]}
          >
            <Text style={[styles.statusText, { color: statusColor }]}>
              {item.status}
            </Text>
          </View>
        </View>

        <View style={styles.cardDivider} />

        <View style={styles.cardRow}>
          <View style={styles.infoCol}>
            <Text style={[styles.infoLabel, { color: colors.secondary }]}>
              Ofitsiant
            </Text>
            <Text style={[styles.infoValue, { color: colors.text }]}>
              {item.waiterName || item.waiterId?.fullName || "Noma'lum"}
            </Text>
          </View>
          <View style={[styles.infoCol, { alignItems: "flex-end" }]}>
            <Text style={[styles.infoLabel, { color: colors.secondary }]}>
              Vaqt
            </Text>
            <Text style={[styles.infoValue, { color: colors.text }]}>
              {timeStr}
            </Text>
          </View>
        </View>

        <View style={styles.cardFooter}>
          <Text style={[styles.totalLabel, { color: colors.secondary }]}>
            Umumiy summa
          </Text>
          <Text style={[styles.totalValue, { color: colors.primary }]}>
            {item.totalAmount?.toLocaleString()} {common.currency}
          </Text>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
      edges={["top"]}
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
          Buyurtmalar
        </Text>
      </View>

      <View style={styles.tabsContainer}>
        <TouchableOpacity
          style={[
            styles.tab,
            viewMode === "all" && {
              borderBottomColor: colors.primary,
              borderBottomWidth: 3,
            },
          ]}
          onPress={() => setViewMode("all")}
        >
          <Text
            style={[
              styles.tabText,
              { color: viewMode === "all" ? colors.primary : colors.secondary },
            ]}
          >
            Hamma
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.tab,
            viewMode === "today" && {
              borderBottomColor: colors.primary,
              borderBottomWidth: 3,
            },
          ]}
          onPress={() => setViewMode("today")}
        >
          <Text
            style={[
              styles.tabText,
              {
                color: viewMode === "today" ? colors.primary : colors.secondary,
              },
            ]}
          >
            Bugun
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.tab,
            viewMode === "tables" && {
              borderBottomColor: colors.primary,
              borderBottomWidth: 3,
            },
          ]}
          onPress={() => setViewMode("tables")}
        >
          <Text
            style={[
              styles.tabText,
              {
                color:
                  viewMode === "tables" ? colors.primary : colors.secondary,
              },
            ]}
          >
            Stollar
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.searchContainer}>
        <View style={[styles.searchBox, { backgroundColor: colors.card }]}>
          <MaterialCommunityIcons
            name="magnify"
            size={20}
            color={colors.secondary}
          />
          <TextInput
            placeholder="Ofitsiant yoki stol bo'yicha qidirish..."
            placeholderTextColor={colors.secondary}
            style={[styles.searchInput, { color: colors.text }]}
            value={search}
            onChangeText={setSearch}
          />
          {search !== "" && (
            <TouchableOpacity onPress={() => setSearch("")}>
              <MaterialCommunityIcons
                name="close-circle"
                size={18}
                color={colors.secondary}
              />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : viewMode === "tables" && !selectedTable ? (
        <View style={{ flex: 1 }}>
          <View style={styles.floorTabs}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <TouchableOpacity
                style={[
                  styles.floorTab,
                  selectedFloor === "All" && {
                    backgroundColor: colors.primary,
                  },
                ]}
                onPress={() => setSelectedFloor("All")}
              >
                <Text
                  style={[
                    styles.floorTabText,
                    {
                      color:
                        selectedFloor === "All" ? "#fff" : colors.secondary,
                    },
                  ]}
                >
                  Barchasi
                </Text>
              </TouchableOpacity>
              {floors.map((floor) => (
                <TouchableOpacity
                  key={floor}
                  style={[
                    styles.floorTab,
                    selectedFloor === floor && {
                      backgroundColor: colors.primary,
                    },
                  ]}
                  onPress={() => setSelectedFloor(floor)}
                >
                  <Text
                    style={[
                      styles.floorTabText,
                      {
                        color:
                          selectedFloor === floor ? "#fff" : colors.secondary,
                      },
                    ]}
                  >
                    {floor}-qavat
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          <ScrollView contentContainerStyle={styles.tablesGrid}>
            {displayTables.map((table) => (
              <TouchableOpacity
                key={table._id}
                style={[styles.tableButton, { backgroundColor: colors.card }]}
                onPress={() => setSelectedTable(table.number)}
              >
                <MaterialCommunityIcons
                  name="table-chair"
                  size={32}
                  color={colors.primary}
                />
                <Text style={[styles.tableButtonText, { color: colors.text }]}>
                  {table.number}-stol
                </Text>
                <Text
                  style={[styles.tableButtonSub, { color: colors.secondary }]}
                >
                  {
                    orders.filter(
                      (o) => o.tableName === table.number.toString(),
                    ).length
                  }{" "}
                  buyurtma
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      ) : (
        <View style={{ flex: 1 }}>
          {viewMode === "tables" && selectedTable && (
            <View style={styles.selectedTableHeader}>
              <TouchableOpacity
                style={styles.backToGrid}
                onPress={() => setSelectedTable(null)}
              >
                <MaterialCommunityIcons
                  name="chevron-left"
                  size={24}
                  color={colors.primary}
                />
                <Text style={[styles.backText, { color: colors.primary }]}>
                  Barcha stollar
                </Text>
              </TouchableOpacity>
              <Text style={[styles.selectedTitle, { color: colors.text }]}>
                {selectedTable}-stol buyurtmalari
              </Text>
            </View>
          )}
          <FlatList
            data={filteredOrders}
            renderItem={({ item }) => <OrderCard item={item} />}
            keyExtractor={(item) => item._id}
            contentContainerStyle={styles.listContent}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
            }
            ListEmptyComponent={
              <View style={styles.emptyState}>
                <MaterialCommunityIcons
                  name="clipboard-text-outline"
                  size={64}
                  color={colors.secondary + "40"}
                />
                <Text style={[styles.emptyText, { color: colors.secondary }]}>
                  Buyurtmalar topilmadi
                </Text>
              </View>
            }
          />
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    padding: 20,
    gap: 15,
    paddingBottom: 10,
  },
  backButton: { padding: 8 },
  headerTitle: { fontSize: 24, fontWeight: "bold" },
  tabsContainer: {
    flexDirection: "row",
    paddingHorizontal: 20,
    marginBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(0,0,0,0.05)",
  },
  tab: {
    paddingVertical: 12,
    marginRight: 25,
    paddingHorizontal: 4,
  },
  tabText: {
    fontSize: 15,
    fontWeight: "bold",
  },
  searchContainer: { paddingHorizontal: 20, marginBottom: 15 },
  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    height: 48,
    borderRadius: 14,
    gap: 10,
  },
  searchInput: { flex: 1, fontSize: 14 },
  listContent: { padding: 20, paddingBottom: 100 },
  centered: { flex: 1, justifyContent: "center", alignItems: "center" },
  orderCard: {
    padding: 16,
    borderRadius: 20,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 12,
  },
  tableLabel: { fontSize: 11, fontWeight: "600", textTransform: "uppercase" },
  tableName: { fontSize: 18, fontWeight: "bold", marginTop: 2 },
  waiterBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 2,
  },
  waiterText: {
    fontSize: 11,
    fontWeight: "500",
  },
  statusBadge: { paddingHorizontal: 12, paddingVertical: 4, borderRadius: 8 },
  statusText: { fontSize: 12, fontWeight: "bold" },
  cardDivider: {
    height: 1,
    backgroundColor: "rgba(0,0,0,0.05)",
    marginVertical: 12,
  },
  cardRow: { flexDirection: "row", justifyContent: "space-between" },
  infoCol: { flex: 1 },
  infoLabel: { fontSize: 11, fontWeight: "600", marginBottom: 4 },
  infoValue: { fontSize: 14, fontWeight: "600" },
  cardFooter: {
    marginTop: 15,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "rgba(0,0,0,0.05)",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  totalLabel: { fontSize: 12, fontWeight: "600" },
  totalValue: { fontSize: 18, fontWeight: "bold" },
  emptyState: { alignItems: "center", marginTop: 100 },
  emptyText: { marginTop: 15, fontSize: 16, fontWeight: "500" },
  tablesGrid: {
    padding: 20,
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    gap: 15,
  },
  tableButton: {
    width: "47%",
    padding: 20,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  tableButtonText: {
    fontSize: 20,
    fontWeight: "bold",
    marginTop: 10,
  },
  tableButtonSub: {
    fontSize: 12,
    marginTop: 4,
  },
  selectedTableHeader: {
    paddingHorizontal: 20,
    paddingBottom: 10,
  },
  backToGrid: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
    marginLeft: -5,
  },
  backText: {
    fontSize: 14,
    fontWeight: "600",
  },
  selectedTitle: {
    fontSize: 18,
    fontWeight: "bold",
  },
  floorTabs: {
    paddingHorizontal: 20,
    marginBottom: 10,
  },
  floorTab: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
    marginRight: 10,
    backgroundColor: "rgba(0,0,0,0.03)",
  },
  floorTabText: {
    fontSize: 13,
    fontWeight: "bold",
  },
});
