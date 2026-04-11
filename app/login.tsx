import React, { useState } from "react";
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
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import * as SecureStore from "expo-secure-store";
import { Storage } from "@/utils/storage";
import { CONFIG } from "@/constants/config";
import axios from "axios";
import { StatusBar } from "expo-status-bar";
import { Colors } from "../constants/theme";
import { MaterialCommunityIcons } from "@expo/vector-icons";

import { Translations } from "../constants/translations";

const t = Translations.uz.auth;
const tc = Translations.uz.common;

const API_URL = `${CONFIG.API_BASE_URL}/auth/login`;

export default function LoginScreen() {
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isPhoneFocused, setIsPhoneFocused] = useState(false);
  const [isPasswordFocused, setIsPasswordFocused] = useState(false);
  const [localError, setLocalError] = useState("");
  const router = useRouter();

  const formatPhone = (text: string) => {
    // Keep only digits
    const cleaned = text.replace(/\D/g, "");

    // Start with 998 if empty or not starting with it
    let result = cleaned;
    if (result.length > 0 && !result.startsWith("998")) {
      result = "998" + result;
    }
    if (result.length === 0) return "";

    let formatted = "+";
    if (result.length > 0) formatted += result.substring(0, 3);
    if (result.length > 3) formatted += " " + result.substring(3, 5);
    if (result.length > 5) formatted += " " + result.substring(5, 8);
    if (result.length > 8) formatted += " " + result.substring(8, 10);
    if (result.length > 10) formatted += " " + result.substring(10, 12);

    return formatted.substring(0, 17);
  };

  const handlePhoneChange = (text: string) => {
    const formatted = formatPhone(text);
    setPhone(formatted);
  };

  const handleLogin = async () => {
    setLocalError("");
    if (!phone || !password) {
      setLocalError(t.errorFillFields);
      return;
    }

    setLoading(true);
    try {
      // Normalize phone: strip spaces and other non-digits, then add "+"
      const cleaned = phone.replace(/\D/g, "");
      const normalizedPhone = "+" + cleaned;

      const response = await axios.post(API_URL, {
        phone: normalizedPhone,
        password,
      });

      const { access_token, user } = response.data;
      await Storage.setItem("access_token", access_token);
      await Storage.setItem("user", JSON.stringify(user));

      const userRole = user.role?.toLowerCase();
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
      const errorMsg = error.response?.data?.message || t.errorLogin;
      setLocalError(errorMsg);
      // Fallback alert
      Alert.alert(t.error, errorMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" />
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.flex}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.headerContainer}>
            <View style={styles.logoIconContainer}>
              <MaterialCommunityIcons name="chef-hat" size={40} color="white" />
            </View>
            <Text style={styles.title}>{t.title}</Text>
            <Text style={styles.subtitle}>{t.subtitle}</Text>
          </View>

          <View style={styles.card}>
            <Text style={styles.loginTitle}>{t.loginTitle}</Text>
            <Text style={styles.loginSubtitle}>{t.loginSubtitle}</Text>

            <View style={styles.form}>
              <Text style={styles.label}>{t.phoneLabel}</Text>
              <View
                style={[
                  styles.inputContainer,
                  isPhoneFocused && styles.inputContainerFocused,
                ]}
              >
                <MaterialCommunityIcons
                  name="phone-outline"
                  size={20}
                  color={
                    isPhoneFocused
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
                  onFocus={() => setIsPhoneFocused(true)}
                  onBlur={() => setIsPhoneFocused(false)}
                  autoCapitalize="none"
                  maxLength={17}
                />
              </View>

              <Text style={styles.label}>{t.passwordLabel}</Text>
              <View
                style={[
                  styles.inputContainer,
                  isPasswordFocused && styles.inputContainerFocused,
                ]}
              >
                <MaterialCommunityIcons
                  name="lock-outline"
                  size={20}
                  color={
                    isPasswordFocused
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
                  onFocus={() => setIsPasswordFocused(true)}
                  onBlur={() => setIsPasswordFocused(false)}
                />
                <TouchableOpacity
                  onPress={() => setShowPassword(!showPassword)}
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

              <TouchableOpacity
                style={[styles.button, loading && styles.buttonDisabled]}
                onPress={handleLogin}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="white" />
                ) : (
                  <Text style={styles.buttonText}>{t.signIn}</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.footer}>
            <Text style={styles.footerText}>{t.demoAccounts}</Text>
            <View style={styles.demoRow}>
              <Text style={styles.demoType}>{t.owner}:</Text>
              <Text style={styles.demoEmail}>+998700134501 / 12345678</Text>
            </View>
            <View style={styles.demoRow}>
              <Text style={styles.demoType}>{t.waiter}:</Text>
              <Text style={styles.demoEmail}>+998921234573 / password123</Text>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.light.background,
  },
  flex: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    padding: 24,
    justifyContent: "center",
  },
  headerContainer: {
    alignItems: "center",
    marginBottom: 40,
  },
  logoIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 24,
    backgroundColor: Colors.light.primary,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 24,
    ...Platform.select({
      ios: {
        shadowColor: Colors.light.primary,
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.2,
        shadowRadius: 15,
      },
      android: {
        elevation: 8,
      },
      web: {
        boxShadow: `0px 10px 15px ${Colors.light.primary}33`,
      },
    }),
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    color: Colors.light.text,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: Colors.light.secondary,
    textAlign: "center",
  },
  card: {
    backgroundColor: Colors.light.card,
    borderRadius: 24,
    padding: 24,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.05,
        shadowRadius: 12,
      },
      android: {
        elevation: 4,
      },
      web: {
        boxShadow: "0px 4px 12px rgba(0, 0, 0, 0.05)",
      },
    }),
  },
  loginTitle: {
    fontSize: 22,
    fontWeight: "bold",
    color: Colors.light.text,
    marginBottom: 8,
  },
  loginSubtitle: {
    fontSize: 14,
    color: Colors.light.secondary,
    marginBottom: 32,
  },
  form: {
    gap: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: Colors.light.text,
    marginBottom: 8,
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.light.input,
    borderRadius: 16,
    paddingHorizontal: 16,
    borderWidth: 1.5,
    borderColor: Colors.light.border,
  },
  inputContainerFocused: {
    borderColor: Colors.light.primary,
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
      web: {
        boxShadow: `0px 4px 12px ${Colors.light.primary}1A`,
      },
    }),
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    height: 56,
    fontSize: 16,
    color: Colors.light.text,
  },
  eyeIcon: {
    padding: 8,
  },
  button: {
    backgroundColor: Colors.light.primary,
    borderRadius: 16,
    height: 56,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 16,
    ...Platform.select({
      ios: {
        shadowColor: Colors.light.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
      },
      android: {
        elevation: 4,
      },
      web: {
        boxShadow: `0px 4px 8px ${Colors.light.primary}33`,
      },
    }),
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "bold",
  },
  footer: {
    marginTop: 32,
    alignItems: "center",
  },
  footerText: {
    fontSize: 14,
    color: Colors.light.secondary,
    marginBottom: 12,
    fontWeight: "600",
  },
  demoRow: {
    flexDirection: "row",
    marginBottom: 4,
  },
  demoType: {
    fontSize: 13,
    color: Colors.light.secondary,
    fontWeight: "600",
    marginRight: 6,
  },
  demoEmail: {
    fontSize: 13,
    color: Colors.light.secondary,
  },
  errorContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFF1F0",
    padding: 12,
    borderRadius: 12,
    gap: 8,
    borderWidth: 1,
    borderColor: "#FFA39E",
  },
  errorText: {
    color: "#FF4D4F",
    fontSize: 14,
    fontWeight: "500",
    flex: 1,
  },
});
