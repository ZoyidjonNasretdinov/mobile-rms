import React, { useState, useRef } from "react";
import {
  StyleSheet,
  View,
  TextInput,
  TouchableOpacity,
  Text,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator,
  ScrollView,
  Keyboard,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
// import * as SecureStore from "expo-secure-store";
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
} from "react-native-reanimated";

import { Translations } from "../constants/translations";

const t = Translations.uz.auth;

const API_URL = `${CONFIG.API_BASE_URL}/auth/login`;

export default function LoginScreen() {
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [localError, setLocalError] = useState("");
  const [focusedInput, setFocusedInput] = useState<string | null>(null);

  const router = useRouter();
  const passwordRef = useRef<any>(null);

  // Reanimated shared values
  const buttonScale = useSharedValue(1);

  const buttonStyle = useAnimatedStyle(() => ({
    transform: [{ scale: buttonScale.value }],
  }));

  const handlePhoneChange = (text: string) => {
    setPhone(text);
  };

  const handleLogin = async () => {
    setLocalError("");
    if (!phone || !password) {
      setLocalError(t.errorFillFields);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }

    setLoading(true);
    buttonScale.value = withSequence(withSpring(0.95), withSpring(1));

    try {
      const cleaned = phone.replace(/\D/g, "");
      const normalizedPhone = "+" + cleaned;

      const response = await axios.post(API_URL, {
        phone: normalizedPhone,
        password,
      });

      const { access_token, user } = response.data;
      await Storage.setItem("access_token", access_token);
      await Storage.setItem("user", JSON.stringify(user));

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      const userRole = user.role?.toLowerCase();

      // Check if user is active (attendance check)
      if (userRole !== "owner" && user.isActive === false) {
        router.replace("/inactive-staff");
        return;
      }

      if (userRole === "owner") {
        router.replace("/dashboard");
      } else if (userRole === "ofisiant") {
        router.replace("/waiter");
      } else if (userRole === "kassier") {
        router.replace("/cashier");
      } else {
        router.replace("/kitchen");
      }
    } catch (error: any) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      const errorMsg = error.response?.data?.message || t.errorLogin;
      setLocalError(errorMsg);
      Alert.alert(t.error, errorMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" />
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.flex}
        keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 0}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <Animated.View
            entering={FadeInUp.delay(200).duration(800)}
            style={styles.headerContainer}
          >
            <View style={styles.logoIconContainer}>
              <MaterialCommunityIcons name="chef-hat" size={42} color="white" />
            </View>
            <Text style={styles.title}>{t.title}</Text>
            <Text style={styles.subtitle}>{t.subtitle}</Text>
          </Animated.View>

          <Animated.View
            entering={FadeInDown.delay(400).duration(800)}
            style={styles.card}
          >
            <Text style={styles.loginTitle}>{t.loginTitle}</Text>
            <Text style={styles.loginSubtitle}>{t.loginSubtitle}</Text>

            <View style={styles.form}>
              <Text style={styles.label}>{t.phoneLabel}</Text>
              <View
                style={[
                  styles.inputContainer,
                  focusedInput === "phone" && styles.inputContainerFocused,
                ]}
              >
                <MaterialCommunityIcons
                  name="phone-outline"
                  size={20}
                  color={
                    focusedInput === "phone"
                      ? Colors.light.primary
                      : Colors.light.secondary
                  }
                  style={styles.inputIcon}
                />
                <TextInput
                  style={styles.input}
                  placeholder="+998 90 123 45 67"
                  placeholderTextColor={Colors.light.secondary}
                  keyboardType="phone-pad"
                  value={phone}
                  onChangeText={handlePhoneChange}
                  onFocus={() => setFocusedInput("phone")}
                  onBlur={() => setFocusedInput(null)}
                  autoCapitalize="none"
                  autoComplete="off"
                  importantForAutofill="no"
                  textContentType="none"
                  maxLength={17}
                  returnKeyType="next"
                  onSubmitEditing={() => passwordRef.current?.focus()}
                />
              </View>

              <Text style={styles.label}>{t.passwordLabel}</Text>
              <View
                style={[
                  styles.inputContainer,
                  focusedInput === "password" && styles.inputContainerFocused,
                ]}
              >
                <MaterialCommunityIcons
                  name="lock-outline"
                  size={20}
                  color={
                    focusedInput === "password"
                      ? Colors.light.primary
                      : Colors.light.secondary
                  }
                  style={styles.inputIcon}
                />
                <TextInput
                  style={styles.input}
                  placeholder={t.passwordPlaceholder}
                  placeholderTextColor={Colors.light.secondary}
                  secureTextEntry={!showPassword}
                  value={password}
                  onChangeText={setPassword}
                  onFocus={() => setFocusedInput("password")}
                  onBlur={() => setFocusedInput(null)}
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

              <Animated.View style={buttonStyle}>
                <TouchableOpacity
                  style={[styles.button, loading && styles.buttonDisabled]}
                  onPress={handleLogin}
                  disabled={loading}
                  activeOpacity={0.8}
                >
                  {loading ? (
                    <ActivityIndicator color="white" />
                  ) : (
                    <Text style={styles.buttonText}>{t.signIn}</Text>
                  )}
                </TouchableOpacity>
              </Animated.View>
            </View>
          </Animated.View>

          <View style={styles.footer}>
            <TouchableOpacity
              onPress={() => router.push("/privacy-policy")}
              style={{ marginBottom: 20 }}
            >
              <Text
                style={[styles.demoEmail, { textDecorationLine: "underline" }]}
              >
                {Translations.uz.profile.privacyPolicy}
              </Text>
            </TouchableOpacity>
            <Text style={styles.footerText}>{t.demoAccounts}</Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8FAFC", // Sleek off-white/grey background
  },
  flex: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    padding: 24,
    paddingTop: Platform.OS === "android" ? 70 : 50,
    paddingBottom: 100,
  },
  headerContainer: {
    alignItems: "center",
    marginBottom: 40,
  },
  logoIconContainer: {
    width: 84,
    height: 84,
    borderRadius: 28,
    backgroundColor: Colors.light.primary,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
    ...Platform.select({
      ios: {
        shadowColor: Colors.light.primary,
        shadowOffset: { width: 0, height: 12 },
        shadowOpacity: 0.3,
        shadowRadius: 16,
      },
      android: {
        elevation: 12,
      },
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
    fontSize: 15,
    color: "#64748B",
    textAlign: "center",
    lineHeight: 22,
    maxWidth: "80%",
  },
  card: {
    backgroundColor: "white",
    borderRadius: 32,
    padding: 28,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 20 },
        shadowOpacity: 0.08,
        shadowRadius: 30,
      },
      android: {
        elevation: 10,
      },
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
    marginBottom: 32,
  },
  form: {
    gap: 18,
  },
  label: {
    fontSize: 14,
    fontWeight: "700",
    color: "#334155",
    marginBottom: 4,
    marginLeft: 4,
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F1F5F9",
    borderRadius: 18,
    paddingHorizontal: 16,
    borderWidth: 2,
    borderColor: "transparent",
    height: 60,
  },
  inputContainerFocused: {
    borderColor: Colors.light.primary + "30",
    backgroundColor: "white",
    ...Platform.select({
      ios: {
        shadowColor: Colors.light.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
      },
      android: {
        elevation: 2,
      },
    }),
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
  eyeIcon: {
    padding: 8,
  },
  button: {
    backgroundColor: Colors.light.primary,
    borderRadius: 20,
    height: 60,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 20,
    ...Platform.select({
      ios: {
        shadowColor: Colors.light.primary,
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.3,
        shadowRadius: 20,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: "white",
    fontSize: 18,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  footer: {
    marginTop: 40,
    alignItems: "center",
  },
  footerText: {
    fontSize: 14,
    color: "#94A3B8",
    marginBottom: 12,
    fontWeight: "600",
  },
  demoEmail: {
    fontSize: 14,
    color: "#64748B",
  },
  errorContainer: {
    flexDirection: "row",
    alignItems: "center",
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
  },
});
