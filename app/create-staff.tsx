import React, { useState, useEffect } from "react";
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  TextInput,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator,
} from "react-native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { useRouter, useLocalSearchParams } from "expo-router";
import { Translations } from "@/constants/translations";
import { Storage } from "@/utils/storage";
import axios from "axios";

const t = Translations.uz.staff;
const API_BASE_URL = "http://192.168.43.160:3000";

export default function CreateStaffScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const isEditing = !!params.id;

  const colorScheme = useColorScheme() ?? "light";
  const colors = Colors[colorScheme];
  const insets = useSafeAreaInsets();

  const [form, setForm] = useState({
    fullName: (params.fullName as string) || "",
    phone: (params.phone as string) || "",
    password: "",
    role: (params.role as string) || "",
  });
  const [loading, setLoading] = useState(false);

  const roles = [
    { label: Translations.uz.auth.waiter, value: "ofisiant" },
    { label: "Oshpaz", value: "oshpaz" },
    { label: "Shashlikchi", value: "shashlikchi" },
    { label: "Salatchi", value: "salatchi" },
    { label: "Barman", value: "bar" },
  ];

  const handleSubmit = async () => {
    if (
      !form.fullName ||
      !form.phone ||
      (!isEditing && !form.password) ||
      !form.role
    ) {
      Alert.alert("Xato", "Barcha maydonlarni to'ldiring");
      return;
    }

    setLoading(true);
    try {
      const token = await Storage.getItem("access_token");
      const normalizedPhone = form.phone.replace(/\D/g, "");

      if (isEditing) {
        const updateData: any = {
          fullName: form.fullName,
          phone: normalizedPhone,
          role: form.role,
        };
        if (form.password) updateData.password = form.password;

        await axios.patch(`${API_BASE_URL}/users/${params.id}`, updateData, {
          headers: { Authorization: `Bearer ${token}` },
        });
        Alert.alert("Muvaffaqiyat", "Xodim ma'lumotlari yangilandi");
      } else {
        await axios.post(
          `${API_BASE_URL}/users`,
          {
            ...form,
            phone: normalizedPhone,
          },
          {
            headers: { Authorization: `Bearer ${token}` },
          },
        );
        Alert.alert("Muvaffaqiyat", "Yangi xodim qo'shildi");
      }
      router.back();
    } catch (error: any) {
      console.error("Staff save error:", error);
      const msg = error.response?.data?.message || "Xatolik yuz berdi";
      Alert.alert("Xato", msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
      edges={["top", "left", "right"]}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
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
            {isEditing ? "Xodimni tahrirlash" : t.addStaff}
          </Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.infoBox}>
            <MaterialCommunityIcons
              name="information-outline"
              size={20}
              color={colors.accent}
            />
            <Text style={[styles.infoText, { color: colors.secondary }]}>
              {isEditing
                ? "Kerakli maydonlarni o'zgartiring. Parolni bo'sh qoldirsangiz, u o'zgarmaydi."
                : Translations.uz.auth.loginSubtitle}
            </Text>
          </View>

          <View style={styles.formContainer}>
            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: colors.text }]}>
                {t.fullName}
              </Text>
              <View
                style={[
                  styles.inputWrapper,
                  { backgroundColor: colors.card, borderColor: colors.border },
                ]}
              >
                <MaterialCommunityIcons
                  name="account-outline"
                  size={20}
                  color={colors.secondary}
                />
                <TextInput
                  style={[styles.input, { color: colors.text }]}
                  placeholder="Masalan: Aziz Rahimov"
                  placeholderTextColor={colors.secondary}
                  value={form.fullName}
                  onChangeText={(val) => setForm({ ...form, fullName: val })}
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: colors.text }]}>
                Telefon raqam
              </Text>
              <View
                style={[
                  styles.inputWrapper,
                  { backgroundColor: colors.card, borderColor: colors.border },
                ]}
              >
                <MaterialCommunityIcons
                  name="phone-outline"
                  size={20}
                  color={colors.secondary}
                />
                <TextInput
                  style={[styles.input, { color: colors.text }]}
                  placeholder="+998 90 123 45 67"
                  keyboardType="phone-pad"
                  placeholderTextColor={colors.secondary}
                  value={form.phone}
                  onChangeText={(val) => setForm({ ...form, phone: val })}
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: colors.text }]}>
                {t.password}
              </Text>
              <View
                style={[
                  styles.inputWrapper,
                  { backgroundColor: colors.card, borderColor: colors.border },
                ]}
              >
                <MaterialCommunityIcons
                  name="lock-outline"
                  size={20}
                  color={colors.secondary}
                />
                <TextInput
                  style={[styles.input, { color: colors.text }]}
                  placeholder={
                    isEditing ? "O'zgartirish uchun kiriting" : "••••••••"
                  }
                  secureTextEntry
                  placeholderTextColor={colors.secondary}
                  value={form.password}
                  onChangeText={(val) => setForm({ ...form, password: val })}
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: colors.text }]}>
                {t.selectRole}
              </Text>
              <View style={styles.rolesGrid}>
                {roles.map((item) => (
                  <TouchableOpacity
                    key={item.value}
                    onPress={() => setForm({ ...form, role: item.value })}
                    style={[
                      styles.roleBtn,
                      {
                        backgroundColor:
                          form.role === item.value
                            ? colors.accent + "20"
                            : colors.card,
                        borderColor:
                          form.role === item.value
                            ? colors.accent
                            : colors.border,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.roleBtnText,
                        {
                          color:
                            form.role === item.value
                              ? colors.accent
                              : colors.text,
                        },
                      ]}
                    >
                      {item.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </View>
        </ScrollView>

        <View
          style={[
            styles.footer,
            { paddingBottom: Math.max(insets.bottom, 20) },
          ]}
        >
          <TouchableOpacity
            style={[styles.submitBtn, { backgroundColor: colors.primary }]}
            onPress={handleSubmit}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text style={styles.submitBtnText}>
                {isEditing ? "Saqlash" : t.submit}
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
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
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 15,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "bold",
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 40,
  },
  infoBox: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderRadius: 12,
    backgroundColor: "rgba(0,0,0,0.03)",
    marginBottom: 24,
    gap: 10,
  },
  infoText: {
    fontSize: 13,
    flex: 1,
  },
  formContainer: {
    gap: 20,
  },
  inputGroup: {
    gap: 8,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    height: 56,
    borderRadius: 16,
    borderWidth: 1,
    gap: 12,
  },
  input: {
    flex: 1,
    fontSize: 16,
  },
  rolesGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginTop: 4,
  },
  roleBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1.5,
  },
  roleBtnText: {
    fontSize: 14,
    fontWeight: "bold",
  },
  footer: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: "rgba(0,0,0,0.05)",
  },
  submitBtn: {
    height: 56,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
  },
  submitBtnText: {
    color: "white",
    fontSize: 16,
    fontWeight: "bold",
  },
});
