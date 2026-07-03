import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    FlatList,
    KeyboardAvoidingView,
    Platform,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
import "react-native-get-random-values";
import { v4 as uuidv4 } from "uuid";
import { getDB } from "../../src/db/local/sqlite";
import { useAppStore } from "../../src/store/appStore";

interface ActiveSKU {
  id: string;
  name: string;
  brand: string | null;
  size: string | null;
}

export default function LoadStockScreen() {
  const router = useRouter();
  const { deviceId } = useAppStore();
  const [loading, setLoading] = useState(true);
  const [skus, setSkus] = useState<ActiveSKU[]>([]);
  const [loadQuantities, setLoadQuantities] = useState<Record<string, string>>(
    {},
  );
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    async function fetchActiveSkus() {
      try {
        const db = await getDB();
        const rows = await db.getAllAsync<ActiveSKU>(
          "SELECT id, name, brand, size FROM sku WHERE active = 1 ORDER BY brand ASC, name ASC",
        );
        setSkus(rows);
      } catch (error) {
        console.error("Failed to fetch SKUs for loading:", error);
        Alert.alert("Error", "Could not load item list.");
      } finally {
        setLoading(false);
      }
    }
    fetchActiveSkus();
  }, []);

  const handleQuantityChange = (id: string, value: string) => {
    // Only allow numeric input
    const numericValue = value.replace(/[^0-9]/g, "");
    setLoadQuantities((prev) => ({
      ...prev,
      [id]: numericValue,
    }));
  };

  const handleSaveStock = async () => {
    if (isSubmitting) return;

    // Filter out items that have no quantity entered or are zero
    const itemsToLoad = Object.entries(loadQuantities)
      .map(([id, qtyStr]) => ({ id, qty: parseInt(qtyStr, 10) }))
      .filter((item) => !isNaN(item.qty) && item.qty > 0);

    if (itemsToLoad.length === 0) {
      Alert.alert("No Data", "Please enter at least one box quantity to load.");
      return;
    }

    setIsSubmitting(true);

    try {
      const db = await getDB();
      const todayStr = new Date().toISOString().split("T")[0];
      const timestamp = new Date().toISOString();

      for (const item of itemsToLoad) {
        const ledgerId = uuidv4();
        await db.runAsync(
          `INSERT INTO stock_ledger (
            id, sku_id, entry_date, quantity, entry_type, invoice_id, created_at, device_id, synced
          ) VALUES (?, ?, ?, ?, 'load', null, ?, ?, 0)`,
          [ledgerId, item.id, todayStr, item.qty, timestamp, deviceId],
        );
      }

      Alert.alert("Success", "Stock loaded successfully!", [
        {
          text: "OK",
          onPress: () => {
            // Clear inputs and go back to dashboard
            setLoadQuantities({});
            router.back();
          },
        },
      ]);
    } catch (error) {
      console.error("Failed to save stock loads:", error);
      Alert.alert("Database Error", "Could not save the stock load.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#3B82F6" />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={styles.container}
    >
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Text style={styles.backBtnText}>⬅️ Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Load Van Stock</Text>
      </View>

      {/* Main List */}
      <FlatList
        data={skus}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContainer}
        ListHeaderComponent={
          <View style={styles.listHeader}>
            <Text style={styles.subtitle}>
              Enter the number of boxes added to the van today.
            </Text>
          </View>
        }
        renderItem={({ item }) => (
          <View style={styles.row}>
            <View style={styles.itemInfo}>
              <Text style={styles.itemName} numberOfLines={1}>
                {item.name}
              </Text>
              <Text style={styles.itemSpecs}>
                {item.brand} • {item.size}
              </Text>
            </View>
            <TextInput
              style={styles.input}
              placeholder="0"
              placeholderTextColor="#9CA3AF"
              keyboardType="number-pad"
              value={loadQuantities[item.id] || ""}
              onChangeText={(val) => handleQuantityChange(item.id, val)}
              maxLength={4}
            />
          </View>
        )}
      />

      {/* Sticky Bottom Save Button */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.saveBtn, isSubmitting && styles.saveBtnDisabled]}
          onPress={handleSaveStock}
          disabled={isSubmitting}
        >
          <Text style={styles.saveBtnText}>
            {isSubmitting ? "Saving..." : "💾 Save Stock Load"}
          </Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F3F4F6",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: 50,
    paddingBottom: 16,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderColor: "#E5E7EB",
    gap: 12,
  },
  backBtn: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: "#F3F4F6",
    borderRadius: 8,
  },
  backBtnText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#4B5563",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#1F2937",
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  listContainer: {
    padding: 16,
    paddingBottom: 100,
  },
  listHeader: {
    marginBottom: 16,
  },
  subtitle: {
    fontSize: 14,
    color: "#6B7280",
  },
  row: {
    flexDirection: "row",
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 16,
    marginBottom: 10,
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  itemInfo: {
    flex: 0.75,
  },
  itemName: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#1F2937",
  },
  itemSpecs: {
    fontSize: 13,
    color: "#6B7280",
    marginTop: 4,
  },
  input: {
    flex: 0.2,
    backgroundColor: "#F9FAFB",
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 8,
    height: 48,
    fontSize: 20,
    fontWeight: "bold",
    textAlign: "center",
    color: "#3B82F6",
  },
  footer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "#FFFFFF",
    padding: 16,
    borderTopWidth: 1,
    borderColor: "#E5E7EB",
    elevation: 8,
  },
  saveBtn: {
    backgroundColor: "#3B82F6",
    height: 56,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  saveBtnDisabled: {
    backgroundColor: "#9CA3AF",
  },
  saveBtnText: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "bold",
  },
});
