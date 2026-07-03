import { syncDatabaseWithCloud } from "@/src/db/sync/supabase";
import { Stack } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import { getDB } from "../src/db/local/sqlite";
import { useAppStore } from "../src/store/appStore";
import { getOrCreateDeviceId } from "../src/utils/deviceId";

export default function RootLayout() {
  const [dbInitialized, setDbInitialized] = useState(false);
  const setDeviceId = useAppStore((state) => state.setDeviceId);

  useEffect(() => {
    async function prepareApp() {
      try {
        console.log("Hydrating persisted device ID...");
        const id = await getOrCreateDeviceId();
        setDeviceId(id);

        console.log("Opening local SQLite instance...");
        await getDB();

        await syncDatabaseWithCloud();

        setDbInitialized(true);
      } catch (error) {
        console.error("Failed to initialize app:", error);
      }
    }

    prepareApp();
  }, []);

  if (!dbInitialized) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(driver)" options={{ headerShown: false }} />
      <Stack.Screen name="(admin)" options={{ headerShown: false }} />
    </Stack>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F3F4F6",
  },
});
