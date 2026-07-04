import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
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

interface SKUStockRow {
  id: string;
  name: string;
  size: string | null;
  current_stock: number;
}

export default function LoadDailyStockScreen() {
  const router = useRouter();
  const [items, setItems] = useState<SKUStockRow[]>([]);
  const [loadQuantities, setLoadQuantities] = useState<Record<string, number>>(
    {},
  );
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    loadInventoryMetrics();
  }, []);

  async function loadInventoryMetrics() {
    try {
      const db = await getDB();
      const rows = await db.getAllAsync<any>(
        `SELECT 
            s.id, s.name, s.size,
            COALESCE(SUM(l.quantity), 0) as current_stock
         FROM sku s
         LEFT JOIN stock_ledger l ON s.id = l.sku_id
         WHERE s.active = 1
         GROUP BY s.id
         ORDER BY s.brand ASC, s.name ASC`,
      );
      setItems(rows);
    } catch (error) {
      console.error("Failed to load warehouse quantities:", error);
    }
  }

  // Stepper adjustment handler - Allows numbers to go negative freely
  const adjustQty = (skuId: string, delta: number) => {
    setLoadQuantities((prev) => {
      const currentVal = prev[skuId] || 0;
      return { ...prev, [skuId]: currentVal + delta };
    });
  };

  // Manual keyboard input handler - Safely handles typed minus signs
  const handleManualInput = (skuId: string, text: string) => {
    // Allows absolute negative tracking parameters if the user types a minus sign
    if (text === "-") {
      setLoadQuantities((prev) => ({ ...prev, [skuId]: 0 }));
      return;
    }

    const cleanNum = parseInt(text) || 0;
    setLoadQuantities((prev) => ({ ...prev, [skuId]: cleanNum }));
  };

  const handleSaveStockLoad = async () => {
    const validEntries = Object.entries(loadQuantities).filter(
      ([_, qty]) => qty !== 0,
    );

    if (validEntries.length === 0) {
      Alert.alert(
        "सूचना",
        "कृपया कम से कम एक आइटम में मात्रा (+ या -) दर्ज करें।",
      );
      return;
    }

    setIsSaving(true);
    try {
      const db = await getDB();
      const todayStr = new Date().toISOString().split("T")[0];
      const timestamp = new Date().toISOString();
      const placeholderDeviceId = "ADMIN-CONSOLE";

      for (const [skuId, qty] of validEntries) {
        const ledgerId = uuidv4();
        // Negative quantities automatically subtract from stock ledger balances, positive ones load them in
        const entryTypeLabel = qty > 0 ? "load" : "unload";

        await db.runAsync(
          `INSERT INTO stock_ledger (
            id, sku_id, entry_date, quantity, entry_type, invoice_id, created_at, device_id, synced
          ) VALUES (?, ?, ?, ?, ?, null, ?, ?, 0)`,
          [
            ledgerId,
            skuId,
            todayStr,
            qty,
            entryTypeLabel,
            timestamp,
            placeholderDeviceId,
          ],
        );
      }

      Alert.alert("सफलता", "स्टॉक अपडेट सफलतापूर्वक सुरक्षित हो गया है!", [
        { text: "ठीक है", onPress: () => router.back() },
      ]);
    } catch (error) {
      console.error("Database transaction failure saving changes:", error);
      Alert.alert("एरर", "स्टॉक लोड सहेजने में त्रुटि हुई।");
    } finally {
      setIsSaving(false);
    }
  };

  // Real-time calculated counters summary metrics breakdown
  const totalLoaded = Object.values(loadQuantities).reduce(
    (sum, val) => (val > 0 ? sum + val : sum),
    0,
  );
  const totalUnloaded = Object.values(loadQuantities).reduce(
    (sum, val) => (val < 0 ? sum + Math.abs(val) : sum),
    0,
  );

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={styles.container}
    >
      {/* Pinned Header Panel */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Feather name="arrow-left" size={24} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>दैनिक स्टॉक लोड / अनलोड</Text>
        <View style={{ width: 44 }} />
      </View>

      {/* Clean Dynamic Combined Overview Summary Ribbon */}
      <View style={styles.summaryBarCard}>
        <Text style={styles.summaryBarText}>
          लोड: <Text style={styles.loadHighlight}>{totalLoaded} पेटी</Text> |
          अनलोड:{" "}
          <Text style={styles.unloadHighlight}>{totalUnloaded} पेटी</Text>
        </Text>
      </View>

      {/* Main Stock Allocation List Feed */}
      <FlatList
        data={items}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContainer}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        renderItem={({ item }) => {
          const currentQty = loadQuantities[item.id] || 0;
          const isPositive = currentQty > 0;
          const isNegative = currentQty < 0;

          return (
            <View
              style={[
                styles.productRowCard,
                isPositive && styles.rowActiveLoad,
                isNegative && styles.rowActiveUnload,
              ]}
            >
              {/* Left Side: Product Identity specs elements */}
              <View style={styles.skuMetaDataBlock}>
                <Text style={styles.skuNameText} numberOfLines={1}>
                  {item.name}
                </Text>
                <Text style={styles.skuSubDetailsLabel}>
                  {item.size || "Standard"} • वैन में अभी: {item.current_stock}{" "}
                  पेटी
                </Text>
              </View>

              {/* Right Side: High contrast 3-Way Steppers Action Module */}
              <View
                style={[
                  styles.stepperInputGroup,
                  isNegative && styles.stepperInputGroupAlert,
                ]}
              >
                <TouchableOpacity
                  style={styles.stepperActionBtn}
                  activeOpacity={0.6}
                  onPress={() => adjustQty(item.id, -1)}
                >
                  <Feather name="minus" size={16} color="#111827" />
                </TouchableOpacity>

                <View style={styles.centerInputWrap}>
                  <TextInput
                    style={[
                      styles.embeddedInputBox,
                      currentQty !== 0 && styles.embeddedInputBoxBold,
                      isNegative && styles.negativeText,
                    ]}
                    value={currentQty === 0 ? "" : currentQty.toString()}
                    placeholder="0"
                    placeholderTextColor="#9CA3AF"
                    keyboardType="numbers-and-punctuation" // Allows inputting minus signs natively on specialized keypads
                    onChangeText={(text) => handleManualInput(item.id, text)}
                  />
                </View>

                <TouchableOpacity
                  style={styles.stepperActionBtn}
                  activeOpacity={0.6}
                  onPress={() => adjustQty(item.id, 1)}
                >
                  <Feather name="plus" size={16} color="#111827" />
                </TouchableOpacity>
              </View>
            </View>
          );
        }}
      />

      {/* FIXED FOOTER CONTROLS SHEET */}
      <View style={styles.stickyFooterContainer}>
        <TouchableOpacity
          style={[
            styles.executionSubmitBtn,
            isSaving && styles.btnDisabledState,
          ]}
          disabled={isSaving}
          activeOpacity={0.9}
          onPress={handleSaveStockLoad}
        >
          <Feather
            name="check-circle"
            size={20}
            color="#FFFFFF"
            style={{ marginRight: 8 }}
          />
          <Text style={styles.executionSubmitBtnText}>
            {isSaving ? "सुरक्षित हो रहा है..." : "स्टॉक अपडेट सुरक्षित करें"}
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
    paddingTop: 44,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderColor: "#E5E7EB",
  },
  backBtn: {
    width: 44,
    height: 44,
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: "#111827",
  },
  summaryBarCard: {
    backgroundColor: "#FFFFFF",
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderColor: "#E5E7EB",
    alignItems: "center",
  },
  summaryBarText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#4B5563",
  },
  loadHighlight: {
    color: "#111827",
    fontWeight: "900",
  },
  unloadHighlight: {
    color: "#DC2626",
    fontWeight: "900",
  },
  listContainer: {
    padding: 14,
    paddingBottom: 140,
  },
  productRowCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 22,
    paddingVertical: 12,
    paddingHorizontal: 14,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    elevation: 1,
  },
  rowActiveLoad: {
    borderColor: "#111827",
    borderWidth: 2,
    backgroundColor: "#F8FAFC",
  },
  rowActiveUnload: {
    borderColor: "#DC2626",
    borderWidth: 2,
    backgroundColor: "#FEF2F2",
  },
  skuMetaDataBlock: {
    flex: 0.54,
    justifyContent: "center",
  },
  skuNameText: {
    fontSize: 18,
    fontWeight: "800",
    color: "#111827",
  },
  skuSubDetailsLabel: {
    fontSize: 13,
    color: "#4B5563",
    fontWeight: "700",
    marginTop: 2,
  },
  stepperInputGroup: {
    flex: 0.46,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F3F4F6",
    borderRadius: 14,
    padding: 3,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  stepperInputGroupAlert: {
    backgroundColor: "#FEE2E2",
    borderColor: "#FCA5A5",
  },
  stepperActionBtn: {
    backgroundColor: "#FFFFFF",
    width: 34,
    height: 34,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
    elevation: 1,
  },
  centerInputWrap: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 2,
  },
  embeddedInputBox: {
    width: "100%",
    fontSize: 17,
    fontWeight: "700",
    color: "#4B5563",
    textAlign: "center",
    padding: 0,
  },
  embeddedInputBoxBold: {
    fontSize: 18,
    fontWeight: "900",
    color: "#111827",
  },
  negativeText: {
    color: "#DC2626",
  },
  stickyFooterContainer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "#FFFFFF",
    borderTopWidth: 1,
    borderColor: "#E5E7EB",
    paddingTop: 14,
    paddingHorizontal: 20,
    paddingBottom: 38,
    elevation: 16,
  },
  executionSubmitBtn: {
    backgroundColor: "#111827",
    height: 56,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    flexDirection: "row",
  },
  btnDisabledState: {
    backgroundColor: "#9CA3AF",
  },
  executionSubmitBtnText: {
    color: "#FFFFFF",
    fontSize: 17,
    fontWeight: "800",
  },
});
