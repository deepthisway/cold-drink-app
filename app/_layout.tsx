import { syncDatabaseWithCloud } from "@/src/db/sync/supabase";
import { Stack } from "expo-router";
import { useEffect, useRef, useState } from "react"; // CHANGED: added useRef
import { ActivityIndicator, AppState, StyleSheet, View } from "react-native"; // CHANGED: added AppState
import { getDB } from "../src/db/local/sqlite";
import { useAppStore } from "../src/store/appStore";
import { getOrCreateDeviceId } from "../src/utils/deviceId";

// NEW: how often to auto-sync in the background while the app is open
const SYNC_INTERVAL_MS = 25_000; // 25 seconds

export default function RootLayout() {
  const [dbInitialized, setDbInitialized] = useState(false);
  const setDeviceId = useAppStore((state) => state.setDeviceId);

  // NEW: wire up the previously-unused sync status fields from the store
  const setSyncingStatus = useAppStore((state) => state.setSyncingStatus);
  const setLastSyncedTime = useAppStore((state) => state.setLastSyncedTime);

  // NEW: guard so overlapping sync calls (interval tick + foreground resume
  // firing at the same time) don't run syncDatabaseWithCloud() concurrently
  const isSyncingRef = useRef(false);

  // NEW: shared sync runner used by initial load, interval, and app-resume
  const runSync = async () => {
    if (isSyncingRef.current) return; // a sync is already in flight, skip
    isSyncingRef.current = true;
    setSyncingStatus(true);
    try {
      await syncDatabaseWithCloud();
      setLastSyncedTime(new Date().toISOString());
    } finally {
      isSyncingRef.current = false;
      setSyncingStatus(false);
    }
  };

  useEffect(() => {
    async function prepareApp() {
      try {
        console.log("Hydrating persisted device ID...");
        const id = await getOrCreateDeviceId();
        setDeviceId(id);

        console.log("Opening local SQLite instance...");
        const db = await getDB();
        //  TEMPORARY DEVELOPER WIPE: Un-comment these lines, save, let the app reload ONCE to clear the old bills, then comment them back out!
        // await db.runAsync("DELETE FROM invoice_item;");
        // await db.runAsync("DELETE FROM stock_ledger;");
        // await db.runAsync("DELETE FROM invoice;");
        // await db.runAsync("DELETE FROM sku;");
        // console.log("Local testing bills flushed!");

        await runSync(); // CHANGED: was syncDatabaseWithCloud(), now uses shared runner

        setDbInitialized(true);
      } catch (error) {
        console.error("Failed to initialize app:", error);
      }
    }

    prepareApp();
  }, []);

  // NEW: periodic background sync while the app is open, so admin loads /
  // driver invoices show up on the other device without a restart
  useEffect(() => {
    if (!dbInitialized) return;

    const interval = setInterval(runSync, SYNC_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [dbInitialized]);

  // NEW: sync immediately when the app comes back to the foreground
  // (e.g. driver unlocks phone / switches back from another app)
  useEffect(() => {
    const subscription = AppState.addEventListener("change", (nextState) => {
      if (nextState === "active" && dbInitialized) {
        runSync();
      }
    });
    return () => subscription.remove();
  }, [dbInitialized]);

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
