import React, { useState, useCallback, useEffect } from "react";
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
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { useRouter, useFocusEffect, useLocalSearchParams } from "expo-router";
import { Translations } from "@/constants/translations";
import { Storage } from "@/utils/storage";
import axios from "axios";
import * as Haptics from "expo-haptics";
import { socketService } from "@/utils/socket";

const t = Translations.uz.cashier;
const common = Translations.uz.common;
const API_BASE_URL = "http://192.168.43.160:3000";

export default function CashierScreen() {
  const router = useRouter();
  const { tab } = useLocalSearchParams();
  const colorScheme = useColorScheme() ?? "light";
  const colors = Colors[colorScheme];

  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<"pending" | "history">(
    (tab as any) === "history" ? "history" : "pending",
  );
  const [searchQuery, setSearchQuery] = useState("");

  const [selectedOrder, setSelectedOrder] = useState<any | null>(null);
  const [payModal, setPayModal] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState("Cash");
  const [processing, setProcessing] = useState(false);

  const fetchOrders = async () => {
    try {
      const token = await Storage.getItem("access_token");
      const headers = { Authorization: `Bearer ${token}` };
      const res = await axios.get(`${API_BASE_URL}/orders`, { headers });

      const allOrders = res.data;
      if (activeTab === "pending") {
        setOrders(
          allOrders.filter(
            (o: any) => o.status !== "Paid" && o.status !== "Cancelled",
          ),
        );
      } else {
        setOrders(
          allOrders.filter((o: any) => o.status === "Paid").slice(0, 50),
        );
      }
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
    }, [activeTab]),
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchOrders();
  };

  const handleFinalizePayment = async () => {
    if (!selectedOrder) return;
    setProcessing(true);
    try {
      const token = await Storage.getItem("access_token");
      await axios.patch(
        `${API_BASE_URL}/orders/${selectedOrder._id}`,
        { status: "Paid", paymentMethod },
        { headers: { Authorization: `Bearer ${token}` } },
      );
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setPayModal(false);
      setSelectedOrder(null);
      fetchOrders();
      Alert.alert("Muvaffaqiyat", "To'lov qabul qilindi va stol bo'shatildi.");
    } catch (error) {
      Alert.alert(common.error, "To'lovni yakunlab bo'lmadi");
    } finally {
      setProcessing(false);
    }
  };

  const handleLogout = async () => {
    await Storage.removeItem("access_token");
    await Storage.removeItem("user");
    router.replace("/login");
  };

  const filteredOrders = orders.filter(
    (o) =>
      o.tableName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      o.waiterName?.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  const stats = {
    pendingCount: orders.length,
    totalRevenue: orders.reduce(
      (acc, o) => acc + (o.status === "Paid" ? o.totalAmount : 0),
      0,
    ),
  };

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
    >
      <View style={styles.header}>
        <View>
          <Text style={[styles.headerSubtitle, { color: colors.secondary }]}>
            {activeTab === "pending" ? t.pendingPayments : t.paymentHistory}
          </Text>
          <Text style={[styles.headerTitle, { color: colors.text }]}>
            {t.title}
          </Text>
        </View>
        <View style={styles.headerActions}>
          <TouchableOpacity
            style={[
              styles.historyBtn,
              { backgroundColor: colors.card, marginRight: 10 },
            ]}
            onPress={() =>
              setActiveTab(activeTab === "pending" ? "history" : "pending")
            }
          >
            <MaterialCommunityIcons
              name={activeTab === "pending" ? "history" : "clock-outline"}
              size={24}
              color={colors.primary}
            />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.historyBtn, { backgroundColor: colors.card }]}
            onPress={handleLogout}
          >
            <MaterialCommunityIcons
              name="logout"
              size={24}
              color={colors.secondary}
            />
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.searchSection}>
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
            placeholder={t.searchTable}
            placeholderTextColor={colors.secondary}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
      </View>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={colors.primary}
            />
          }
        >
          {filteredOrders.length === 0 ? (
            <View style={styles.empty}>
              <MaterialCommunityIcons
                name="cash-multiple"
                size={64}
                color={colors.border}
              />
              <Text style={[styles.emptyText, { color: colors.secondary }]}>
                Buyurtmalar mavjud emas
              </Text>
            </View>
          ) : (
            filteredOrders.map((order) => (
              <TouchableOpacity
                key={order._id}
                style={[styles.orderCard, { backgroundColor: colors.card }]}
                onPress={() => {
                  if (order.status !== "Paid") {
                    setSelectedOrder(order);
                    setPayModal(true);
                  }
                }}
              >
                <View style={styles.cardInfo}>
                  <View
                    style={[
                      styles.tableBadge,
                      { backgroundColor: colors.primary + "15" },
                    ]}
                  >
                    <View style={styles.badgeColumn}>
                      <View style={styles.badgeLabelRow}>
                        <MaterialCommunityIcons
                          name="table-chair"
                          size={14}
                          color={colors.primary}
                        />
                        <Text
                          numberOfLines={1}
                          style={[
                            styles.tableNumber,
                            { color: colors.primary },
                          ]}
                        >
                          {order.tableName}
                        </Text>
                      </View>
                      <View style={styles.badgeLabelRow}>
                        <MaterialCommunityIcons
                          name="layers-outline"
                          size={10}
                          color={colors.primary}
                        />
                        <Text
                          numberOfLines={1}
                          style={[
                            styles.floorTextSmall,
                            { color: colors.primary },
                          ]}
                        >
                          {order.tableId?.floor || 1}
                        </Text>
                      </View>
                    </View>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.waiterName, { color: colors.text }]}>
                      {order.waiterName || "Ofitsiant"}
                    </Text>
                    <Text
                      style={[styles.orderTime, { color: colors.secondary }]}
                    >
                      {new Date(order.createdAt).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </Text>
                  </View>
                  <View style={{ alignItems: "flex-end" }}>
                    <Text style={[styles.amount, { color: colors.text }]}>
                      {order.totalAmount.toLocaleString()} {common.currency}
                    </Text>
                    <View
                      style={[
                        styles.statusBadge,
                        {
                          backgroundColor:
                            order.status === "Paid"
                              ? colors.success + "15"
                              : colors.warning + "15",
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.statusText,
                          {
                            color:
                              order.status === "Paid"
                                ? colors.success
                                : colors.warning,
                          },
                        ]}
                      >
                        {order.status === "Paid" ? "To'landi" : "Kutilmoqda"}
                      </Text>
                    </View>
                  </View>
                </View>
              </TouchableOpacity>
            ))
          )}
        </ScrollView>
      )}

      {/* Payment Modal */}
      <Modal visible={payModal} transparent animationType="slide">
        <SafeAreaView
          style={[styles.modalOverlay, { backgroundColor: colors.background }]}
        >
          <View
            style={[
              styles.modalContent,
              { backgroundColor: colors.background },
            ]}
          >
            <View style={styles.modalHeader}>
              <TouchableOpacity
                onPress={() => setPayModal(false)}
                style={styles.modalCloseBtn}
              >
                <MaterialCommunityIcons
                  name="arrow-left"
                  size={26}
                  color={colors.text}
                />
              </TouchableOpacity>
              <Text style={[styles.modalTitle, { color: colors.text }]}>
                {t.confirmPayment}
              </Text>
              <View style={{ width: 40 }} />
            </View>

            {selectedOrder && (
              <View style={styles.billDetails}>
                <View style={[styles.billRow, { marginBottom: 8 }]}>
                  <Text style={[styles.billLabel, { color: colors.secondary }]}>
                    Stol:
                  </Text>
                  <Text style={[styles.billValue, { color: colors.text }]}>
                    {selectedOrder.tableName}
                  </Text>
                </View>
                <View
                  style={[
                    styles.billRow,
                    {
                      borderTopWidth: 1,
                      borderTopColor: colors.border,
                      paddingTop: 12,
                      marginBottom: 12,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.billLabel,
                      { color: colors.secondary, fontWeight: "800" },
                    ]}
                  >
                    Jami summa:
                  </Text>
                  <Text style={[styles.billTotal, { color: colors.primary }]}>
                    {selectedOrder.totalAmount.toLocaleString()}{" "}
                    {common.currency}
                  </Text>
                </View>

                <Text style={[styles.methodLabel, { color: colors.text }]}>
                  {t.selectMethod}
                </Text>
                <View style={styles.methodGrid}>
                  <TouchableOpacity
                    style={[
                      styles.methodBtn,
                      {
                        backgroundColor:
                          paymentMethod === "Cash"
                            ? colors.primary
                            : colors.background,
                        borderColor:
                          paymentMethod === "Cash"
                            ? colors.primary
                            : colors.border,
                      },
                    ]}
                    onPress={() => setPaymentMethod("Cash")}
                  >
                    <MaterialCommunityIcons
                      name="cash"
                      size={24}
                      color={
                        paymentMethod === "Cash" ? "white" : colors.secondary
                      }
                    />
                    <Text
                      style={[
                        styles.methodText,
                        {
                          color:
                            paymentMethod === "Cash" ? "white" : colors.text,
                        },
                      ]}
                    >
                      {t.cash}
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.methodBtn,
                      {
                        backgroundColor:
                          paymentMethod === "Card"
                            ? colors.primary
                            : colors.background,
                        borderColor:
                          paymentMethod === "Card"
                            ? colors.primary
                            : colors.border,
                      },
                    ]}
                    onPress={() => setPaymentMethod("Card")}
                  >
                    <MaterialCommunityIcons
                      name="credit-card-outline"
                      size={24}
                      color={
                        paymentMethod === "Card" ? "white" : colors.secondary
                      }
                    />
                    <Text
                      style={[
                        styles.methodText,
                        {
                          color:
                            paymentMethod === "Card" ? "white" : colors.text,
                        },
                      ]}
                    >
                      {t.card}
                    </Text>
                  </TouchableOpacity>
                </View>

                <View style={styles.receiptSection}>
                  <Text
                    style={[styles.receiptHeader, { color: colors.secondary }]}
                  >
                    Buyurtma tafsilotlari (Chek):
                  </Text>
                  <ScrollView style={styles.itemsScroll} nestedScrollEnabled>
                    {selectedOrder.items.map((item: any, index: number) => (
                      <View key={index} style={styles.itemRow}>
                        <View style={{ flex: 1 }}>
                          <Text
                            style={[styles.itemName, { color: colors.text }]}
                          >
                            {item.name}
                          </Text>
                          <Text
                            style={[
                              styles.itemMeta,
                              { color: colors.secondary },
                            ]}
                          >
                            {item.quantity} x {item.price.toLocaleString()}
                          </Text>
                        </View>
                        <Text
                          style={[styles.itemTotal, { color: colors.text }]}
                        >
                          {(item.quantity * item.price).toLocaleString()}
                        </Text>
                      </View>
                    ))}
                  </ScrollView>
                </View>

                <TouchableOpacity
                  style={[styles.payBtn, { backgroundColor: colors.primary }]}
                  onPress={handleFinalizePayment}
                  disabled={processing}
                >
                  {processing ? (
                    <ActivityIndicator color="white" />
                  ) : (
                    <Text style={styles.payBtnText}>{t.pay}</Text>
                  )}
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.cancelBtn, { borderColor: colors.border }]}
                  onPress={() => setPayModal(false)}
                  disabled={processing}
                >
                  <Text
                    style={[styles.cancelBtnText, { color: colors.secondary }]}
                  >
                    {common.cancel}
                  </Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 24,
    paddingVertical: 20,
  },
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
  },
  headerTitle: { fontSize: 24, fontWeight: "800" },
  headerSubtitle: {
    fontSize: 13,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  historyBtn: {
    width: 48,
    height: 48,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
  },
  searchSection: { paddingHorizontal: 24, marginBottom: 16 },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    height: 54,
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 16,
  },
  searchInput: { flex: 1, marginLeft: 12, fontSize: 16, fontWeight: "500" },
  list: { paddingHorizontal: 24, paddingBottom: 40 },
  orderCard: {
    borderRadius: 20,
    padding: 18,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  cardInfo: { flexDirection: "row", alignItems: "center", gap: 16 },
  tableBadge: {
    paddingHorizontal: 8,
    height: 50,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    minWidth: 70,
  },
  tableNumber: { fontSize: 16, fontWeight: "900", marginLeft: 2 },
  floorTextSmall: { fontSize: 10, fontWeight: "700" },
  badgeLabelRow: { flexDirection: "row", alignItems: "center" },
  badgeColumn: { alignItems: "center", gap: 2 },
  waiterName: { fontSize: 16, fontWeight: "700", marginBottom: 2 },
  orderTime: { fontSize: 13, fontWeight: "500" },
  amount: { fontSize: 17, fontWeight: "800", marginBottom: 6 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  statusText: { fontSize: 11, fontWeight: "700", textTransform: "uppercase" },
  centered: { flex: 1, justifyContent: "center", alignItems: "center" },
  empty: { alignItems: "center", marginTop: 100 },
  emptyText: { marginTop: 16, fontSize: 16, fontWeight: "500" },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,1)", // Completely opaque backdrop
  },
  modalContent: {
    flex: 1,
    padding: 24,
    paddingTop: 10, // Adjust for safe area if needed
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 24,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(0,0,0,0.05)",
  },
  modalCloseBtn: {
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 12,
    backgroundColor: "rgba(0,0,0,0.03)",
  },
  modalTitle: { fontSize: 20, fontWeight: "800" },
  billDetails: { gap: 16 },
  receiptSection: {
    backgroundColor: "rgba(0,0,0,0.02)",
    borderRadius: 16,
    padding: 12,
    maxHeight: 250,
  },
  receiptHeader: {
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase",
    marginBottom: 8,
    letterSpacing: 0.5,
  },
  itemsScroll: { flexGrow: 1, marginBottom: 15 },
  itemRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "rgba(0,0,0,0.05)",
  },
  itemName: { fontSize: 14, fontWeight: "600" },
  itemMeta: { fontSize: 12, marginTop: 2 },
  itemTotal: { fontSize: 14, fontWeight: "700" },
  billRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  billLabel: { fontSize: 16, fontWeight: "500" },
  billValue: { fontSize: 18, fontWeight: "700" },
  billTotal: { fontSize: 22, fontWeight: "900" },
  methodLabel: { fontSize: 15, fontWeight: "700", marginTop: 10 },
  methodGrid: { flexDirection: "row", gap: 12 },
  methodBtn: {
    flex: 1,
    height: 70,
    borderRadius: 18,
    borderWidth: 1.5,
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
  },
  methodText: { fontSize: 14, fontWeight: "700" },
  payBtn: {
    height: 60,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 10,
  },
  payBtnText: { color: "white", fontSize: 18, fontWeight: "bold" },
  cancelBtn: {
    height: 54,
    borderRadius: 18,
    borderWidth: 1,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 12,
  },
  cancelBtnText: { fontSize: 16, fontWeight: "600" },
});
