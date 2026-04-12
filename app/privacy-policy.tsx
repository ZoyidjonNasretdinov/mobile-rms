import React from "react";
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { useRouter } from "expo-router";
import { Translations } from "@/constants/translations";

const t = Translations.uz.profile;

export default function PrivacyPolicyScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme() ?? "light";
  const colors = Colors[colorScheme];

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
          {t.privacyPolicy}
        </Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <Text style={[styles.title, { color: colors.text }]}>
          Maxfiylik Siyosati
        </Text>
        <Text style={[styles.date, { color: colors.secondary }]}>
          Oxirgi yangilanish: 12-aprel, 2026
        </Text>

        <Text style={[styles.paragraph, { color: colors.text }]}>
          Ushbu maxfiylik siyosati "RMS" (Restaurant Management System) mobil
          ilovasi orqali to'planadigan ma'lumotlar va ulardan foydalanish
          tartibini tushuntiradi.
        </Text>

        <Text style={[styles.sectionTitle, { color: colors.text }]}>
          1. Ma'lumotlarni to'plash
        </Text>
        <Text style={[styles.paragraph, { color: colors.text }]}>
          Ilova siz tizimdan foydalanganingizda quyidagi ma'lumotlarni to'plashi
          mumkin:
          {"\n"}• Ism va familiya (xodimlarni identifikatsiya qilish uchun)
          {"\n"}• Telefon raqami (kirish uchun)
          {"\n"}• Lavozim (huquqlarni belgilash uchun)
        </Text>

        <Text style={[styles.sectionTitle, { color: colors.text }]}>
          2. Ma'lumotlardan foydalanish
        </Text>
        <Text style={[styles.paragraph, { color: colors.text }]}>
          To'plangan ma'lumotlar faqat restoran ichki operatsiyalarini
          boshqarish va xavfsizlikni ta'minlash maqsadida ishlatiladi.
          Ma'lumotlar tashqi shaxslarga sotilmaydi yoki ulashilmaydi.
        </Text>

        <Text style={[styles.sectionTitle, { color: colors.text }]}>
          3. Ma'lumotlarni o'chirish
        </Text>
        <Text style={[styles.paragraph, { color: colors.text }]}>
          Foydalanuvchi istalgan vaqtda o'z hisobini "Profil" bo'limi orqali
          o'chirishi mumkin. Hisob o'chirilganda foydalanuvchining barcha
          shaxsiy ma'lumotlari tizimdan butunlay o'chiriladi.
        </Text>

        <Text style={[styles.sectionTitle, { color: colors.text }]}>
          4. Xavfsizlik
        </Text>
        <Text style={[styles.paragraph, { color: colors.text }]}>
          Biz sizning ma'lumotlaringizni himoya qilish uchun zamonaviy shifrlash
          texnologiyalaridan foydalanamiz.
        </Text>

        <Text
          style={[styles.paragraph, { color: colors.secondary, marginTop: 20 }]}
        >
          Savollaringiz bo'lsa, tizim administratori bilan bog'laning.
        </Text>
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
  title: { fontSize: 24, fontWeight: "bold", marginBottom: 10 },
  date: { fontSize: 14, marginBottom: 20 },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginTop: 20,
    marginBottom: 10,
  },
  paragraph: { fontSize: 16, lineHeight: 24, color: "#444" },
});
