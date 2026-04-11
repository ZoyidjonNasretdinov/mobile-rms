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
import axios from "axios";
import { StatusBar } from "expo-status-bar";
import { Colors } from "../constants/theme";
import { MaterialCommunityIcons } from "@expo/vector-icons";

import { Translations } from "../constants/translations";

const t = Translations.uz.auth;
const tc = Translations.uz.common;

const API_URL = "http://192.168.43.160:3000/auth/login";

export default function LoginScreen() {
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async () => {
    if (!phone || !password) {
      Alert.alert(t.error, t.errorFillFields);
      return;
    }

    setLoading(true);
    try {
      // Normalize phone: strip "+", spaces, and other non-digits
      const normalizedPhone = phone.replace(/\D/g, "");

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
        <ScrollView contentContainerStyle={styles.scrollContent}>
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
              <View style={styles.inputContainer}>
                <MaterialCommunityIcons
                  name="phone-outline"
                  size={20}
                  color={Colors.light.secondary}
                  style={styles.inputIcon}
                />
                <TextInput
                  style={styles.input}
                  placeholder="+998 90 123 45 67"
                  placeholderTextColor={Colors.light.secondary}
                  keyboardType="phone-pad"
                  value={phone}
                  onChangeText={setPhone}
                  autoCapitalize="none"
                />
              </View>

              <Text style={styles.label}>{t.passwordLabel}</Text>
              <View style={styles.inputContainer}>
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
              <Text style={styles.demoType}>{t.owner}</Text>
              <Text style={styles.demoEmail}>owner@restaurant.com</Text>
            </View>
            <View style={styles.demoRow}>
              <Text style={styles.demoType}>{t.waiter}</Text>
              <Text style={styles.demoEmail}>waiter@restaurant.com</Text>
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
    borderWidth: 1,
    borderColor: Colors.light.border,
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
});
