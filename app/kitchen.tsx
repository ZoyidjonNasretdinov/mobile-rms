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
  Modal,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { useRouter, useLocalSearchParams } from "expo-router";
import { Storage } from "@/utils/storage";
import axios from "axios";
import { CONFIG } from "@/constants/config";
import { socketService } from "@/utils/socket";
import * as Haptics from "expo-haptics";
import * as Speech from "expo-speech";
import { notificationService } from "@/utils/notifications";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  runOnJS,
  interpolate,
  interpolateColor,
} from "react-native-reanimated";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const SWIPE_THRESHOLD = SCREEN_WIDTH * 0.2;
const API_BASE_URL = CONFIG.API_BASE_URL;

type KitchenTab = "Pending" | "Ready" | "History";

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
  } catch {}
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

  useEffect(() => {
    translateX.value = withSpring(0);
  }, [item._id, status, translateX]);

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
    .onEnd(() => {
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
    borderColor: interpolateColor(
      Math.abs(translateX.value),
      [0, SWIPE_THRESHOLD],
      ["transparent", colors.primary + "40"],
    ),
    borderWidth: 1,
  }));

  const rIconLeftStyle = useAnimatedStyle(() => ({
    opacity: interpolate(
      translateX.value,
      [0, SWIPE_THRESHOLD / 2],
      [0, 1],
      "clamp",
    ),
  }));

  const rIconRightStyle = useAnimatedStyle(() => ({
    opacity: interpolate(
      translateX.value,
      [-SWIPE_THRESHOLD / 2, 0],
      [1, 0],
      "clamp",
    ),
  }));

  return (
    <View style={styles.swipeContainer}>
      <Animated.View
        style={[
          styles.swipeBack,
          { backgroundColor: colors.success + "20" },
          rIconLeftStyle,
        ]}
      >
        <MaterialCommunityIcons name="check" size={28} color={colors.success} />
      </Animated.View>
      <Animated.View
        style={[
          styles.swipeBack,
          styles.swipeBackRight,
          { backgroundColor: colors.accent + "20" },
          rIconRightStyle,
        ]}
      >
        <MaterialCommunityIcons name="undo" size={28} color={colors.accent} />
      </Animated.View>

      <GestureDetector gesture={gesture}>
        <Animated.View
          style={[styles.itemCard, { backgroundColor: colors.card }, rStyle]}
        >
          <TouchableOpacity
            activeOpacity={0.9}
            onPress={() => onPress(item._id)}
          >
            <View style={styles.itemHeader}>
              <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
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
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 13, fontWeight: '700', color: colors.text }} numberOfLines={1}>
                    {item.waiterName || "Staff"}
                  </Text>
                  <Text style={{ fontSize: 10, color: colors.secondary }}>Buyurtma oldi</Text>
                </View>
              </View>
              <View style={styles.orderIdBadge}>
                <Text style={[styles.orderIdText, { color: colors.secondary }]}>
                  #{item._id.slice(-4).toUpperCase()}
                </Text>
              </View>
            </View>

            <View style={styles.itemBodyList}>
              {matchingItems.map((bi: any, index: number) => (
                <View key={index} style={styles.itemBodyRow}>
                  <Text style={[styles.itemQty, { color: colors.primary }]}>
                    {bi.quantity}x
                  </Text>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.itemName, { color: colors.text }]}>
                      {bi.name}
                    </Text>
                    {bi.comment && (
                      <Text
                        style={{
                          color: colors.danger,
                          fontSize: 13,
                          fontWeight: "500",
                          marginTop: 2,
                        }}
                      >
                        ⚠️ {bi.comment}
                      </Text>
                    )}
                    {bi.completedBy && (
                      <Text
                        style={{
                          color: colors.success,
                          fontSize: 11,
                          fontWeight: "500",
                          marginTop: 2,
                        }}
                      >
                        ✅ {bi.completedBy} tomonidan tayyorlandi
                      </Text>
                    )}
                  </View>
                </View>
              ))}
            </View>

            <View style={styles.itemFooter}>
              <Text style={[styles.timeText, { color: colors.secondary }]}>
                {new Date(item.createdAt).toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </Text>
              <View style={styles.footerInfo}>
                <View
                  style={[
                    styles.statusBadge,
                    {
                      backgroundColor:
                        status === "Ready"
                          ? colors.success + "15"
                          : colors.accent + "15",
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.statusText,
                      {
                        color:
                          status === "Ready" ? colors.success : colors.accent,
                      },
                    ]}
                  >
                    {status === "Ready" ? "Tayyor" : "Navbatda"}
                  </Text>
                </View>
              </View>
            </View>
          </TouchableOpacity>
        </Animated.View>
      </GestureDetector>
    </View>
  );
};

