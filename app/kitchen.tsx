import React, { useState, useEffect, useRef } from "react";
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert,
  Dimensions,
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
import * as Haptics from "expo-haptics";
import {
  GestureHandlerRootView,
  Gesture,
  GestureDetector,
  TouchableOpacity as GHTouchableOpacity,
} from "react-native-gesture-handler";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  runOnJS,
} from "react-native-reanimated";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const SWIPE_THRESHOLD = SCREEN_WIDTH * 0.2; // Lowered from 0.3 for easier trigger
const API_BASE_URL = CONFIG.API_BASE_URL;

type KitchenTab = "Pending" | "Cooking" | "Ready" | "Inventory";

interface SwipeableItemProps {
  item: any;
  colors: any;
  onSwipeLeft: (orderId: string, itemIndices: any[]) => void;
  onSwipeRight: (orderId: string, itemIndices: any[]) => void;
  onPress: (orderId: string) => void;
}

const safeHaptics = async (type: Haptics.NotificationFeedbackType) => {
  try {
    await Haptics.notificationAsync(type);
  } catch (e) {
    // Ignore haptics error on web/unsupported
  }
};

const SwipeableItem = ({
  item,
  colors,
  onSwipeLeft,
  onSwipeRight,
  onPress,
}: SwipeableItemProps) => {
  const translateX = useSharedValue(0);
  const matchingItems = item.matchingItems || [];
  const status = matchingItems[0]?.status || "Pending";
  const isAnyReversed = matchingItems.some((i: any) => i.isReversed);

  // Reset swipe position when item or status changes
  useEffect(() => {
    translateX.value = withSpring(0);
  }, [item._id, status]);

  const canSwipeRight = status !== "Ready";
  const canSwipeLeft = status !== "Pending";

  const gesture = Gesture.Pan()
    .activeOffsetX([-15, 15])
    .failOffsetY([-15, 15])
    .onUpdate((event) => {
      let x = event.translationX;
      if (!canSwipeRight && x > 0) x = x * 0.2;
      if (!canSwipeLeft && x < 0) x = x * 0.2;
      translateX.value = x;
    })
    .onEnd((event) => {
      if (canSwipeRight && translateX.value > SWIPE_THRESHOLD) {
        runOnJS(safeHaptics)(Haptics.NotificationFeedbackType.Success);
        runOnJS(onSwipeRight)(item._id, matchingItems);
        translateX.value = withSpring(SCREEN_WIDTH);
      } else if (canSwipeLeft && translateX.value < -SWIPE_THRESHOLD) {
        runOnJS(safeHaptics)(Haptics.NotificationFeedbackType.Warning);
        runOnJS(onSwipeLeft)(item._id, matchingItems);
        translateX.value = withSpring(-SCREEN_WIDTH);
      } else {
        translateX.value = withSpring(0);
      }
    });

  const rStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  const rIconLeftStyle = useAnimatedStyle(() => ({
    opacity:
      canSwipeRight && translateX.value > 5
        ? Math.min(translateX.value / 40, 1)
        : 0,
    transform: [
      { scale: withSpring(translateX.value > 30 ? 1.1 : 0.8, { damping: 10 }) },
    ],
  }));

  const rIconRightStyle = useAnimatedStyle(() => ({
    opacity:
      canSwipeLeft && translateX.value < -5
        ? Math.min(Math.abs(translateX.value) / 40, 1)
        : 0,
    transform: [
      {
        scale: withSpring(translateX.value < -30 ? 1.1 : 0.8, { damping: 10 }),
      },
    ],
  }));

  const config = (() => {
    switch (status) {
      case "Ready":
        return { color: colors.success, label: "Tayyor", icon: "check-circle" };
      case "Cooking":
        return { color: colors.primary, label: "Jarayonda", icon: "fire" };
      default:
        return {
          color: colors.accent,
          label: "Navbatda",
          icon: "clock-outline",
        };
    }
  })();

  return (
    <View style={styles.swipeContainer}>
      <Animated.View
        style={[
          styles.swipeBack,
          rIconLeftStyle,
          { backgroundColor: colors.success + "25" },
        ]}
      >
        <MaterialCommunityIcons
          name="arrow-right-bold"
          size={32}
          color={colors.success}
        />
      </Animated.View>
      <Animated.View
        style={[
          styles.swipeBack,
          styles.swipeBackRight,
          rIconRightStyle,
          { backgroundColor: colors.danger + "25" },
        ]}
      >
        <MaterialCommunityIcons
          name="arrow-left-bold"
          size={32}
          color={colors.danger}
        />
      </Animated.View>

      <GestureDetector gesture={gesture}>
        <Animated.View
          style={[
            styles.itemCard,
            { backgroundColor: colors.card },
            isAnyReversed && {
              backgroundColor: "#FFF1F0",
              borderColor: "#FF4D4F",
              borderWidth: 1.5,
              borderStyle: "dashed",
            },
            rStyle,
          ]}
        >
          <GHTouchableOpacity
            activeOpacity={0.8}
            onPress={() => onPress(item._id)}
          >
            <View style={styles.itemHeader}>
              <View style={{ flexDirection: "row", gap: 8 }}>
                <View
                  style={[
                    styles.tableBadge,
                    { backgroundColor: colors.primary + "15" },
                  ]}
                >
                  <Text style={[styles.tableName, { color: colors.primary }]}>
                    Stol {item.tableName}
                  </Text>
                </View>
                <View
                  style={[
                    styles.orderIdBadge,
                    { backgroundColor: colors.secondary + "15" },
                  ]}
                >
                  <Text
                    style={[styles.orderIdText, { color: colors.secondary }]}
                  >
                    #{item._id.slice(-4).toUpperCase()}
                  </Text>
                </View>
              </View>
              <View
                style={[
                  styles.statusBadge,
                  {
                    backgroundColor: isAnyReversed
                      ? "#FF4D4F"
                      : config.color + "15",
                  },
                ]}
              >
                <MaterialCommunityIcons
                  name={isAnyReversed ? "alert-circle" : (config.icon as any)}
                  size={14}
                  color={isAnyReversed ? "white" : config.color}
                />
                <Text
                  style={[
                    styles.statusText,
                    { color: isAnyReversed ? "white" : config.color },
                  ]}
                >
                  {isAnyReversed ? "Qaytarilgan" : config.label}
                </Text>
              </View>
            </View>

            <View style={styles.itemBodyList}>
              {matchingItems.map((subItem: any, idx: number) => (
                <View key={idx} style={styles.itemBodyRow}>
                  <Text style={[styles.itemQty, { color: colors.text }]}>
                    {subItem.quantity}x
                  </Text>
                  <Text style={[styles.itemName, { color: colors.text }]}>
                    {subItem.name}
                  </Text>
                </View>
              ))}
            </View>

            <View style={styles.itemFooter}>
              <View style={styles.footerInfo}>
                <View style={styles.infoBadge}>
                  <MaterialCommunityIcons
                    name="table-chair"
                    size={14}
                    color={colors.secondary}
                  />
                  <Text style={[styles.infoText, { color: colors.secondary }]}>
                    Stol {item.tableName}
                  </Text>
                </View>
                <View style={styles.infoSeparator} />
                <View style={styles.infoBadge}>
                  <MaterialCommunityIcons
                    name="account-outline"
                    size={14}
                    color={colors.secondary}
                  />
                  <Text style={[styles.infoText, { color: colors.secondary }]}>
                    {item.waiterName || "Ofitsiant"}
                  </Text>
                </View>
              </View>
              <View style={styles.itemFooterRight}>
                <Text style={[styles.timeText, { color: colors.secondary }]}>
                  {new Date(item.createdAt).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </Text>
              </View>
            </View>
          </GHTouchableOpacity>
        </Animated.View>
      </GestureDetector>
    </View>
  );
};

const getRoleConfig = (role: string, colors: any) => {
  switch (role?.toLowerCase()) {
    case "shashlikchi":
      return {
        title: "Shashlik Station",
        color: "#EF4444",
        icon: "fire",
        label: "Shashlikchi",
      };
    case "salatchi":
      return {
        title: "Salat Station",
        color: "#10B981",
        icon: "leaf",
        label: "Salatchi",
      };
    case "bar":
      return {
        title: "Bar Station",
        color: "#3B82F6",
        icon: "glass-cocktail",
        label: "Barman",
      };
    case "oshpaz":
      return {
        title: "Oshpaz Station",
        color: "#F59E0B",
        icon: "chef-hat",
        label: "Oshpaz",
      };
    default:
      return {
        title: "Station",
        color: colors.primary,
        icon: "silverware-fork-knife",
        label: "Xodim",
      };
  }
};

export default function KitchenScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme() ?? "light";
  const colors = Colors[colorScheme];

  const [activeTab, setActiveTab] = useState<KitchenTab>("Pending");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [orders, setOrders] = useState<any[]>([]);
  const [pendingTransfers, setPendingTransfers] = useState<any[]>([]);
  const [myStock, setMyStock] = useState<any[]>([]);
  const [user, setUser] = useState<any>(null);
  const userRef = useRef<any>(null);

  // Load user once on mount (separated from fetchOrders to avoid infinite loop)
  useEffect(() => {
    const loadUser = async () => {
      const userStr = await Storage.getItem("user");
      if (userStr) {
        const parsed = JSON.parse(userStr);
        setUser(parsed);
        userRef.current = parsed;
      }
    };
    loadUser();
  }, []);

  const fetchOrders = async () => {
    try {
      const token = await Storage.getItem("access_token");

      const response = await axios.get(`${API_BASE_URL}/orders`, {
        headers: { Authorization: `Bearer ${token}` },
        timeout: 10000,
      });

      const roleDeptMap = {
        shashlikchi: "shashlikchi",
        oshpaz: "oshpaz",
        salatchi: "salatchi",
        bar: "bar",
      };

      const userObj = userRef.current || {};
      const myDept = roleDeptMap[userObj.role as keyof typeof roleDeptMap];
      const allOrders = response.data || [];

      if (userObj.role === "owner") {
        setOrders(allOrders.filter((o: any) => o.status !== "Paid"));
      } else {
        const filtered = allOrders
          .filter((o: any) => o.status !== "Paid")
          .map((order: any) => {
            // Keep original index to ensure backend updates reach the correct item
            const myItems = (order.items || [])
              .map((item: any, originalIndex: number) => ({
                ...item,
                originalIndex,
              }))
              .filter((item: any) => item.department === myDept);

            return myItems.length > 0 ? { ...order, items: myItems } : null;
          })
          .filter(Boolean);
        setOrders(filtered);
      }
    } catch (error) {
      console.error("Kitchen fetch error:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const fetchInventory = async () => {
    try {
      const token = await Storage.getItem("access_token");
      const userObj = userRef.current || {};
      const dept = userObj.role?.toLowerCase();
      if (!dept) return;

      const [transfersRes, stockRes] = await Promise.all([
        axios.get(`${API_BASE_URL}/inventory/transfers/${dept}`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        axios.get(`${API_BASE_URL}/inventory/staff/${dept}`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      setPendingTransfers(transfersRes.data);
      setMyStock(stockRes.data);
    } catch (error) {
      console.error("Inventory fetch error:", error);
    }
  };

  const handleConfirmTransfer = async (id: string, status: string) => {
    try {
      const token = await Storage.getItem("access_token");
      await axios.post(
        `${API_BASE_URL}/inventory/transfers/${id}/confirm`,
        { status },
        { headers: { Authorization: `Bearer ${token}` } },
      );
      Alert.alert(
        "Muvaffaqiyat",
        status === "ACCEPTED" ? "Qabul qilindi" : "Rad etildi",
      );
      fetchInventory();
    } catch (error) {
      Alert.alert("Xato", "Amalni bajarib bo'lmadi");
    }
  };

  // Fetch orders once user is loaded
  useEffect(() => {
    if (user !== null) {
      fetchOrders();
      fetchInventory();
    }
  }, [user]);

  // Set up socket listeners once on mount (using ref to avoid re-registering)
  useEffect(() => {
    const socket = socketService.getSocket();

    const roleDeptMap = {
      shashlikchi: "shashlikchi",
      oshpaz: "oshpaz",
      salatchi: "salatchi",
      bar: "bar",
    };

    socket.on("orderCreated", (newOrder: any) => {
      const currentUser = userRef.current;
      const myDept = roleDeptMap[currentUser?.role as keyof typeof roleDeptMap];
      if (currentUser?.role === "owner") {
        setOrders((prev) => [newOrder, ...prev]);
        return;
      }
      const myItems = (newOrder.items || []).filter(
        (item: any) => item.department === myDept,
      );
      if (myItems.length > 0) {
        setOrders((prev) => [{ ...newOrder, items: myItems }, ...prev]);
      }
    });

    socket.on("orderUpdated", (updatedOrder: any) => {
      const currentUser = userRef.current;
      const myDept = roleDeptMap[currentUser?.role as keyof typeof roleDeptMap];

      setOrders((prev) => {
        const isExisting = prev.some((o) => o._id === updatedOrder._id);
        if (currentUser?.role === "owner") {
          return prev.map((o) =>
            o._id === updatedOrder._id ? updatedOrder : o,
          );
        }
        const myItems = (updatedOrder.items || []).filter(
          (item: any) => item.department === myDept,
        );
        if (myItems.length > 0) {
          if (isExisting) {
            return prev.map((o) =>
              o._id === updatedOrder._id
                ? { ...updatedOrder, items: myItems }
                : o,
            );
          } else {
            return [{ ...updatedOrder, items: myItems }, ...prev];
          }
        } else {
          return prev.filter((o) => o._id !== updatedOrder._id);
        }
      });
    });

    socket.on("transferCreated", (newTransfer: any) => {
      const currentUser = userRef.current;
      const myDept = roleDeptMap[currentUser?.role as keyof typeof roleDeptMap];
      if (newTransfer.to === myDept) {
        setPendingTransfers((prev) => [newTransfer, ...prev]);
        safeHaptics(Haptics.NotificationFeedbackType.Success);
      }
    });

    socket.on("transferUpdated", (updatedTransfer: any) => {
      const currentUser = userRef.current;
      const myDept = roleDeptMap[currentUser?.role as keyof typeof roleDeptMap];
      if (updatedTransfer.to === myDept) {
        setPendingTransfers((prev) =>
          prev.filter((t) => t._id !== updatedTransfer._id),
        );
        fetchInventory(); // Refresh stock balance
      }
    });

    socket.on("stockUpdated", () => {
      fetchInventory();
    });

    return () => {
      socket.off("orderCreated");
      socket.off("orderUpdated");
      socket.off("transferCreated");
      socket.off("transferUpdated");
      socket.off("stockUpdated");
    };
  }, []);

  const handleLogout = async () => {
    await Storage.removeItem("access_token");
    await Storage.removeItem("user");
    router.replace("/login");
  };

  const updateItemsStatus = async (
    orderId: string,
    itemIndices: number[],
    newStatus: string,
  ) => {
    try {
      const token = await Storage.getItem("access_token");
      await axios.put(
        `${API_BASE_URL}/orders/${orderId}/items/bulk-status`,
        { itemIndices, status: newStatus },
        { headers: { Authorization: `Bearer ${token}` } },
      );
      // Fallback refetch to ensure UI updates even if socket is slow
      fetchOrders();
    } catch (error) {
      console.error("Status update error:", error);
      Alert.alert("Xatolik", "Statusni yangilab bo'lmadi");
    }
  };

  const handleSwipeRight = (orderId: string, items: any[]) => {
    if (items.length === 0) return;
    const current = items[0].status;
    let next = current;
    if (current === "Pending") next = "Cooking";
    else if (current === "Cooking") next = "Ready";

    if (next !== current) {
      updateItemsStatus(
        orderId,
        items.map((i) => i.index),
        next,
      );
    }
  };

  const handleSwipeLeft = (orderId: string, items: any[]) => {
    if (items.length === 0) return;
    const current = items[0].status;

    if (current === "Ready") {
      Alert.alert(
        "Ehtiyot bo'ling!",
        "Tayyor bo'lgan mahsulotlarni qayta jarayonga qaytarmoqchimisiz?",
        [
          { text: "Yo'q", style: "cancel" },
          {
            text: "Ha, qaytarish",
            style: "destructive",
            onPress: () =>
              updateItemsStatus(
                orderId,
                items.map((i) => i.index),
                "Cooking",
              ),
          },
        ],
      );
      return;
    }

    let next = current;
    if (current === "Cooking") next = "Pending";

    if (next !== current) {
      updateItemsStatus(
        orderId,
        items.map((i) => i.index),
        next,
      );
    }
  };

  const getFilteredItems = () => {
    const grouped: any[] = [];
    orders.forEach((order) => {
      const matchingItems = (order.items || [])
        .map((item: any) => ({
          ...item,
          index: item.originalIndex ?? 0, // Fallback if somehow missing
        }))
        .filter((item: any) => item.status === activeTab);

      if (matchingItems.length > 0) {
        grouped.push({
          ...order,
          matchingItems,
          createdAt: order.createdAt || new Date().toISOString(),
        });
      }
    });

    return grouped.sort(
      (a, b) =>
        new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
    );
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchOrders();
    fetchInventory();
  };

  const filteredItems = getFilteredItems();

  const roleConfig = getRoleConfig(user?.role, colors);

  return (
    <View style={{ flex: 1 }}>
      <SafeAreaView
        style={[styles.container, { backgroundColor: colors.background }]}
      >
        <View
          style={[
            styles.headerCard,
            {
              backgroundColor: roleConfig.color,
              shadowColor: roleConfig.color,
            },
          ]}
        >
          <View style={styles.headerTop}>
            <View style={styles.headerInfo}>
              <View style={styles.headerIconContainer}>
                <MaterialCommunityIcons
                  name={roleConfig.icon as any}
                  size={32}
                  color="white"
                />
              </View>
              <View>
                <Text style={styles.headerRole}>{roleConfig.label}</Text>
                <Text style={styles.headerTitle}>{roleConfig.title}</Text>
              </View>
            </View>
            <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
              <MaterialCommunityIcons name="logout" size={24} color="white" />
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.tabsContainer}>
          {(["Pending", "Cooking", "Ready", "Inventory"] as KitchenTab[]).map(
            (type) => {
              let count = 0;
              if (type === "Inventory") {
                count = pendingTransfers.length;
              } else {
                count = orders.reduce(
                  (acc, o) =>
                    acc +
                    (o.items || []).filter((i: any) => i.status === type)
                      .length,
                  0,
                );
              }
              const label =
                type === "Pending"
                  ? "Navbat"
                  : type === "Cooking"
                    ? "Jarayon"
                    : type === "Ready"
                      ? "Tayyor"
                      : "Ombor";
              return (
                <TouchableOpacity
                  key={type}
                  style={[
                    styles.tabItem,
                    activeTab === type && {
                      backgroundColor:
                        type === "Ready"
                          ? colors.success
                          : type === "Cooking"
                            ? colors.primary
                            : type === "Inventory"
                              ? colors.accent
                              : colors.accent,
                    },
                  ]}
                  onPress={() => setActiveTab(type)}
                >
                  <Text
                    style={[
                      styles.tabLabel,
                      activeTab === type && { color: "white" },
                    ]}
                  >
                    {label}
                  </Text>
                  <View
                    style={[
                      styles.tabBadge,
                      activeTab === type
                        ? { backgroundColor: "rgba(255,255,255,0.3)" }
                        : { backgroundColor: "rgba(0,0,0,0.05)" },
                    ]}
                  >
                    <Text
                      style={[
                        styles.tabBadgeText,
                        activeTab === type && { color: "white" },
                      ]}
                    >
                      {count}
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            },
          )}
        </View>

        {activeTab === "Inventory" ? (
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
            }
          >
            {pendingTransfers.length > 0 && (
              <View style={styles.section}>
                <Text style={[styles.sectionTitle, { color: colors.text }]}>
                  Yangi kelgan masalliqlar
                </Text>
                {pendingTransfers.map((t) => (
                  <View
                    key={t._id}
                    style={[
                      styles.transferCard,
                      { backgroundColor: colors.card },
                    ]}
                  >
                    <View style={{ flex: 1 }}>
                      <Text
                        style={[styles.transferName, { color: colors.text }]}
                      >
                        {t.productId?.name || "Noma'lum mahsulot"}
                      </Text>
                      <Text style={{ fontSize: 12, color: colors.secondary }}>
                        Masalliq kelgan vaqti:{" "}
                        {new Date(t.createdAt).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </Text>
                    </View>
                    <View
                      style={[
                        styles.transferQtyBadge,
                        { backgroundColor: colors.primary + "15" },
                      ]}
                    >
                      <Text
                        style={[
                          styles.transferQty,
                          { color: colors.primary, fontWeight: "bold" },
                        ]}
                      >
                        {t.quantity} {t.productId?.unit || ""}
                      </Text>
                    </View>
                    <View style={styles.transferActions}>
                      <TouchableOpacity
                        onPress={() => handleConfirmTransfer(t._id, "REJECTED")}
                        style={[
                          styles.actionBtn,
                          { backgroundColor: colors.danger + "15" },
                        ]}
                      >
                        <MaterialCommunityIcons
                          name="close"
                          size={20}
                          color={colors.danger}
                        />
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={() => handleConfirmTransfer(t._id, "ACCEPTED")}
                        style={[
                          styles.actionBtn,
                          { backgroundColor: colors.success + "15" },
                        ]}
                      >
                        <MaterialCommunityIcons
                          name="check"
                          size={20}
                          color={colors.success}
                        />
                      </TouchableOpacity>
                    </View>
                  </View>
                ))}
              </View>
            )}

            <View style={styles.section}>
              <Text
                style={[
                  styles.sectionTitle,
                  { color: colors.text, marginTop: 10 },
                ]}
              >
                Mavjud qoldiq
              </Text>
              {myStock.length === 0 ? (
                <Text
                  style={{
                    color: colors.secondary,
                    fontStyle: "italic",
                    textAlign: "center",
                    marginTop: 20,
                  }}
                >
                  Hozircha omborda mahsulot yo'q
                </Text>
              ) : (
                <View
                  style={[styles.stockList, { backgroundColor: colors.card }]}
                >
                  {myStock.map((s, idx) => (
                    <View
                      key={s._id}
                      style={[
                        styles.stockRow,
                        idx !== myStock.length - 1 && {
                          borderBottomWidth: 1,
                          borderBottomColor: colors.border + "50",
                        },
                      ]}
                    >
                      <Text style={[styles.stockName, { color: colors.text }]}>
                        {s.productId?.name}
                      </Text>
                      <Text
                        style={[styles.stockQty, { color: colors.primary }]}
                      >
                        {s.quantity} {s.productId?.unit}
                      </Text>
                    </View>
                  ))}
                </View>
              )}
            </View>
          </ScrollView>
        ) : loading ? (
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
            {filteredItems.length === 0 ? (
              <View style={styles.empty}>
                <MaterialCommunityIcons
                  name="clipboard-text-outline"
                  size={64}
                  color={colors.secondary + "40"}
                />
                <Text style={[styles.emptyText, { color: colors.secondary }]}>
                  Hozircha malumot yo'q
                </Text>
              </View>
            ) : (
              filteredItems.map((order) => (
                <SwipeableItem
                  key={order._id}
                  item={order}
                  colors={colors}
                  onSwipeRight={handleSwipeRight}
                  onSwipeLeft={handleSwipeLeft}
                  onPress={() => {}} // Optional detail view
                />
              ))
            )}
          </ScrollView>
        )}
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  swipeContainer: {
    position: "relative",
    marginBottom: 12,
  },
  swipeBack: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    width: "100%",
    borderRadius: 20,
    flexDirection: "row",
    alignItems: "center",
    paddingLeft: 25,
  },
  swipeBackRight: {
    justifyContent: "flex-end",
    paddingLeft: 0,
    paddingRight: 25,
  },
  headerCard: {
    margin: 20,
    padding: 24,
    borderRadius: 30,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  headerTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  headerInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
  },
  headerIconContainer: {
    width: 60,
    height: 60,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.2)",
    justifyContent: "center",
    alignItems: "center",
  },
  headerRole: {
    fontSize: 14,
    color: "rgba(255,255,255,0.8)",
    fontWeight: "bold",
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  headerTitle: {
    fontSize: 24,
    color: "white",
    fontWeight: "bold",
    marginTop: 2,
  },
  logoutBtn: { padding: 8 },
  tabsContainer: {
    flexDirection: "row",
    paddingHorizontal: 20,
    gap: 10,
    marginBottom: 15,
  },
  tabItem: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 12,
    borderRadius: 15,
    backgroundColor: "rgba(0,0,0,0.03)",
  },
  tabLabel: { fontSize: 13, fontWeight: "bold", color: "#64748B" },
  tabBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  tabBadgeText: { fontSize: 11, fontWeight: "bold", color: "#64748B" },
  scrollContent: { padding: 20 },
  itemCard: {
    borderRadius: 20,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  itemHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  tableBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 8,
  },
  tableName: { fontSize: 14, fontWeight: "bold" },
  orderIdBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.05)",
  },
  orderIdText: {
    fontSize: 12,
    fontWeight: "bold",
    fontFamily: "monospace",
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusText: { fontSize: 12, fontWeight: "bold" },
  itemBodyList: {
    gap: 8,
    marginBottom: 12,
  },
  itemBodyRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  itemQty: { fontSize: 20, fontWeight: "bold" },
  itemName: { fontSize: 18, fontWeight: "500" },
  itemFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderTopWidth: 1,
    borderTopColor: "rgba(0,0,0,0.05)",
    paddingTop: 12,
  },
  timeText: { fontSize: 12, fontWeight: "500" },
  footerInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  infoBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  infoText: {
    fontSize: 12,
    fontWeight: "600",
  },
  infoSeparator: {
    width: 1,
    height: 12,
    backgroundColor: "rgba(0,0,0,0.1)",
  },
  itemFooterRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  empty: { alignItems: "center", marginTop: 100 },
  emptyText: { fontSize: 16, marginTop: 15, fontWeight: "500" },
  section: { marginBottom: 25 },
  sectionTitle: { fontSize: 18, fontWeight: "bold", marginBottom: 15 },
  transferCard: {
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
  transferInfo: { flex: 1, gap: 4 },
  transferName: { fontSize: 16, fontWeight: "bold" },
  transferQtyBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    marginLeft: 10,
  },
  transferQty: { fontSize: 14, fontWeight: "600" },
  transferActions: { flexDirection: "row", gap: 8 },
  actionBtn: {
    width: 40,
    height: 40,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  stockList: { borderRadius: 15, overflow: "hidden" },
  stockRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 15,
  },
  stockName: { fontSize: 16, fontWeight: "500" },
  stockQty: { fontSize: 16, fontWeight: "bold" },
});
