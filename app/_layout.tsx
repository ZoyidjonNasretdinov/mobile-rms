import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider,
} from "@react-navigation/native";
import { Stack, useRouter, useSegments } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect, useState } from "react";
import * as SecureStore from "expo-secure-store";
import { Storage } from "@/utils/storage";
import "react-native-reanimated";
import axios from "axios";
import { socketService } from "@/utils/socket";
import { CONFIG } from "@/constants/config";

import { useColorScheme } from "@/hooks/use-color-scheme";

import { SafeAreaProvider } from "react-native-safe-area-context";
import { GestureHandlerRootView } from "react-native-gesture-handler";

export const unstable_settings = {
  initialRouteName: "login",
};

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const segments = useSegments();
  const router = useRouter();
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const token = await Storage.getItem("access_token");
        const inAuthGroup = (segments[0] as any) === "login";

        if (!token && !inAuthGroup) {
          router.replace("/login" as any);
        } else if (token && inAuthGroup) {
          const userStr = await Storage.getItem("user");
          if (userStr) {
            const user = JSON.parse(userStr);

            // Redirect inactive staff
            if (user.role !== "owner" && user.isActive === false) {
              router.replace("/inactive-staff");
              return;
            }

            if (user.role === "owner") {
              router.replace("/dashboard");
            } else if (user.role === "ofisiant") {
              router.replace("/waiter");
            } else if (user.role === "kassier") {
              router.replace("/cashier");
            } else {
              router.replace("/kitchen");
            }
          } else {
            router.replace("/dashboard");
          }
        } else if (token && !inAuthGroup) {
          // Check if user became inactive mid-session
          const userStr = await Storage.getItem("user");
          if (userStr) {
            const user = JSON.parse(userStr);
            if (
              user.role !== "owner" &&
              user.isActive === false &&
              segments[0] !== "inactive-staff"
            ) {
              router.replace("/inactive-staff");
            }
          }
        }
      } catch (e) {
        console.error("Auth check failed", e);
      } finally {
        setIsReady(true);
      }
    };

    checkAuth();

    const socket = socketService.getSocket();
    const handleStatusChange = async () => {
      try {
        const token = await Storage.getItem("access_token");
        if (token) {
          const res = await axios.get(`${CONFIG.API_BASE_URL}/users/profile`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          if (res.data) {
            await Storage.setItem("user", JSON.stringify(res.data));
            // Trigger auth check by changing segments if needed,
            // but the next checkAuth or segment change will handle it.
            // For immediate effect:
            const user = res.data;
            if (
              user.role !== "owner" &&
              user.isActive === false &&
              segments[0] !== "inactive-staff"
            ) {
              router.replace("/inactive-staff");
            }
          }
        }
      } catch (err) {
        console.error("Layout status update error:", err);
      }
    };

    socket.on("staffStatusChanged", handleStatusChange);

    return () => {
      socket.off("staffStatusChanged", handleStatusChange);
    };
  }, [segments]);

  if (!isReady) {
    return null;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <ThemeProvider
          value={colorScheme === "dark" ? DarkTheme : DefaultTheme}
        >
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="login" options={{ gestureEnabled: false }} />
            <Stack.Screen
              name="dashboard"
              options={{ gestureEnabled: false }}
            />
            <Stack.Screen name="waiter" options={{ gestureEnabled: false }} />
            <Stack.Screen name="kitchen" options={{ gestureEnabled: false }} />
            <Stack.Screen
              name="create-order"
              options={{ title: "Yangi buyurtma" }}
            />
            <Stack.Screen
              name="modal"
              options={{ presentation: "modal", title: "Modal" }}
            />
          </Stack>
          <StatusBar style="auto" />
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
