import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  DarkTheme,
  DefaultTheme,
  router,
  Stack,
  ThemeProvider,
  usePathname,
} from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { useEffect, useState } from "react";
import { useColorScheme, View } from "react-native";

import { AnimatedSplashOverlay } from "@/components/animated-icon";

SplashScreen.preventAutoHideAsync();

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const pathname = usePathname();

  const [checkingAuth, setCheckingAuth] = useState(true);

  useEffect(() => {
    checkAuth();
  }, [pathname]);

  const checkAuth = async () => {
    try {
      const token = await AsyncStorage.getItem("token");

      console.log("========== ROUTE GUARD ==========");
      console.log("PATH:", pathname);
      console.log(
        "TOKEN:",
        token ? "มี Token" : "ไม่มี Token"
      );

      // ไม่มี Token
      if (!token) {
        // อนุญาต Login และ Register
        if (pathname !== "/login") {
          console.log(
            "NO TOKEN → REDIRECT TO LOGIN"
          );

          router.replace("/login");
        }

        setCheckingAuth(false);
        await SplashScreen.hideAsync();
        return;
      }

      // มี Token แต่เข้าหน้า Login หรือ Register
      if (
        token &&
        pathname === "/login"
      ) {
        console.log(
          "TOKEN EXISTS → REDIRECT TO HOME"
        );

        router.replace("/");
      }

      setCheckingAuth(false);
      await SplashScreen.hideAsync();

    } catch (error) {
      console.error(
        "ROUTE GUARD ERROR:",
        error
      );

      await AsyncStorage.removeItem("token");
      await AsyncStorage.removeItem("user");

      router.replace("/login");

      setCheckingAuth(false);
      await SplashScreen.hideAsync();
    }
  };

  if (checkingAuth) {
    return (
      <View style={{ flex: 1 }}>
        <AnimatedSplashOverlay />
      </View>
    );
  }

  return (
    <ThemeProvider
      value={
        colorScheme === "dark"
          ? DarkTheme
          : DefaultTheme
      }
    >
      <Stack
        screenOptions={{
          headerShown: false,
        }}
      />
    </ThemeProvider>
  );
}