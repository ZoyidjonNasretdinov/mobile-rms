import React, { useEffect, useState } from "react";
import {
  StyleSheet,
  View,
  ScrollView,
  TouchableOpacity,
  Text,
  Alert,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
// import * as SecureStore from "expo-secure-store";
import { Storage } from "@/utils/storage";
import { StatusBar } from "expo-status-bar";
import { Colors } from "@/constants/theme";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useColorScheme } from "@/hooks/use-color-scheme";
import axios from "axios";
import { socketService } from "@/utils/socket";
import { CONFIG } from "@/constants/config";

import { Translations } from "@/constants/translations";

const t = Translations.uz.dashboard;

export default function DashboardScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme() ?? "light";
  const colors = Colors[colorScheme];
  const [activeStaffCount, setActiveStaffCount] = useState({
    active: 0,
    total: 0,
  });
  const [role, setRole] = useState("");
  const [revenue, setRevenue] = useState(0);
  const [orderCount, setOrderCount] = useState(0);
  const [stockStats, setStockStats] = useState({ low: 0, total: 0 });
  const [activeShift, setActiveShift] = useState<any>(null);
  const [isShiftActive, setIsShiftActive] = useState(false);
  const [showShiftModal, setShowShiftModal] = useState(false);
  const [shiftModalType, setShiftModalType] = useState<"start" | "end">(
    "start",
  );
  const [shiftCash, setShiftCash] = useState("0");
  const [processingShift, setProcessingShift] = useState(false);

  useEffect(() => {
    const fetchDashboardData = async () => {
      const userStr = await Storage.getItem("user");
      if (userStr) {
        const user = JSON.parse(userStr);
        setRole(user.role);

        const userRole = user.role?.toLowerCase();
        if (userRole === "ofisiant") router.replace("/waiter");
        if (["oshpaz", "shashlikchi", "salatchi", "bar"].includes(userRole))
          router.replace("/kitchen");
        if (userRole === "kassier") router.replace("/cashier");
      }

      try {
        const token = await Storage.getItem("access_token");
        const headers = { Authorization: `Bearer ${token}` };

        const usersRes = await axios.get(`${CONFIG.API_BASE_URL}/users`, {
          headers,
        });
        const staff = usersRes.data;
        const active = staff.filter((s: any) => s.isActive).length;
        setActiveStaffCount({ active, total: staff.length });

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

        const statsRes = await axios.get(
          `${CONFIG.API_BASE_URL}/orders/stats?startDate=${startOfDay}&endDate=${endOfDay}`,
          { headers },
        );
        setRevenue(statsRes.data.totalRevenue);
        setOrderCount(statsRes.data.totalOrderCount);

        const productsRes = await axios.get(
          `${CONFIG.API_BASE_URL}/inventory/products`,
          { headers },
        );
        const products = productsRes.data;
        const lowStock = products.filter(
          (p: any) => p.currentStock <= (p.minThreshold || 0),
        ).length;
        setStockStats({ low: lowStock, total: products.length });

        const shiftRes = await axios.get(
          `${CONFIG.API_BASE_URL}/shifts/active`,
          { headers },
        );
        setActiveShift(shiftRes.data);
        setIsShiftActive(!!shiftRes.data);
      } catch (error) {
        console.error("Dashboard fetch error:", error);
      }
    };

    fetchDashboardData();

    const socket = socketService.getSocket();
    const handleUpdate = () => fetchDashboardData();

    socket.on("orderCreated", handleUpdate);
    socket.on("orderUpdated", handleUpdate);
    socket.on("staffStatusChanged", handleUpdate);
    socket.on("stockUpdated", handleUpdate);
    socket.on("staffStockUpdated", handleUpdate);
    socket.on("transferUpdated", handleUpdate);

    return () => {
      socket.off("orderCreated", handleUpdate);
      socket.off("orderUpdated", handleUpdate);
      socket.off("staffStatusChanged", handleUpdate);
      socket.off("stockUpdated", handleUpdate);
      socket.off("staffStockUpdated", handleUpdate);
      socket.off("transferUpdated", handleUpdate);
    };
  }, []);

  const handleLogout = async () => {
    await Storage.removeItem("access_token");
    await Storage.removeItem("user");
    router.replace("/login");
  };

  const handleStartShift = () => {
    setShiftModalType("start");
    setShiftCash("0");
    setShowShiftModal(true);
  };

  const handleEndShift = () => {
    setShiftModalType("end");
    setShiftCash("0");
    setShowShiftModal(true);
  };

  const submitShiftAction = async () => {
    if (processingShift) return;
    setProcessingShift(true);
    try {
      const token = await Storage.getItem("access_token");
      const staffStr = await Storage.getItem("user");
      const user = staffStr ? JSON.parse(staffStr) : null;
      const userId = user?.id || user?._id || "";

      if (!userId) {
        Alert.alert("Xato", "User ID topilmadi. Qaytadan login qiling.");
        setProcessingShift(false);
        return;
      }

      const endpoint =
        shiftModalType === "start" ? "/shifts/start" : "/shifts/end";

      const cashValue = parseFloat(shiftCash.replace(/[^0-9.]/g, "") || "0");

      const body =
        shiftModalType === "start"
          ? { openedBy: userId, startCash: cashValue }
          : { closedBy: userId, endCash: cashValue };

      await axios.post(`${CONFIG.API_BASE_URL}${endpoint}`, body, {
        headers: { Authorization: `Bearer ${token}` },
      });

      setShowShiftModal(false);

      Alert.alert(
        "Muvaffaqiyatli",
        shiftModalType === "start"
          ? "Ish kuni boshlandi"
          : "Ish kuni yakunlandi",
      );

      // Refresh state
      const refreshedShift = await axios.get(
        `${CONFIG.API_BASE_URL}/shifts/active`,
        { headers: { Authorization: `Bearer ${token}` } },
      );
      setActiveShift(refreshedShift.data);
      setIsShiftActive(!!refreshedShift.data);
    } catch (error: any) {
      console.error(
        "[ShiftAction] Error:",
        error.response?.data || error.message,
      );
      Alert.alert(
        "Xato",
        error.response?.data?.message || "Amalni bajarib bo'lmadi",
      );
    } finally {
      setProcessingShift(false);
    }
  };

  const PerformanceCard = ({
    title,
    value,
    change,
    icon,
    iconColor,
    bgColor,
    onPress,
  }: any) => (
    <TouchableOpacity
      style={[styles.perfCard, { backgroundColor: colors.card }]}
      onPress={onPress}
      disabled={!onPress}
    >
      <View style={styles.perfCardHeader}>
        <View style={[styles.iconContainer, { backgroundColor: bgColor }]}>
          <MaterialCommunityIcons name={icon} size={24} color={iconColor} />
        </View>
        <View style={styles.changeContainer}>
          <MaterialCommunityIcons
            name={change.startsWith("+") ? "trending-up" : "trending-down"}
            size={16}
            color={change.startsWith("+") ? colors.success : colors.danger}
          />
          <Text
            style={[
              styles.changeText,
              {
                color: change.startsWith("+") ? colors.success : colors.danger,
              },
            ]}
          >
            {change}
          </Text>
        </View>
      </View>
      <Text
        style={[styles.perfValue, { color: colors.text }]}
        numberOfLines={1}
        adjustsFontSizeToFit
      >
        {value}
      </Text>
      <Text
        style={[styles.perfTitle, { color: colors.secondary }]}
        numberOfLines={1}
        adjustsFontSizeToFit
      >
        {title}
      </Text>
    </TouchableOpacity>
  );

  const QuickAction = ({ title, icon, color, onPress }: any) => (
    <TouchableOpacity
      style={[styles.actionButton, { backgroundColor: colors.card }]}
      onPress={onPress}
    >
      <View
        style={[styles.actionIconContainer, { backgroundColor: color + "15" }]}
      >
        <MaterialCommunityIcons name={icon} size={28} color={color} />
      </View>
      <Text
        style={[styles.actionTitle, { color: colors.text }]}
        numberOfLines={1}
        adjustsFontSizeToFit
      >
        {title}
      </Text>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
    >
      <StatusBar style={colorScheme === "dark" ? "light" : "dark"} />
      <View style={styles.header}>
        <View>
          <Text style={[styles.headerTitle, { color: colors.text }]}>
            {t.title}
          </Text>
        </View>
        <TouchableOpacity
          style={styles.profileButton}
          onPress={() => router.push("/profile")}
        >
          <MaterialCommunityIcons
            name="account-circle-outline"
            size={28}
            color={colors.primary}
          />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Text style={[styles.sectionTitle, { color: colors.text }]}>
          {t.performance}
        </Text>

        <View style={styles.shiftActions}>
          <TouchableOpacity
            style={[
              styles.shiftBtn,
              {
                backgroundColor: isShiftActive ? colors.danger : colors.success,
              },
            ]}
            onPress={isShiftActive ? handleEndShift : handleStartShift}
          >
            <MaterialCommunityIcons
              name={isShiftActive ? "clock-end" : "clock-start"}
              size={24}
              color="white"
            />
            <Text style={styles.shiftBtnText}>
              {isShiftActive ? t.endDay : t.startDay}
            </Text>
          </TouchableOpacity>
          <View style={styles.shiftStatusRow}>
            <View
              style={[
                styles.statusDot,
                {
                  backgroundColor: isShiftActive
                    ? colors.success
                    : colors.danger,
                },
              ]}
            />
            <Text
              style={{
                color: colors.secondary,
                fontSize: 13,
                fontWeight: "600",
              }}
            >
              {t.shiftStatus}: {isShiftActive ? t.active : t.closed}
            </Text>
          </View>
        </View>
        <View style={styles.perfGrid}>
          <PerformanceCard
            title={t.revenue}
            value={`${revenue.toLocaleString()} ${Translations.uz.common.currency}`}
            change="+12%"
            icon="bank-transfer"
            iconColor="#10B981"
            bgColor="#10B98115"
          />
          <PerformanceCard
            title={t.orders}
            value={orderCount.toString()}
            change="+8%"
            icon="clipboard-list"
            iconColor="#3B82F6"
            bgColor="#3B82F615"
            onPress={() => router.push("/orders")}
          />
          <PerformanceCard
            title={t.staffOnDuty}
            value={`${activeStaffCount.active}/${activeStaffCount.total}`}
            change={t.now}
            icon="account-group-outline"
            iconColor="#8B5CF6"
            bgColor="#8B5CF615"
            onPress={() => router.push("/staff")}
          />
          <PerformanceCard
            title={t.stockLevel}
            value={stockStats.total.toString()}
            change={stockStats.low > 0 ? `${stockStats.low} kam` : "Normal"}
            icon="cube-outline"
            iconColor={stockStats.low > 0 ? "#EF4444" : "#F59E0B"}
            bgColor={stockStats.low > 0 ? "#EF444415" : "#F59E0B15"}
            onPress={() => router.push("/inventory")}
          />
        </View>

        <Text style={[styles.sectionTitle, { color: colors.text }]}>
          {t.quickActions}
        </Text>
        <View style={styles.actionGrid}>
          {[
            {
              title: t.staff,
              icon: "account-group",
              color: "#3B82F6",
              onPress: () => router.push("/staff"),
            },
            {
              title: t.tables,
              icon: "table-furniture",
              color: "#00AEEF",
              onPress: () => router.push("/tables-admin"),
            },
            {
              title: t.inventory,
              icon: "package-variant-closed",
              color: "#8B5CF6",
              onPress: () => router.push("/inventory"),
            },
            {
              title: Translations.uz.procurement.title,
              icon: "cart-outline",
              color: "#F59E0B",
              onPress: () => router.push("/procurement"),
            },
            {
              title: Translations.uz.partners.title,
              icon: "handshake-outline",
              color: "#10B981",
              onPress: () => router.push("/partners"),
            },
            {
              title: Translations.uz.menu.title,
              icon: "silverware-fork-knife",
              color: "#EC4899",
              onPress: () => router.push("/menu"),
            },
            {
              title: Translations.uz.products.title,
              icon: "cube-outline",
              color: "#EC4899",
              onPress: () => router.push("/products"),
            },
            role === "owner"
              ? {
                  title: Translations.uz.eodReport.title,
                  icon: "chart-box-outline",
                  color: "#6366F1",
                  onPress: () => router.push("/reports"),
                }
              : null,
            role === "owner" || role === "kassier"
              ? {
                  title: Translations.uz.cashier.title,
                  icon: "cash-register",
                  color: "#10B981",
                  onPress: () => router.push("/cashier"),
                }
              : null,
          ]
            .filter(Boolean)
            .map((action: any, idx) => (
              <QuickAction
                key={idx}
                title={action.title}
                icon={action.icon}
                color={action.color}
                onPress={action.onPress}
              />
            ))}
        </View>

        <View style={styles.bottomSpace} />
      </ScrollView>

      {/* Shift Action Modal */}
      <Modal visible={showShiftModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            style={styles.modalContainer}
          >
            <View
              style={[styles.modalContent, { backgroundColor: colors.card }]}
            >
              <View style={styles.modalHeader}>
                <Text style={[styles.modalTitle, { color: colors.text }]}>
                  {shiftModalType === "start"
                    ? "Ish kunini boshlash"
                    : "Ish kunini yakunlash"}
                </Text>
                <TouchableOpacity onPress={() => setShowShiftModal(false)}>
                  <MaterialCommunityIcons
                    name="close"
                    size={24}
                    color={colors.secondary}
                  />
                </TouchableOpacity>
              </View>

              <Text style={[styles.modalLabel, { color: colors.secondary }]}>
                {shiftModalType === "start"
                  ? "Kassadagi boshlang'ich naqd pul:"
                  : "Kassadagi yakuniy naqd pul:"}
              </Text>

              <View
                style={[
                  styles.cashInputContainer,
                  {
                    backgroundColor: colors.background,
                    borderColor: colors.border,
                  },
                ]}
              >
                <MaterialCommunityIcons
                  name="cash-multiple"
                  size={24}
                  color={colors.primary}
                />
                <TextInput
                  style={[styles.cashInput, { color: colors.text }]}
                  value={shiftCash}
                  onChangeText={setShiftCash}
                  keyboardType="numeric"
                  placeholder="0"
                  placeholderTextColor={colors.secondary}
                  autoFocus
                />
                <Text
                  style={[styles.currencyLabel, { color: colors.secondary }]}
                >
                  {Translations.uz.common.currency}
                </Text>
              </View>

              <TouchableOpacity
                style={[
                  styles.submitBtn,
                  {
                    backgroundColor:
                      shiftModalType === "start"
                        ? colors.success
                        : colors.danger,
                  },
                ]}
                onPress={submitShiftAction}
                disabled={processingShift}
              >
                {processingShift ? (
                  <ActivityIndicator color="white" />
                ) : (
                  <Text style={styles.submitBtnText}>
                    {shiftModalType === "start" ? "Boshlash" : "Yakunlash"}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 15,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: "bold",
  },
  headerSubtitle: {
    fontSize: 14,
    marginTop: 2,
  },
  logoutButton: {
    padding: 8,
  },
  scrollContent: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 16,
    marginTop: 10,
  },
  perfGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    gap: 12,
  },
  perfCard: {
    width: "48%",
    padding: 16,
    borderRadius: 20,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  perfCardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 12,
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  changeContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  changeText: {
    fontSize: 12,
    fontWeight: "bold",
    marginLeft: 2,
  },
  perfValue: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 4,
  },
  perfTitle: {
    fontSize: 12,
    fontWeight: "500",
  },
  actionGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    gap: 12,
    marginBottom: 24,
  },
  actionButton: {
    width: "48%",
    paddingVertical: 20,
    borderRadius: 24,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  actionIconContainer: {
    width: 60,
    height: 60,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
  },
  actionTitle: {
    fontSize: 14,
    fontWeight: "bold",
    paddingHorizontal: 8,
    textAlign: "center",
  },
  bottomSpace: { height: 40 },
  shiftStatusRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 4,
    gap: 6,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  shiftActions: {
    paddingHorizontal: 20,
    marginBottom: 10,
  },
  shiftBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    borderRadius: 15,
    gap: 8,
  },
  shiftBtnText: {
    color: "white",
    fontSize: 16,
    fontWeight: "bold",
  },
  profileButton: {
    padding: 8,
    borderRadius: 12,
    backgroundColor: Colors.light.primary + "10",
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modalContainer: {
    width: "100%",
    alignItems: "center",
  },
  modalContent: {
    width: "100%",
    borderRadius: 24,
    padding: 24,
    elevation: 5,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "bold",
  },
  modalLabel: {
    fontSize: 14,
    fontWeight: "500",
    marginBottom: 12,
  },
  cashInputContainer: {
    flexDirection: "row",
    alignItems: "center",
    height: 60,
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 16,
    marginBottom: 24,
  },
  cashInput: {
    flex: 1,
    fontSize: 20,
    fontWeight: "bold",
    marginLeft: 12,
  },
  currencyLabel: {
    fontSize: 16,
    fontWeight: "bold",
  },
  submitBtn: {
    height: 56,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
  },
  submitBtnText: {
    color: "white",
    fontSize: 17,
    fontWeight: "bold",
  },
});
