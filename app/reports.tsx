import React, { useState, useEffect, useMemo } from "react";
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { useRouter } from "expo-router";
import { Translations } from "@/constants/translations";
import { Storage } from "@/utils/storage";
import axios from "axios";

const API_BASE_URL = "http://192.168.43.160:3000";
const t = Translations.uz.eodReport;
const common = Translations.uz.common;

export default function ReportsScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme() ?? "light";
  const colors = Colors[colorScheme];

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [period, setPeriod] = useState<"daily" | "weekly" | "monthly">("daily");

  const statsData = useMemo(
    () => ({
      daily: [
        { label: "Du", rev: 400, exp: 250 },
        { label: "Se", rev: 350, exp: 200 },
        { label: "Ch", rev: 550, exp: 300 },
        { label: "Pa", rev: 480, exp: 280 },
        { label: "Ju", rev: 600, exp: 350 },
        { label: "Sh", rev: 850, exp: 450 },
        { label: "Ya", rev: 700, exp: 400 },
      ],
      weekly: [
        { label: "1-hafta", rev: 4500, exp: 2800 },
        { label: "2-hafta", rev: 5200, exp: 3100 },
        { label: "3-hafta", rev: 4800, exp: 2900 },
        { label: "4-hafta", rev: 6100, exp: 3500 },
      ],
      monthly: [
        { label: "Yan", rev: 18000, exp: 12000 },
        { label: "Feb", rev: 22000, exp: 14000 },
        { label: "Mar", rev: 28000, exp: 16000 },
        { label: "Apr", rev: 25000, exp: 15000 },
      ],
    }),
    [],
  );

  const [currentStats, setCurrentStats] = useState<any[]>([]);

  useEffect(() => {
    setCurrentStats(statsData[period]);
  }, [period, statsData]);

  const fetchData = async () => {
    try {
      setLoading(true);
      // Simulate real data fetching
      setTimeout(() => {
        setLoading(false);
        setRefreshing(false);
      }, 600);
    } catch (error) {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  const MaxValue = useMemo(() => {
    const vals = currentStats.map((s) => Math.max(s.rev, s.exp));
    return Math.max(...vals, 1);
  }, [currentStats]);

  const StatCard = ({ title, value, icon, color }: any) => (
    <View style={[styles.statCard, { backgroundColor: colors.card }]}>
      <View style={[styles.statIcon, { backgroundColor: color + "15" }]}>
        <MaterialCommunityIcons name={icon} size={24} color={color} />
      </View>
      <View>
        <Text style={[styles.statTitle, { color: colors.secondary }]}>
          {title}
        </Text>
        <Text style={[styles.statValue, { color: colors.text }]}>{value}</Text>
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
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          showsVerticalScrollIndicator={false}
        >
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
                          height: (s.rev / MaxValue) * 120,
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
                          height: (s.exp / MaxValue) * 120,
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
              value={`${(period === "daily" ? 12500000 : period === "weekly" ? 55000000 : 185000000).toLocaleString()} so'm`}
              icon="trending-up"
              color={colors.success}
            />
            <StatCard
              title="Jami Xarajat"
              value={`${(period === "daily" ? 4200000 : period === "weekly" ? 18000000 : 65000000).toLocaleString()} so'm`}
              icon="trending-down"
              color={colors.danger}
            />
            <StatCard
              title="Sof Foyda"
              value={`${(period === "daily" ? 8300000 : period === "weekly" ? 37000000 : 120000000).toLocaleString()} so'm`}
              icon="wallet-outline"
              color={colors.primary}
            />
            <StatCard
              title="Buyurtmalar"
              value="145"
              icon="cart-outline"
              color={colors.accent}
            />
          </View>

          <View style={[styles.chartBox, { backgroundColor: colors.card }]}>
            <Text style={[styles.boxTitle, { color: colors.text }]}>
              {t.topSold}
            </Text>
            {[
              { name: "Osh (Palov)", count: 420, price: 35000 },
              { name: "Shashlik (Lula)", count: 350, price: 18000 },
              { name: "Choy", count: 800, price: 5000 },
            ].map((item, index) => (
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
                    {item.price.toLocaleString()} so'm
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
});
