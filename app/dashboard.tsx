import React, { useEffect, useState } from "react";
import {
  StyleSheet,
  View,
  ScrollView,
  TouchableOpacity,
  Text,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import * as SecureStore from "expo-secure-store";
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
  const [userName, setUserName] = useState(t.title);
  const [activeStaffCount, setActiveStaffCount] = useState({
    active: 0,
    total: 0,
  });
  const [revenue, setRevenue] = useState(0);
  const [orderCount, setOrderCount] = useState(0);
  const [role, setRole] = useState("");
  const [activeShift, setActiveShift] = useState<any>(null);
  const [isShiftActive, setIsShiftActive] = useState(false);

  useEffect(() => {
    const fetchDashboardData = async () => {
      // Load user info
      const userStr = await Storage.getItem("user");
      if (userStr) {
        const user = JSON.parse(userStr);
        setUserName(user.fullName || user.name || t.title);
        setRole(user.role);

        // Auto-redirect roles to their stations if not owner
        const userRole = user.role?.toLowerCase();
        if (userRole === "ofisiant") router.replace("/waiter");
        if (["oshpaz", "shashlikchi", "salatchi", "bar"].includes(userRole))
          router.replace("/kitchen");
        if (userRole === "kassier") router.replace("/cashier");
      }

      // Load staff stats
      try {
        const token = await Storage.getItem("access_token");
        const response = await axios.get(`${CONFIG.API_BASE_URL}/users`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const staff = response.data;
        const active = staff.filter((s: any) => s.isActive).length;
        setActiveStaffCount({ active, total: staff.length });

        // Load revenue and order stats for TODAY
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
          {
            headers: { Authorization: `Bearer ${token}` },
          },
        );
        setRevenue(statsRes.data.totalRevenue);
        setOrderCount(statsRes.data.totalOrderCount);
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

    return () => {
      socket.off("orderCreated", handleUpdate);
      socket.off("orderUpdated", handleUpdate);
      socket.off("staffStatusChanged", handleUpdate);
    };
  }, []);

  const handleLogout = async () => {
    await Storage.removeItem("access_token");
    await Storage.removeItem("user");
    router.replace("/login");
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
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <MaterialCommunityIcons
            name="logout"
            size={24}
            color={colors.secondary}
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
        <View style={styles.perfGrid}></View>

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
});
