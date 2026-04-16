import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert,
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
    "tables" | "myOrders" | "notifications"
  >("tables");
  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [tables, setTables] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
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

      // Fetch Today's Orders
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

      const ordersRes = await axios.get(
        `${API_BASE_URL}/orders?startDate=${startOfDay}&endDate=${endOfDay}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );
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

  useEffect(() => {
    fetchData();
    const socket = socketService.getSocket();

    socket.on("orderCreated", (newOrder: any) => {
      setOrders((prev) => [newOrder, ...prev]);
    });

    socket.on("orderUpdated", (updatedOrder: any) => {
      setOrders((prev) =>
        prev.map((o) => (o._id === updatedOrder._id ? updatedOrder : o)),
      );
    });

    socket.on("itemReady", (data: any) => {
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
    });

    socket.on("itemCooking", (data: any) => {
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
    });

    socket.on("orderPaid", (data: any) => {
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
    });

    socket.on("tableUpdated", (updatedTable: any) => {
      setTables((prev) =>
        prev.map((t) => (t._id === updatedTable._id ? updatedTable : t)),
      );
    });

    socket.on("dayStarted", () => {
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
    });

    socket.on("dayEnded", () => {
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
    });

    return () => {
      socket.off("orderCreated");
      socket.off("orderUpdated");
      socket.off("itemReady");
      socket.off("itemCooking");
      socket.off("orderPaid");
      socket.off("tableUpdated");
    };
  }, [fetchData, colors.primary, colors.success, colors.warning]);

  const handleLogout = async () => {
    await Storage.removeItem("access_token");
    await Storage.removeItem("user");
    router.replace("/login");
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
  const myOrders = orders.filter((o) => o.waiterId === myUserId);
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
    const tableOrders = orders.filter(
      (o) => o.tableName === table.number.toString(),
    );
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
            <Text
              style={{
                color: statusColor,
                fontSize: 15,
                fontWeight: "800",
                marginTop: 6,
              }}
            >
              {activeOrder.totalAmount?.toLocaleString()}{" "}
              {Translations.uz.common.currency}
            </Text>
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
              tableId: order.tableId,
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
        <View style={styles.headerTitleRow}>
          <View style={[styles.titleIcon, { backgroundColor: colors.accent }]}>
            <MaterialCommunityIcons
              name="shopping-outline"
              size={24}
              color="white"
            />
          </View>
          <View>
            <Text style={[styles.headerTitle, { color: colors.text }]}>
              {t.title}
            </Text>
            <Text style={[styles.headerSubtitle, { color: colors.secondary }]}>
              {user?.fullName || "Waiter"}
            </Text>
          </View>
        </View>
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <MaterialCommunityIcons
            name="logout"
            size={24}
            color={colors.secondary}
          />
        </TouchableOpacity>
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
          value={`${orders
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
            activeTab === "tables" && { backgroundColor: colors.primary },
          ]}
          onPress={() => setActiveTab("tables")}
        >
          <MaterialCommunityIcons
            name="view-grid-outline"
            size={20}
            color={activeTab === "tables" ? "white" : colors.secondary}
          />
          <Text
            style={[
              styles.tabText,
              { color: activeTab === "tables" ? "white" : colors.secondary },
            ]}
          >
            Stollar
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.tabItem,
            activeTab === "notifications" && {
              backgroundColor: colors.primary,
            },
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
          <Text
            style={[
              styles.tabText,
              {
                color:
                  activeTab === "notifications" ? "white" : colors.secondary,
              },
            ]}
          >
            Bildirishnomalar
          </Text>
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
          ) : (
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
          )}
          <View style={styles.bottomSpace} />
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
  },
  statValue: { fontSize: 22, fontWeight: "bold" },
  statLabel: { fontSize: 12, fontWeight: "600" },
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
});
