import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider,
} from "@react-navigation/native";
import { Stack, useRouter, useSegments } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect, useState } from "react";
import { AppState } from "react-native";
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

// Screens that don't require auth check
const PUBLIC_SCREENS = ["login", "privacy-policy"];
// Screens that are part of auth flow (skip PIN for these)
const AUTH_FLOW_SCREENS = ["login", "pin-lock", "pin-setup", "inactive-staff", "privacy-policy"];

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const segments = useSegments();
  const router = useRouter();
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const navigateByRole = (user: any) => {
      // Barcha foydalanuvchilar avval dashboardga o'tadi
      router.replace("/dashboard");
    };

    const checkAuth = async () => {
      try {
        const currentScreen = segments[0] as string;
        const token = await Storage.getItem("access_token");
        const isPublic = PUBLIC_SCREENS.includes(currentScreen);
        const isAuthFlow = AUTH_FLOW_SCREENS.includes(currentScreen);

        // No token — send to login
        if (!token) {
          if (!isPublic) {
            router.replace("/login" as any);
          }
          return;
        }

        // Has token, currently on login or initial load — redirect properly
        if (token && (!currentScreen || currentScreen === "login")) {
          const userStr = await Storage.getItem("user");
          if (!userStr) {
            // Corrupted state — clear and go to login
            await Storage.removeItem("access_token");
            router.replace("/login" as any);
            return;
          }

          const user = JSON.parse(userStr);

          // Check inactive staff
          if (user.role !== "owner" && user.isActive === false) {
            router.replace("/inactive-staff");
            return;
          }

          // Check if PIN is set — show PIN lock first
          const savedPin = await Storage.getItem("app_pin");
          if (savedPin) {
            router.replace("/pin-lock");
            return;
          }

          // Route by role
          navigateByRole(user);
          return;
        }

        // Has token, on a normal screen — check for inactive status
        if (token && !isAuthFlow) {
          const userStr = await Storage.getItem("user");
          if (userStr) {
            const user = JSON.parse(userStr);
            if (
              user.role !== "owner" &&
              user.isActive === false &&
              currentScreen !== "inactive-staff"
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

    // Real-time staff status updates via Socket
    const socket = socketService.getSocket();
    const handleStatusChange = async () => {
      try {
        const token = await Storage.getItem("access_token");
        if (token) {
          const res = await axios.get(`${CONFIG.API_BASE_URL}/users/profile`, {
            headers: { Authorization: `Bearer ${token}` },
            timeout: 5000,
          });
          if (res.data) {
            await Storage.setItem("user", JSON.stringify(res.data));
            const user = res.data;
            const currentScreen = segments[0] as string;
            if (
              user.role !== "owner" &&
              user.isActive === false &&
              currentScreen !== "inactive-staff"
            ) {
              router.replace("/inactive-staff");
            }
          }
        }
      } catch (err) {
        // Silent fail — network might be unavailable
      }
    };

    socket.on("staffStatusChanged", handleStatusChange);

    const subscription = AppState.addEventListener("change", async (nextAppState) => {
      if (nextAppState === "active") {
        const token = await Storage.getItem("access_token");
        const savedPin = await Storage.getItem("app_pin");
        const unlocked = await Storage.getItem("pin_unlocked");
        
        // Agar tokenga ega bo'lsa va PIN o'rnatilgan bo'lsa, va u lock qilinmagan yoki hozir lockda bo'lmasa
        if (token && savedPin) {
          // Ilova fondan qaytganda doim PIN so'rash uchun
          const currentScreen = segments[0] as string;
          if (currentScreen !== "pin-lock" && currentScreen !== "pin-setup" && currentScreen !== "login") {
            router.push("/pin-lock");
          }
        }
      } else if (nextAppState === "background") {
        // Ilova fonga o'tganda lock holatini tiklash (ixtiyoriy)
        await Storage.removeItem("pin_unlocked");
      }
    });

    return () => {
      socket.off("staffStatusChanged", handleStatusChange);
      subscription.remove();
    };
  }, [segments]); // <-- added segments dependency to avoid stale closures if possible

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
            <Stack.Screen name="cashier" options={{ gestureEnabled: false }} />
            <Stack.Screen name="kitchen" options={{ gestureEnabled: false }} />
            <Stack.Screen
              name="inactive-staff"
              options={{ gestureEnabled: false }}
            />
            <Stack.Screen
              name="pin-lock"
              options={{ gestureEnabled: false }}
            />
            <Stack.Screen
              name="pin-setup"
              options={{ presentation: "modal" }}
            />
            <Stack.Screen name="profile" />
            <Stack.Screen name="staff" />
            <Stack.Screen name="create-staff" />
            <Stack.Screen name="reports" />
            <Stack.Screen name="inventory" />
            <Stack.Screen name="procurement" />
            <Stack.Screen name="partners" />
            <Stack.Screen name="menu" />
            <Stack.Screen name="products" />
            <Stack.Screen name="tables-admin" />
            <Stack.Screen name="orders" />
            <Stack.Screen name="staff-inventory" />
            <Stack.Screen name="day-summary" />
            <Stack.Screen
              name="create-order"
              options={{ title: "Yangi buyurtma" }}
            />
            <Stack.Screen name="create-product" />
            <Stack.Screen name="create-inventory" />
            <Stack.Screen name="create-procurement" />
            <Stack.Screen name="create-table" />
            <Stack.Screen
              name="modal"
              options={{ presentation: "modal", title: "Modal" }}
            />
            <Stack.Screen name="privacy-policy" />
          </Stack>
          <StatusBar style="auto" />
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}


