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
import { PDFService } from "@/utils/pdf-service";

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
  const [user, setUser] = useState<any>(null);
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
  const [shiftCard, setShiftCard] = useState("0");
  const [processingShift, setProcessingShift] = useState(false);
  const [eodReport, setEodReport] = useState<any>(null);
  const [showEodModal, setShowEodModal] = useState(false);
  const [expectedTotals, setExpectedTotals] = useState({ cash: 0, card: 0 });

  useEffect(() => {
    const fetchDashboardData = async () => {
      const userStr = await Storage.getItem("user");
      if (userStr) {
        const userData = JSON.parse(userStr);
        setUser(userData);
      }

      try {
        const token = await Storage.getItem("access_token");
        const headers = { Authorization: `Bearer ${token}` };
        
        let isOwner = false;
        if (userStr) {
          const userData = JSON.parse(userStr);
          isOwner = userData.role === "owner";
        }

        if (isOwner) {
          const usersRes = await axios.get(`${CONFIG.API_BASE_URL}/users`, {
            headers,
          });
          const staff = usersRes.data;
          const active = staff.filter((s: any) => s.isActive).length;
          setActiveStaffCount({ active, total: staff.length });

          const statsRes = await axios.get(
            `${CONFIG.API_BASE_URL}/orders/stats`,
            { headers }
          );
          setRevenue(statsRes.data.totalRevenue);
          setOrderCount(statsRes.data.totalOrderCount);

          const productsRes = await axios.get(
            `${CONFIG.API_BASE_URL}/inventory/products`,
            { headers }
          );
          const products = productsRes.data;
          const lowStock = products.filter(
            (p: any) => p.currentStock <= (p.minThreshold || 0)
          ).length;
          setStockStats({ low: lowStock, total: products.length });
        }

        // Barcha uchun smena haqida ma'lumot
        const shiftRes = await axios.get(
          `${CONFIG.API_BASE_URL}/shifts/active`,
          { headers },
        );
        setActiveShift(shiftRes.data);
        setIsShiftActive(!!shiftRes.data);
      } catch (error: any) {
        console.error("Dashboard fetch error:", error);
        if (error.response?.status === 401) {
          await Storage.removeItem("access_token");
          await Storage.removeItem("user");
          router.replace("/login");
        }
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
    setShiftCard("0");
    setShowShiftModal(true);
  };

  const getActions = () => {
    const hasRole = (r: string) => {
      if (!user) return false;
      const target = r.toLowerCase();
      const primary = user.role?.toLowerCase() || "";
      const extras = (user.extraRoles || []).map((e: string) => e.toLowerCase());
      return primary === target || extras.includes(target);
    };
    const isOwner = user?.role === "owner";

    const actions: any[] = [];

    // Owner-only Admin Actions
    if (isOwner) {
      actions.push(
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
        {
          title: Translations.uz.eodReport.title,
          icon: "chart-box-outline",
          color: "#6366F1",
          onPress: () => router.push("/reports"),
        },
      );
    }

    // Role-Specific Operation Actions
    if (isOwner || hasRole("oshpaz")) {
      actions.push({
        title: Translations.uz.kitchen.title,
        icon: "stove",
        color: "#FF9F1C",
        onPress: () => router.push("/kitchen?dept=oshpaz"),
      });
    }
    if (isOwner || hasRole("shashlikchi")) {
      actions.push({
        title: Translations.uz.kitchen.grillTitle,
        icon: "fire",
        color: "#EF4444",
        onPress: () => router.push("/kitchen?dept=shashlikchi"),
      });
    }
    if (isOwner || hasRole("bar")) {
      actions.push({
        title: Translations.uz.kitchen.barTitle,
        icon: "glass-cocktail",
        color: "#3B82F6",
        onPress: () => router.push("/kitchen?dept=bar"),
      });
    }
    if (isOwner || hasRole("salatchi")) {
      actions.push({
        title: Translations.uz.kitchen.saladTitle,
        icon: "leaf",
        color: "#10B981",
        onPress: () => router.push("/kitchen?dept=salatchi"),
      });
    }
    if (isOwner || hasRole("ofisiant")) {
      actions.push({
        title: Translations.uz.waiter.title,
        icon: "room-service",
        color: "#2EC4B6",
        onPress: () => router.push("/waiter"),
      });
    }
    if (isOwner || hasRole("kassier")) {
      actions.push({
        title: Translations.uz.cashier.title,
        icon: "cash-register",
        color: "#10B981",
        onPress: () => router.push("/cashier"),
      });
    }

    return actions.filter(Boolean);
  };

  const handleEndShift = async () => {
    if (!activeShift) return;
    setShiftModalType("end");
    setShiftCash("0");
    setShiftCard("0");

    // Fetch expected totals before showing modal
    try {
      const token = await Storage.getItem("access_token");
      const res = await axios.get(
        `${CONFIG.API_BASE_URL}/reports/shift-summary/${activeShift._id}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );
      setExpectedTotals({
        cash: res.data.stats.expectedCash,
        card: res.data.stats.expectedCard,
      });
    } catch (e) {
      console.error("Error fetching expected totals", e);
    }

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
      const cardValue = parseFloat(shiftCard.replace(/[^0-9.]/g, "") || "0");

      const body =
        shiftModalType === "start"
          ? {
              openedBy: userId,
              startCash: cashValue,
              startCard: cardValue,
            }
          : {
              closedBy: userId,
              endCash: cashValue,
              endCard: cardValue,
              expectedCash: expectedTotals.cash,
              expectedCard: expectedTotals.card,
            };

      const shiftRes = await axios.post(
        `${CONFIG.API_BASE_URL}${endpoint}`,
        body,
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );

      setShowShiftModal(false);

      if (shiftModalType === "end") {
        try {
          const reportRes = await axios.get(
            `${CONFIG.API_BASE_URL}/reports/shift-summary/${shiftRes.data._id}`,
            { headers: { Authorization: `Bearer ${token}` } },
          );
          setEodReport(reportRes.data);
          setShowEodModal(true);
        } catch (reportError) {
          console.error("Error fetching EOD report:", reportError);
          Alert.alert(
            "Muvaffaqiyatli",
            "Ish kuni yakunlandi, ammo hisobotni yuklashda xatolik yuz berdi",
          );
        }
      } else {
        Alert.alert("Muvaffaqiyatli", "Ish kuni boshlandi");
      }

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
            {user?.role === "owner" ? t.title : "Bosh sahifa"}
          </Text>
          {user?.role === "owner" && (
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
                style={[styles.headerSubtitle, { color: colors.secondary }]}
              >
                {t.shiftStatus}: {isShiftActive ? t.active : t.closed}
              </Text>
            </View>
          )}
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
        {/* Shift Actions */}
        {user?.role === "owner" && (
          <View style={styles.shiftActions}>
            <TouchableOpacity
              style={[
                styles.shiftBtn,
                {
                  backgroundColor: isShiftActive
                    ? colors.danger
                    : colors.success,
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
          </View>
        )}

        {/* Owner Performance Grid */}
        {user?.role === "owner" && (
          <View style={styles.perfGrid}>
            <PerformanceCard
              title={t.revenue}
              value={`${revenue.toLocaleString()} ${
                Translations.uz.common.currency
              }`}
              change="+12.5%"
              icon="cash-multiple"
              iconColor="#10B981"
              bgColor="#10B98115"
            />
            <PerformanceCard
              title={t.orders}
              value={orderCount.toString()}
              change="+5"
              icon="receipt"
              iconColor="#3B82F6"
              bgColor="#3B82F615"
            />
            <PerformanceCard
              title={t.staffOnDuty}
              value={`${activeStaffCount.active}/${activeStaffCount.total}`}
              change="Faol"
              icon="account-group"
              iconColor="#8B5CF6"
              bgColor="#8B5CF615"
            />
            <PerformanceCard
              title={t.stockLevel}
              value={`${stockStats.low} kam`}
              change={`${stockStats.total} jami`}
              icon="package-variant-closed"
              iconColor="#F59E0B"
              bgColor="#F59E0B15"
            />
          </View>
        )}

        {user?.role !== "owner" && (
          <>
            <View style={styles.perfGrid}>
              {[user?.role, ...(user?.extraRoles || [])]
                .filter((r) =>
                  ["oshpaz", "shashlikchi", "salatchi", "bar", "ofisiant"].includes(
                    r?.toLowerCase(),
                  ),
                )
                .map((role) => {
                  const roleLower = role.toLowerCase();
                  const configs: Record<
                    string,
                    { title: string; color: string; icon: any }
                  > = {
                    oshpaz: {
                      title: "Oshpaz Ombori",
                      color: "#FF9F1C",
                      icon: "chef-hat",
                    },
                    shashlikchi: {
                      title: "Shashlikchi Ombori",
                      color: "#EF4444",
                      icon: "fire",
                    },
                    salatchi: {
                      title: "Salatchi Ombori",
                      color: "#10B981",
                      icon: "leaf",
                    },
                    bar: {
                      title: "Bar Ombori",
                      color: "#3B82F6",
                      icon: "glass-cocktail",
                    },
                    ofisiant: {
                      title: "Ofitsiant Ombori",
                      color: "#2EC4B6",
                      icon: "room-service",
                    },
                  };

                  const config = configs[roleLower];
                  if (!config) return null;

                  return (
                    <PerformanceCard
                      key={roleLower}
                      title={config.title}
                      value="Ko'rib chiqish"
                      change="Mavjud"
                      icon={config.icon}
                      iconColor={config.color}
                      bgColor={config.color + "15"}
                      onPress={() =>
                        router.push({
                          pathname: "/staff-inventory",
                          params: { dept: roleLower },
                        })
                      }
                    />
                  );
                })}
            </View>
          </>
        )}

        <Text style={[styles.sectionTitle, { color: colors.text }]}>
          {t.quickActions}
        </Text>
        <View style={styles.actionGrid}>
          {getActions().map((action: any, idx) => (
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
                />
                <Text
                  style={[styles.currencyLabel, { color: colors.secondary }]}
                >
                  UZS
                </Text>
              </View>

              {shiftModalType === "end" && (
                <View style={styles.discrepancyBox}>
                  <Text
                    style={[
                      styles.discrepancyText,
                      { color: colors.secondary },
                    ]}
                  >
                    Kutilayotgan naqd: {expectedTotals.cash.toLocaleString()}{" "}
                    UZS
                  </Text>
                  <Text
                    style={[
                      styles.discrepancyValue,
                      {
                        color:
                          parseFloat(shiftCash) - expectedTotals.cash === 0
                            ? colors.success
                            : colors.danger,
                      },
                    ]}
                  >
                    Tafovut:{" "}
                    {(
                      parseFloat(shiftCash || "0") - expectedTotals.cash
                    ).toLocaleString()}{" "}
                    UZS
                  </Text>
                </View>
              )}

              <Text
                style={[
                  styles.modalLabel,
                  { color: colors.secondary, marginTop: 16 },
                ]}
              >
                {shiftModalType === "start"
                  ? "Boshlang'ich karta balansi (terminal):"
                  : "Yakuniy karta balansi (terminal):"}
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
                  name="credit-card-outline"
                  size={24}
                  color={colors.primary}
                />
                <TextInput
                  style={[styles.cashInput, { color: colors.text }]}
                  value={shiftCard}
                  onChangeText={setShiftCard}
                  keyboardType="numeric"
                  placeholder="0"
                  placeholderTextColor={colors.secondary}
                />
                <Text
                  style={[styles.currencyLabel, { color: colors.secondary }]}
                >
                  UZS
                </Text>
              </View>

              {shiftModalType === "end" && (
                <View style={styles.discrepancyBox}>
                  <Text
                    style={[
                      styles.discrepancyText,
                      { color: colors.secondary },
                    ]}
                  >
                    Kutilayotgan karta: {expectedTotals.card.toLocaleString()}{" "}
                    UZS
                  </Text>
                  <Text
                    style={[
                      styles.discrepancyValue,
                      {
                        color:
                          parseFloat(shiftCard) - expectedTotals.card === 0
                            ? colors.success
                            : colors.danger,
                      },
                    ]}
                  >
                    Tafovut:{" "}
                    {(
                      parseFloat(shiftCard || "0") - expectedTotals.card
                    ).toLocaleString()}{" "}
                    UZS
                  </Text>
                </View>
              )}

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

      {/* EOD Report Modal */}
      <Modal visible={showEodModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View
            style={[
              styles.modalContent,
              { backgroundColor: colors.card, maxHeight: "90%" },
            ]}
          >
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>
                {Translations.uz.eodReport.title}
              </Text>
              <TouchableOpacity onPress={() => setShowEodModal(false)}>
                <MaterialCommunityIcons
                  name="close"
                  size={24}
                  color={colors.secondary}
                />
              </TouchableOpacity>
            </View>

            {eodReport && (
              <ScrollView showsVerticalScrollIndicator={false}>
                {isShiftActive && (
                  <View
                    style={{
                      padding: 16,
                      backgroundColor: colors.primary + "10",
                      borderRadius: 12,
                      marginBottom: 16,
                      borderWidth: 1,
                      borderColor: colors.primary + "30",
                    }}
                  >
                    <View
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        gap: 8,
                        marginBottom: 8,
                      }}
                    >
                      <MaterialCommunityIcons
                        name="clock-check-outline"
                        size={20}
                        color={colors.primary}
                      />
                      <Text
                        style={{
                          fontWeight: "700",
                          color: colors.primary,
                          fontSize: 15,
                        }}
                      >
                        Ish kuni ochiq
                      </Text>
                    </View>
                    <Text
                      style={{
                        fontSize: 13,
                        color: colors.secondary,
                        lineHeight: 18,
                      }}
                    >
                      Amaldagi ish kuni hali ochiq. Hisobotni ko'rishingiz
                      mumkin, ammo yakuniy hisoblash uchun ish kunini yopish
                      kerak.
                    </Text>
                  </View>
                )}

                <View style={{ gap: 10, marginBottom: 20 }}>
                  <TouchableOpacity
                    style={[
                      styles.closeReportBtn,
                      {
                        backgroundColor: colors.success + "15",
                        marginTop: 0,
                        paddingVertical: 12,
                      },
                    ]}
                    onPress={() => {
                      if (eodReport) {
                        PDFService.generateEodPDF(eodReport);
                      } else {
                        Alert.alert("Xato", "Hisobot ma'lumotlari yuklanmagan");
                      }
                    }}
                  >
                    <View
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        gap: 8,
                      }}
                    >
                      <MaterialCommunityIcons
                        name="file-pdf-box"
                        size={24}
                        color={colors.success}
                      />
                      <Text
                        style={[
                          styles.submitBtnText,
                          { color: colors.success },
                        ]}
                      >
                        {Translations.uz.eodReport.exportPdf}
                      </Text>
                    </View>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.closeReportBtn,
                      {
                        backgroundColor: colors.primary,
                        marginTop: 0,
                        paddingVertical: 12,
                      },
                    ]}
                    onPress={() => setShowEodModal(false)}
                  >
                    <Text style={styles.submitBtnText}>Yopish</Text>
                  </TouchableOpacity>
                </View>
                <View style={styles.reportSection}>
                  <Text
                    style={[styles.reportLabel, { color: colors.secondary }]}
                  >
                    {Translations.uz.eodReport.financialSummary}
                  </Text>
                  <View style={styles.reportRow}>
                    <Text style={[styles.reportText, { color: colors.text }]}>
                      Jami Savdo:
                    </Text>
                    <Text
                      style={[styles.reportValue, { color: colors.success }]}
                    >
                      {eodReport.stats.totalSales.toLocaleString()}{" "}
                      {Translations.uz.common.currency}
                    </Text>
                  </View>
                  <View style={styles.reportRow}>
                    <Text style={[styles.reportText, { color: colors.text }]}>
                      Naqd:
                    </Text>
                    <Text style={[styles.reportText, { color: colors.text }]}>
                      {eodReport.stats.cashSales.toLocaleString()}{" "}
                      {Translations.uz.common.currency}
                    </Text>
                  </View>
                  <View style={styles.reportRow}>
                    <Text style={[styles.reportText, { color: colors.text }]}>
                      Terminal:
                    </Text>
                    <Text style={[styles.reportText, { color: colors.text }]}>
                      {eodReport.stats.terminalSales.toLocaleString()}{" "}
                      {Translations.uz.common.currency}
                    </Text>
                  </View>
                  <View style={styles.reportRow}>
                    <Text style={[styles.reportText, { color: colors.text }]}>
                      Jami Xarajatlar:
                    </Text>
                    <Text
                      style={[styles.reportValue, { color: colors.danger }]}
                    >
                      {eodReport.stats.totalExpenses.toLocaleString()}{" "}
                      {Translations.uz.common.currency}
                    </Text>
                  </View>
                </View>

                <View
                  style={[styles.divider, { backgroundColor: colors.border }]}
                />

                <View style={styles.reportSection}>
                  <Text
                    style={[styles.reportLabel, { color: colors.secondary }]}
                  >
                    Kassa Reconciliation
                  </Text>
                  <View style={styles.reportRow}>
                    <Text style={[styles.reportText, { color: colors.text }]}>
                      Kutilgan Naqd:
                    </Text>
                    <Text style={[styles.reportText, { color: colors.text }]}>
                      {eodReport.stats.expectedCash.toLocaleString()}{" "}
                      {Translations.uz.common.currency}
                    </Text>
                  </View>
                  <View style={styles.reportRow}>
                    <Text style={[styles.reportText, { color: colors.text }]}>
                      Haqiqiy Naqd:
                    </Text>
                    <Text style={[styles.reportText, { color: colors.text }]}>
                      {eodReport.stats.actualCash.toLocaleString()}{" "}
                      {Translations.uz.common.currency}
                    </Text>
                  </View>
                  <View style={styles.reportRow}>
                    <Text style={[styles.reportText, { color: colors.text }]}>
                      Farq (Discrepancy):
                    </Text>
                    <Text
                      style={[
                        styles.reportValue,
                        {
                          color:
                            eodReport.stats.discrepancy < 0
                              ? colors.danger
                              : colors.success,
                        },
                      ]}
                    >
                      {eodReport.stats.discrepancy.toLocaleString()}{" "}
                      {Translations.uz.common.currency}
                    </Text>
                  </View>
                </View>

                {eodReport.expenses?.length > 0 && (
                  <>
                    <View
                      style={[
                        styles.divider,
                        { backgroundColor: colors.border },
                      ]}
                    />
                    <View style={styles.reportSection}>
                      <Text
                        style={[
                          styles.reportLabel,
                          { color: colors.secondary },
                        ]}
                      >
                        Xarajatlar Tafsiloti
                      </Text>
                      {eodReport.expenses.map((exp: any, i: number) => (
                        <View key={i} style={styles.reportRow}>
                          <Text
                            style={[styles.reportText, { color: colors.text }]}
                          >
                            {exp.title}
                          </Text>
                          <Text
                            style={[
                              styles.reportValue,
                              { color: colors.danger },
                            ]}
                          >
                            -{exp.amount.toLocaleString()}
                          </Text>
                        </View>
                      ))}
                    </View>
                  </>
                )}
              </ScrollView>
            )}
          </View>
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
    flexWrap: "wrap",
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
  discrepancyBox: {
    marginTop: 4,
    paddingHorizontal: 4,
    marginBottom: 4,
  },
  discrepancyText: {
    fontSize: 12,
    fontWeight: "500",
  },
  discrepancyValue: {
    fontSize: 12,
    fontWeight: "700",
    marginTop: 2,
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
  reportSection: {
    marginVertical: 14,
    backgroundColor: "rgba(0,0,0,0.02)",
    padding: 12,
    borderRadius: 16,
  },
  reportLabel: {
    fontSize: 12,
    fontWeight: "800",
    marginBottom: 10,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  reportRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
    gap: 12,
  },
  reportText: {
    fontSize: 15,
    flex: 1,
  },
  reportValue: {
    fontWeight: "800",
    fontSize: 16,
    textAlign: "right",
  },
  divider: {
    height: 1,
    marginVertical: 4,
    opacity: 0.5,
  },
  closeReportBtn: {
    height: 56,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 24,
    marginBottom: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
});
