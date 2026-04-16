import React, { useState, useCallback } from "react";
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { useRouter, useFocusEffect } from "expo-router";
import { Storage } from "@/utils/storage";
import axios from "axios";
import { CONFIG } from "@/constants/config";

import { Translations } from "@/constants/translations";

const t = Translations.uz.staff;
const API_BASE_URL = CONFIG.API_BASE_URL;

export default function StaffManagementScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme() ?? "light";
  const colors = Colors[colorScheme];

  const [staff, setStaff] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const fetchStaff = async () => {
    try {
      const token = await Storage.getItem("access_token");
      const response = await axios.get(`${API_BASE_URL}/users`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setStaff(response.data);
    } catch (error) {
      console.error("Fetch staff error:", error);
      Alert.alert("Xato", "Xodimlarni yuklashda xatolik yuz berdi");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchStaff();
    }, []),
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchStaff();
  };

  const toggleStatus = async (id: string, currentStatus: boolean) => {
    try {
      const token = await Storage.getItem("access_token");
      await axios.patch(
        `${API_BASE_URL}/users/${id}`,
        { isActive: !currentStatus },
        { headers: { Authorization: `Bearer ${token}` } },
      );
      fetchStaff();
    } catch {
      Alert.alert("Xato", "Statusni o'zgartirishda xatolik");
    }
  };

  const deleteStaff = (id: string) => {
    Alert.alert("O'chirish", "Haqiqatan ham bu xodimni o'chirmoqchimisiz?", [
      { text: "Bekor qilish", style: "cancel" },
      {
        text: "O'chirish",
        style: "destructive",
        onPress: async () => {
          try {
            const token = await Storage.getItem("access_token");
            await axios.delete(`${API_BASE_URL}/users/${id}`, {
              headers: { Authorization: `Bearer ${token}` },
            });
            fetchStaff();
          } catch {
            Alert.alert("Xato", "O'chirishda xatolik");
          }
        },
      },
    ]);
  };

  const filteredStaff = staff.filter(
    (s) =>
      s.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.phone.includes(searchQuery),
  );

  const activeCount = staff.filter((s) => s.isActive).length;
  const inactiveCount = staff.length - activeCount;

  const StaffCard = ({ item }: { item: any }) => (
    <View style={[styles.staffCard, { backgroundColor: colors.card }]}>
      <View style={styles.staffHeader}>
        <View style={{ flex: 1 }}>
          <View style={styles.nameRow}>
            <Text
              style={[styles.staffName, { color: colors.text }]}
              numberOfLines={1}
            >
              {item.fullName}
            </Text>
            {item.isActive && (
              <MaterialCommunityIcons
                name="check-decagram"
                size={16}
                color={colors.success}
              />
            )}
          </View>
          <View
            style={[
              styles.roleBadge,
              { backgroundColor: colors.accent + "15" },
            ]}
          >
            <Text
              style={[styles.roleText, { color: colors.accent }]}
              numberOfLines={1}
            >
              {item.role.charAt(0).toUpperCase() + item.role.slice(1)}
            </Text>
          </View>
        </View>
        <View
          style={[
            styles.statusBadge,
            {
              backgroundColor: item.isActive
                ? colors.success + "15"
                : colors.danger + "15",
            },
          ]}
        >
          <Text
            style={[
              styles.statusText,
              { color: item.isActive ? colors.success : colors.danger },
            ]}
          >
            {item.isActive ? t.activeStaff : t.inactive}
          </Text>
        </View>
      </View>

      <View style={styles.contactInfo}>
        <View style={styles.contactRow}>
          <MaterialCommunityIcons
            name="phone-outline"
            size={16}
            color={colors.secondary}
          />
          <Text style={[styles.contactText, { color: colors.secondary }]}>
            {item.phone}
          </Text>
        </View>
      </View>

      <View style={styles.actions}>
        <TouchableOpacity
          style={[
            styles.deactivateButton,
            { backgroundColor: item.isActive ? colors.input : colors.success },
          ]}
          onPress={() => toggleStatus(item._id, item.isActive)}
        >
          <Text
            style={[
              styles.deactivateText,
              { color: item.isActive ? colors.text : "white" },
            ]}
          >
            {item.isActive ? "Kemadi" : "Keldi"}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.editButton, { backgroundColor: colors.accent + "15" }]}
          onPress={() =>
            router.push({
              pathname: "/create-staff",
              params: {
                id: item._id,
                fullName: item.fullName,
                phone: item.phone,
                role: item.role,
              },
            })
          }
        >
          <MaterialCommunityIcons
            name="pencil-outline"
            size={20}
            color={colors.accent}
          />
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.deleteButton,
            { backgroundColor: colors.danger + "15" },
          ]}
          onPress={() => deleteStaff(item._id)}
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
        <View style={styles.headerTitleRow}>
          <View style={[styles.titleIcon, { backgroundColor: colors.accent }]}>
            <MaterialCommunityIcons
              name="account-group"
              size={24}
              color="white"
            />
          </View>
          <View>
            <Text style={[styles.headerTitle, { color: colors.text }]}>
              {t.title}
            </Text>
            <Text style={[styles.headerSubtitle, { color: colors.secondary }]}>
              {t.totalStaff.replace("{count}", staff.length.toString())}
            </Text>
          </View>
        </View>
        <TouchableOpacity
          onPress={() => router.push("/create-staff")}
          style={[styles.addButton, { backgroundColor: colors.primary }]}
        >
          <MaterialCommunityIcons name="plus" size={24} color="white" />
        </TouchableOpacity>
      </View>

      <View style={styles.searchContainer}>
        <View
          style={[
            styles.searchBar,
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}
        >
          <MaterialCommunityIcons
            name="magnify"
            size={20}
            color={colors.secondary}
          />
          <TextInput
            placeholder={t.searchPlaceholder}
            placeholderTextColor={colors.secondary}
            style={[styles.searchInput, { color: colors.text }]}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
      </View>

      <View style={styles.statsRow}>
        <View
          style={[
            styles.statBox,
            {
              backgroundColor: colors.success + "05",
              borderColor: colors.success + "20",
            },
          ]}
        >
          <Text style={[styles.statValue, { color: colors.success }]}>
            {activeCount}
          </Text>
          <Text style={[styles.statLabel, { color: colors.success }]}>
            Aktiv
          </Text>
        </View>
        <View
          style={[
            styles.statBox,
            {
              backgroundColor: colors.danger + "05",
              borderColor: colors.danger + "20",
            },
          ]}
        >
          <Text style={[styles.statValue, { color: colors.danger }]}>
            {inactiveCount}
          </Text>
          <Text style={[styles.statLabel, { color: colors.danger }]}>
            Kemaganlar
          </Text>
        </View>
        <TouchableOpacity
          style={[
            styles.statBox,
            {
              backgroundColor: colors.primary + "10",
              borderColor: colors.primary + "30",
            },
          ]}
          onPress={() => {
            const allActive = staff.every((s) => s.isActive);
            Alert.alert(
              allActive ? "Barcha kemadi" : "Barcha keldi",
              `Haqiqatan ham barcha xodimlarni ${
                allActive ? "kemadi" : "keldi"
              } deb belgilamoqchimisiz?`,
              [
                { text: "Bekor qilish", style: "cancel" },
                {
                  text: allActive ? "Ha, kemadi" : "Ha, keldi",
                  onPress: async () => {
                    try {
                      const token = await Storage.getItem("access_token");
                      await axios.patch(
                        `${API_BASE_URL}/users/bulk-status`,
                        { isActive: !allActive },
                        { headers: { Authorization: `Bearer ${token}` } },
                      );
                      fetchStaff();
                    } catch {
                      Alert.alert("Xato", "Amalni bajarib bo'lmadi");
                    }
                  },
                },
              ],
            );
          }}
        >
          <MaterialCommunityIcons
            name={
              staff.every((s) => s.isActive)
                ? "account-off-outline"
                : "account-check-outline"
            }
            size={24}
            color={colors.primary}
          />
          <Text style={[styles.statLabel, { color: colors.primary }]}>
            {staff.every((s) => s.isActive) ? "Barcha kemadi" : "Barcha keldi"}
          </Text>
        </TouchableOpacity>
      </View>

      {loading && !refreshing ? (
        <ActivityIndicator size="large" color={colors.primary} />
      ) : (
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        >
          {filteredStaff.map((item) => (
            <StaffCard key={item._id} item={item} />
          ))}
          {filteredStaff.length === 0 && (
            <View style={{ alignItems: "center", marginTop: 40 }}>
              <Text style={{ color: colors.secondary }}>
                Xodimlar topilmadi
              </Text>
            </View>
          )}
          <View style={styles.bottomSpace} />
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 15,
  },
  backButton: {
    padding: 8,
    marginRight: 12,
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
  headerTitle: {
    fontSize: 20,
    fontWeight: "bold",
  },
  headerSubtitle: {
    fontSize: 13,
  },
  addButton: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  searchContainer: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    height: 50,
    borderRadius: 16,
    borderWidth: 1,
  },
  searchInput: {
    flex: 1,
    marginLeft: 10,
    fontSize: 15,
  },
  statsRow: {
    flexDirection: "row",
    paddingHorizontal: 20,
    gap: 16,
    marginBottom: 20,
  },
  statBox: {
    flex: 1,
    height: 80,
    borderRadius: 20,
    borderWidth: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  statValue: {
    fontSize: 24,
    fontWeight: "bold",
  },
  statLabel: {
    fontSize: 13,
    fontWeight: "600",
  },
  scrollContent: {
    paddingHorizontal: 20,
  },
  staffCard: {
    borderRadius: 24,
    padding: 20,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  staffHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 16,
  },
  nameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 6,
  },
  staffName: {
    fontSize: 18,
    fontWeight: "bold",
  },
  roleBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    alignSelf: "flex-start",
  },
  roleText: {
    fontSize: 12,
    fontWeight: "700",
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  statusText: {
    fontSize: 12,
    fontWeight: "bold",
  },
  contactInfo: {
    gap: 8,
    marginBottom: 20,
  },
  contactRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  contactText: {
    fontSize: 14,
  },
  actions: {
    flexDirection: "row",
    gap: 10,
  },
  deactivateButton: {
    flex: 1,
    height: 48,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  deactivateText: {
    fontSize: 14,
    fontWeight: "bold",
  },
  editButton: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  deleteButton: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  bottomSpace: {
    height: 40,
  },
});
