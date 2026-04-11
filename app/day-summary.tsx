import React, { useEffect, useState } from "react";
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { Storage } from "@/utils/storage";
import axios from "axios";
import { CONFIG } from "@/constants/config";

const API_BASE_URL = CONFIG.API_BASE_URL;

export default function DaySummaryScreen() {
  const router = useRouter();
  const { shiftId } = useLocalSearchParams();
  const colorScheme = useColorScheme() ?? "light";
  const colors = Colors[colorScheme];

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const token = await Storage.getItem("access_token");
        const res = await axios.get(
          `${API_BASE_URL}/reports/shift-summary/${shiftId}`,
          { headers: { Authorization: `Bearer ${token}` } },
        );
        setData(res.data);
      } catch (error) {
        console.error("Fetch shift summary error:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [shiftId]);

  if (loading) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!data) return null;

  const { stats, inventory, expenses, shift } = data;
  const isMatched = Math.abs(stats.discrepancy) < 100; // Small threshold

  const SummaryCard = ({ title, value, label, icon, color, subValue }: any) => (
    <View style={[styles.card, { backgroundColor: colors.card }]}>
      <View style={styles.cardHeader}>
        <View style={[styles.iconBox, { backgroundColor: color + "15" }]}>
          <MaterialCommunityIcons name={icon} size={24} color={color} />
        </View>
        <Text style={[styles.cardTitle, { color: colors.secondary }]}>
          {title}
        </Text>
      </View>
      <View style={styles.cardBody}>
        <Text style={[styles.cardValue, { color: colors.text }]}>{value}</Text>
        {subValue && (
          <Text style={[styles.cardSubValue, { color: colors.secondary }]}>
            {subValue}
          </Text>
        )}
      </View>
      <View
        style={[styles.cardFooter, { borderTopColor: colors.border + "50" }]}
      >
        <Text style={[styles.cardLabel, { color: colors.secondary }]}>
          {label}
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
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <MaterialCommunityIcons
            name="arrow-left"
            size={24}
            color={colors.text}
          />
        </TouchableOpacity>
        <View>
          <Text style={[styles.headerTitle, { color: colors.text }]}>
            Kun yakuni hisoboti
          </Text>
          <Text style={[styles.headerSubtitle, { color: colors.secondary }]}>
            {new Date(shift.startTime).toLocaleDateString("uz-UZ", {
              day: "2-digit",
              month: "long",
            })}
          </Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Status Badge */}
        <View
          style={[
            styles.statusBadge,
            { backgroundColor: isMatched ? colors.success : colors.danger },
          ]}
        >
          <MaterialCommunityIcons
            name={isMatched ? "check-circle" : "alert-circle"}
            size={24}
            color="white"
          />
          <Text style={styles.statusText}>
            {isMatched ? "Kassa mos keldi" : "Tushumda farq bor!"}
          </Text>
        </View>

        <View style={styles.grid}>
          <SummaryCard
            title="Kassa (Tushum)"
            value={`${stats.actualCash.toLocaleString()} so'm`}
            subValue={`Kutilgan: ${stats.expectedCash.toLocaleString()}`}
            label={
              stats.discrepancy === 0
                ? "Farq yo'q"
                : `${stats.discrepancy > 0 ? "+" : ""}${stats.discrepancy.toLocaleString()} so'm farq`
            }
            icon="cash-register"
            color={isMatched ? colors.success : colors.danger}
          />
          <SummaryCard
            title="Harajatlar"
            value={`${stats.totalExpenses.toLocaleString()} so'm`}
            label={`${expenses.length} ta xarid va to'lovlar`}
            icon="cart-arrow-down"
            color={colors.warning}
          />
        </View>

        {/* Expenses List */}
        <Text style={[styles.sectionTitle, { color: colors.text }]}>
          Batafsil xarajatlar
        </Text>
        <View style={[styles.box, { backgroundColor: colors.card }]}>
          {expenses.map((exp: any, i: number) => (
            <View
              key={i}
              style={[
                styles.itemRow,
                i < expenses.length - 1 && {
                  borderBottomColor: colors.border + "30",
                  borderBottomWidth: 1,
                },
              ]}
            >
              <View style={styles.itemInfo}>
                <Text style={[styles.itemName, { color: colors.text }]}>
                  {exp.title}
                </Text>
                <Text style={[styles.itemCat, { color: colors.secondary }]}>
                  {exp.category}
                </Text>
              </View>
              <Text style={[styles.itemAmount, { color: colors.danger }]}>
                -{exp.amount.toLocaleString()}
              </Text>
            </View>
          ))}
          {expenses.length === 0 && (
            <Text style={[styles.emptyText, { color: colors.secondary }]}>
              Harajatlar mavjud emas
            </Text>
          )}
        </View>

        {/* Inventory Reconciliation */}
        <Text style={[styles.sectionTitle, { color: colors.text }]}>
          Omborxona aylanmasi
        </Text>
        <View style={[styles.box, { backgroundColor: colors.card }]}>
          {inventory.map((inv: any, i: number) => (
            <View
              key={i}
              style={[
                styles.itemRow,
                i < inventory.length - 1 && {
                  borderBottomColor: colors.border + "30",
                  borderBottomWidth: 1,
                },
              ]}
            >
              <View style={styles.itemInfo}>
                <Text style={[styles.itemName, { color: colors.text }]}>
                  {inv.name}
                </Text>
                <Text
                  style={[styles.itemMovement, { color: colors.secondary }]}
                >
                  Kirish: {inv.in} | Chiqish: {inv.out} {inv.unit}
                </Text>
              </View>
              <View style={styles.deltaBox}>
                <Text
                  style={[
                    styles.deltaText,
                    {
                      color: inv.in > inv.out ? colors.success : colors.warning,
                    },
                  ]}
                >
                  {inv.in - inv.out > 0 ? "+" : ""}
                  {(inv.in - inv.out).toFixed(1)}
                </Text>
              </View>
            </View>
          ))}
          {inventory.length === 0 && (
            <Text style={[styles.emptyText, { color: colors.secondary }]}>
              Harakatlar mavjud emas
            </Text>
          )}
        </View>

        <TouchableOpacity
          style={[styles.closeBtn, { backgroundColor: colors.primary }]}
          onPress={() => router.back()}
        >
          <Text style={styles.closeBtnText}>Tushunarli</Text>
        </TouchableOpacity>
        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  centered: { flex: 1, justifyContent: "center", alignItems: "center" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    padding: 20,
    gap: 15,
  },
  backBtn: { padding: 8 },
  headerTitle: { fontSize: 20, fontWeight: "bold" },
  headerSubtitle: { fontSize: 13 },
  scrollContent: { padding: 20 },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderRadius: 20,
    gap: 12,
    marginBottom: 20,
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
  },
  statusText: { color: "white", fontSize: 16, fontWeight: "bold" },
  grid: { flexDirection: "row", gap: 12, marginBottom: 20 },
  card: { flex: 1, padding: 16, borderRadius: 24, elevation: 2 },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 12,
  },
  cardBody: {
    marginVertical: 4,
  },
  cardTitle: { fontSize: 11, fontWeight: "600" },
  iconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  cardValue: { fontSize: 16, fontWeight: "bold", marginBottom: 2 },
  cardSubValue: { fontSize: 10 },
  cardFooter: { marginTop: 12, paddingTop: 8, borderTopWidth: 1 },
  cardLabel: { fontSize: 10, fontWeight: "500" },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 16,
    marginTop: 10,
  },
  box: { paddingHorizontal: 20, borderRadius: 24, marginBottom: 20 },
  itemRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 15,
    gap: 12,
  },
  itemInfo: { flex: 1 },
  itemName: { fontSize: 14, fontWeight: "600", marginBottom: 2 },
  itemCat: { fontSize: 11 },
  itemAmount: { fontSize: 14, fontWeight: "bold" },
  itemMovement: { fontSize: 11 },
  deltaBox: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: "rgba(0,0,0,0.03)",
  },
  deltaText: { fontSize: 12, fontWeight: "bold" },
  emptyText: { textAlign: "center", paddingVertical: 30, fontStyle: "italic" },
  closeBtn: {
    height: 56,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 10,
  },
  closeBtnText: { color: "white", fontSize: 16, fontWeight: "bold" },
});
