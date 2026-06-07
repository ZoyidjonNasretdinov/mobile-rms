import React, { useState, useEffect } from "react";
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  Alert,
  ScrollView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { useRouter } from "expo-router";
import { Translations } from "@/constants/translations";
import { Storage } from "@/utils/storage";
import axios from "axios";
import { CONFIG } from "@/constants/config";

const t = Translations.uz.profile;
const common = Translations.uz.common;

export default function ProfileScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme() ?? "light";
  const colors = Colors[colorScheme];
  const [hasPin, setHasPin] = useState(false);
  const [user, setUser] = useState<any>(null);
  const pinTrans = Translations.uz.pin;


  useEffect(() => {
    const checkPin = async () => {
      const pin = await Storage.getItem("app_pin");
      setHasPin(!!pin);
    };
    const getUser = async () => {
      const userStr = await Storage.getItem("user");
      if (userStr) {
        setUser(JSON.parse(userStr));
      }
    };
    getUser();
    checkPin();
  }, []);

  const handleRemovePin = async () => {
    Alert.alert(pinTrans.remove, "Haqiqatan ham PIN-kodni o'chirmoqchimisiz?", [
      { text: common.cancel, style: "cancel" },
      {
        text: common.delete,
        style: "destructive",
        onPress: async () => {
          await Storage.removeItem("app_pin");
          setHasPin(false);
          Alert.alert("Muvaffaqiyatli", "PIN-kod o'chirildi");
        },
      },
    ]);
  };

  const handleLogout = async () => {
    try {
      await Storage.removeItem("access_token");
      await Storage.removeItem("user");
      router.replace("/login");
    } catch {
      Alert.alert(common.error, "Tizimdan chiqishda xato yuz berdi");
    }
  };


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
        <Text style={[styles.headerTitle, { color: colors.text }]}>
          {t.title}
        </Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={[styles.profileCard, { backgroundColor: colors.card }]}>
          <View style={[styles.avatar, { backgroundColor: colors.primary }]}>
            <MaterialCommunityIcons name="account" size={50} color="white" />
          </View>
          <Text style={[styles.userName, { color: colors.text }]}>
            {user?.fullName || "Foydalanuvchi"}
          </Text>
          <Text style={[styles.userRole, { color: colors.secondary }]}>
            {user?.role?.toUpperCase()}
          </Text>
          <Text style={[styles.userPhone, { color: colors.secondary }]}>
            {user?.phone}
          </Text>
        </View>

        <View style={styles.section}>
          <TouchableOpacity
            style={[styles.menuItem, { backgroundColor: colors.card }]}
            onPress={() => (hasPin ? handleRemovePin() : router.push("/pin-setup"))}
          >
            <View style={styles.menuItemLeft}>
              <MaterialCommunityIcons
                name="shield-lock-outline"
                size={24}
                color={colors.primary}
              />
              <Text style={[styles.menuText, { color: colors.text }]}>
                {hasPin ? pinTrans.remove : pinTrans.setup}
              </Text>
            </View>
            <MaterialCommunityIcons
              name={hasPin ? "trash-can-outline" : "chevron-right"}
              size={24}
              color={hasPin ? colors.danger : colors.border}
            />
          </TouchableOpacity>

          {hasPin && (
            <TouchableOpacity
              style={[styles.menuItem, { backgroundColor: colors.card }]}
              onPress={() => router.push("/pin-setup")}
            >
              <View style={styles.menuItemLeft}>
                <MaterialCommunityIcons
                  name="shield-edit-outline"
                  size={24}
                  color={colors.primary}
                />
                <Text style={[styles.menuText, { color: colors.text }]}>
                  PIN-kodni yangilash
                </Text>
              </View>
              <MaterialCommunityIcons
                name="chevron-right"
                size={24}
                color={colors.border}
              />
            </TouchableOpacity>
          )}

          {user?.role === "owner" && (
            <TouchableOpacity
              style={[styles.menuItem, { backgroundColor: colors.card }]}
              onPress={() => router.push("/system-settings")}
            >
              <View style={styles.menuItemLeft}>
                <MaterialCommunityIcons
                  name="cog-outline"
                  size={24}
                  color={colors.primary}
                />
                <Text style={[styles.menuText, { color: colors.text }]}>
                  Tizim Sozlamalari
                </Text>
              </View>
              <MaterialCommunityIcons
                name="chevron-right"
                size={24}
                color={colors.border}
              />
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={[styles.menuItem, { backgroundColor: colors.card }]}
            onPress={() => router.push("/privacy-policy")}
          >
            <View style={styles.menuItemLeft}>
              <MaterialCommunityIcons
                name="shield-check-outline"
                size={24}
                color={colors.primary}
              />
              <Text style={[styles.menuText, { color: colors.text }]}>
                {t.privacyPolicy}
              </Text>
            </View>
            <MaterialCommunityIcons
              name="chevron-right"
              size={24}
              color={colors.border}
            />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.menuItem, { backgroundColor: colors.card }]}
            onPress={handleLogout}
          >
            <View style={styles.menuItemLeft}>
              <MaterialCommunityIcons
                name="logout"
                size={24}
                color={colors.warning}
              />
              <Text style={[styles.menuText, { color: colors.text }]}>
                {t.logout}
              </Text>
            </View>
          </TouchableOpacity>


        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 15,
  },
  backButton: { padding: 8, marginRight: 12 },
  headerTitle: { fontSize: 20, fontWeight: "bold" },
  content: { padding: 20 },
  profileCard: {
    padding: 30,
    borderRadius: 20,
    alignItems: "center",
    marginBottom: 20,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  avatar: {
    width: 90,
    height: 90,
    borderRadius: 45,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 15,
  },
  userName: { fontSize: 22, fontWeight: "bold", marginBottom: 5 },
  userRole: { fontSize: 14, fontWeight: "600", marginBottom: 5 },
  userPhone: { fontSize: 16 },
  section: { gap: 12 },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 18,
    borderRadius: 15,
    elevation: 1,
  },
  menuItemLeft: { flexDirection: "row", alignItems: "center", gap: 15 },
  menuText: { fontSize: 16, fontWeight: "600" },
});
