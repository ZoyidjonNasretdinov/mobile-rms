import React, { useState, useCallback } from "react";
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
import { CONFIG } from "@/constants/config";
import * as Haptics from "expo-haptics";
import { socketService } from "@/utils/socket";
import { notificationService } from "@/utils/notifications";

const t = Translations.uz.cashier;
const common = Translations.uz.common;
const API_BASE_URL = CONFIG.API_BASE_URL;

export default function CashierScreen() {
  const router = useRouter();
  const { tab } = useLocalSearchParams();
  const colorScheme = useColorScheme() ?? "light";
  const colors = Colors[colorScheme];

  const [orders, setOrders] = useState<any[]>([]);
  const [shifts, setShifts] = useState<any[]>([]);
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
  const [user, setUser] = useState<any>(null);

  const [shiftDetailsModal, setShiftDetailsModal] = useState(false);
  const [shiftOrders, setShiftOrders] = useState<any[]>([]);
  const [loadingShift, setLoadingShift] = useState(false);
  const [selectedShift, setSelectedShift] = useState<any>(null);

  const handleViewShiftDetails = async (shift: any) => {
    setSelectedShift(shift);
    setShiftDetailsModal(true);
    setLoadingShift(true);
    try {
      const token = await Storage.getItem("access_token");
      const url = `${API_BASE_URL}/orders/stats?startDate=${shift.startTime}${shift.endTime ? `&endDate=${shift.endTime}` : ''}`;
      const res = await axios.get(url, { headers: { Authorization: `Bearer ${token}` } });
      const sortedOrders = (res.data.orders || []).sort(
        (a: any, b: any) =>
          new Date(b.updatedAt || b.createdAt).getTime() -
          new Date(a.updatedAt || a.createdAt).getTime(),
      );
      setShiftOrders(sortedOrders);
    } catch (e) {
      console.error("Failed to fetch shift details", e);
      Alert.alert("Xatolik", "Smena malumotlarini yuklab bo'lmadi");
    } finally {
      setLoadingShift(false);
    }
  };

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

      const shiftsRes = await axios.get(`${API_BASE_URL}/shifts`, { headers });
      setShifts(shiftsRes.data);
    } catch (error) {
      console.error("Fetch orders error:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      const loadUser = async () => {
        const userStr = await Storage.getItem("user");
        if (userStr) setUser(JSON.parse(userStr));
      };
      loadUser();
      fetchOrders();

      const socket = socketService.getSocket();

      const handleUpdate = () => fetchOrders();

      const handleOrderCreated = () => {
        handleUpdate();
        notificationService.notify(
          "Yangi buyurtma tushdi!",
          Haptics.NotificationFeedbackType.Success,
          "alarm",
        );
      };

      const handleDayStarted = () => {
        notificationService.notify(
          "Ish kuni boshlandi. Baraka bersin!",
          Haptics.NotificationFeedbackType.Success,
        );
        fetchOrders();
      };

      const handleDayEnded = () => {
        notificationService.notify(
          "Ish kuni yakunlandi. Charchamang!",
          Haptics.NotificationFeedbackType.Warning,
        );
        fetchOrders();
      };

      socket.on("orderCreated", handleOrderCreated);
      socket.on("orderUpdated", handleUpdate);
      socket.on("orderPaid", handleUpdate);
      socket.on("dayStarted", handleDayStarted);
      socket.on("dayEnded", handleDayEnded);

      return () => {
        socket.off("orderCreated", handleOrderCreated);
        socket.off("orderUpdated", handleUpdate);
        socket.off("orderPaid", handleUpdate);
        socket.off("dayStarted", handleDayStarted);
        socket.off("dayEnded", handleDayEnded);
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
      const body = {
        status: "Paid",
        paymentMethod,
        cashierId: user?.id || user?._id,
        cashierName: user?.fullName || "Kassir",
      };

      await axios.patch(`${API_BASE_URL}/orders/${selectedOrder._id}`, body, {
        headers: { Authorization: `Bearer ${token}` },
      });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setPayModal(false);
      setSelectedOrder(null);
      fetchOrders();
      Alert.alert("Muvaffaqiyat", "To'lov qabul qilindi va stol bo'shatildi.");
    } catch (error: any) {
      console.error("Payment error:", error.response?.data || error.message);
      const msg = error.response?.data?.message || "To'lovni yakunlab bo'lmadi";
      Alert.alert(common.error, msg);
    } finally {
      setProcessing(false);
    }
  };

  const handleHeaderAction = async () => {
    router.back();
  };

  const combinedHistory = React.useMemo(() => {
    if (activeTab !== "history") return [];

    const items: any[] = orders
      .filter((o) => o.status === "Paid")
      .map((o) => ({ ...o, type: "order" }));

    shifts.forEach((s) => {
      if (s.startTime) {
        items.push({
          _id: `start-${s._id}`,
          createdAt: s.startTime,
          type: "shift-start",
          data: s,
        });
      }
      if (s.endTime) {
        items.push({
          _id: `end-${s._id}`,
          createdAt: s.endTime,
          type: "shift-end",
          data: s,
        });
      }
    });

    return items.sort(
      (a, b) =>
        new Date(b.updatedAt || b.createdAt).getTime() -
        new Date(a.updatedAt || a.createdAt).getTime(),
    );
  }, [orders, shifts, activeTab]);

  const filteredOrders =
    activeTab === "pending"
      ? orders
          .filter(
            (o) =>
              o.tableName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
              o.waiterName?.toLowerCase().includes(searchQuery.toLowerCase()),
          )
          .sort(
            (a, b) =>
              new Date(b.updatedAt || b.createdAt).getTime() - 
              new Date(a.updatedAt || a.createdAt).getTime(),
          )
      : combinedHistory.filter(
          (item) =>
            item.type !== "order" ||
            item.tableName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            item.waiterName?.toLowerCase().includes(searchQuery.toLowerCase()),
        );

  const renderHistoryItem = (item: any) => {
    if (item.type === "shift-start") {
      return (
        <TouchableOpacity key={item._id} style={styles.shiftMarker} onPress={() => handleViewShiftDetails(item.data)}>
          <View
            style={[styles.markerLine, { backgroundColor: colors.success }]}
          />
          <View style={styles.markerBadge}>
            <MaterialCommunityIcons
              name="clock-start"
              size={16}
              color="white"
            />
            <Text style={styles.markerText}>
              Ish kuni boshlandi:{" "}
              {new Date(item.createdAt).toLocaleTimeString("uz-UZ", {
                hour: "2-digit",
                minute: "2-digit",
              })}
              {item.data?.openedBy ? ` • ${item.data.openedBy}` : ""}
            </Text>
          </View>
          <View
            style={[styles.markerLine, { backgroundColor: colors.success }]}
          />
        </TouchableOpacity>
      );
    }
    if (item.type === "shift-end") {
      return (
        <TouchableOpacity key={item._id} style={styles.shiftMarker} onPress={() => handleViewShiftDetails(item.data)}>
          <View
            style={[styles.markerLine, { backgroundColor: colors.danger }]}
          />
          <View style={styles.markerBadge}>
            <MaterialCommunityIcons name="clock-end" size={16} color="white" />
            <Text style={styles.markerText}>
              Ish kuni yakunlandi:{" "}
              {new Date(item.createdAt).toLocaleTimeString("uz-UZ", {
                hour: "2-digit",
                minute: "2-digit",
              })}
              {item.data?.closedBy ? ` • ${item.data.closedBy}` : ""}
            </Text>
          </View>
          <View
            style={[styles.markerLine, { backgroundColor: colors.danger }]}
          />
        </TouchableOpacity>
      );
    }

    const order = item;
    return (
      <TouchableOpacity
        key={order._id}
        style={[styles.orderCard, { backgroundColor: colors.card }]}
        onPress={() => {
          setSelectedOrder(order);
          setPayModal(true);
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
                  style={[styles.tableNumber, { color: colors.primary }]}
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
                  style={[styles.floorTextSmall, { color: colors.primary }]}
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
            {order.status === "Paid" && order.cashierName && (
              <Text
                style={{
                  fontSize: 12,
                  color: colors.secondary,
                  marginTop: 2,
                }}
              >
                Kassir: {order.cashierName}
              </Text>
            )}
            <Text style={[styles.orderTime, { color: colors.secondary }]}>
              {new Date(order.updatedAt || order.createdAt).toLocaleTimeString(
                "uz-UZ",
                {
                  hour: "2-digit",
                  minute: "2-digit",
                },
              )}
            </Text>
          </View>
          <View style={{ alignItems: "flex-end" }}>
            <Text style={[styles.amount, { color: colors.text }]}>
              {order.totalAmount.toLocaleString()} {common.currency}
            </Text>
            <View
              style={[
                styles.statusBadge,
                { backgroundColor: colors.success + "15" },
              ]}
            >
              <Text style={[styles.statusText, { color: colors.success }]}>
                {order.paymentMethod === "Card" ? "Karta" : "Naqd"}
              </Text>
            </View>
          </View>
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
            onPress={handleHeaderAction}
          >
            <MaterialCommunityIcons
              name={user?.role === "owner" ? "arrow-left" : "logout"}
              size={24}
              color={colors.secondary}
            />
          </TouchableOpacity>
        </View>
      </View>

      {activeTab === "pending" && (
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
      )}

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
          ) : activeTab === "pending" ? (
            filteredOrders.map((order) => (
              <TouchableOpacity
                key={order._id}
                style={[styles.orderCard, { backgroundColor: colors.card }]}
                onPress={() => {
                  setSelectedOrder(order);
                  setPayModal(true);
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
                            order.status === "Ready"
                              ? colors.success + "30"
                              : colors.warning + "15",
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.statusText,
                          {
                            color:
                              order.status === "Ready"
                                ? colors.success
                                : colors.warning,
                          },
                        ]}
                      >
                        {order.status === "Ready" ? "Tayyor" : "Faol"}
                      </Text>
                    </View>
                  </View>
                </View>
              </TouchableOpacity>
            ))
          ) : (
            shifts.map((shift, idx) => (
              <TouchableOpacity
                key={shift._id || idx}
                style={[
                  styles.orderCard,
                  { backgroundColor: colors.card, padding: 16, marginBottom: 12 },
                ]}
                onPress={() => handleViewShiftDetails(shift)}
              >
                <View style={{ flexDirection: "row", alignItems: "center" }}>
                  <View
                    style={{
                      width: 44,
                      height: 44,
                      borderRadius: 22,
                      backgroundColor: colors.primary + "15",
                      justifyContent: "center",
                      alignItems: "center",
                      marginRight: 15,
                    }}
                  >
                    <MaterialCommunityIcons
                      name="calendar-clock"
                      size={26}
                      color={colors.primary}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text
                      style={{
                        color: colors.text,
                        fontSize: 17,
                        fontWeight: "700",
                      }}
                    >
                      {new Date(shift.startTime).toLocaleDateString("uz-UZ")}
                    </Text>
                    <View style={{ flexDirection: "row", marginTop: 4, gap: 10 }}>
                      <Text style={{ color: colors.secondary, fontSize: 13 }}>
                        ⬇️ {new Date(shift.startTime).toLocaleTimeString("uz-UZ", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </Text>
                      {shift.endTime && (
                        <Text style={{ color: colors.secondary, fontSize: 13 }}>
                          ⬆️ {new Date(shift.endTime).toLocaleTimeString("uz-UZ", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </Text>
                      )}
                    </View>
                  </View>
                  <MaterialCommunityIcons
                    name="chevron-right"
                    size={24}
                    color={colors.border}
                  />
                </View>
              </TouchableOpacity>
            ))
          )}
        </ScrollView>
      )}

      {/* Shift Details Modal */}
      <Modal visible={shiftDetailsModal} transparent animationType="slide" statusBarTranslucent>
        <View style={styles.modalOverlay}>
          <TouchableOpacity 
            style={styles.modalBackdrop} 
            activeOpacity={1} 
            onPress={() => setShiftDetailsModal(false)} 
          />
          <View style={[styles.bottomSheet, { backgroundColor: colors.background, flex: 0.92 }]}>
            <View style={styles.sheetHandleContainer}>
              <View style={styles.sheetHandle} />
            </View>
            <View style={[styles.modalContent, { flex: 1, paddingBottom: 20 }]}>
              <View style={styles.modalHeader}>
                <TouchableOpacity
                  onPress={() => setShiftDetailsModal(false)}
                  style={styles.modalCloseBtn}
                >
                  <MaterialCommunityIcons
                    name="arrow-left"
                    size={26}
                    color={colors.text}
                  />
                </TouchableOpacity>
                <Text style={[styles.modalTitle, { color: colors.text }]}>
                  Smena To'lovlari
                </Text>
                <View style={{ width: 40 }} />
              </View>

              {loadingShift ? (
                <View style={styles.centered}>
                  <ActivityIndicator size="large" color={colors.primary} />
                </View>
              ) : (
                <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
                  {shiftOrders.length === 0 ? (
                    <Text style={[styles.emptyText, { color: colors.secondary, textAlign: 'center' }]}>Bu smenada to'lovlar yo'q</Text>
                  ) : (
                    <>
                      <Text style={{fontSize: 16, fontWeight: 'bold', marginBottom: 15, color: colors.primary}}>
                        Jami: {shiftOrders.reduce((sum, o) => sum + (o.totalAmount || 0), 0).toLocaleString()} {common.currency}
                      </Text>
                      {shiftOrders.map((order, idx) => (
                        <TouchableOpacity 
                          key={idx} 
                          style={[styles.itemRow, { paddingVertical: 12 }]}
                          onPress={() => {
                            setSelectedOrder(order);
                            setPayModal(true);
                          }}
                        >
                          <View style={{ flex: 1 }}>
                            <Text style={[styles.itemName, { color: colors.text }]}>
                              {order.tableName}-stol
                            </Text>
                            <Text style={[styles.itemMeta, { color: colors.secondary }]}>
                              {new Date(order.updatedAt || order.createdAt).toLocaleTimeString("uz-UZ", { hour: "2-digit", minute: "2-digit" })}
                              {" • "}{order.paymentMethod === 'Card' ? 'Karta' : 'Naqd'}
                              {order.cashierName ? ` • ${order.cashierName}` : ''}
                            </Text>
                          </View>
                          <View style={{ alignItems: 'flex-end', gap: 4 }}>
                            <Text style={[styles.itemTotal, { color: colors.primary }]}>
                              {order.totalAmount?.toLocaleString()} {common.currency}
                            </Text>
                            <MaterialCommunityIcons name="chevron-right" size={16} color={colors.border} />
                          </View>
                        </TouchableOpacity>
                      ))}
                    </>
                  )}
                </ScrollView>
              )}
            </View>
          </View>
        </View>
      </Modal>

      {/* Payment Modal */}
      <Modal visible={payModal} transparent animationType="slide" statusBarTranslucent>
        <View style={styles.modalOverlay}>
          <TouchableOpacity 
            style={styles.modalBackdrop} 
            activeOpacity={1} 
            onPress={() => setPayModal(false)} 
          />
          <View style={[styles.bottomSheet, { backgroundColor: colors.background }]}>
            <View style={styles.sheetHandleContainer}>
              <View style={styles.sheetHandle} />
            </View>
            <View style={styles.modalContent}>
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
                {selectedOrder?.status === "Paid"
                  ? "To'lov Tafsilotlari"
                  : t.confirmPayment}
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

                {selectedOrder.status === "Paid" && (
                  <View style={{ marginBottom: 16 }}>
                    <View style={styles.billRow}>
                      <Text
                        style={[styles.billLabel, { color: colors.secondary }]}
                      >
                        To'lov usuli:
                      </Text>
                      <Text style={[styles.billValue, { color: colors.text }]}>
                        {selectedOrder.paymentMethod === "Card"
                          ? "Karta"
                          : "Naqd"}
                      </Text>
                    </View>
                    <View style={[styles.billRow, { marginTop: 8 }]}>
                      <Text
                        style={[styles.billLabel, { color: colors.secondary }]}
                      >
                        Ofitsiant:
                      </Text>
                      <Text style={[styles.billValue, { color: colors.text }]}>
                        {selectedOrder.waiterName || "Noma'lum"}
                      </Text>
                    </View>
                    <View style={[styles.billRow, { marginTop: 8 }]}>
                      <Text
                        style={[styles.billLabel, { color: colors.secondary }]}
                      >
                        Kassir:
                      </Text>
                      <Text style={[styles.billValue, { color: colors.text }]}>
                        {selectedOrder.cashierName || "Kassir"}
                      </Text>
                    </View>
                  </View>
                )}

                {selectedOrder.status !== "Paid" && (
                  <>
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
                            paymentMethod === "Cash"
                              ? "white"
                              : colors.secondary
                          }
                        />
                        <Text
                          style={[
                            styles.methodText,
                            {
                              color:
                                paymentMethod === "Cash"
                                  ? "white"
                                  : colors.text,
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
                            paymentMethod === "Card"
                              ? "white"
                              : colors.secondary
                          }
                        />
                        <Text
                          style={[
                            styles.methodText,
                            {
                              color:
                                paymentMethod === "Card"
                                  ? "white"
                                  : colors.text,
                            },
                          ]}
                        >
                          {t.card}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </>
                )}

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
                            {item.completedBy ? ` • 👨‍🍳 ${item.completedBy}` : ""}
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

                {selectedOrder.status !== "Paid" ? (
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
                ) : (
                  <TouchableOpacity
                    style={[
                      styles.payBtn,
                      { backgroundColor: colors.secondary },
                    ]}
                    onPress={() => setPayModal(false)}
                  >
                    <Text style={styles.payBtnText}>Yopish</Text>
                  </TouchableOpacity>
                )}

                {selectedOrder.status !== "Paid" && (
                  <TouchableOpacity
                    style={[styles.cancelBtn, { borderColor: colors.border }]}
                    onPress={() => setPayModal(false)}
                    disabled={processing}
                  >
                    <Text
                      style={[
                        styles.cancelBtnText,
                        { color: colors.secondary },
                      ]}
                    >
                      {common.cancel}
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            )}
            </View>
          </View>
        </View>
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
    justifyContent: "flex-end",
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  bottomSheet: {
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    paddingBottom: 40,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 20,
    maxHeight: "92%",
  },
  sheetHandleContainer: {
    alignItems: "center",
    paddingTop: 12,
    paddingBottom: 8,
  },
  sheetHandle: {
    width: 40,
    height: 5,
    borderRadius: 3,
    backgroundColor: "rgba(0,0,0,0.2)",
  },
  modalContent: {
    padding: 24,
    paddingTop: 0,
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
  shiftMarker: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 16,
    paddingHorizontal: 8,
  },
  markerLine: {
    flex: 1,
    height: 1,
    opacity: 0.3,
  },
  markerBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: "#1E293B",
    marginHorizontal: 10,
    gap: 6,
  },
  markerText: {
    color: "white",
    fontSize: 12,
    fontWeight: "700",
  },
});
