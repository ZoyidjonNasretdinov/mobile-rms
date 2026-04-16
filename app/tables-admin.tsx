import React, { useState, useEffect } from "react";
import {
  StyleSheet,
  View,
  Text,
  SectionList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
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

const API_BASE_URL = CONFIG.API_BASE_URL;

export default function TablesAdminScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme() ?? "light";
  const colors = Colors[colorScheme];

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [tables, setTables] = useState<any[]>([]);

  const fetchTables = async () => {
    try {
      const token = await Storage.getItem("access_token");
      const response = await axios.get(`${API_BASE_URL}/tables`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      // Group by floor
      const groups = response.data.reduce((acc: any, table: any) => {
        const floor = table.floor || 1;
        if (!acc[floor]) acc[floor] = [];
        acc[floor].push(table);
        return acc;
      }, {});

      const sections = Object.keys(groups)
        .sort((a, b) => parseInt(a) - parseInt(b))
        .map((floor) => ({
          title: `${floor}-qavat`,
          data: groups[floor].sort(
            (a: any, b: any) => parseInt(a.number) - parseInt(b.number),
          ),
        }));

      setTables(sections);
    } catch (error) {
      console.error("Fetch tables error:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchTables();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchTables();
  };

  const handleDelete = (id: string, number: string) => {
    Alert.alert("O'chirish", `${number}-stol o'chirilsinmi?`, [
      { text: "Bekor qilish", style: "cancel" },
      {
        text: "O'chirish",
        style: "destructive",
        onPress: async () => {
          try {
            const token = await Storage.getItem("access_token");
            await axios.delete(`${API_BASE_URL}/tables/${id}`, {
              headers: { Authorization: `Bearer ${token}` },
            });
            fetchTables();
          } catch {
            Alert.alert("Xato", "O'chirishda xatolik yuz berdi");
          }
        },
      },
    ]);
  };

  const TableItem = ({ item }: { item: any }) => (
    <View style={[styles.card, { backgroundColor: colors.card }]}>
      <View style={styles.cardInfo}>
        <View
          style={[styles.iconBox, { backgroundColor: colors.primary + "15" }]}
        >
          <MaterialCommunityIcons
            name="table-chair"
            size={24}
            color={colors.primary}
          />
        </View>
        <View style={styles.tableNameRow}>
          <MaterialCommunityIcons
            name="table-chair"
            size={18}
            color={colors.text}
          />
          <Text style={[styles.tableName, { color: colors.text }]}>
            {item.number}
          </Text>
          {item.floor && (
            <View
              style={[
                styles.inlineFloorBadge,
                { backgroundColor: colors.accent + "15" },
              ]}
            >
              <MaterialCommunityIcons
                name="layers-outline"
                size={12}
                color={colors.accent}
              />
              <Text style={[styles.inlineFloorText, { color: colors.accent }]}>
                {item.floor}
              </Text>
            </View>
          )}
        </View>
        <Text style={[styles.tableSub, { color: colors.secondary }]}>
          {"Sig'imi: "}
          {item.capacity}
          {" kishi"}
        </Text>
      </View>
      <View style={styles.cardActions}>
        <TouchableOpacity
          onPress={() =>
            router.push({ pathname: "/create-table", params: { id: item._id } })
          }
          style={styles.actionBtn}
        >
          <MaterialCommunityIcons
            name="pencil-outline"
            size={20}
            color={colors.primary}
          />
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => handleDelete(item._id, item.number)}
          style={styles.actionBtn}
        >
          <MaterialCommunityIcons
            name="trash-can-outline"
            size={20}
            color={colors.danger}
          />
        </TouchableOpacity>
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
          Stollarni boshqarish
        </Text>
        <TouchableOpacity
          onPress={() => router.push("/create-table")}
          style={[styles.addButton, { backgroundColor: colors.primary }]}
        >
          <MaterialCommunityIcons name="plus" size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <SectionList
          sections={tables}
          renderItem={({ item }) => <TableItem item={item} />}
          renderSectionHeader={({ section: { title } }) => (
            <View
              style={[
                styles.sectionHeader,
                { backgroundColor: colors.background },
              ]}
            >
              <Text style={[styles.sectionTitle, { color: colors.secondary }]}>
                {title}
              </Text>
            </View>
          )}
          keyExtractor={(item) => item._id}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={{ color: colors.secondary }}>Stollar topilmadi</Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: "row", alignItems: "center", padding: 20, gap: 15 },
  backButton: { padding: 8 },
  headerTitle: { fontSize: 20, fontWeight: "bold", flex: 1 },
  addButton: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  list: { padding: 20 },
  card: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
    borderRadius: 16,
    marginBottom: 12,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
  },
  cardInfo: { flexDirection: "row", alignItems: "center", gap: 12 },
  iconBox: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  tableName: { fontSize: 18, fontWeight: "800", marginLeft: 6 },
  tableNameRow: { flexDirection: "row", alignItems: "center", marginBottom: 4 },
  inlineFloorBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    marginLeft: 12,
  },
  inlineFloorText: { fontSize: 12, fontWeight: "700" },
  tableSub: { fontSize: 13 },
  cardActions: { flexDirection: "row", gap: 8 },
  actionBtn: { padding: 8 },
  centered: { flex: 1, justifyContent: "center", alignItems: "center" },
  empty: { alignItems: "center", marginTop: 100 },
  sectionHeader: {
    paddingVertical: 10,
    paddingHorizontal: 4,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "bold",
    textTransform: "uppercase",
  },
});
