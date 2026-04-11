import React from "react";
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { useRouter } from "expo-router";
import * as SecureStore from "expo-secure-store";
import { Translations } from "@/constants/translations";
import axios from "axios";
import { CONFIG } from "@/constants/config";

const API_BASE_URL = CONFIG.API_BASE_URL;
const t = Translations.uz.partners;
const c = Translations.uz.common;

export default function PartnersScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme() ?? "light";
  const colors = Colors[colorScheme];

  const [partners, setPartners] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [refreshing, setRefreshing] = React.useState(false);

  const fetchData = async () => {
    try {
      setLoading(true);
      const token = await SecureStore.getItemAsync("userToken");
      const res = await axios.get(`${API_BASE_URL}/partners`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setPartners(res.data);
      setLoading(false);
      setRefreshing(false);
    } catch (error) {
      console.error("Fetch partners error:", error);
      setLoading(false);
      setRefreshing(false);
    }
  };

  React.useEffect(() => {
    fetchData();
  }, []);

  const PartnerCard = ({ name, contribution, share, trend }: any) => (
    <View style={[styles.partnerCard, { backgroundColor: colors.card }]}>
      <View style={styles.partnerHeader}>
        <View style={styles.partnerInfo}>
          <Text
            style={[styles.partnerName, { color: colors.text }]}
            numberOfLines={1}
            adjustsFontSizeToFit
          >
            {name}
          </Text>
          <Text
            style={[styles.partnerSubtitle, { color: colors.secondary }]}
            numberOfLines={1}
            adjustsFontSizeToFit
          >
            {t.profitShare}: {share}%
          </Text>
        </View>
        <View
          style={[
            styles.trendBadge,
            { backgroundColor: colors.success + "15" },
          ]}
        >
          <MaterialCommunityIcons
            name="trending-up"
            size={14}
            color={colors.success}
          />
          <Text style={[styles.trendText, { color: colors.success }]}>
            {trend}%
          </Text>
        </View>
      </View>
      <View style={styles.contributionRow}>
        <View style={styles.contribItem}>
          <Text style={[styles.contribLabel, { color: colors.secondary }]}>
            {t.contribution}
          </Text>
          <Text
            style={[styles.contribValue, { color: colors.text }]}
            numberOfLines={1}
            adjustsFontSizeToFit
          >
            {contribution} {c.currency}
          </Text>
        </View>
        <TouchableOpacity
          style={[styles.detailsBtn, { backgroundColor: colors.accent + "15" }]}
        >
          <Text style={[styles.detailsBtnText, { color: colors.accent }]}>
            Tarix
          </Text>
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
          <View style={[styles.titleIcon, { backgroundColor: colors.success }]}>
            <MaterialCommunityIcons
              name="handshake-outline"
              size={24}
              color="white"
            />
          </View>
          <View style={{ flex: 1 }}>
            <Text
              style={[styles.headerTitle, { color: colors.text }]}
              numberOfLines={1}
              adjustsFontSizeToFit
            >
              {t.title}
            </Text>
            <Text
              style={[styles.headerSubtitle, { color: colors.secondary }]}
              numberOfLines={1}
              adjustsFontSizeToFit
            >
              {t.totalInvested}: 45,000,000 {c.currency}
            </Text>
          </View>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.statsGrid}>
          <View style={[styles.statItem, { backgroundColor: colors.card }]}>
            <Text
              style={[styles.statLabel, { color: colors.secondary }]}
              numberOfLines={1}
              adjustsFontSizeToFit
            >
              {t.stats.weekly}
            </Text>
            <Text
              style={[styles.statValue, { color: colors.success }]}
              numberOfLines={1}
              adjustsFontSizeToFit
            >
              +12.5%
            </Text>
          </View>
          <View style={[styles.statItem, { backgroundColor: colors.card }]}>
            <Text
              style={[styles.statLabel, { color: colors.secondary }]}
              numberOfLines={1}
              adjustsFontSizeToFit
            >
              {t.stats.monthly}
            </Text>
            <Text
              style={[styles.statValue, { color: colors.primary }]}
              numberOfLines={1}
              adjustsFontSizeToFit
            >
              +4.2%
            </Text>
          </View>
        </View>

        <Text style={[styles.sectionTitle, { color: colors.text }]}>
          {t.contribution}
        </Text>

        {loading && partners.length === 0 ? (
          <ActivityIndicator size="large" color={colors.primary} />
        ) : (
          partners.map((partner) => (
            <PartnerCard
              key={partner._id}
              name={partner.name}
              contribution={partner.totalContribution.toLocaleString()}
              share={partner.share}
              trend="0"
            />
          ))
        )}

        {partners.length === 0 && !loading && (
          <Text
            style={{
              textAlign: "center",
              color: colors.secondary,
              marginTop: 20,
            }}
          >
            Hozircha sheriklar yo'q
          </Text>
        )}

        <Text style={[styles.sectionTitle, { color: colors.text }]}>
          {t.recentActivity}
        </Text>
        <View style={[styles.activityList, { backgroundColor: colors.card }]}>
          <View style={styles.activityItem}>
            <MaterialCommunityIcons
              name="arrow-up-circle"
              size={20}
              color={colors.success}
            />
            <Text style={[styles.activityText, { color: colors.text }]}>
              {t.names.partner1} 5 mln so'm go'sht uchun kiritdi
            </Text>
          </View>
          <View style={[styles.divider, { backgroundColor: colors.border }]} />
          <View style={styles.activityItem}>
            <MaterialCommunityIcons
              name="arrow-up-circle"
              size={20}
              color={colors.success}
            />
            <Text style={[styles.activityText, { color: colors.text }]}>
              {t.names.partner2} ko'mir uchun 1.2 mln so'm kiritdi
            </Text>
          </View>
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
    fontSize: 18,
    fontWeight: "bold",
  },
  headerSubtitle: {
    fontSize: 12,
  },
  scrollContent: {
    padding: 20,
  },
  statsGrid: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 24,
  },
  statItem: {
    flex: 1,
    padding: 16,
    borderRadius: 20,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  statLabel: {
    fontSize: 11,
    fontWeight: "600",
    marginBottom: 4,
  },
  statValue: {
    fontSize: 16,
    fontWeight: "bold",
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 16,
    marginTop: 8,
  },
  partnerCard: {
    padding: 16,
    borderRadius: 24,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  partnerHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  partnerInfo: {
    flex: 1,
  },
  partnerName: {
    fontSize: 16,
    fontWeight: "bold",
  },
  partnerSubtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  trendBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 4,
  },
  trendText: {
    fontSize: 12,
    fontWeight: "bold",
  },
  contribItem: {
    flex: 1,
  },
  contributionRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
  },
  contribLabel: {
    fontSize: 12,
    marginBottom: 2,
  },
  contribValue: {
    fontSize: 15,
    fontWeight: "bold",
  },
  detailsBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  detailsBtnText: {
    fontSize: 12,
    fontWeight: "bold",
  },
  activityList: {
    borderRadius: 24,
    padding: 16,
  },
  activityItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 12,
  },
  activityText: {
    fontSize: 13,
    flex: 1,
  },
  divider: {
    height: 1,
    opacity: 0.1,
  },
  bottomSpace: {
    height: 40,
  },
});
