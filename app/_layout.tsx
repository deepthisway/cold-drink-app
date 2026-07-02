import { syncDatabaseWithCloud } from "@/src/db/sync/supabase";
import { Stack } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import { getDB } from "../src/db/local/sqlite";

export default function RootLayout() {
  const [dbInitialized, setDbInitialized] = useState(false);

  useEffect(() => {
    async function prepareDatabase() {
      try {
        console.log("Opening local SQLite instance...");
        await getDB();

        // Pull the live products and shops straight from your Supabase dashboard insert
        await syncDatabaseWithCloud();

        setDbInitialized(true);
      } catch (error) {
        console.error("Failed to initialize local SQLite layer:", error);
      }
    }

    prepareDatabase();
  }, []);

  // Show a clean loading state while SQLite initializes tables on the first cold launch
  if (!dbInitialized) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      {/* Driver screens routing group */}
      <Stack.Screen name="(driver)" options={{ headerShown: false }} />

      {/* Admin screens routing group */}
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
