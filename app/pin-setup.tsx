import React, { useState } from "react";
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

export default function PinSetupScreen() {
  const router = useRouter();
  const [step, setStep] = useState<"enter" | "confirm">("enter");
  const [pin, setPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const shakeOffset = useSharedValue(0);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: shakeOffset.value }],
  }));

  const handlePress = async (num: string) => {
    if (step === "enter") {
      if (pin.length >= 4) return;
      const newPin = pin + num;
      setPin(newPin);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      if (newPin.length === 4) {
        setTimeout(() => setStep("confirm"), 300);
      }
    } else {
      if (confirmPin.length >= 4) return;
      const newConfirmPin = confirmPin + num;
      setConfirmPin(newConfirmPin);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

      if (newConfirmPin.length === 4) {
        if (newConfirmPin === pin) {
          // Success
          await Storage.setItem("app_pin", pin);
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          Alert.alert("Muvaffaqiyatli", t.success);
          router.back();
        } else {
          // Error
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
          shakeOffset.value = withSequence(
            withTiming(-10, { duration: 50 }),
            withTiming(10, { duration: 50 }),
            withTiming(-10, { duration: 50 }),
            withTiming(10, { duration: 50 }),
            withTiming(0, { duration: 50 })
          );
          Alert.alert("Xato", t.mismatch);
          setConfirmPin("");
          setPin("");
          setStep("enter");
        }
      }
    }
  };

  const handleBackSpace = () => {
    if (step === "enter") {
      setPin(pin.slice(0, -1));
    } else {
      setConfirmPin(confirmPin.slice(0, -1));
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const renderDots = () => {
    const currentPin = step === "enter" ? pin : confirmPin;
    return (
      <Animated.View style={[styles.dotsContainer, animatedStyle]}>
        {[1, 2, 3, 4].map((i) => (
          <View
            key={i}
            style={[
              styles.dot,
              {
                backgroundColor:
                  currentPin.length >= i ? Colors.light.primary : "#E2E8F0",
              },
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
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
            <MaterialCommunityIcons name="chevron-left" size={32} color="#1E293B" />
          </TouchableOpacity>
          <View style={styles.iconContainer}>
            <MaterialCommunityIcons
              name="shield-check-outline"
              size={32}
              color="white"
            />
          </View>
          <Text style={styles.title}>
            {step === "enter" ? t.setup : t.confirm}
          </Text>
        </View>

        {renderDots()}

        <View style={styles.keypad}>
          {[1, 2, 3].map((row) => (
            <View key={row} style={styles.row}>
              {[1, 2, 3].map((col) =>
                renderKey(((row - 1) * 3 + col).toString())
              )}
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

        <View style={styles.footer}>
          <Text style={styles.footerText}>
            PIN-kod ilovaga kirish xavfsizligini oshiradi
          </Text>
        </View>
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
    width: "100%",
  },
  backBtn: {
    position: "absolute",
    left: 20,
    top: 0,
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: 22,
    backgroundColor: Colors.light.primary,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
  },
  title: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#1E293B",
    marginBottom: 8,
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
  footer: {
    marginTop: 20,
    paddingHorizontal: 40,
  },
  footerText: {
    color: "#64748B",
    textAlign: "center",
    fontSize: 14,
  },
});
