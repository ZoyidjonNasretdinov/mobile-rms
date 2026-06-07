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
  Modal,
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

const t = Translations.uz.procurement;
const common = Translations.uz.common;
const API_BASE_URL = CONFIG.API_BASE_URL;

export default function ProcurementScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme() ?? "light";
  const colors = Colors[colorScheme];

  const [purchases, setPurchases] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState(common.all);
  const [selectedPurchase, setSelectedPurchase] = useState<any>(null);
  const [showDetails, setShowDetails] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

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
    const today = new Date().toDateString();
    return purchases.filter((p) => {
      if (!showHistory) {
         if (new Date(p.date).toDateString() !== today) return false;
      }
      const matchesSearch = p.item
        .toLowerCase()
        .includes(searchQuery.toLowerCase());
      const matchesCategory =
        activeCategory === common.all || p.category === activeCategory;
      return matchesSearch && matchesCategory;
    });
  }, [searchQuery, activeCategory, purchases, showHistory]);

  const totalToday = useMemo(() => {
    const today = new Date().toDateString();
    return purchases
      .filter((p) => new Date(p.date).toDateString() === today)
      .reduce((sum, p) => sum + p.price, 0);
  }, [purchases]);

  const PurchaseCard = (p: any) => {
    const { _id, item, supplier, price, category, source, date, unit, quantity } = p;
    return (
      <TouchableOpacity 
        style={[styles.purchaseCard, { backgroundColor: colors.card }]}
        onPress={() => {
          setSelectedPurchase(p);
          setShowDetails(true);
        }}
        activeOpacity={0.7}
      >
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
              {quantity} {unit}{supplier ? ` • ${supplier}` : ""}
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
      </TouchableOpacity>
    );
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
        <View style={styles.headerTitleRow}>
          <View style={[styles.titleIcon, { backgroundColor: colors.primary }]}>
            <MaterialCommunityIcons
              name="cart-outline"
              size={24}
              color="white"
            />
          </View>
          <View style={{ flex: 1, paddingRight: 8 }}>
            <Text 
              style={[styles.headerTitle, { color: colors.text }]}
              numberOfLines={1}
            >
              {showHistory ? "Xaridlar tarixi" : t.title}
            </Text>
            <Text 
              style={[styles.headerSubtitle, { color: colors.secondary }]}
              numberOfLines={1}
            >
              Bugun: {totalToday.toLocaleString()} {common.currency}
            </Text>
          </View>
        </View>
        <View style={{ flexDirection: "row", gap: 12 }}>
          <TouchableOpacity
            style={[styles.addButton, { backgroundColor: showHistory ? colors.primary : colors.card, borderWidth: showHistory ? 0 : 1, borderColor: colors.border }]}
            onPress={() => setShowHistory(!showHistory)}
          >
            <MaterialCommunityIcons name="history" size={24} color={showHistory ? "white" : colors.text} />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.addButton, { backgroundColor: colors.primary }]}
            onPress={() => router.push("/create-procurement")}
          >
            <MaterialCommunityIcons name="plus" size={24} color="white" />
          </TouchableOpacity>
        </View>
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

      {/* Details Modal */}
      <Modal visible={showDetails} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.background }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>Xarid tafsilotlari</Text>
              <TouchableOpacity onPress={() => setShowDetails(false)} style={[styles.closeButton, { backgroundColor: colors.card }]}>
                <MaterialCommunityIcons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            {selectedPurchase && (
              <ScrollView contentContainerStyle={styles.modalScroll}>
                <View style={[styles.detailHeaderCard, { backgroundColor: colors.card }]}>
                  <View style={[styles.detailIcon, { backgroundColor: colors.primary + "15" }]}>
                    <MaterialCommunityIcons name="cart" size={32} color={colors.primary} />
                  </View>
                  <Text style={[styles.detailItemName, { color: colors.text }]}>{selectedPurchase.item}</Text>
                  <Text style={[styles.detailPrice, { color: colors.primary }]}>
                    {selectedPurchase.price.toLocaleString()} UZS
                  </Text>
                </View>

                <View style={styles.detailRowGroup}>
                  <View style={styles.detailRow}>
                    <MaterialCommunityIcons name="account" size={20} color={colors.secondary} style={styles.detailRowIcon} />
                    <View>
                      <Text style={[styles.detailLabel, { color: colors.secondary }]}>Sotib olgan (Manba)</Text>
                      <Text style={[styles.detailValue, { color: colors.text }]}>
                        {t.sources[selectedPurchase.source as keyof typeof t.sources] || selectedPurchase.source}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.detailRow}>
                    <MaterialCommunityIcons name="calendar" size={20} color={colors.secondary} style={styles.detailRowIcon} />
                    <View>
                      <Text style={[styles.detailLabel, { color: colors.secondary }]}>Sana va Vaqt</Text>
                      <Text style={[styles.detailValue, { color: colors.text }]}>
                        {new Date(selectedPurchase.date).toLocaleString()}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.detailRow}>
                    <MaterialCommunityIcons name="tag" size={20} color={colors.secondary} style={styles.detailRowIcon} />
                    <View>
                      <Text style={[styles.detailLabel, { color: colors.secondary }]}>Kategoriya</Text>
                      <Text style={[styles.detailValue, { color: colors.text }]}>
                        {selectedPurchase.category}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.detailRow}>
                    <MaterialCommunityIcons name="scale" size={20} color={colors.secondary} style={styles.detailRowIcon} />
                    <View>
                      <Text style={[styles.detailLabel, { color: colors.secondary }]}>Miqdori</Text>
                      <Text style={[styles.detailValue, { color: colors.text }]}>
                        {selectedPurchase.quantity} {selectedPurchase.unit}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.detailRow}>
                    <MaterialCommunityIcons name="cash" size={20} color={colors.secondary} style={styles.detailRowIcon} />
                    <View>
                      <Text style={[styles.detailLabel, { color: colors.secondary }]}>Birlik narxi</Text>
                      <Text style={[styles.detailValue, { color: colors.text }]}>
                        {selectedPurchase.quantity > 0 
                          ? (selectedPurchase.price / selectedPurchase.quantity).toLocaleString() 
                          : "0"} UZS
                      </Text>
                    </View>
                  </View>

                  {selectedPurchase.supplier ? (
                    <View style={styles.detailRow}>
                      <MaterialCommunityIcons name="map-marker" size={20} color={colors.secondary} style={styles.detailRowIcon} />
                      <View>
                        <Text style={[styles.detailLabel, { color: colors.secondary }]}>Joy / Yetkazib beruvchi</Text>
                        <Text style={[styles.detailValue, { color: colors.text }]}>
                          {selectedPurchase.supplier}
                        </Text>
                      </View>
                    </View>
                  ) : null}
                </View>
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
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
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    height: "80%",
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    padding: 24,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 24,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: "bold",
  },
  closeButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
  },
  modalScroll: {
    paddingBottom: 40,
  },
  detailHeaderCard: {
    alignItems: "center",
    padding: 24,
    borderRadius: 24,
    marginBottom: 24,
  },
  detailIcon: {
    width: 64,
    height: 64,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  detailItemName: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 8,
  },
  detailPrice: {
    fontSize: 24,
    fontWeight: "800",
  },
  detailRowGroup: {
    gap: 20,
    paddingHorizontal: 8,
  },
  detailRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  detailRowIcon: {
    marginRight: 16,
    width: 24,
    textAlign: "center",
  },
  detailLabel: {
    fontSize: 13,
    marginBottom: 4,
  },
  detailValue: {
    fontSize: 16,
    fontWeight: "600",
  },
});
