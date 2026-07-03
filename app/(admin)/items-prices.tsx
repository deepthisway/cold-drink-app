import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    FlatList,
    KeyboardAvoidingView,
    Modal,
    Platform,
    StyleSheet,
    Switch,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
import { getDB } from "../../src/db/local/sqlite";

interface SKU {
  id: string;
  name: string;
  brand: string | null;
  size: string | null;
  price: number;
  active: number;
}

export default function ItemsPricesScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [skus, setSkus] = useState<SKU[]>([]);

  // Modal State
  const [editingSku, setEditingSku] = useState<SKU | null>(null);
  const [newPrice, setNewPrice] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    loadSkus();
  }, []);

  const loadSkus = async () => {
    try {
      const db = await getDB();
      const rows = await db.getAllAsync<SKU>(
        "SELECT * FROM sku ORDER BY active DESC, brand ASC, name ASC",
      );
      setSkus(rows);
    } catch (error) {
      console.error("Failed to load SKUs:", error);
      Alert.alert("Error", "Could not load items from database.");
    } finally {
      setLoading(false);
    }
  };

  const toggleActiveStatus = async (id: string, currentStatus: number) => {
    const newStatus = currentStatus === 1 ? 0 : 1;

    // Optimistically update UI
    setSkus((prev) =>
      prev.map((sku) => (sku.id === id ? { ...sku, active: newStatus } : sku)),
    );

    try {
      const db = await getDB();
      // Mark synced = 0 so any future catalog upload engine pushes it to cloud
      await db.runAsync("UPDATE sku SET active = ?, synced = 0 WHERE id = ?", [
        newStatus,
        id,
      ]);
    } catch (error) {
      console.error("Failed to toggle SKU active status:", error);
      // Revert UI on failure
      setSkus((prev) =>
        prev.map((sku) =>
          sku.id === id ? { ...sku, active: currentStatus } : sku,
        ),
      );
      Alert.alert("Database Error", "Could not update item status.");
    }
  };

  const openPriceModal = (sku: SKU) => {
    setEditingSku(sku);
    setNewPrice(sku.price.toString());
  };

  const handleSavePrice = async () => {
    if (!editingSku) return;

    const parsedPrice = parseInt(newPrice, 10);
    if (isNaN(parsedPrice) || parsedPrice <= 0) {
      Alert.alert(
        "Invalid Price",
        "Please enter a valid number greater than 0.",
      );
      return;
    }

    setIsSaving(true);
    try {
      const db = await getDB();
      await db.runAsync("UPDATE sku SET price = ?, synced = 0 WHERE id = ?", [
        parsedPrice,
        editingSku.id,
      ]);

      // Update local state
      setSkus((prev) =>
        prev.map((sku) =>
          sku.id === editingSku.id ? { ...sku, price: parsedPrice } : sku,
        ),
      );
      setEditingSku(null);
    } catch (error) {
      console.error("Failed to update price:", error);
      Alert.alert("Database Error", "Could not save the new price.");
    } finally {
      setIsSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#8B5CF6" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Text style={styles.backBtnText}>⬅️ Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Items & Prices</Text>
      </View>

      <FlatList
        data={skus}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContainer}
        renderItem={({ item }) => (
          <View
            style={[
              styles.itemCard,
              item.active === 0 && styles.itemCardInactive,
            ]}
          >
            <View style={styles.itemMain}>
              <Text
                style={[
                  styles.itemName,
                  item.active === 0 && styles.textInactive,
                ]}
              >
                {item.name}
              </Text>
              <Text style={styles.itemSpecs}>
                {item.brand} • {item.size}
              </Text>

              <View style={styles.priceRow}>
                <Text style={styles.priceLabel}>Price: </Text>
                <Text style={styles.priceValue}>₹{item.price}</Text>
                <TouchableOpacity
                  style={styles.editPriceBtn}
                  onPress={() => openPriceModal(item)}
                >
                  <Text style={styles.editPriceBtnText}>✏️ Edit</Text>
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.toggleContainer}>
              <Text style={styles.toggleLabel}>
                {item.active === 1 ? "Active" : "Hidden"}
              </Text>
              <Switch
                value={item.active === 1}
                onValueChange={() => toggleActiveStatus(item.id, item.active)}
                trackColor={{ false: "#D1D5DB", true: "#C4B5FD" }}
                thumbColor={item.active === 1 ? "#8B5CF6" : "#9CA3AF"}
              />
            </View>
          </View>
        )}
      />

      {/* Edit Price Modal Overlay */}
      <Modal
        visible={!!editingSku}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setEditingSku(null)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.modalOverlay}
        >
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Edit Price</Text>
            <Text style={styles.modalSubtitle}>{editingSku?.name}</Text>

            <View style={styles.inputWrapper}>
              <Text style={styles.currencySymbol}>₹</Text>
              <TextInput
                style={styles.priceInput}
                keyboardType="number-pad"
                value={newPrice}
                onChangeText={setNewPrice}
                autoFocus={true}
                maxLength={5}
              />
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => setEditingSku(null)}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.modalSaveBtn,
                  isSaving && styles.modalSaveBtnDisabled,
                ]}
                onPress={handleSavePrice}
                disabled={isSaving}
              >
                <Text style={styles.modalSaveText}>
                  {isSaving ? "Saving..." : "Save Price"}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
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
    paddingBottom: 40,
  },
  itemCard: {
    flexDirection: "row",
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    alignItems: "center",
    justifyContent: "space-between",
    elevation: 1,
  },
  itemCardInactive: {
    backgroundColor: "#F9FAFB",
    opacity: 0.7,
  },
  itemMain: {
    flex: 0.75,
  },
  itemName: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#1F2937",
  },
  textInactive: {
    color: "#6B7280",
    textDecorationLine: "line-through",
  },
  itemSpecs: {
    fontSize: 13,
    color: "#6B7280",
    marginTop: 2,
    marginBottom: 8,
  },
  priceRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  priceLabel: {
    fontSize: 14,
    color: "#4B5563",
  },
  priceValue: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#8B5CF6",
  },
  editPriceBtn: {
    marginLeft: 12,
    backgroundColor: "#F3F4F6",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  editPriceBtnText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#4B5563",
  },
  toggleContainer: {
    flex: 0.25,
    alignItems: "flex-end",
  },
  toggleLabel: {
    fontSize: 12,
    color: "#6B7280",
    fontWeight: "600",
    marginBottom: 4,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modalContent: {
    backgroundColor: "#FFFFFF",
    width: "100%",
    maxWidth: 340,
    borderRadius: 16,
    padding: 24,
    elevation: 5,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#1F2937",
  },
  modalSubtitle: {
    fontSize: 15,
    color: "#6B7280",
    marginTop: 4,
    marginBottom: 20,
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 10,
    paddingHorizontal: 16,
    backgroundColor: "#F9FAFB",
    marginBottom: 24,
  },
  currencySymbol: {
    fontSize: 24,
    color: "#6B7280",
    marginRight: 8,
    fontWeight: "500",
  },
  priceInput: {
    flex: 1,
    height: 60,
    fontSize: 28,
    fontWeight: "bold",
    color: "#1F2937",
  },
  modalActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 12,
  },
  modalCancelBtn: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  modalCancelText: {
    fontSize: 16,
    color: "#6B7280",
    fontWeight: "600",
  },
  modalSaveBtn: {
    backgroundColor: "#8B5CF6",
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  modalSaveBtnDisabled: {
    backgroundColor: "#C4B5FD",
  },
  modalSaveText: {
    fontSize: 16,
    color: "#FFFFFF",
    fontWeight: "bold",
  },
});
