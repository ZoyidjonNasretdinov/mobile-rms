import React, { useState, useEffect, useMemo, useRef } from "react";
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Modal,
  TextInput,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { useRouter } from "expo-router";
import * as SecureStore from "expo-secure-store";
import { Translations } from "@/constants/translations";
import { Storage } from "@/utils/storage";
import axios from "axios";
import { CONFIG } from "@/constants/config";
import { socketService } from "@/utils/socket";

const API_BASE_URL = CONFIG.API_BASE_URL;
const t = Translations.uz.eodReport;
const common = Translations.uz.common;
const dash = Translations.uz.dashboard;

export default function ReportsScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme() ?? "light";
  const colors = Colors[colorScheme];

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [period, setPeriod] = useState<"daily" | "weekly" | "monthly">("daily");

  const [currentStats, setCurrentStats] = useState<any[]>([]);
  const [totals, setTotals] = useState({
    totalRevenue: 0,
    totalExpenses: 0,
    netProfit: 0,
    orderCount: 0,
  });
  const [topSold, setTopSold] = useState<any[]>([]);
  const [user, setUser] = useState<any>(null);
  const [activeShift, setActiveShift] = useState<any>(null);
  const [isShiftActive, setIsShiftActive] = useState(false);
  const [showCashModal, setShowCashModal] = useState(false);
  const [cashValue, setCashValue] = useState("");
  const [modalType, setModalType] = useState<"start" | "end">("start");

  const userRef = useRef<any>(null);

  const fetchData = async () => {
    try {
      const token = await Storage.getItem("access_token");
      if (!token) return;

      const [financialRes, topSoldRes] = await Promise.all([
        axios.get(`${API_BASE_URL}/reports/financial?period=${period}`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        axios.get(`${API_BASE_URL}/reports/top-sold`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      setCurrentStats(financialRes.data.stats);
      setTotals({
        totalRevenue: financialRes.data.totalRevenue,
        totalExpenses: financialRes.data.totalExpenses,
        netProfit: financialRes.data.netProfit,
        orderCount: financialRes.data.orderCount,
      });
      setTopSold(topSoldRes.data);
    } catch (error) {
      console.error("Fetch reports error:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const fetchShiftStatus = async () => {
    try {
      const token = await Storage.getItem("access_token");
      const shiftRes = await axios.get(`${API_BASE_URL}/shifts/active`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setActiveShift(shiftRes.data);
      setIsShiftActive(!!shiftRes.data);
    } catch (error) {
      console.error("Shift fetch error:", error);
    }
  };

  useEffect(() => {
    const init = async () => {
      const userStr = await Storage.getItem("user");
      if (userStr) {
        const parsed = JSON.parse(userStr);
        setUser(parsed);
        userRef.current = parsed;
      }
      await fetchShiftStatus();
      await fetchData();
    };
    init();

    const socket = socketService.getSocket();
    const handleUpdate = () => {
      fetchShiftStatus();
      fetchData();
    };

    socket.on("shiftStatusChanged", handleUpdate);
    socket.on("orderCreated", handleUpdate);
    socket.on("orderUpdated", handleUpdate);

    return () => {
      socket.off("shiftStatusChanged", handleUpdate);
      socket.off("orderCreated", handleUpdate);
      socket.off("orderUpdated", handleUpdate);
    };
  }, [period]);

  const handleShiftAction = async () => {
    const val = parseFloat(cashValue) || 0;
    try {
      const token = await Storage.getItem("access_token");
      const endpoint = modalType === "start" ? "start" : "end";
      const payload =
        modalType === "start"
          ? { openedBy: user._id, startCash: val }
          : { closedBy: user._id, endCash: val };

      await axios.post(`${API_BASE_URL}/shifts/${endpoint}`, payload, {
        headers: { Authorization: `Bearer ${token}` },
      });

      setShowCashModal(false);
      setCashValue("");
      Alert.alert(
        "Muvaffaqiyatli",
        modalType === "start" ? "Ish kuni boshlandi" : "Ish kuni yakunlandi",
      );
      fetchShiftStatus();
      fetchData();
    } catch (error: any) {
      Alert.alert(
        "Xatolik",
        error.response?.data?.message || "Amalni bajarib bo'lmadi",
      );
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchShiftStatus();
    fetchData();
  };

  const MaxValue = useMemo(() => {
    if (!currentStats || currentStats.length === 0) return 1;
    const vals = currentStats.map((s) => Math.max(s.rev || 0, s.exp || 0));
    return Math.max(...vals, 1);
  }, [currentStats]);

  const StatCard = ({ title, value, icon, color }: any) => (
    <View style={[styles.statCard, { backgroundColor: colors.card }]}>
      <View style={[styles.statIcon, { backgroundColor: color + "15" }]}>
        <MaterialCommunityIcons name={icon} size={24} color={color} />
      </View>
      <View style={{ flex: 1 }}>
        <Text
          style={[styles.statTitle, { color: colors.secondary }]}
          numberOfLines={1}
        >
          {title}
        </Text>
        <Text
          style={[styles.statValue, { color: colors.text }]}
          numberOfLines={1}
          adjustsFontSizeToFit
        >
          {value}
        </Text>
      </View>
    </View>
  );

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
          {t.title}
        </Text>
        <TouchableOpacity
          onPress={() => {}}
          style={[styles.headerBtn, { backgroundColor: colors.card }]}
        >
          <MaterialCommunityIcons
            name="filter-variant"
            size={24}
            color={colors.primary}
          />
        </TouchableOpacity>
      </View>

      <View style={styles.periodSelector}>
        {(["daily", "weekly", "monthly"] as const).map((p) => (
          <TouchableOpacity
            key={p}
            onPress={() => setPeriod(p)}
            style={[
              styles.periodBtn,
              { backgroundColor: period === p ? colors.primary : colors.card },
            ]}
          >
            <Text
              style={{
                color: period === p ? "white" : colors.secondary,
                fontWeight: "bold",
                fontSize: 13,
              }}
            >
              {p === "daily" ? "Kunlik" : p === "weekly" ? "Haftalik" : "Oylik"}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <>
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
            }
            showsVerticalScrollIndicator={false}
          >
            {user?.role === "owner" && (
              <View style={styles.shiftSection}>
                <View
                  style={[
                    styles.shiftStatusCard,
                    { backgroundColor: colors.card },
                    isShiftActive
                      ? { borderColor: colors.success + "40", borderWidth: 1 }
                      : { borderColor: colors.danger + "40", borderWidth: 1 },
                  ]}
                >
                  <View style={styles.shiftInfo}>
                    <View
                      style={[
                        styles.statusIndicator,
                        {
                          backgroundColor: isShiftActive
                            ? colors.success
                            : colors.danger,
                        },
                      ]}
                    />
                    <Text
                      style={[styles.shiftLabel, { color: colors.secondary }]}
                    >
                      {dash.shiftStatus}:{" "}
                      <Text
                        style={{
                          color: isShiftActive ? colors.success : colors.danger,
                          fontWeight: "bold",
                        }}
                      >
                        {isShiftActive ? dash.active : dash.closed}
                      </Text>
                    </Text>
                  </View>

                  <View style={{ flexDirection: "row", gap: 10 }}>
                    {activeShift && (
                      <TouchableOpacity
                        style={[
                          styles.shiftActionBtn,
                          { backgroundColor: colors.primary },
                        ]}
                        onPress={() =>
                          router.push({
                            pathname: "/day-summary",
                            params: { shiftId: activeShift._id },
                          })
                        }
                      >
                        <MaterialCommunityIcons
                          name="file-chart-outline"
                          size={18}
                          color="white"
                        />
                      </TouchableOpacity>
                    )}

                    {!isShiftActive ? (
                      <TouchableOpacity
                        style={[
                          styles.shiftActionBtn,
                          { backgroundColor: colors.success },
                        ]}
                        onPress={() => {
                          setModalType("start");
                          setShowCashModal(true);
                        }}
                      >
                        <MaterialCommunityIcons
                          name="play-circle-outline"
                          size={20}
                          color="white"
                        />
                        <Text style={styles.shiftActionText}>
                          {dash.startDay}
                        </Text>
                      </TouchableOpacity>
                    ) : (
                      <TouchableOpacity
                        style={[
                          styles.shiftActionBtn,
                          { backgroundColor: colors.danger },
                        ]}
                        onPress={() => {
                          setModalType("end");
                          setShowCashModal(true);
                        }}
                      >
                        <MaterialCommunityIcons
                          name="stop-circle-outline"
                          size={20}
                          color="white"
                        />
                        <Text style={styles.shiftActionText}>
                          {dash.endDay}
                        </Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              </View>
            )}

            {/* Chart Section */}
            <View
              style={[styles.chartContainer, { backgroundColor: colors.card }]}
            >
              <View style={styles.chartHeader}>
                <Text style={[styles.boxTitle, { color: colors.text }]}>
                  Moliyaviy ko'rsatkichlar
                </Text>
                <View style={styles.legend}>
                  <View style={styles.legendItem}>
                    <View
                      style={[
                        styles.legendDot,
                        { backgroundColor: colors.success },
                      ]}
                    />
                    <Text
                      style={[styles.legendText, { color: colors.secondary }]}
                    >
                      Tushum
                    </Text>
                  </View>
                  <View style={styles.legendItem}>
                    <View
                      style={[
                        styles.legendDot,
                        { backgroundColor: colors.danger },
                      ]}
                    />
                    <Text
                      style={[styles.legendText, { color: colors.secondary }]}
                    >
                      Xarajat
                    </Text>
                  </View>
                </View>
              </View>

              <View style={styles.chartArea}>
                {currentStats.map((s, i) => (
                  <View key={i} style={styles.chartCol}>
                    <View style={styles.barGroup}>
                      <View
                        style={[
                          styles.bar,
                          {
                            backgroundColor: colors.success,
                            height: ((s.rev || 0) / MaxValue) * 120,
                            borderTopLeftRadius: 4,
                            borderTopRightRadius: 4,
                          },
                        ]}
                      />
                      <View
                        style={[
                          styles.bar,
                          {
                            backgroundColor: colors.danger,
                            height: ((s.exp || 0) / MaxValue) * 120,
                            borderTopLeftRadius: 4,
                            borderTopRightRadius: 4,
                            marginLeft: 2,
                          },
                        ]}
                      />
                    </View>
                    <Text
                      style={[styles.chartLabel, { color: colors.secondary }]}
                      numberOfLines={1}
                    >
                      {s.label}
                    </Text>
                  </View>
                ))}
              </View>
            </View>

            <View style={styles.statsGrid}>
              <StatCard
                title="Jami Tushum"
                value={`${(totals.totalRevenue || 0).toLocaleString()} so'm`}
                icon="trending-up"
                color={colors.success}
              />
              <StatCard
                title="Jami Xarajat"
                value={`${(totals.totalExpenses || 0).toLocaleString()} so'm`}
                icon="trending-down"
                color={colors.danger}
              />
              <StatCard
                title="Sof Foyda"
                value={`${(totals.netProfit || 0).toLocaleString()} so'm`}
                icon="wallet-outline"
                color={colors.primary}
              />
              <StatCard
                title="Buyurtmalar"
                value={(totals.orderCount || 0).toString()}
                icon="cart-outline"
                color={colors.accent}
              />
            </View>

            <View style={[styles.chartBox, { backgroundColor: colors.card }]}>
              <Text style={[styles.boxTitle, { color: colors.text }]}>
                {t.topSold}
              </Text>
              {topSold.map((item, index) => (
                <View key={index} style={styles.topItemRow}>
                  <View
                    style={[
                      styles.rankBadge,
                      {
                        backgroundColor:
                          colors.primary + (index === 0 ? "30" : "10"),
                      },
                    ]}
                  >
                    <Text style={{ color: colors.primary, fontWeight: "bold" }}>
                      {index + 1}
                    </Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.itemName, { color: colors.text }]}>
                      {item.name}
                    </Text>
                    <Text style={{ fontSize: 11, color: colors.secondary }}>
                      {(item.price || 0).toLocaleString()} so'm
                    </Text>
                  </View>
                  <Text style={[styles.itemCount, { color: colors.secondary }]}>
                    {item.count} ta
                  </Text>
                </View>
              ))}
            </View>

            <TouchableOpacity
              style={[styles.exportBtn, { backgroundColor: colors.primary }]}
            >
              <MaterialCommunityIcons
                name="file-pdf-box"
                size={24}
                color="white"
              />
              <Text style={styles.exportBtnText}>{t.exportPdf}</Text>
            </TouchableOpacity>
            <View style={{ height: 40 }} />
          </ScrollView>

          <Modal
            visible={showCashModal}
            transparent
            animationType="slide"
            onRequestClose={() => setShowCashModal(false)}
          >
            <View style={styles.modalOverlay}>
              <View
                style={[styles.modalContent, { backgroundColor: colors.card }]}
              >
                <View style={styles.modalHeader}>
                  <Text style={[styles.modalTitle, { color: colors.text }]}>
                    {modalType === "start" ? dash.startDay : dash.endDay}
                  </Text>
                  <TouchableOpacity onPress={() => setShowCashModal(false)}>
                    <MaterialCommunityIcons
                      name="close"
                      size={24}
                      color={colors.secondary}
                    />
                  </TouchableOpacity>
                </View>

                <View style={styles.modalBody}>
                  <Text
                    style={[styles.inputLabel, { color: colors.secondary }]}
                  >
                    {modalType === "start"
                      ? "Boshlang'ich kassa qoldig'i (so'm)"
                      : "Yakuniy kassa qoldig'i (so'm)"}
                  </Text>
                  <TextInput
                    style={[
                      styles.modalInput,
                      {
                        backgroundColor: colors.background,
                        color: colors.text,
                      },
                    ]}
                    placeholder="0"
                    keyboardType="numeric"
                    value={cashValue}
                    onChangeText={setCashValue}
                    autoFocus
                  />
                </View>

                <TouchableOpacity
                  style={[styles.modalBtn, { backgroundColor: colors.primary }]}
                  onPress={handleShiftAction}
                >
                  <Text style={styles.modalBtnText}>{common.save}</Text>
                </TouchableOpacity>
              </View>
            </View>
          </Modal>
        </>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: "row", alignItems: "center", padding: 20, gap: 15 },
  backButton: { padding: 8 },
  headerTitle: { fontSize: 20, fontWeight: "bold", flex: 1 },
  headerBtn: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  periodSelector: {
    flexDirection: "row",
    paddingHorizontal: 20,
    gap: 10,
    marginBottom: 15,
  },
  periodBtn: {
    flex: 1,
    height: 40,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  scrollContent: { padding: 20 },
  centered: { flex: 1, justifyContent: "center", alignItems: "center" },
  chartContainer: { padding: 20, borderRadius: 24, marginBottom: 20 },
  chartHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  boxTitle: { fontSize: 16, fontWeight: "bold" },
  legend: { flexDirection: "row", gap: 12 },
  legendItem: { flexDirection: "row", alignItems: "center", gap: 4 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendText: { fontSize: 11, fontWeight: "600" },
  chartArea: {
    flexDirection: "row",
    height: 200,
    alignItems: "flex-end",
    justifyContent: "space-between",
    paddingTop: 20,
  },
  chartCol: { alignItems: "center", gap: 8, flex: 1 },
  barGroup: { flexDirection: "row", alignItems: "flex-end" },
  bar: { width: 12 },
  chartLabel: {
    fontSize: 10,
    fontWeight: "600",
    textAlign: "center",
    width: "100%",
  },
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    marginBottom: 20,
  },
  statCard: {
    width: "48%",
    padding: 15,
    borderRadius: 20,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  statIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  statTitle: { fontSize: 11, fontWeight: "600", marginBottom: 2 },
  statValue: { fontSize: 13, fontWeight: "bold" },
  chartBox: { padding: 20, borderRadius: 24, marginBottom: 20 },
  topItemRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
    gap: 12,
  },
  rankBadge: {
    width: 28,
    height: 28,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
  },
  itemName: { fontSize: 14, fontWeight: "500" },
  itemCount: { fontSize: 13, fontWeight: "bold" },
  exportBtn: {
    height: 56,
    borderRadius: 16,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 10,
    marginTop: 10,
  },
  exportBtnText: { color: "white", fontSize: 16, fontWeight: "bold" },
  shiftSection: { marginBottom: 20 },
  shiftStatusCard: {
    padding: 16,
    borderRadius: 20,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  shiftInfo: { flexDirection: "row", alignItems: "center", gap: 10 },
  statusIndicator: { width: 10, height: 10, borderRadius: 5 },
  shiftLabel: { fontSize: 14 },
  shiftActionBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderRadius: 12,
    gap: 6,
  },
  shiftActionText: { color: "white", fontSize: 13, fontWeight: "bold" },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    padding: 24,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    minHeight: 350,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 24,
  },
  modalTitle: { fontSize: 20, fontWeight: "bold" },
  modalBody: { marginBottom: 30 },
  inputLabel: { fontSize: 14, marginBottom: 12 },
  modalInput: {
    height: 60,
    borderRadius: 16,
    paddingHorizontal: 20,
    fontSize: 24,
    fontWeight: "bold",
  },
  modalBtn: {
    height: 56,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
  },
  modalBtnText: { color: "white", fontSize: 16, fontWeight: "bold" },
});
