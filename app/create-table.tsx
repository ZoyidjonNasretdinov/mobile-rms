import React, { useState, useEffect } from "react";
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { useRouter, useLocalSearchParams } from "expo-router";
import { Storage } from "@/utils/storage";
import axios from "axios";
import { CONFIG } from "@/constants/config";

const API_BASE_URL = CONFIG.API_BASE_URL;

export default function CreateTableScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const colorScheme = useColorScheme() ?? "light";
  const colors = Colors[colorScheme];

  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(false);

  const [number, setNumber] = useState("");
  const [capacity, setCapacity] = useState("");
  const [floor, setFloor] = useState("");

  useEffect(() => {
    if (id) {
      setFetching(true);
      const fetchTable = async () => {
        try {
          const token = await Storage.getItem("access_token");
          const response = await axios.get(`${API_BASE_URL}/tables/${id}`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          const table = response.data;
          setNumber(table.number);
          setCapacity(table.capacity.toString());
          if (table.floor) setFloor(table.floor.toString());
        } catch (error) {
          Alert.alert("Xato", "Ma'lumotlarni yuklashda xatolik");
        } finally {
          setFetching(false);
        }
      };
      fetchTable();
    }
  }, [id]);

  const handleSave = async () => {
    if (!number || !capacity) {
      Alert.alert("Xato", "Barcha maydonlarni to'ldiring");
      return;
    }

    setLoading(true);
    try {
      const token = await Storage.getItem("access_token");
      const data = {
        number,
        capacity: parseInt(capacity),
        floor: floor ? parseInt(floor) : undefined,
      };

      if (id) {
        await axios.put(`${API_BASE_URL}/tables/${id}`, data, {
          headers: { Authorization: `Bearer ${token}` },
        });
      } else {
        await axios.post(`${API_BASE_URL}/tables`, data, {
          headers: { Authorization: `Bearer ${token}` },
        });
      }
      router.back();
    } catch (error: any) {
      Alert.alert(
        "Xato",
        error.response?.data?.message || "Saqlashda xatolik yuz berdi",
      );
    } finally {
      setLoading(false);
    }
  };

  if (fetching) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

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
          {id ? "Stolni tahrirlash" : "Yangi stol qo'shish"}
        </Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.inputGroup}>
          <Text style={[styles.label, { color: colors.secondary }]}>
            Stol raqami
          </Text>
          <View style={[styles.inputBox, { backgroundColor: colors.card }]}>
            <TextInput
              style={[styles.input, { color: colors.text }]}
              placeholder="Masalan: 5"
              placeholderTextColor={colors.secondary}
              value={number}
              onChangeText={setNumber}
              keyboardType="number-pad"
            />
          </View>
        </View>

        <View style={styles.inputGroup}>
          <Text style={[styles.label, { color: colors.secondary }]}>
            {"Sig'imi (kishi)"}
          </Text>
          <View style={[styles.inputBox, { backgroundColor: colors.card }]}>
            <TextInput
              style={[styles.input, { color: colors.text }]}
              placeholder="Masalan: 4"
              placeholderTextColor={colors.secondary}
              value={capacity}
              onChangeText={setCapacity}
              keyboardType="number-pad"
            />
          </View>
        </View>

        <View style={styles.inputGroup}>
          <Text style={[styles.label, { color: colors.secondary }]}>Qavat</Text>
          <View style={[styles.inputBox, { backgroundColor: colors.card }]}>
            <TextInput
              style={[styles.input, { color: colors.text }]}
              placeholder="Masalan: 1"
              placeholderTextColor={colors.secondary}
              value={floor}
              onChangeText={setFloor}
              keyboardType="number-pad"
            />
          </View>
        </View>

        <TouchableOpacity
          style={[styles.saveButton, { backgroundColor: colors.primary }]}
          onPress={handleSave}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <MaterialCommunityIcons name="check" size={24} color="#fff" />
              <Text style={styles.saveButtonText}>Saqlash</Text>
            </>
          )}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: "row", alignItems: "center", padding: 20, gap: 15 },
  backButton: { padding: 8 },
  headerTitle: { fontSize: 20, fontWeight: "bold" },
  content: { padding: 20 },
  inputGroup: { marginBottom: 20 },
  label: { fontSize: 14, fontWeight: "600", marginBottom: 8, marginLeft: 4 },
  inputBox: {
    height: 56,
    borderRadius: 16,
    paddingHorizontal: 16,
    justifyContent: "center",
  },
  input: { fontSize: 16, fontWeight: "500" },
  saveButton: {
    height: 56,
    borderRadius: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    marginTop: 20,
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
  },
  saveButtonText: { color: "#fff", fontSize: 18, fontWeight: "bold" },
  centered: { flex: 1, justifyContent: "center", alignItems: "center" },
});
