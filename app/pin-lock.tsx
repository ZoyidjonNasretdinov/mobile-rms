import React, { useState, useEffect } from "react";
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  Alert,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Storage } from "@/utils/storage";
import { Colors } from "@/constants/theme";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { StatusBar } from "expo-status-bar";
import * as Haptics from "expo-haptics";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withSequence,
  withTiming,
  FadeIn,
} from "react-native-reanimated";
import { Translations } from "@/constants/translations";

const t = Translations.uz.pin;

export default function PinLockScreen() {
  const router = useRouter();
  const [pin, setPin] = useState("");
  const [user, setUser] = useState<any>(null);
  const shakeOffset = useSharedValue(0);

  useEffect(() => {
    const loadUser = async () => {
      const userStr = await Storage.getItem("user");
      if (userStr) {
        setUser(JSON.parse(userStr));
      }
    };
    loadUser();
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: shakeOffset.value }],
  }));

  const handlePress = async (num: string) => {
    if (pin.length >= 4) return;

    const newPin = pin + num;
    setPin(newPin);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    if (newPin.length === 4) {
      const savedPin = await Storage.getItem("app_pin");
      if (newPin === savedPin) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        // Successful PIN entry
        router.replace("/dashboard");
      } else {
        // Wrong PIN
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        shakeOffset.value = withSequence(
          withTiming(-10, { duration: 50 }),
          withTiming(10, { duration: 50 }),
          withTiming(-10, { duration: 50 }),
          withTiming(10, { duration: 50 }),
          withTiming(0, { duration: 50 })
        );
        setTimeout(() => setPin(""), 500);
      }
    }
  };

  const handleBackSpace = () => {
    setPin(pin.slice(0, -1));
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const handleLogout = async () => {
    await Storage.removeItem("access_token");
    await Storage.removeItem("user");
    await Storage.removeItem("app_pin");
    router.replace("/login");
  };

  const renderDots = () => {
    return (
      <Animated.View style={[styles.dotsContainer, animatedStyle]}>
        {[1, 2, 3, 4].map((i) => (
          <View
            key={i}
            style={[
              styles.dot,
              pin.length >= i && styles.dotActive,
              { backgroundColor: pin.length >= i ? Colors.light.primary : "#E2E8F0" },
            ]}
          />
        ))}
      </Animated.View>
    );
  };

  const renderKey = (num: string) => (
    <TouchableOpacity
      key={num}
      style={styles.key}
      onPress={() => handlePress(num)}
    >
      <Text style={styles.keyText}>{num}</Text>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" />
      <Animated.View entering={FadeIn.duration(800)} style={styles.content}>
        <View style={styles.header}>
          <View style={styles.iconContainer}>
            <MaterialCommunityIcons name="lock-outline" size={32} color="white" />
          </View>
          <Text style={styles.title}>{t.enter}</Text>
          {user && (
            <Text style={styles.subtitle}>{user.fullName}</Text>
          )}
        </View>

        {renderDots()}

        <View style={styles.keypad}>
          {[1, 2, 3].map((row) => (
            <View key={row} style={styles.row}>
              {[1, 2, 3].map((col) => renderKey(((row - 1) * 3 + col).toString()))}
            </View>
          ))}
          <View style={styles.row}>
            <View style={styles.emptyKey} />
            {renderKey("0")}
            <TouchableOpacity style={styles.key} onPress={handleBackSpace}>
              <MaterialCommunityIcons
                name="backspace-outline"
                size={28}
                color="#64748B"
              />
            </TouchableOpacity>
          </View>
        </View>

        <TouchableOpacity style={styles.forgotBtn} onPress={handleLogout}>
          <Text style={styles.forgotText}>{t.forgot}</Text>
        </TouchableOpacity>
      </Animated.View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "white",
  },
  content: {
    flex: 1,
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 40,
  },
  header: {
    alignItems: "center",
    marginTop: 20,
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: 22,
    backgroundColor: Colors.light.primary,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
    ...Platform.select({
      ios: {
        shadowColor: Colors.light.primary,
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.3,
        shadowRadius: 12,
      },
      android: { elevation: 6 },
    }),
  },
  title: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#1E293B",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: "#64748B",
  },
  dotsContainer: {
    flexDirection: "row",
    gap: 20,
    marginVertical: 40,
  },
  dot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  dotActive: {
    borderWidth: 0,
  },
  keypad: {
    width: "80%",
    gap: 20,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  key: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: "#F8FAFC",
    justifyContent: "center",
    alignItems: "center",
  },
  emptyKey: {
    width: 70,
    height: 70,
  },
  keyText: {
    fontSize: 26,
    fontWeight: "600",
    color: "#1E293B",
  },
  forgotBtn: {
    marginTop: 20,
    padding: 10,
  },
  forgotText: {
    color: Colors.light.primary,
    fontWeight: "600",
    fontSize: 15,
  },
});
