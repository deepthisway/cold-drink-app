import { Feather } from "@expo/vector-icons";
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
import { getDB } from "../../src/db/local/sqlite";
import { syncDatabaseWithCloud } from "../../src/db/sync/supabase";

interface ItemPriceRow {
  id: string;
  name: string;
  size: string | null;
  price: number;
  active: number; // 1 = visible, 0 = hidden
}

export default function ItemsPricesScreen() {
  const router = useRouter();
  const [items, setItems] = useState<ItemPriceRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Temporary local state dictionaries tracking modifications
  const [priceChanges, setPriceChanges] = useState<Record<string, string>>({});
  const [statusChanges, setStatusChanges] = useState<Record<string, number>>(
    {},
  );

  useEffect(() => {
    loadMasterItems();
  }, []);

  async function loadMasterItems() {
    try {
      const db = await getDB();
      const rows = await db.getAllAsync<ItemPriceRow>(
        "SELECT id, name, size, price, active FROM sku ORDER BY name ASC",
      );
      setItems(rows);
    } catch (error) {
      console.error("Failed to query master product item rows:", error);
    } finally {
      setLoading(false);
    }
  }

  const handlePriceTextChange = (id: string, text: string) => {
    const cleanText = text.replace(/[^0-9]/g, "");
    setPriceChanges((prev) => ({ ...prev, [id]: cleanText }));
  };

  const toggleItemActiveStatus = (id: string, currentStatus: number) => {
    // If a modification already exists locally, invert it; otherwise, calculate next step state
    const targetBase =
      statusChanges[id] !== undefined ? statusChanges[id] : currentStatus;
    const nextStatus = targetBase === 1 ? 0 : 1;
    setStatusChanges((prev) => ({ ...prev, [id]: nextStatus }));
  };

  const handleSaveChanges = async () => {
    const priceUpdates = Object.entries(priceChanges);
    const statusUpdates = Object.entries(statusChanges);

    if (priceUpdates.length === 0 && statusUpdates.length === 0) {
      Alert.alert("सूचना", "कोई बदलाव नहीं किया गया है।");
      return;
    }

    setIsSaving(true);
    try {
      const db = await getDB();

      // 1. Process batch price corrections
      for (const [id, priceStr] of priceUpdates) {
        if (priceStr.trim() !== "") {
          const newPrice = parseInt(priceStr);
          await db.runAsync(
            "UPDATE sku SET price = ?, synced = 0 WHERE id = ?",
            [newPrice, id],
          );
        }
      }

      // 2. Process batch visibility switch status loops
      for (const [id, activeInt] of statusUpdates) {
        await db.runAsync(
          "UPDATE sku SET active = ?, synced = 0 WHERE id = ?",
          [activeInt, id],
        );
      }

      Alert.alert(
        "सफलता",
        "सभी आइटमों के दाम और स्टेटस सफलतापूर्वक अपडेट हो गए हैं!",
        [{ text: "ठीक है", onPress: () => router.back() }],
      );

      // Trigger ecosystem data sync immediately in the background
      syncDatabaseWithCloud().catch((err) =>
        console.error("Post-save background sync failure:", err),
      );
    } catch (error) {
      console.error(
        "Database updates failed inside master catalog transactions:",
        error,
      );
      Alert.alert("एरर", "डेटाबेस में बदलाव सुरक्षित करने में समस्या आई।");
    } finally {
      setIsSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#111827" />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={styles.container}
    >
      {/* Top Header Row Panel */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Feather name="arrow-left" size={24} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>सामान और रेट मैनेजमेंट</Text>

        {/* ADD PRODUCT BUTTON SHORTCUT */}
        <TouchableOpacity
          style={styles.addProductBtn}
          onPress={() => router.push("/(admin)/new-sku")}
          activeOpacity={0.7}
        >
          <Feather name="plus" size={18} color="#111827" />
          <Text style={styles.addProductBtnText}>जोड़ें</Text>
        </TouchableOpacity>
      </View>

      {/* Main Items Listing FlatList */}
      <FlatList
        data={items}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContainer}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        renderItem={({ item }) => {
          // Resolve if dynamic changes are live in memory
          const livePriceStr =
            priceChanges[item.id] !== undefined
              ? priceChanges[item.id]
              : item.price.toString();
          const liveActiveStatus =
            statusChanges[item.id] !== undefined
              ? statusChanges[item.id]
              : item.active;
          const isItemActive = liveActiveStatus === 1;

          return (
            <View
              style={[
                styles.itemConfigCard,
                !isItemActive && styles.itemConfigCardDisabled,
              ]}
            >
              {/* Left Identity Column block */}
              <View style={styles.productMetaInfoBlock}>
                <Text
                  style={[
                    styles.productNameText,
                    !isItemActive && styles.textMuted,
                  ]}
                  numberOfLines={1}
                >
                  {item.name}
                </Text>
                <Text style={styles.productSizeText}>
                  साइज: {item.size || "Standard"}
                </Text>

                {/* Visual Status Activation Chip */}
                <TouchableOpacity
                  style={[
                    styles.statusToggleBadge,
                    isItemActive ? styles.badgeActive : styles.badgeInactive,
                  ]}
                  activeOpacity={0.7}
                  onPress={() => toggleItemActiveStatus(item.id, item.active)}
                >
                  <View
                    style={[
                      styles.dotMarker,
                      isItemActive ? styles.dotActive : styles.dotInactive,
                    ]}
                  />
                  <Text
                    style={[
                      styles.statusToggleText,
                      isItemActive ? styles.textActive : styles.textInactive,
                    ]}
                  >
                    {isItemActive ? "चालू (Active)" : "बंद (Hidden)"}
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Right Pricing Inputs Segment Block */}
              <View style={styles.pricingInputColumn}>
                <Text style={styles.pricingFieldLabel}>
                  रेट (Wholesale Rate)
                </Text>
                <View style={styles.inputPrefixWrap}>
                  <Text style={styles.currencySymbolText}>₹</Text>
                  <TextInput
                    style={styles.rateInputField}
                    value={livePriceStr}
                    placeholder="0"
                    placeholderTextColor="#9CA3AF"
                    keyboardType="number-pad"
                    maxLength={5}
                    editable={isItemActive} // Block editing rates on inactive items to preserve clarity
                    onChangeText={(text) =>
                      handlePriceTextChange(item.id, text)
                    }
                  />
                </View>
              </View>
            </View>
          );
        }}
      />

      {/* FIXED FOOTER CONTROLS ROW PANEL CONTAINER */}
      <View style={styles.stickyFooterContainer}>
        <TouchableOpacity
          style={[
            styles.executionSubmitBtn,
            isSaving && styles.btnDisabledState,
          ]}
          disabled={isSaving}
          activeOpacity={0.9}
          onPress={handleSaveChanges}
        >
          <Feather
            name="save"
            size={20}
            color="#FFFFFF"
            style={{ marginRight: 8 }}
          />
          <Text style={styles.executionSubmitBtnText}>
            {isSaving
              ? "बदलाव सुरक्षित हो रहे हैं..."
              : "रेट और स्टेटस सुरक्षित करें"}
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
    flex: 1,
    marginLeft: 8,
  },
  addProductBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F3F4F6",
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  addProductBtnText: {
    fontSize: 14,
    fontWeight: "750",
    color: "#111827",
    marginLeft: 2,
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F3F4F6",
  },
  listContainer: {
    padding: 14,
    paddingBottom: 130,
  },
  itemConfigCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 22,
    padding: 16,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    elevation: 1,
  },
  itemConfigCardDisabled: {
    backgroundColor: "#F9FAFB",
    borderColor: "#E5E7EB",
  },
  productMetaInfoBlock: {
    flex: 0.58,
    justifyContent: "center",
  },
  productNameText: {
    fontSize: 18,
    fontWeight: "800",
    color: "#111827",
  },
  productSizeText: {
    fontSize: 14,
    color: "#6B7280",
    fontWeight: "600",
    marginTop: 2,
  },
  textMuted: {
    color: "#9CA3AF",
    textDecorationLine: "line-through",
  },
  statusToggleBadge: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 8,
    marginTop: 8,
    borderWidth: 1,
  },
  badgeActive: {
    backgroundColor: "#ECFDF5",
    borderColor: "#A7F3D0",
  },
  badgeInactive: {
    backgroundColor: "#F3F4F6",
    borderColor: "#E5E7EB",
  },
  dotMarker: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 6,
  },
  dotActive: {
    backgroundColor: "#10B981",
  },
  dotInactive: {
    backgroundColor: "#9CA3AF",
  },
  statusToggleText: {
    fontSize: 12,
    fontWeight: "700",
  },
  textActive: {
    color: "#065F46",
  },
  textInactive: {
    color: "#374151",
  },
  pricingInputColumn: {
    flex: 0.42,
    alignItems: "flex-end",
  },
  pricingFieldLabel: {
    fontSize: 12,
    color: "#6B7280",
    fontWeight: "750",
    textTransform: "uppercase",
    letterSpacing: 0.3,
    marginBottom: 6,
  },
  inputPrefixWrap: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F3F4F6",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    height: 48,
    paddingHorizontal: 12,
    width: "100%",
  },
  currencySymbolText: {
    fontSize: 18,
    fontWeight: "800",
    color: "#4B5563",
    marginRight: 4,
  },
  rateInputField: {
    flex: 1,
    fontSize: 18,
    fontWeight: "900",
    color: "#111827",
    padding: 0,
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