export default function KitchenScreen() {
  const router = useRouter();
  const { dept: paramDept, tab: paramTab } = useLocalSearchParams();
  const colorScheme = useColorScheme() ?? "light";
  const colors = Colors[colorScheme];

  const [activeTab, setActiveTab] = useState<KitchenTab>(
    (paramTab as KitchenTab) || "Pending",
  );
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [orders, setOrders] = useState<any[]>([]);
  const [historyOrders, setHistoryOrders] = useState<any[]>([]);
  const [shifts, setShifts] = useState<any[]>([]);
  const [shiftDetailsModal, setShiftDetailsModal] = useState(false);
  const [shiftOrders, setShiftOrders] = useState<any[]>([]);
  const [loadingShift, setLoadingShift] = useState(false);
  const [selectedShift, setSelectedShift] = useState<any>(null);

  const [user, setUser] = useState<any>(null);
  const userRef = useRef<any>(null);

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
      const [response, historyRes, shiftsRes] = await Promise.all([
        axios.get(`${API_BASE_URL}/orders`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        axios.get(`${API_BASE_URL}/orders?status=Paid`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        axios.get(`${API_BASE_URL}/shifts`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      const roleDeptMap = {
        shashlikchi: "shashlikchi",
        oshpaz: "oshpaz",
        salatchi: "salatchi",
        bar: "bar",
      };
      const userObj = userRef.current || {};
      const myDept =
        (paramDept as string) ||
        roleDeptMap[userObj.role as keyof typeof roleDeptMap];

      const processOrders = (orderList: any[]) =>
        orderList
          .map((order: any) => {
            const myItems = (order.items || [])
              .map((item: any, originalIndex: number) => ({
                ...item,
                originalIndex,
              }))
              .filter((item: any) => item.department === myDept);
            return myItems.length > 0 ? { ...order, items: myItems } : null;
          })
          .filter(Boolean);

      setOrders(processOrders(response.data || []));
      setHistoryOrders(processOrders(historyRes.data || []));
      setShifts(shiftsRes.data || []);
    } catch (e: any) {
      console.log("Kitchen fetch error:", e?.message || e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (user !== null) fetchOrders();
  }, [user]);

  useEffect(() => {
    const socket = socketService.getSocket();
    const roleDeptMap = {
      shashlikchi: "shashlikchi",
      oshpaz: "oshpaz",
      salatchi: "salatchi",
      bar: "bar",
    };

    const handleUpdate = (order: any) => {
      const currentUser = userRef.current;
      const myDept =
        paramDept || roleDeptMap[currentUser?.role as keyof typeof roleDeptMap];
      const myItems = (order.items || [])
        .map((item: any, originalIndex: number) => ({ ...item, originalIndex }))
        .filter((item: any) => item.department === myDept);

      if (myItems.length > 0) {
        setOrders((prev) => {
          const exists = prev.find((o) => o._id === order._id);
          if (exists)
            return prev.map((o) =>
              o._id === order._id ? { ...order, items: myItems } : o,
            );
          return [{ ...order, items: myItems }, ...prev];
        });

        if (order.status !== "Paid") {
          notificationService.notify(
            "Buyurtma yangilanishi",
            Haptics.NotificationFeedbackType.Success,
            "kitchen",
          );
        }
      } else {
        setOrders((prev) => prev.filter((o) => o._id !== order._id));
      }
    };

    socket.on("orderCreated", handleUpdate);
    socket.on("orderUpdated", handleUpdate);
    socket.on("dayStarted", fetchOrders);
    socket.on("dayEnded", fetchOrders);

    return () => {
      socket.off("orderCreated", handleUpdate);
      socket.off("orderUpdated", handleUpdate);
      socket.off("dayStarted", fetchOrders);
      socket.off("dayEnded", fetchOrders);
    };
  }, []);

  const handleHeaderAction = async () => {
    router.back();
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
      fetchOrders();
    } catch (e: any) {
      console.log("Status update error:", e?.message || e);
      Alert.alert("Xatolik", "Statusni yangilab bo'lmadi");
    }
  };

  const handleViewShiftDetails = async (shift: any) => {
    setSelectedShift(shift);
    setShiftDetailsModal(true);
    setLoadingShift(true);
    try {
      const token = await Storage.getItem("access_token");
      const url = `${API_BASE_URL}/orders/stats?startDate=${shift.startTime}${shift.endTime ? `&endDate=${shift.endTime}` : ""}`;
      const res = await axios.get(url, {
        headers: { Authorization: `Bearer ${token}` },
      });
      
      const roleDeptMap = {
        shashlikchi: "shashlikchi",
        oshpaz: "oshpaz",
        salatchi: "salatchi",
        bar: "bar",
      };
      const userObj = userRef.current || {};
      const myDept =
        (paramDept as string) ||
        roleDeptMap[userObj.role as keyof typeof roleDeptMap];

      const ordersList = res.data.orders || [];
      const processOrders = (orderList: any[]) =>
        orderList
          .map((order: any) => {
            const myItems = (order.items || [])
              .map((item: any, originalIndex: number) => ({
                ...item,
                originalIndex,
              }))
              .filter((item: any) => item.department === myDept);
            return myItems.length > 0 ? { ...order, items: myItems } : null;
          })
          .filter(Boolean);

      setShiftOrders(processOrders(ordersList));
    } catch (e: any) {
      console.log("Failed to fetch shift details", e?.message || e);
      Alert.alert("Xatolik", "Smena malumotlarini yuklab bo'lmadi");
    } finally {
      setLoadingShift(false);
    }
  };

  const filteredItems = (orders)
    .reduce((acc, order) => {
      const matchingItems = (order.items || [])
        .map((item: any) => ({ ...item, index: item.originalIndex ?? 0 }))
        .filter((item: any) => item.status === activeTab);

      if (matchingItems.length > 0) {
        acc.push({ ...order, matchingItems });
      }
      return acc;
    }, [] as any[])
    .sort((a: any, b: any) => {
      return new Date(b.updatedAt || b.createdAt).getTime() - new Date(a.updatedAt || a.createdAt).getTime();
    });

  const onRefresh = () => {
    setRefreshing(true);
    fetchOrders();
  };

  const getRoleConfig = (role: string) => {
    const r = role?.toLowerCase();
    if (r === "oshpaz")
      return {
        label: "OSHPAZ",
        title: "Oshxona Stansiyasi",
        color: "#FF9F1C",
        icon: "chef-hat",
      };
    if (r === "shashlikchi")
      return {
        label: "SHASHLIKCHI",
        title: "Mangal Stansiyasi",
        color: "#EF4444",
        icon: "fire",
      };
    if (r === "salatchi")
      return {
        label: "SALATCHI",
        title: "Salatlar Bo'limi",
        color: "#10B981",
        icon: "leaf",
      };
    if (r === "bar")
      return {
        label: "BARMEN",
        title: "Bar Stansiyasi",
        color: "#3B82F6",
        icon: "glass-cocktail",
      };
    return {
      label: "STAFF",
      title: "Ishchi Stansiyasi",
      color: colors.primary,
      icon: "account-hard-hat",
    };
  };

  const roleConfig = getRoleConfig((paramDept as string) || user?.role);

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
            <TouchableOpacity
              style={styles.logoutBtn}
              onPress={handleHeaderAction}
            >
              <MaterialCommunityIcons
                name={
                  user?.role === "owner" || paramDept ? "arrow-left" : "logout"
                }
                size={24}
                color="white"
              />
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.tabsContainer}>
          {(["Pending", "Ready", "History"] as KitchenTab[]).map((type) => {
            const list = type === "History" ? historyOrders : orders;
            const count = list.reduce(
              (acc, o) =>
                acc +
                (o.items || []).filter((i: any) =>
                  type === "History" ? true : i.status === type,
                ).length,
              0,
            );
            return (
              <TouchableOpacity
                key={type}
                style={[
                  styles.tabItem,
                  activeTab === type && {
                    backgroundColor:
                      type === "Ready"
                        ? colors.success
                        : type === "History"
                          ? colors.primary
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
                  {type === "Pending"
                    ? "Navbat"
                    : type === "Ready"
                      ? "Tayyor"
                      : "Tarix"}
                </Text>
                <View
                  style={[
                    styles.tabBadge,
                    { backgroundColor: "rgba(255,255,255,0.3)" },
                  ]}
                >
                  <Text
                    style={[
                      styles.tabBadgeText,
                      { color: activeTab === type ? "white" : colors.text },
                    ]}
                  >
                    {count}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          })}
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
            {activeTab === "History" ? (
              shifts.length === 0 ? (
                <View style={styles.empty}>
                  <MaterialCommunityIcons
                    name="clipboard-text-outline"
                    size={64}
                    color={colors.secondary + "40"}
                  />
                  <Text style={[styles.emptyText, { color: colors.secondary }]}>
                    Smenalar yo'q
                  </Text>
                </View>
              ) : (
                shifts.map((shift, idx) => (
                  <TouchableOpacity
                    key={shift._id || idx}
                    style={[styles.itemCard, { backgroundColor: colors.card, padding: 16 }]}
                    onPress={() => handleViewShiftDetails(shift)}
                  >
                    <View style={{ flexDirection: "row", alignItems: "center" }}>
                      <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: colors.primary + "20", justifyContent: "center", alignItems: "center", marginRight: 12 }}>
                        <MaterialCommunityIcons name="calendar-clock" size={24} color={colors.primary} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={{ color: colors.text, fontSize: 16, fontWeight: "600" }}>
                          {new Date(shift.startTime).toLocaleDateString("uz-UZ")}
                        </Text>
                        <Text style={{ color: colors.secondary, fontSize: 13, marginTop: 4 }}>
                          Boshlandi: {new Date(shift.startTime).toLocaleTimeString("uz-UZ", { hour: "2-digit", minute: "2-digit" })}
                        </Text>
                        {shift.endTime && (
                          <Text style={{ color: colors.secondary, fontSize: 13, marginTop: 2 }}>
                            Yakunlandi: {new Date(shift.endTime).toLocaleTimeString("uz-UZ", { hour: "2-digit", minute: "2-digit" })}
                          </Text>
                        )}
                      </View>
                      <MaterialCommunityIcons name="chevron-right" size={24} color={colors.secondary} />
                    </View>
                  </TouchableOpacity>
                ))
              )
            ) : filteredItems.length === 0 ? (
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
              filteredItems.map((order: any) => (
                <SwipeableItem
                  key={order._id}
                  item={order}
                  colors={colors}
                  onSwipeRight={(id, items) =>
                    updateItemsStatus(
                      id,
                      items.map((i) => i.index),
                      "Ready",
                    )
                  }
                  onSwipeLeft={(id, items) =>
                    updateItemsStatus(
                      id,
                      items.map((i) => i.index),
                      "Pending",
                    )
                  }
                  onPress={() => {}}
                />
              ))
            )}
          </ScrollView>
        )}
      </SafeAreaView>

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
                  Smena Buyurtmalari
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
                    <Text style={[styles.emptyText, { color: colors.secondary, textAlign: 'center', marginTop: 40 }]}>Bu smenada stansiya uchun tayyorlangan buyurtmalar yo'q</Text>
                  ) : (
                    shiftOrders.map((order: any, idx) => {
                      return (
                        <View key={order._id || idx} style={[styles.itemCard, { backgroundColor: colors.card, marginBottom: 12 }]}>
                          <View style={styles.itemHeader}>
                            <View style={[styles.tableBadge, { backgroundColor: colors.primary + "15" }]}>
                              <Text style={[styles.tableName, { color: colors.primary }]}>
                                Stol {order.tableName}
                              </Text>
                            </View>
                            <View style={styles.orderIdBadge}>
                              <Text style={[styles.orderIdText, { color: colors.secondary }]}>
                                {new Date(order.createdAt).toLocaleTimeString("uz-UZ", { hour: "2-digit", minute: "2-digit" })}
                              </Text>
                            </View>
                          </View>

                          <View style={styles.itemBodyList}>
                            {order.items.map((bi: any, bIndex: number) => (
                              <View key={bIndex} style={styles.itemBodyRow}>
                                <Text style={[styles.itemQty, { color: colors.primary }]}>
                                  {bi.quantity}x
                                </Text>
                                <View style={{ flex: 1 }}>
                                  <Text style={[styles.itemName, { color: colors.text }]}>
                                    {bi.name}
                                  </Text>
                                  {bi.completedBy && (
                                    <Text style={{ color: colors.success, fontSize: 11, fontWeight: "500", marginTop: 2 }}>
                                      ✅ {bi.completedBy} tomonidan tayyorlandi
                                    </Text>
                                  )}
                                </View>
                              </View>
                            ))}
                          </View>
                        </View>
                      );
                    })
                  )}
                </ScrollView>
              )}
            </View>
          </View>
        </View>
      </Modal>

    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  headerCard: {
    margin: 20,
    padding: 20,
    borderRadius: 25,
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 5,
  },
  headerTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  headerInfo: { flexDirection: "row", alignItems: "center", gap: 12 },
  headerIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 15,
    backgroundColor: "rgba(255,255,255,0.2)",
    justifyContent: "center",
    alignItems: "center",
  },
  headerRole: {
    fontSize: 12,
    color: "rgba(255,255,255,0.8)",
    fontWeight: "bold",
    letterSpacing: 1,
  },
  headerTitle: { fontSize: 20, color: "white", fontWeight: "bold" },
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
    gap: 8,
    paddingVertical: 12,
    borderRadius: 15,
    backgroundColor: "rgba(0,0,0,0.03)",
  },
  tabLabel: { fontSize: 14, fontWeight: "bold", color: "#64748B" },
  tabBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 },
  tabBadgeText: { fontSize: 12, fontWeight: "bold" },
  scrollContent: { paddingHorizontal: 20, paddingBottom: 40 },
  itemCard: {
    borderRadius: 20,
    padding: 16,
    marginBottom: 12,
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
    marginBottom: 15,
  },
  tableBadge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10 },
  tableName: { fontSize: 16, fontWeight: "bold" },
  orderIdBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.05)",
  },
  orderIdText: { fontSize: 12, fontWeight: "bold", fontFamily: "monospace" },
  itemBodyList: { gap: 10, marginBottom: 15 },
  itemBodyRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  itemQty: { fontSize: 18, fontWeight: "bold" },
  itemName: { fontSize: 16, fontWeight: "600" },
  itemFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderTopWidth: 1,
    borderTopColor: "rgba(0,0,0,0.05)",
    paddingTop: 12,
  },
  timeText: { fontSize: 13, fontWeight: "500" },
  footerInfo: { flexDirection: "row", alignItems: "center", gap: 8 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  statusText: { fontSize: 12, fontWeight: "bold" },
  swipeContainer: { position: "relative", marginBottom: 12 },
  swipeBack: {
    position: "absolute",
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    borderRadius: 20,
    flexDirection: "row",
    alignItems: "center",
    paddingLeft: 20,
  },
  swipeBackRight: { justifyContent: "flex-end", paddingRight: 20 },
  empty: { alignItems: "center", marginTop: 100 },
  emptyText: { fontSize: 16, marginTop: 15, fontWeight: "500" },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },
  modalBackdrop: { ...StyleSheet.absoluteFillObject },
  bottomSheet: { borderTopLeftRadius: 30, borderTopRightRadius: 30, overflow: "hidden" },
  sheetHandleContainer: { alignItems: "center", paddingVertical: 10 },
  sheetHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: "rgba(0,0,0,0.1)" },
  modalContent: { padding: 20 },
  modalHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 20 },
  modalCloseBtn: { padding: 5 },
  modalTitle: { fontSize: 18, fontWeight: "bold" },
  centered: { flex: 1, justifyContent: "center", alignItems: "center" },
});
