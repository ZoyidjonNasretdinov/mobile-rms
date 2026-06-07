import React, { useState, useEffect, useCallback, useRef } from "react";
import { useFocusEffect } from "expo-router";
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert,
  Modal,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { useRouter } from "expo-router";
import { Storage } from "@/utils/storage";
import axios from "axios";
import { CONFIG } from "@/constants/config";
import { socketService } from "@/utils/socket";
// import * as Speech from "expo-speech";
import * as Haptics from "expo-haptics";
import { notificationService } from "@/utils/notifications";

import { Translations } from "@/constants/translations";

const t = Translations.uz.waiter;
const API_BASE_URL = CONFIG.API_BASE_URL;

export default function WaiterStationScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme() ?? "light";
  const colors = Colors[colorScheme];

  const [activeTab, setActiveTab] = useState<
    "tables" | "myOrders" | "notifications" | "history"
  >("tables");
  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [tables, setTables] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [historyOrders, setHistoryOrders] = useState<any[]>([]);
  const [selectedHistoryOrder, setSelectedHistoryOrder] = useState<any>(null);
  const [expandedDates, setExpandedDates] = useState<string[]>([]);
  const [user, setUser] = useState<any>(null);
  const userRef = useRef<any>(null);
  const [selectedFloor, setSelectedFloor] = useState<number | null>(null);
  const [isShiftActive, setIsShiftActive] = useState(true); // Default to true to avoid flicker

  const fetchData = useCallback(async () => {
    try {
      const token = await Storage.getItem("access_token");
      const userStr = await Storage.getItem("user");
      if (userStr) {
        const parsedUser = JSON.parse(userStr);
        setUser(parsedUser);
        userRef.current = parsedUser;
      }

      // Fetch Tables
      const tablesRes = await axios.get(`${API_BASE_URL}/tables`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const fetchedTables = tablesRes.data.sort(
        (a: any, b: any) => parseInt(a.number) - parseInt(b.number),
      );
      setTables(fetchedTables);

      // Set default floor
      if (fetchedTables.length > 0 && selectedFloor === null) {
        const floors = [
          ...new Set(fetchedTables.map((t: any) => t.floor || 1)),
        ].sort((a: any, b: any) => (a as number) - (b as number)) as number[];
        setSelectedFloor(floors[0]);
      }

      const ordersRes = await axios.get(`${API_BASE_URL}/orders`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setOrders(ordersRes.data);

      // Check shift status
      try {
        const shiftRes = await axios.get(`${API_BASE_URL}/shifts/active`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setIsShiftActive(!!shiftRes.data);
      } catch (e) {
        setIsShiftActive(false);
      }
    } catch (error) {
      console.error("Waiter fetch error:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [selectedFloor]);

  useFocusEffect(
    useCallback(() => {
      fetchData();
    }, [fetchData])
  );

  useEffect(() => {
    if (activeTab === "history") {
      fetchHistoryOrders();
    }
  }, [activeTab]);

  const fetchHistoryOrders = async () => {
    try {
      const token = await Storage.getItem("access_token");
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      const res = await axios.get(`${API_BASE_URL}/orders?startDate=${thirtyDaysAgo.toISOString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setHistoryOrders(res.data);
    } catch (error) {
      console.error("Fetch history error:", error);
    }
  };

  useEffect(() => {
    fetchData();
    const socket = socketService.getSocket();

    const handleOrderCreated = (newOrder: any) => {
      setOrders((prev) => [newOrder, ...prev]);
    };

    const handleOrderUpdated = (updatedOrder: any) => {
      setOrders((prev) =>
        prev.map((o) => (o._id === updatedOrder._id ? updatedOrder : o)),
      );
    };

    const handleItemReady = (data: any) => {
      const currentUser = userRef.current;
      const currentUserId = currentUser?.id || currentUser?._id;
      if (!data.waiterId || data.waiterId === currentUserId) {
        const floorStr = data.floor ? `${data.floor}-qavat, ` : "";
        const msg = `${floorStr}${data.tableName}-stol uchun ${data.itemName} tayyor bo'ldi.`;
        notificationService.notify(
          msg,
          Haptics.NotificationFeedbackType.Success,
          "alarm",
        );

        setNotifications((prev) =>
          [
            {
              id: Date.now().toString(),
              message: msg,
              time: new Date().toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              }),
              icon: "check-circle",
              color: colors.success,
            },
            ...prev,
          ].slice(0, 50),
        );
        setUnreadCount((c) => c + 1);

        Alert.alert("Taom Tayyor!", msg, [{ text: "Tushunarli" }], {
          cancelable: true,
        });
      }
    };

    const handleItemCooking = (data: any) => {
      const currentUser = userRef.current;
      const currentUserId = currentUser?.id || currentUser?._id;
      if (!data.waiterId || data.waiterId === currentUserId) {
        const floorStr = data.floor ? `${data.floor}-qavat, ` : "";
        const msg = `${floorStr}${data.tableName}-stol: ${data.itemName} jarayonga o'tkazildi 🍳`;
        notificationService.notify(
          msg,
          Haptics.NotificationFeedbackType.Warning,
        );
        setNotifications((prev) =>
          [
            {
              id: Date.now().toString(),
              message: msg,
              time: new Date().toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              }),
              icon: "chef-hat",
              color: "#F59E0B",
            },
            ...prev,
          ].slice(0, 50),
        );
        setUnreadCount((c) => c + 1);
      }
    };

    const handleOrderPaid = (data: any) => {
      const currentUser = userRef.current;
      const currentUserId = currentUser?.id || currentUser?._id;
      if (!data.waiterId || data.waiterId === currentUserId) {
        const floorStr = data.floor ? `${data.floor}-qavat, ` : "";
        const method = data.paymentMethod === "Online" ? "(Onlayn)" : "(Naqd)";
        const msg = `${floorStr}${data.tableName}-stol to'lovi qabul qilindi ${method}. Summa: ${data.totalAmount?.toLocaleString()} so'm.`;
        notificationService.notify(
          msg,
          Haptics.NotificationFeedbackType.Success,
        );
        setNotifications((prev) =>
          [
            {
              id: Date.now().toString(),
              message: msg,
              time: new Date().toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              }),
              icon: "cash-check",
              color: "#10B981",
            },
            ...prev,
          ].slice(0, 50),
        );
        setUnreadCount((c) => c + 1);
        fetchData();
      }
    };

    const handleTableUpdated = (updatedTable: any) => {
      setTables((prev) =>
        prev.map((t) => (t._id === updatedTable._id ? updatedTable : t)),
      );
    };

    const handleDayStarted = () => {
      const msg = "Ish kuni boshlandi. Baraka bersin!";
      notificationService.notify(msg, Haptics.NotificationFeedbackType.Success);
      setNotifications((prev) => [
        {
          id: Date.now().toString(),
          message: msg,
          time: new Date().toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          }),
          icon: "sun-clock",
          color: colors.primary,
        },
        ...prev,
      ]);
      fetchData();
    };

    const handleDayEnded = () => {
      const msg = "Ish kuni yakunlandi. Charchamang!";
      notificationService.notify(msg, Haptics.NotificationFeedbackType.Warning);
      setNotifications((prev) => [
        {
          id: Date.now().toString(),
          message: msg,
          time: new Date().toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          }),
          icon: "moon-star",
          color: colors.warning,
        },
        ...prev,
      ]);
      fetchData();
    };

    const handleStockUpdated = () => fetchData();
    const handleStaffStockUpdated = () => fetchData();

    socket.on("orderCreated", handleOrderCreated);
    socket.on("orderUpdated", handleOrderUpdated);
    socket.on("itemReady", handleItemReady);
    socket.on("itemCooking", handleItemCooking);
    socket.on("orderPaid", handleOrderPaid);
    socket.on("tableUpdated", handleTableUpdated);
    socket.on("dayStarted", handleDayStarted);
    socket.on("dayEnded", handleDayEnded);
    socket.on("stockUpdated", handleStockUpdated);
    socket.on("staffStockUpdated", handleStaffStockUpdated);

    return () => {
      socket.off("orderCreated", handleOrderCreated);
      socket.off("orderUpdated", handleOrderUpdated);
      socket.off("itemReady", handleItemReady);
      socket.off("itemCooking", handleItemCooking);
      socket.off("orderPaid", handleOrderPaid);
      socket.off("tableUpdated", handleTableUpdated);
      socket.off("dayStarted", handleDayStarted);
      socket.off("dayEnded", handleDayEnded);
      socket.off("stockUpdated", handleStockUpdated);
      socket.off("staffStockUpdated", handleStaffStockUpdated);
    };
  }, [fetchData, colors.primary, colors.success, colors.warning]);

  const handleHeaderAction = async () => {
    router.back();
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  const StatBox = ({ label, value, color }: any) => (
    <View style={[styles.statBox, { backgroundColor: color + "10" }]}>
      <Text style={[styles.statValue, { color: color }]}>{value}</Text>
      <Text style={[styles.statLabel, { color: color }]}>{label}</Text>
    </View>
  );

  const myUserId = user?.id || user?._id;
  const myOrders = orders
    .filter((o) => o.waiterId === myUserId)
    .sort(
      (a, b) =>
        new Date(b.updatedAt || b.createdAt).getTime() -
        new Date(a.updatedAt || a.createdAt).getTime(),
    );
  const floors = [...new Set(tables.map((t: any) => t.floor || 1))].sort(
    (a: any, b: any) => (a as number) - (b as number),
  ) as number[];
  const filteredTables = tables.filter((t) => (t.floor || 1) === selectedFloor);

  const getReadinessIndicators = (order: any) => {
    if (!order || !order.items) return null;
    const departments = {
      oshpaz: { icon: "chef-hat", color: "#F59E0B" },
      bar: { icon: "glass-cocktail", color: "#3B82F6" },
      shashlikchi: { icon: "fire", color: "#EF4444" },
      salatchi: { icon: "leaf", color: "#10B981" },
    };

    const readyStats: { [key: string]: boolean } = {};
    order.items.forEach((item: any) => {
      if (item.status === "Ready" && item.department) {
        readyStats[item.department] = true;
      }
    });

    return Object.keys(readyStats).map((dept) => {
      const config = departments[dept as keyof typeof departments] || {
        icon: "food",
        color: colors.primary,
      };
      return (
        <View
          key={dept}
          style={[styles.miniBadge, { backgroundColor: config.color + "20" }]}
        >
          <MaterialCommunityIcons
            name={config.icon as any}
            size={12}
            color={config.color}
          />
        </View>
      );
    });
  };

  const TableCard = ({ table }: { table: any }) => {
    const tableOrders = orders.filter((o) => {
      const oTableId = typeof o.tableId === 'object' && o.tableId ? o.tableId._id : o.tableId;
      return oTableId === table._id;
    });
    const activeOrder = tableOrders.find(
      (o) => o.status !== "Paid" && o.status !== "Cancelled",
    );
    const status = activeOrder ? activeOrder.status : "Vacant";

    let statusColor = colors.accent;
    let statusIcon: any = "clock-outline";

    if (status === "Ready") {
      statusColor = colors.success;
      statusIcon = "check-circle-outline";
    } else if (status === "Vacant") {
      statusColor = colors.secondary;
      statusIcon = "plus";
    }

    return (
      <TouchableOpacity
        style={[
          styles.tableCard,
          {
            backgroundColor:
              status === "Vacant" ? colors.background : colors.card,
          },
          status !== "Vacant" && { borderColor: statusColor, borderWidth: 1 },
        ]}
        onPress={() => {
          if (!isShiftActive) {
            Alert.alert(
              "Ish kuni boshlanmagan",
              "Iltimos, boshliq kunni boshlashini kuting.",
            );
            return;
          }
          router.push({
            pathname: "/create-order",
            params: {
              tableId: table._id,
              tableName: table.number,
              orderId: activeOrder?._id || "",
            },
          });
        }}
      >
        <View style={styles.tableHeader}>
          <View style={{ flex: 1, marginRight: 8 }}>
            <View style={styles.tableNameRow}>
              <MaterialCommunityIcons
                name="table-chair"
                size={16}
                color={status === "Vacant" ? colors.secondary : colors.text}
              />
              <Text
                numberOfLines={1}
                style={[
                  styles.tableId,
                  {
                    color: status === "Vacant" ? colors.secondary : colors.text,
                  },
                ]}
              >
                {table.number}
              </Text>
            </View>
            <View style={styles.floorNameRow}>
              <MaterialCommunityIcons
                name="layers-outline"
                size={12}
                color={colors.secondary}
              />
              <Text
                numberOfLines={1}
                style={[styles.floorTextMini, { color: colors.secondary }]}
              >
                {table.floor || 1}
              </Text>
            </View>
          </View>
          <View style={styles.badgeRow}>
            {activeOrder && getReadinessIndicators(activeOrder)}
            <MaterialCommunityIcons
              name={statusIcon}
              size={18}
              color={statusColor}
            />
          </View>
        </View>

        {status === "Vacant" ? (
          <View style={styles.vacantContent}>
            <MaterialCommunityIcons
              name="plus"
              size={24}
              color={colors.secondary}
            />
            <Text style={[styles.vacantText, { color: colors.secondary }]}>
              {t.newOrder}
            </Text>
          </View>
        ) : (
          <View style={styles.activeContent}>
            <View style={styles.waiterInfo}>
              <MaterialCommunityIcons
                name="account-outline"
                size={12}
                color={colors.secondary}
              />
              <Text style={[styles.waiterName, { color: colors.secondary }]}>
                {activeOrder.waiterName || "Ofitsiant"}
              </Text>
            </View>
            <Text style={[styles.guestsText, { color: colors.secondary }]}>
              {t.guests.replace("{count}", table.capacity)}
            </Text>
            <View style={styles.activeMeta}>
              <View style={styles.metaRow}>
                <Text style={[styles.metaLabel, { color: colors.secondary }]}>
                  {t.amount}
                </Text>
                <Text style={[styles.tableStatus, { color: statusColor }]}>
                  {status === "Ready" ? (
                    "Tayyor"
                  ) : (
                    <View style={{ flexDirection: "row", gap: 6 }}>
                      {activeOrder.items?.filter(
                        (i: any) => i.status === "Ready",
                      ).length > 0 && (
                        <Text
                          style={{
                            color: colors.success,
                            fontSize: 11,
                            fontWeight: "bold",
                          }}
                        >
                          {
                            activeOrder.items.filter(
                              (i: any) => i.status === "Ready",
                            ).length
                          }{" "}
                          tayyor
                        </Text>
                      )}
                      {activeOrder.items?.filter(
                        (i: any) => i.status !== "Ready",
                      ).length > 0 && (
                        <Text
                          style={{
                            color: colors.accent,
                            fontSize: 11,
                            fontWeight: "bold",
                          }}
                        >
                          {
                            activeOrder.items.filter(
                              (i: any) => i.status !== "Ready",
                            ).length
                          }{" "}
                          kutilmoqda
                        </Text>
                      )}
                    </View>
                  )}
                </Text>
              </View>
            </View>
            {/* Total amount prominently shown */}
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: 6 }}>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 10, color: colors.secondary, marginBottom: 2 }}>
                  Buyurtma oldi:
                </Text>
                <Text style={{ fontSize: 12, fontWeight: '700', color: colors.text }} numberOfLines={1}>
                  {activeOrder.waiterName || "Staff"}
                </Text>
              </View>
              <Text
                style={{
                  color: statusColor,
                  fontSize: 15,
                  fontWeight: "800",
                }}
              >
                {activeOrder.totalAmount?.toLocaleString()}{" "}
                {Translations.uz.common.currency}
              </Text>
            </View>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  const OrderRow = ({ order }: { order: any }) => {
    const readyCount =
      order.items?.filter((i: any) => i.status === "Ready").length || 0;
    const pendingCount =
      order.items?.filter((i: any) => i.status !== "Ready").length || 0;

    return (
      <TouchableOpacity
        style={[styles.orderRow, { backgroundColor: colors.card }]}
        onPress={() => {
          router.push({
            pathname: "/create-order",
            params: {
              tableId: typeof order.tableId === 'object' ? order.tableId._id : order.tableId,
              tableName: order.tableName,
              orderId: order._id,
            },
          });
        }}
      >
        <View style={styles.orderLeft}>
          <View
            style={[
              styles.tableNumberCircle,
              { backgroundColor: colors.primary + "15" },
            ]}
          >
            <MaterialCommunityIcons
              name="table-chair"
              size={14}
              color={colors.primary}
            />
            <Text style={[styles.tableNumberText, { color: colors.primary }]}>
              {order.tableName}
            </Text>
          </View>
          <View>
            <Text style={[styles.orderTimeText, { color: colors.secondary }]}>
              {new Date(order.createdAt).toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </Text>
            <View
              style={{ flexDirection: "row", gap: 6, alignItems: "center" }}
            >
              <Text style={[styles.orderStatusText, { color: colors.text }]}>
                {order.status === "Paid" ? "To'langan" : "Faol"}
              </Text>
              {readyCount > 0 && (
                <Text
                  style={{
                    color: colors.success,
                    fontSize: 11,
                    fontWeight: "bold",
                  }}
                >
                  {readyCount} tayyor
                </Text>
              )}
              {pendingCount > 0 && (
                <Text
                  style={{
                    color: colors.accent,
                    fontSize: 11,
                    fontWeight: "bold",
                  }}
                >
                  {pendingCount} kutilmoqda
                </Text>
              )}
            </View>
          </View>
        </View>
        <View style={styles.orderRight}>
          <View style={styles.badgeRow}>{getReadinessIndicators(order)}</View>
          <Text style={[styles.orderAmountText, { color: colors.text }]}>
            {order.totalAmount?.toLocaleString()}{" "}
            {Translations.uz.common.currency}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
    >
      <View style={styles.header}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
          <TouchableOpacity
            onPress={handleHeaderAction}
            style={[
              styles.logoutButton,
              {
                backgroundColor: colors.card,
                width: 44,
                height: 44,
                borderRadius: 15,
                justifyContent: "center",
                alignItems: "center",
              },
            ]}
          >
            <MaterialCommunityIcons
              name={user?.role === "owner" ? "arrow-left" : "logout"}
              size={24}
              color={colors.text}
            />
          </TouchableOpacity>
          <View style={{ flex: 1, paddingRight: 8 }}>
            <Text style={[styles.headerSubtitle, { color: colors.secondary, marginBottom: 2 }]} numberOfLines={1}>
              {user?.fullName || "Waiter"}
            </Text>
            <Text style={[styles.headerTitle, { color: colors.text, fontSize: 24, fontWeight: "800" }]} numberOfLines={1}>
              {t.title}
            </Text>
          </View>
        </View>
      </View>

      {!isShiftActive && (
        <View
          style={{
            backgroundColor: "#F59E0B",
            padding: 10,
            alignItems: "center",
            flexDirection: "row",
            justifyContent: "center",
            gap: 8,
          }}
        >
          <MaterialCommunityIcons
            name="alert-outline"
            size={20}
            color="white"
          />
          <Text style={{ color: "white", fontWeight: "bold", fontSize: 13 }}>
            {"Ish kuni boshlanmagan. Zakaz berib bo'lmaydi."}
          </Text>
        </View>
      )}

      <View style={styles.statsRow}>
        <StatBox
          label={t.tablesActive}
          value={`${tables.filter((t) => t.status === "Active").length}/${tables.length}`}
          color={colors.primary}
        />
        <StatBox
          label={t.ordersReady}
          value={orders.filter((o) => o.status === "Ready").length}
          color={colors.success}
        />
        <StatBox
          label="Tushum"
          value={`${myOrders
            .reduce(
              (acc, o) => acc + (o.status === "Paid" ? o.totalAmount : 0),
              0,
            )
            .toLocaleString()}`}
          color={colors.accent}
        />
      </View>

      <View style={styles.tabSwitcher}>
        <TouchableOpacity
          style={[
            styles.tabItem,
            activeTab === "tables" && { backgroundColor: colors.primary, flex: 2 },
          ]}
          onPress={() => setActiveTab("tables")}
        >
          <MaterialCommunityIcons
            name="view-grid-outline"
            size={20}
            color={activeTab === "tables" ? "white" : colors.secondary}
          />
          {activeTab === "tables" && (
            <Text style={[styles.tabText, { color: "white" }]}>Stollar</Text>
          )}
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[
            styles.tabItem,
            activeTab === "notifications" && { backgroundColor: colors.primary, flex: 2 },
          ]}
          onPress={() => {
            setActiveTab("notifications");
            setUnreadCount(0);
          }}
        >
          <View>
            <MaterialCommunityIcons
              name="bell-outline"
              size={20}
              color={activeTab === "notifications" ? "white" : colors.secondary}
            />
            {unreadCount > 0 && activeTab !== "notifications" && (
              <View
                style={[
                  styles.notifBadge,
                  { backgroundColor: colors.danger || "#EF4444" },
                ]}
              />
            )}
          </View>
          {activeTab === "notifications" && (
            <Text style={[styles.tabText, { color: "white" }]}>Xabarlar</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.tabItem,
            activeTab === "history" && { backgroundColor: colors.primary, flex: 2 },
          ]}
          onPress={() => setActiveTab("history")}
        >
          <MaterialCommunityIcons
            name="history"
            size={20}
            color={activeTab === "history" ? "white" : colors.secondary}
          />
          {activeTab === "history" && (
            <Text style={[styles.tabText, { color: "white" }]}>Tarix</Text>
          )}
        </TouchableOpacity>
      </View>



      {activeTab === "tables" && (
        <View style={styles.floorSelector}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.floorScroll}
          >
            {floors.map((floor) => (
              <TouchableOpacity
                key={floor}
                style={[
                  styles.floorItem,
                  selectedFloor === floor && {
                    backgroundColor: colors.primary,
                    borderColor: colors.primary,
                  },
                ]}
                onPress={() => setSelectedFloor(floor)}
              >
                <Text
                  style={[
                    styles.floorText,
                    selectedFloor === floor && { color: "white" },
                  ]}
                >
                  {floor}-qavat
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

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
          {activeTab === "tables" ? (
            <View style={styles.tableGrid}>
              {filteredTables.map((table) => (
                <TableCard key={table._id} table={table} />
              ))}
            </View>
          ) : activeTab === "myOrders" ? (
            <View style={styles.myOrdersList}>
              {myOrders.length === 0 ? (
                <Text style={[styles.emptyText, { color: colors.secondary }]}>
                  Bugun hali buyurtma qabul qilmadingiz
                </Text>
              ) : (
                myOrders.map((order) => (
                  <OrderRow key={order._id} order={order} />
                ))
              )}
            </View>
          ) : activeTab === "notifications" ? (
            <View style={styles.myOrdersList}>
              {notifications.length === 0 ? (
                <Text style={[styles.emptyText, { color: colors.secondary }]}>
                  Bildirishnomalar mavjud emas
                </Text>
              ) : (
                notifications.map((notif) => (
                  <View
                    key={notif.id}
                    style={[styles.orderRow, { backgroundColor: colors.card }]}
                  >
                    <View style={styles.orderLeft}>
                      <View
                        style={[
                          styles.tableNumberCircle,
                          {
                            backgroundColor: (notif.color || "#34C759") + "15",
                          },
                        ]}
                      >
                        <MaterialCommunityIcons
                          name={notif.icon || "bell"}
                          size={20}
                          color={notif.color || colors.primary}
                        />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text
                          style={[
                            styles.orderTimeText,
                            { color: colors.secondary },
                          ]}
                        >
                          {notif.time}
                        </Text>
                        <Text
                          style={[
                            styles.orderStatusText,
                            { color: colors.text, fontSize: 13 },
                          ]}
                        >
                          {notif.message}
                        </Text>
                      </View>
                    </View>
                  </View>
                ))
              )}
            </View>
          ) : activeTab === "history" ? (
            <View style={styles.myOrdersList}>
              {historyOrders.length === 0 ? (
                <Text style={[styles.emptyText, { color: colors.secondary }]}>
                  Tarix mavjud emas
                </Text>
              ) : (
                Object.entries(
                  historyOrders.reduce((acc, order) => {
                    const date = new Date(order.createdAt).toLocaleDateString("ru-RU");
                    if (!acc[date]) acc[date] = { revenue: 0, orders: [] };
                    if (order.status === "Paid") {
                      acc[date].revenue += order.totalAmount || 0;
                    }
                    acc[date].orders.push(order);
                    return acc;
                  }, {} as Record<string, { revenue: number; orders: any[] }>)
                ).map(([date, data]: any) => (
                  <View
                    key={date}
                    style={{
                      marginBottom: 15,
                      backgroundColor: colors.card || "white",
                      borderRadius: 15,
                      overflow: "hidden",
                    }}
                  >
                    <TouchableOpacity
                      style={{ padding: 15 }}
                      onPress={() => {
                        setExpandedDates((prev) =>
                          prev.includes(date)
                            ? prev.filter((d) => d !== date)
                            : [...prev, date]
                        );
                      }}
                    >
                      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                        <Text style={{ fontWeight: "bold", fontSize: 16, color: colors.text }}>
                          Sana: {date}
                        </Text>
                        <MaterialCommunityIcons
                          name={expandedDates.includes(date) ? "chevron-up" : "chevron-down"}
                          size={24}
                          color={colors.secondary}
                        />
                      </View>
                      <Text
                        style={{
                          fontSize: 14,
                          color: colors.success || "green",
                          marginTop: 8,
                          fontWeight: "bold",
                        }}
                      >
                        Kunlik Tushum: {data.revenue.toLocaleString()} UZS
                      </Text>
                    </TouchableOpacity>

                    {expandedDates.includes(date) && (
                      <View style={{ paddingHorizontal: 15, paddingBottom: 10 }}>
                        {data.orders.sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).map((o: any, idx: number) => (
                          <TouchableOpacity
                            key={idx}
                            onPress={() => setSelectedHistoryOrder(o)}
                            style={{
                              paddingVertical: 12,
                              borderTopWidth: 1,
                              borderTopColor: colors.border || "#eee",
                            }}
                          >
                            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                              <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                                <MaterialCommunityIcons name="clock-outline" size={14} color={colors.secondary} />
                                <Text style={{ fontSize: 13, color: colors.secondary }}>
                                  {new Date(o.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                                </Text>
                              </View>
                              <Text style={{ fontWeight: "bold", color: colors.text }}>
                                {(o.totalAmount || 0).toLocaleString()} UZS
                              </Text>
                            </View>
                            <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: 4 }}>
                              <Text style={{ fontWeight: "600", color: colors.text }}>
                                {o.tableName}-stol ({o.status})
                              </Text>
                              <Text style={{ fontSize: 12, color: colors.secondary }} numberOfLines={1}>
                                {o.items?.length || 0} ta mahsulot
                              </Text>
                            </View>
                          </TouchableOpacity>
                        ))}
                      </View>
                    )}
                  </View>
                ))
              )}
            </View>
          ) : null}
          <View style={styles.bottomSpace} />
        </ScrollView>
      )}

      {/* History Order Details Modal */}
      <Modal
        visible={!!selectedHistoryOrder}
        animationType="slide"
        transparent
        onRequestClose={() => setSelectedHistoryOrder(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.card, maxHeight: '80%' }]}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={[styles.modalTitle, { color: colors.text }]}>
                  {selectedHistoryOrder?.tableName}-stol
                </Text>
                <Text style={{ color: colors.secondary, fontSize: 13, marginTop: 2 }}>
                  {selectedHistoryOrder && new Date(selectedHistoryOrder.createdAt).toLocaleString("ru-RU")}
                </Text>
              </View>
              <TouchableOpacity onPress={() => setSelectedHistoryOrder(null)}>
                <MaterialCommunityIcons name="close" size={24} color={colors.secondary} />
              </TouchableOpacity>
            </View>
            <ScrollView style={{ padding: 20 }}>
              <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 15 }}>
                <Text style={{ color: colors.secondary, fontWeight: "600" }}>Holat:</Text>
                <Text style={{ color: colors.primary, fontWeight: "bold" }}>{selectedHistoryOrder?.status}</Text>
              </View>
              <Text style={{ fontWeight: "bold", color: colors.text, marginBottom: 10 }}>Buyurtmalar:</Text>
              {selectedHistoryOrder?.items?.map((item: any, i: number) => (
                <View key={i} style={{ flexDirection: "row", justifyContent: "space-between", paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: colors.border || "#eee" }}>
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: colors.text }}>{item.name}</Text>
                    <Text style={{ color: colors.secondary, fontSize: 12 }}>{item.price?.toLocaleString()} UZS x {item.quantity}</Text>
                  </View>
                  <Text style={{ color: colors.text, fontWeight: "600" }}>
                    {((item.price || 0) * (item.quantity || 1)).toLocaleString()} UZS
                  </Text>
                </View>
              ))}
              <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: 20, paddingTop: 10, borderTopWidth: 1, borderTopColor: colors.border || "#eee" }}>
                <Text style={{ fontWeight: "bold", fontSize: 16, color: colors.text }}>Jami:</Text>
                <Text style={{ fontWeight: "bold", fontSize: 18, color: colors.success || "green" }}>
                  {selectedHistoryOrder?.totalAmount?.toLocaleString()} UZS
                </Text>
              </View>
              <View style={{ height: 40 }} />
            </ScrollView>
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
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 15,
  },
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
  logoutButton: { padding: 8 },
  statsRow: {
    flexDirection: "row",
    paddingHorizontal: 20,
    gap: 12,
    marginBottom: 24,
  },
  statBox: {
    flex: 1,
    height: 80,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 4,
  },
  statValue: { fontSize: 22, fontWeight: "bold" },
  statLabel: { fontSize: 12, fontWeight: "600", textAlign: "center" },
  tabSwitcher: {
    flexDirection: "row",
    marginHorizontal: 20,
    backgroundColor: "rgba(0,0,0,0.05)",
    borderRadius: 15,
    padding: 4,
    marginBottom: 20,
  },
  tabItem: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 10,
    borderRadius: 12,
  },
  tabText: { fontSize: 14, fontWeight: "600" },
  floorSelector: { marginBottom: 15 },
  floorScroll: { paddingHorizontal: 20, gap: 10 },
  floorItem: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  floorText: { fontSize: 14, fontWeight: "600", color: "#64748B" },
  floorTextMini: { fontSize: 11, fontWeight: "500", marginTop: -2 },
  scrollContent: { paddingHorizontal: 20 },
  tableGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    gap: 16,
  },
  tableCard: {
    width: "47%",
    borderRadius: 24,
    padding: 16,
    minHeight: 160,
    backgroundColor: "white",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  tableHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  tableId: { fontSize: 18, fontWeight: "800", marginLeft: 4 },
  tableNameRow: { flexDirection: "row", alignItems: "center", marginBottom: 2 },
  floorNameRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  badgeRow: { flexDirection: "row", gap: 4, alignItems: "center" },
  miniBadge: {
    padding: 2,
    borderRadius: 6,
    justifyContent: "center",
    alignItems: "center",
  },
  tableStatus: { fontSize: 13, fontWeight: "600" },
  vacantContent: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
    borderWidth: 1.5,
    borderStyle: "dashed",
    borderColor: "#CBD5E1",
    borderRadius: 16,
    marginVertical: 4,
  },
  vacantText: { fontSize: 14, fontWeight: "600" },
  activeContent: { flex: 1, gap: 4 },
  waiterInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginBottom: 4,
  },
  waiterName: { fontSize: 12, fontWeight: "500" },
  guestsText: { fontSize: 14, fontWeight: "500", marginBottom: 12 },
  activeMeta: { gap: 6 },
  metaRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  metaLabel: { fontSize: 11, fontWeight: "500" },
  metaAmount: { fontSize: 14, fontWeight: "bold" },
  payBtn: {
    marginTop: 12,
    height: 36,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  payBtnText: { color: "white", fontSize: 13, fontWeight: "bold" },
  myOrdersList: { gap: 12 },
  orderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    borderRadius: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 1,
  },
  orderLeft: { flexDirection: "row", alignItems: "center", gap: 12 },
  tableNumberCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  tableNumberText: { fontSize: 16, fontWeight: "bold" },
  orderTimeText: { fontSize: 12, fontWeight: "500" },
  orderStatusText: { fontSize: 14, fontWeight: "600" },
  orderRight: { alignItems: "flex-end", gap: 4 },
  orderAmountText: { fontSize: 15, fontWeight: "bold" },
  emptyText: { textAlign: "center", marginTop: 50, fontSize: 14 },
  bottomSpace: { height: 40 },
  notifBadge: {
    position: "absolute",
    right: -4,
    top: -4,
    width: 8,
    height: 8,
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: "white",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    padding: 20,
  },
  modalContent: {
    borderRadius: 24,
    overflow: "hidden",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    padding: 20,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "rgba(0,0,0,0.05)",
  },
  modalTitle: { fontSize: 18, fontWeight: "bold" },
});
