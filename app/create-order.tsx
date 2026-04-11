import React, { useState, useEffect } from "react";
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { Storage } from "@/utils/storage";
import { Translations } from "@/constants/translations";
import axios from "axios";

const API_BASE_URL = "http://192.168.43.160:3000";

export default function CreateOrderScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { tableId, tableName, orderId } = params;
  const colorScheme = useColorScheme() ?? "light";
  const colors = Colors[colorScheme];

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [categories, setCategories] = useState<any[]>([]);
  const [items, setItems] = useState<any[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [cart, setCart] = useState<{ [key: string]: any }>({});
  const [originalQuantities, setOriginalQuantities] = useState<{
    [key: string]: number;
  }>({});

  useEffect(() => {
    const fetchData = async () => {
      try {
        const token = await Storage.getItem("access_token");
        const [catsRes, itemsRes] = await Promise.all([
          axios.get(`${API_BASE_URL}/menu/categories`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
          axios.get(`${API_BASE_URL}/menu/items`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
        ]);

        setCategories(catsRes.data);
        setItems(itemsRes.data);
        if (catsRes.data.length > 0) {
          setSelectedCategory(catsRes.data[0]._id);
        }

        // If editing an existing order, load its items
        if (orderId) {
          const orderRes = await axios.get(`${API_BASE_URL}/orders`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          const existingOrder = orderRes.data.find(
            (o: any) => o._id === orderId,
          );
          if (existingOrder) {
            const initialCart: { [key: string]: any } = {};
            const initialOrig: { [key: string]: number } = {};
            existingOrder.items.forEach((item: any, idx: number) => {
              const menuItem = itemsRes.data.find(
                (mi: any) => mi.name === item.name,
              );
              const itemId = menuItem?._id || `old-${idx}`;
              initialCart[itemId] = {
                _id: itemId,
                name: item.name,
                price: item.price,
                quantity: item.quantity,
                categoryId: menuItem?.categoryId,
              };
              initialOrig[itemId] = item.quantity;
            });
            setCart(initialCart);
            setOriginalQuantities(initialOrig);
          }
        }
      } catch (error) {
        console.error("Fetch menu error:", error);
        Alert.alert("Xatolik", "Menu ma'lumotlarini yuklab bo'lmadi");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [orderId]);

  const updateQuantity = (item: any, delta: number) => {
    const newCart = { ...cart };
    const originalQty = originalQuantities[item._id] || 0;

    if (!newCart[item._id]) {
      if (delta > 0) {
        newCart[item._id] = { ...item, quantity: delta };
      }
    } else {
      const currentQty = newCart[item._id].quantity;
      if (delta < 0 && currentQty <= originalQty) {
        Alert.alert("Cheklov", "Avvalgi buyurtmani kamaytirib bo'lmaydi");
        return;
      }
      newCart[item._id].quantity += delta;
      if (newCart[item._id].quantity <= 0) {
        delete newCart[item._id];
      }
    }
    setCart(newCart);
  };

  const calculateTotal = () => {
    return Object.values(cart).reduce(
      (sum, item) => sum + item.price * item.quantity,
      0,
    );
  };

  const handleSaveOrder = async () => {
    const cartItems = Object.values(cart);
    if (cartItems.length === 0) {
      Alert.alert("Xatolik", "Kamida bitta mahsulot tanlang");
      return;
    }

    setSaving(true);
    try {
      const token = await Storage.getItem("access_token");
      const userStr = await Storage.getItem("user");
      const user = userStr ? JSON.parse(userStr) : null;

      const orderData = {
        tableId,
        tableName,
        items: cartItems.map((item) => ({
          name: item.name,
          quantity: item.quantity,
          price: item.price,
        })),
        waiterId: user?._id,
        waiterName: user?.fullName,
        totalAmount: calculateTotal(),
        status: "Active",
      };

      if (orderId) {
        await axios.put(`${API_BASE_URL}/orders/${orderId}`, orderData, {
          headers: { Authorization: `Bearer ${token}` },
        });
      } else {
        await axios.post(`${API_BASE_URL}/orders`, orderData, {
          headers: { Authorization: `Bearer ${token}` },
        });
      }

      Alert.alert("Muvaffaqiyatli", "Buyurtma saqlandi", [
        { text: "OK", onPress: () => router.back() },
      ]);
    } catch (error) {
      console.error("Save order error:", error);
      Alert.alert("Xatolik", "Buyurtmani saqlashda xatolik yuz berdi");
    } finally {
      setSaving(false);
    }
  };

  const filteredItems = items.filter(
    (item) =>
      (selectedCategory ? item.categoryId?._id === selectedCategory : true) &&
      item.name.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  if (loading) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
    >
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <MaterialCommunityIcons
            name="arrow-left"
            size={24}
            color={colors.text}
          />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.text }]}>
          {tableName}-stol : Yangi buyurtma
        </Text>
      </View>

      <View style={styles.searchContainer}>
        <View style={[styles.searchInputRow, { backgroundColor: colors.card }]}>
          <MaterialCommunityIcons
            name="magnify"
            size={20}
            color={colors.secondary}
          />
          <TextInput
            placeholder="Qidirish..."
            style={[styles.searchInput, { color: colors.text }]}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
      </View>

      <View style={styles.categoryContainer}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoryScroll}
        >
          {categories.map((cat) => (
            <TouchableOpacity
              key={cat._id}
              style={[
                styles.categoryItem,
                selectedCategory === cat._id && {
                  backgroundColor: colors.primary,
                  borderColor: colors.primary,
                },
              ]}
              onPress={() => setSelectedCategory(cat._id)}
            >
              <Text
                style={[
                  styles.categoryText,
                  selectedCategory === cat._id && { color: "white" },
                ]}
              >
                {cat.name}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <ScrollView contentContainerStyle={styles.itemsScroll}>
        <View style={styles.itemsGrid}>
          {filteredItems.map((item) => (
            <View
              key={item._id}
              style={[styles.itemCard, { backgroundColor: colors.card }]}
            >
              <View style={styles.itemInfo}>
                <Text style={[styles.itemName, { color: colors.text }]}>
                  {item.name}
                </Text>
                <Text style={[styles.itemPrice, { color: colors.primary }]}>
                  {item.price?.toLocaleString()} sūm
                </Text>
              </View>

              <View style={styles.qtyControls}>
                {cart[item._id] ? (
                  <>
                    <TouchableOpacity
                      onPress={() => updateQuantity(item, -1)}
                      style={[
                        styles.qtyBtn,
                        { backgroundColor: colors.primary + "20" },
                        cart[item._id].quantity <=
                          (originalQuantities[item._id] || 0) && {
                          opacity: 0.3,
                        },
                      ]}
                      disabled={
                        cart[item._id].quantity <=
                        (originalQuantities[item._id] || 0)
                      }
                    >
                      <MaterialCommunityIcons
                        name="minus"
                        size={18}
                        color={colors.primary}
                      />
                    </TouchableOpacity>
                    <Text style={[styles.qtyText, { color: colors.text }]}>
                      {cart[item._id].quantity}
                    </Text>
                  </>
                ) : null}
                <TouchableOpacity
                  onPress={() => updateQuantity(item, 1)}
                  style={[styles.qtyBtn, { backgroundColor: colors.primary }]}
                >
                  <MaterialCommunityIcons name="plus" size={18} color="white" />
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </View>
      </ScrollView>

      <View style={[styles.footer, { backgroundColor: colors.card }]}>
        <View style={styles.footerInfo}>
          <Text style={[styles.totalLabel, { color: colors.secondary }]}>
            Jami summa:
          </Text>
          <Text style={[styles.totalValue, { color: colors.text }]}>
            {calculateTotal().toLocaleString()}{" "}
            {Translations.uz.common.currency}
          </Text>
        </View>
        <TouchableOpacity
          style={[styles.saveBtn, { backgroundColor: colors.primary }]}
          onPress={handleSaveOrder}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text style={styles.saveBtnText}>Saqlash</Text>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  centered: { flex: 1, justifyContent: "center", alignItems: "center" },
  header: { flexDirection: "row", alignItems: "center", padding: 15, gap: 15 },
  backBtn: { padding: 5 },
  title: { fontSize: 18, fontWeight: "bold" },
  searchContainer: { paddingHorizontal: 20, marginBottom: 15 },
  searchInputRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 15,
    height: 48,
    borderRadius: 12,
    gap: 10,
  },
  searchInput: { flex: 1, fontSize: 15 },
  categoryContainer: { marginBottom: 15 },
  categoryScroll: { paddingHorizontal: 20, gap: 10 },
  categoryItem: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  categoryText: { fontSize: 14, fontWeight: "600", color: "#64748B" },
  itemsScroll: { paddingHorizontal: 20 },
  itemsGrid: { gap: 12, marginBottom: 100 },
  itemCard: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    borderRadius: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 1,
  },
  itemInfo: { flex: 1, gap: 4 },
  itemName: { fontSize: 16, fontWeight: "600" },
  itemPrice: { fontSize: 14, fontWeight: "bold" },
  qtyControls: { flexDirection: "row", alignItems: "center", gap: 12 },
  qtyBtn: {
    width: 32,
    height: 32,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  qtyText: {
    fontSize: 16,
    fontWeight: "bold",
    minWidth: 20,
    textAlign: "center",
  },
  footer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 20,
    paddingVertical: 20,
    borderTopWidth: 1,
    borderTopColor: "#E2E8F0",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  footerInfo: { gap: 2 },
  totalLabel: { fontSize: 12, fontWeight: "600" },
  totalValue: { fontSize: 18, fontWeight: "bold" },
  saveBtn: {
    paddingHorizontal: 30,
    height: 50,
    borderRadius: 15,
    justifyContent: "center",
    alignItems: "center",
  },
  saveBtnText: { color: "white", fontSize: 16, fontWeight: "bold" },
});
