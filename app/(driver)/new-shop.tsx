import { useRouter } from "expo-router";
import { useState } from "react";
import {
    Alert,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
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

export default function NewShopScreen() {
  const router = useRouter();
  const selectShop = useAppStore((state) => state.selectShop);

  const [shopName, setShopName] = useState("");
  const [phone, setPhone] = useState("");

  const handleSaveShop = async () => {
    if (!shopName.trim()) {
      Alert.alert(
        "Error",
        "कृपया दुकान का नाम दर्ज करें (Please enter shop name)",
      );
      return;
    }

    try {
      const db = await getDB();
      const newShopId = uuidv4();
      const timestamp = new Date().toISOString();

      // Write locally to SQLite first (offline safe)
      await db.runAsync(
        "INSERT INTO shop (id, name, phone, created_at, synced) VALUES (?, ?, ?, ?, 0)",
        [newShopId, shopName.trim(), phone.trim() || null, timestamp],
      );

      // Auto-select the newly registered shop into active state memory
      selectShop(newShopId, shopName.trim());

      // Drop driver directly into the cart-building grid matrix
      router.push("/(driver)/billing");
    } catch (error) {
      console.error("Failed to create new shop entry:", error);
      Alert.alert("Error", "Failed to save new shop. Please try again.");
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={styles.container}
    >
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <Text style={styles.title}>नई दुकान की जानकारी</Text>
        <Text style={styles.subtitle}>Enter New Shop Details</Text>

        <View style={styles.formGroup}>
          <Text style={styles.label}>दुकान का नाम (Shop Name) *</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. Verma Ji Provision Store"
            placeholderTextColor="#9CA3AF"
            value={shopName}
            onChangeText={setShopName}
          />
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>फ़ोन नंबर (Phone Number - Optional)</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. 9876543210"
            placeholderTextColor="#9CA3AF"
            keyboardType="phone-pad"
            value={phone}
            onChangeText={setPhone}
            maxLength={10}
          />
        </View>

        <TouchableOpacity style={styles.saveButton} onPress={handleSaveShop}>
          <Text style={styles.saveButtonText}>
            सहेजें और आगे बढ़ें (Save & Continue)
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F3F4F6",
  },
  scrollContainer: {
    paddingTop: 60,
    paddingHorizontal: 24,
    paddingBottom: 40,
  },
  title: {
    fontSize: 26,
    fontWeight: "bold",
    color: "#1F2937",
  },
  subtitle: {
    fontSize: 14,
    color: "#6B7280",
    marginBottom: 32,
  },
  formGroup: {
    marginBottom: 24,
  },
  label: {
    fontSize: 16,
    fontWeight: "600",
    color: "#4B5563",
    marginBottom: 8,
  },
  input: {
    backgroundColor: "#FFFFFF",
    height: 56,
    borderRadius: 12,
    paddingHorizontal: 16,
    fontSize: 18,
    color: "#1F2937",
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  saveButton: {
    backgroundColor: "#10B981",
    height: 60,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 16,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  saveButtonText: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "bold",
  },
});
