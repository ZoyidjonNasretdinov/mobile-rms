import React, { useState, useEffect, useMemo } from "react";
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
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

const t = Translations.uz.procurement;
const common = Translations.uz.common;
const API_BASE_URL = "http://192.168.43.160:3000";

export default function ProcurementScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme() ?? "light";
  const colors = Colors[colorScheme];

  const [purchases, setPurchases] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState(common.all);

  const fetchData = async () => {
    try {
      const token = await Storage.getItem("access_token");
      const res = await axios.get(`${API_BASE_URL}/procurement`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setPurchases(res.data);
    } catch (error) {
      console.error("Fetch procurement error:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  const categories = useMemo(
    () => [
      { label: common.all, value: common.all },
      { label: t.categories.meat, value: "meat" },
      { label: t.categories.vegetables, value: "vegetables" },
      { label: t.categories.drinks, value: "drinks" },
      { label: t.categories.spices, value: "spices" },
    ],
    [],
  );

  const filteredPurchases = useMemo(() => {
    return purchases.filter((p) => {
      const matchesSearch = p.item
        .toLowerCase()
        .includes(searchQuery.toLowerCase());
      const matchesCategory =
        activeCategory === common.all || p.category === activeCategory;
      return matchesSearch && matchesCategory;
    });
  }, [searchQuery, activeCategory, purchases]);

  const totalToday = useMemo(() => {
    const today = new Date().toDateString();
    return purchases
      .filter((p) => new Date(p.date).toDateString() === today)
      .reduce((sum, p) => sum + p.price, 0);
  }, [purchases]);

  const PurchaseCard = ({
    _id,
    item,
    supplier,
    price,
    category,
    source,
    date,
    unit,
    quantity,
  }: any) => (
    <View style={[styles.purchaseCard, { backgroundColor: colors.card }]}>
      <View style={styles.purchaseHeader}>
        <View
          style={[
            styles.categoryIcon,
            { backgroundColor: colors.accent + "15" },
          ]}
        >
          <MaterialCommunityIcons
            name={
              category === "meat"
                ? "food-steak"
                : category === "drinks"
                  ? "bottle-wine"
                  : category === "vegetables"
                    ? "food-apple"
                    : "shaker-outline"
            }
            size={20}
            color={colors.accent}
          />
        </View>
        <View style={{ flex: 1, marginLeft: 12 }}>
          <Text style={[styles.itemName, { color: colors.text }]}>{item}</Text>
          <Text style={[styles.supplierName, { color: colors.secondary }]}>
            {quantity} {unit} • {supplier}
          </Text>
        </View>
        <Text style={[styles.priceText, { color: colors.text }]}>
          {price.toLocaleString()} {common.currency}
        </Text>
      </View>
      <View style={styles.purchaseFooter}>
        <View
          style={[styles.sourceBadge, { backgroundColor: colors.background }]}
        >
          <Text style={[styles.sourceText, { color: colors.secondary }]}>
            {t.paymentSource}:{" "}
            {t.sources[source as keyof typeof t.sources] || source} •{" "}
            {new Date(date).toLocaleDateString()}
          </Text>
        </View>
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
          <View style={[styles.titleIcon, { backgroundColor: colors.primary }]}>
            <MaterialCommunityIcons
              name="cart-outline"
              size={24}
              color="white"
            />
          </View>
          <View>
            <Text style={[styles.headerTitle, { color: colors.text }]}>
              {t.title}
            </Text>
            <Text style={[styles.headerSubtitle, { color: colors.secondary }]}>
              Bugun: {totalToday.toLocaleString()} {common.currency}
            </Text>
          </View>
        </View>
        <TouchableOpacity
          style={[styles.addButton, { backgroundColor: colors.primary }]}
          onPress={() => router.push("/create-procurement")}
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
            placeholder="Sotib olingan tovarni qidirish..."
            placeholderTextColor={colors.secondary}
            style={[styles.searchInput, { color: colors.text }]}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery !== "" && (
            <TouchableOpacity onPress={() => setSearchQuery("")}>
              <MaterialCommunityIcons
                name="close-circle"
                size={18}
                color={colors.secondary}
              />
            </TouchableOpacity>
          )}
        </View>
      </View>

      <View style={styles.categoryScroll}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoryContainer}
        >
          {categories.map((cat) => (
            <TouchableOpacity
              key={cat.value}
              onPress={() => setActiveCategory(cat.value)}
              style={[
                styles.categoryBtn,
                activeCategory === cat.value && {
                  backgroundColor: colors.primary,
                },
              ]}
            >
              <Text
                style={[
                  styles.categoryText,
                  activeCategory === cat.value
                    ? { color: "white" }
                    : { color: colors.secondary },
                ]}
              >
                {cat.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {loading ? (
          <ActivityIndicator
            size="large"
            color={colors.primary}
            style={{ marginTop: 40 }}
          />
        ) : filteredPurchases.length > 0 ? (
          filteredPurchases.map((p) => <PurchaseCard key={p._id} {...p} />)
        ) : (
          <View style={styles.emptyContainer}>
            <MaterialCommunityIcons
              name="cart-off"
              size={64}
              color={colors.border}
            />
            <Text style={[styles.emptyText, { color: colors.secondary }]}>
              Xaridlar topilmadi
            </Text>
          </View>
        )}
        <View style={styles.bottomSpace} />
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
  headerTitle: { fontSize: 18, fontWeight: "bold" },
  headerSubtitle: { fontSize: 12 },
  addButton: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  searchContainer: { paddingHorizontal: 20, marginBottom: 16 },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    height: 50,
    borderRadius: 16,
    borderWidth: 1,
  },
  searchInput: { flex: 1, marginLeft: 10, fontSize: 15 },
  categoryScroll: { marginBottom: 16 },
  categoryContainer: { paddingHorizontal: 20, gap: 10 },
  categoryBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: "rgba(0,0,0,0.03)",
  },
  categoryText: { fontSize: 13, fontWeight: "600" },
  scrollContent: { paddingHorizontal: 20 },
  purchaseCard: {
    padding: 16,
    borderRadius: 20,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  purchaseHeader: { flexDirection: "row", alignItems: "center" },
  categoryIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  itemName: { fontSize: 15, fontWeight: "bold" },
  supplierName: { fontSize: 12 },
  priceText: { fontSize: 15, fontWeight: "bold" },
  purchaseFooter: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "rgba(0,0,0,0.05)",
  },
  sourceBadge: {
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  sourceText: { fontSize: 11, fontWeight: "500" },
  emptyContainer: { alignItems: "center", marginTop: 60, gap: 16 },
  emptyText: { fontSize: 16, fontWeight: "600" },
  bottomSpace: { height: 100 },
});
