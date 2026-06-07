import React, { useState, useRef } from "react";
import {
  StyleSheet,
  View,
  TextInput,
  TouchableOpacity,
  Text,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator,
  Image,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Storage } from "@/utils/storage";
import { CONFIG } from "@/constants/config";
import axios from "axios";
import { StatusBar } from "expo-status-bar";
import { Colors } from "../constants/theme";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import Animated, {
  FadeInUp,
  FadeInDown,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import { Translations } from "../constants/translations";

const t = Translations.uz.auth;
const API_URL = `${CONFIG.API_BASE_URL}/auth/login`;

// Demo accounts for quick login during testing
const DEMO_ACCOUNTS = [
  { label: "Owner", phone: "+998901234567", password: "123", color: "#8B5CF6" },
  { label: "Oshpaz", phone: "+998901112233", password: "123", color: "#FF9F1C" },
  { label: "Ofitsiant", phone: "+998902223344", password: "123", color: "#2EC4B6" },
  { label: "Kassir", phone: "+998903334455", password: "123", color: "#10B981" },
];

export default function LoginScreen() {
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [localError, setLocalError] = useState("");
  const [focusedInput, setFocusedInput] = useState<string | null>(null);
  const [showDemo, setShowDemo] = useState(false);

  const router = useRouter();
  const passwordRef = useRef<TextInput>(null);
  const blurTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inputShake = useSharedValue(0);

  const [restaurantName, setRestaurantName] = useState(t.title);
  const [restaurantLogo, setRestaurantLogo] = useState("");

  React.useEffect(() => {
    const fetchSettings = async () => {
      try {
        const res = await axios.get(`${CONFIG.API_BASE_URL}/settings`);
        if (res.data) {
          if (res.data.restaurantName) setRestaurantName(res.data.restaurantName);
          if (res.data.restaurantLogo) setRestaurantLogo(res.data.restaurantLogo);
        }
      } catch (e) {
        // ignore
      }
    };
    fetchSettings();
  }, []);

  const buttonScale = useSharedValue(1);
  const buttonStyle = useAnimatedStyle(() => ({
    transform: [{ scale: buttonScale.value }],
  }));

  const shakeStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: inputShake.value }],
  }));

  const triggerShake = () => {
    inputShake.value = withSequence(
      withTiming(-8, { duration: 60 }),
      withTiming(8, { duration: 60 }),
      withTiming(-8, { duration: 60 }),
      withTiming(8, { duration: 60 }),
      withTiming(0, { duration: 60 })
    );
  };

  const handleFocus = (inputName: string) => {
    if (blurTimeoutRef.current) {
      clearTimeout(blurTimeoutRef.current);
      blurTimeoutRef.current = null;
    }
    setFocusedInput(inputName);
    setLocalError("");
  };

  const handleBlur = () => {
    blurTimeoutRef.current = setTimeout(() => {
      setFocusedInput(null);
    }, 150);
  };

  const formatPhoneNumber = (text: string) => {
    // Remove all non-digit chars
    const cleaned = text.replace(/\D/g, "");
    // Limit to 12 digits (998 + 9 digits)
    const limited = cleaned.substring(0, 12);

    let formatted = "";
    if (limited.length > 0) {
      formatted = "+" + limited.substring(0, 3);
    }
    if (limited.length > 3) {
      formatted += " (" + limited.substring(3, 5) + ")";
    }
    if (limited.length > 5) {
      formatted += " " + limited.substring(5, 8);
    }
    if (limited.length > 8) {
      formatted += " " + limited.substring(8, 10);
    }
    if (limited.length > 10) {
      formatted += " " + limited.substring(10, 12);
    }
    return formatted;
  };

  const handlePhoneChange = (text: string) => {
    const formatted = formatPhoneNumber(text);
    setPhone(formatted);
  };

  const navigateByRole = (role: string) => {
    router.replace("/dashboard");
  };

  const handleLogin = async () => {
    setLocalError("");

    const trimmedPhone = phone.trim();
    const trimmedPassword = password.trim();

    if (!trimmedPhone || !trimmedPassword) {
      setLocalError(t.errorFillFields);
      triggerShake();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }

    // Validate phone has enough digits
    const digits = trimmedPhone.replace(/\D/g, "");
    if (digits.length < 12) {
      setLocalError("To'liq telefon raqamini kiriting (12 ta raqam)");
      triggerShake();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }

    setLoading(true);
    buttonScale.value = withSequence(withSpring(0.95), withSpring(1));

    try {
      // Always ensure + prefix and clean format
      const normalizedPhone = "+" + digits;

      const response = await axios.post(
        API_URL,
        { phoneNumber: normalizedPhone, password: trimmedPassword },
        { timeout: 10000 }
      );

      const { access_token, user } = response.data;
      await Storage.setItem("access_token", access_token);
      await Storage.setItem("user", JSON.stringify(user));
      console.log("[Login] User data:", user);

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      // Check if inactive (non-owner)
      if (user.role?.toLowerCase() !== "owner" && user.isActive === false) {
        router.replace("/inactive-staff");
        return;
      }

      // Check if PIN is set — navigate to pin-lock first
      const savedPin = await Storage.getItem("app_pin");
      if (savedPin) {
        router.replace("/pin-lock");
        return;
      }

      // Navigate to correct dashboard by role
      navigateByRole(user.role);
    } catch (error: any) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      triggerShake();

      let errorMsg = t.errorLogin;

      if (error.code === "ECONNREFUSED" || error.code === "ERR_NETWORK") {
        errorMsg =
          "Server bilan aloqa yo'q. WiFi ulanishini tekshiring yoki admindan so'rang.";
      } else if (error.response?.status === 401) {
        errorMsg = "Telefon raqami yoki parol noto'g'ri";
      } else if (error.response?.data?.message) {
        errorMsg = error.response.data.message;
      } else if (error.message?.includes("timeout")) {
        errorMsg = "So'rov vaqti o'tdi. Internet aloqangizni tekshiring.";
      }

      setLocalError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const fillDemoAccount = (demo: (typeof DEMO_ACCOUNTS)[0]) => {
    const formatted = formatPhoneNumber(demo.phone.replace(/\D/g, ""));
    setPhone(formatted);
    setPassword(demo.password);
    setLocalError("");
    setShowDemo(false);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" />
      <View style={styles.flex}>
        {/* Background Blobs for Premium Feel */}
        <View style={styles.blob1} />
        <View style={styles.blob2} />
        
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="always"
          showsVerticalScrollIndicator={false}
          bounces={false}
        >
          <View style={styles.headerContainer}>
            <View style={styles.logoIconContainer}>
              {restaurantLogo ? (
                <Image source={{ uri: restaurantLogo }} style={{ width: 168, height: 168, borderRadius: 56 }} />
              ) : (
                <MaterialCommunityIcons name="chef-hat" size={84} color="white" />
              )}
            </View>
            <Text style={styles.title}>{restaurantName}</Text>
            <Text style={styles.subtitle}>{t.subtitle}</Text>
          </View>

          {/* Login Card */}
          <View style={styles.card}>
            <Text style={styles.loginTitle}>{t.loginTitle}</Text>
            <Text style={styles.loginSubtitle}>{t.loginSubtitle}</Text>

            <View style={styles.form}>
              {/* Phone Input */}
              <View>
                <Text style={styles.label}>{t.phoneLabel}</Text>
                <View
                  style={[
                    styles.inputContainer,
                    localError && !password && styles.inputContainerError,
                  ]}
                >
                  <MaterialCommunityIcons
                    name="phone-outline"
                    size={20}
                    color={Colors.light.secondary}
                    style={styles.inputIcon}
                  />
                  <TextInput
                    style={styles.input}
                    placeholder="+998 (70) 013 45 01"
                    placeholderTextColor={Colors.light.secondary}
                    keyboardType="phone-pad"
                    value={phone}
                    onChangeText={handlePhoneChange}
                    autoCapitalize="none"
                    maxLength={19}
                  />
                  {phone.length > 0 && (
                    <TouchableOpacity
                      onPress={() => setPhone("")}
                      style={styles.clearBtn}
                    >
                      <MaterialCommunityIcons
                        name="close-circle"
                        size={18}
                        color={Colors.light.secondary}
                      />
                    </TouchableOpacity>
                  )}
                </View>
              </View>

              {/* Password Input */}
              <View>
                <Text style={styles.label}>{t.passwordLabel}</Text>
                <View
                  style={[
                    styles.inputContainer,
                    localError && phone && styles.inputContainerError,
                  ]}
                >
                  <MaterialCommunityIcons
                    name="lock-outline"
                    size={20}
                    color={Colors.light.secondary}
                    style={styles.inputIcon}
                  />
                  <TextInput
                    style={styles.input}
                    placeholder={t.passwordPlaceholder}
                    placeholderTextColor={Colors.light.secondary}
                    secureTextEntry={!showPassword}
                    value={password}
                    onChangeText={setPassword}
                    autoComplete="off"
                    importantForAutofill="no"
                    textContentType="none"
                    ref={passwordRef}
                    returnKeyType="done"
                    onSubmitEditing={handleLogin}
                  />
                  <TouchableOpacity
                    onPress={() => {
                      setShowPassword(!showPassword);
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    }}
                    style={styles.eyeIcon}
                  >
                    <MaterialCommunityIcons
                      name={showPassword ? "eye-off-outline" : "eye-outline"}
                      size={20}
                      color={Colors.light.secondary}
                    />
                  </TouchableOpacity>
                </View>
              </View>

              {/* Error Message */}
              {localError ? (
                <View style={styles.errorContainer}>
                  <MaterialCommunityIcons
                    name="alert-circle-outline"
                    size={16}
                    color="#FF4D4F"
                  />
                  <Text style={styles.errorText}>{localError}</Text>
                </View>
              ) : null}

              {/* Login Button */}
              <Animated.View style={buttonStyle}>
                <TouchableOpacity
                  style={[styles.button, loading && styles.buttonDisabled]}
                  onPress={handleLogin}
                  disabled={loading}
                  activeOpacity={0.85}
                >
                  {loading ? (
                    <View style={styles.loadingRow}>
                      <ActivityIndicator color="white" />
                      <Text style={[styles.buttonText, { marginLeft: 10 }]}>
                        Kirilmoqda...
                      </Text>
                    </View>
                  ) : (
                    <Text style={styles.buttonText}>{t.signIn}</Text>
                  )}
                </TouchableOpacity>
              </Animated.View>
            </View>
          </View>

          {/* Demo Accounts Section */}
          <View style={styles.demoSection}>
            <TouchableOpacity
              style={styles.demoToggleBtn}
              onPress={() => {
                setShowDemo(!showDemo);
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              }}
            >
              <MaterialCommunityIcons
                name={showDemo ? "chevron-up" : "chevron-down"}
                size={18}
                color="#94A3B8"
              />
              <Text style={styles.demoToggleText}>Demo hisoblar</Text>
            </TouchableOpacity>

            {showDemo && (
              <View style={styles.demoAccountsGrid}>
                {DEMO_ACCOUNTS.map((demo) => (
                  <TouchableOpacity
                    key={demo.phone}
                    style={[
                      styles.demoAccountCard,
                      { borderLeftColor: demo.color },
                    ]}
                    onPress={() => fillDemoAccount(demo)}
                    activeOpacity={0.7}
                  >
                    <View
                      style={[
                        styles.demoRoleDot,
                        { backgroundColor: demo.color + "20" },
                      ]}
                    >
                      <Text style={[styles.demoRoleText, { color: demo.color }]}>
                        {demo.label[0]}
                      </Text>
                    </View>
                    <View style={styles.demoInfo}>
                      <Text style={styles.demoLabel}>{demo.label}</Text>
                      <Text style={styles.demoPhone}>{demo.phone}</Text>
                    </View>
                    <MaterialCommunityIcons
                      name="arrow-right"
                      size={16}
                      color="#CBD5E1"
                    />
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>

          {/* Footer */}
          <View style={styles.footer}>
            <TouchableOpacity
              onPress={() => router.push("/privacy-policy")}
            >
              <Text
                style={[styles.footerLink, { textDecorationLine: "underline" }]}
              >
                {Translations.uz.profile.privacyPolicy}
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  flex: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    padding: 24,
    paddingTop: Platform.OS === "android" ? 60 : 40,
    paddingBottom: 40,
  },
  headerContainer: {
    alignItems: "center",
    marginBottom: 36,
  },
  logoIconContainer: {
    width: 168,
    height: 168,
    borderRadius: 56,
    backgroundColor: Colors.light.primary,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 24,
    borderWidth: 4,
    borderColor: "rgba(255, 255, 255, 0.8)",
    ...Platform.select({
      ios: {
        shadowColor: Colors.light.primary,
        shadowOffset: { width: 0, height: 16 },
        shadowOpacity: 0.4,
        shadowRadius: 24,
      },
      android: { elevation: 12 },
    }),
  },
  title: {
    fontSize: 30,
    fontWeight: "800",
    color: "#1E293B",
    marginBottom: 8,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 16,
    color: "#64748B",
    textAlign: "center",
    lineHeight: 24,
    maxWidth: "85%",
  },
  card: {
    backgroundColor: "rgba(255, 255, 255, 0.95)",
    borderRadius: 36,
    padding: 32,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.5)",
    ...Platform.select({
      ios: {
        shadowColor: "#8B5CF6",
        shadowOffset: { width: 0, height: 24 },
        shadowOpacity: 0.12,
        shadowRadius: 40,
      },
      android: { elevation: 10 },
    }),
  },
  loginTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#0F172A",
    marginBottom: 6,
  },
  loginSubtitle: {
    fontSize: 14,
    color: "#64748B",
    marginBottom: 28,
  },
  form: {
    gap: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: "700",
    color: "#334155",
    marginBottom: 8,
    marginLeft: 4,
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F8FAFC",
    borderRadius: 20,
    paddingHorizontal: 20,
    height: 64,
  },
  inputContainerFocused: {
    borderColor: Colors.light.primary + "50",
    backgroundColor: "white",
    ...Platform.select({
      ios: {
        shadowColor: Colors.light.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
      },
    }),
  },
  inputContainerError: {
    borderColor: "#FCA5A5",
    backgroundColor: "#FFF5F5",
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    height: "100%",
    fontSize: 16,
    color: "#0F172A",
    fontWeight: "500",
  },
  clearBtn: {
    padding: 4,
  },
  eyeIcon: {
    padding: 8,
  },
  errorContainer: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: "#FEF2F2",
    padding: 14,
    borderRadius: 16,
    gap: 10,
    borderWidth: 1,
    borderColor: "#FCA5A5",
  },
  errorText: {
    color: "#991B1B",
    fontSize: 14,
    fontWeight: "600",
    flex: 1,
    lineHeight: 20,
  },
  button: {
    backgroundColor: Colors.light.primary,
    borderRadius: 24,
    height: 64,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 12,
    ...Platform.select({
      ios: {
        shadowColor: Colors.light.primary,
        shadowOffset: { width: 0, height: 12 },
        shadowOpacity: 0.4,
        shadowRadius: 20,
      },
      android: { elevation: 8 },
    }),
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonText: {
    color: "white",
    fontSize: 18,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  loadingRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  // Demo Section
  demoSection: {
    marginBottom: 16,
  },
  demoToggleBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 10,
  },
  demoToggleText: {
    fontSize: 14,
    color: "#94A3B8",
    fontWeight: "600",
  },
  demoAccountsGrid: {
    gap: 10,
    marginTop: 8,
  },
  demoAccountCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "white",
    borderRadius: 16,
    padding: 14,
    gap: 12,
    borderLeftWidth: 4,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 8,
      },
      android: { elevation: 2 },
    }),
  },
  demoRoleDot: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  demoRoleText: {
    fontSize: 16,
    fontWeight: "800",
  },
  demoInfo: {
    flex: 1,
  },
  demoLabel: {
    fontSize: 14,
    fontWeight: "700",
    color: "#1E293B",
  },
  demoPhone: {
    fontSize: 12,
    color: "#94A3B8",
    marginTop: 2,
  },
  footer: {
    alignItems: "center",
    marginTop: 12,
  },
  footerLink: {
    fontSize: 14,
    color: "#94A3B8",
  },
  blob1: {
    position: "absolute",
    top: -120,
    right: -100,
    width: 350,
    height: 350,
    borderRadius: 175,
    backgroundColor: Colors.light.primary,
    opacity: 0.12,
  },
  blob2: {
    position: "absolute",
    bottom: -80,
    left: -120,
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: "#FF9F1C",
    opacity: 0.08,
  },
});
