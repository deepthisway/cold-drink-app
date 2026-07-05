import { Feather } from "@expo/vector-icons";
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
import { syncDatabaseWithCloud } from "../../src/db/sync/supabase";

export default function NewSKUScreen() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [brand, setBrand] = useState("");
  const [size, setSize] = useState("");
  const [price, setPrice] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const handleCreateSKU = async () => {
    if (!name.trim()) {
      Alert.alert("त्रुटि (Error)", "कृपया आइटम का नाम दर्ज करें!");
      return;
    }

    const parsedPrice = parseFloat(price);
    if (isNaN(parsedPrice) || parsedPrice <= 0) {
      Alert.alert("त्रुटि (Error)", "कृपया एक सही रेट (Price) दर्ज करें!");
      return;
    }

    setIsSaving(true);
    try {
      const db = await getDB();
      const newSkuId = uuidv4();
      const timestamp = new Date().toISOString();

      // Insert directly into local SQLite schema with synced = 0
      await db.runAsync(
        `INSERT INTO sku (id, name, brand, size, price, image_path, active, created_at, synced) 
         VALUES (?, ?, ?, ?, ?, null, 1, ?, 0)`,
        [
          newSkuId,
          name.trim(),
          brand.trim() || null,
          size.trim() || null,
          parsedPrice,
          timestamp,
        ],
      );

      Alert.alert("सफलता (Success)", "नया आइटम सफलतापूर्वक जोड़ दिया गया है!", [
        { text: "ठीक है (OK)", onPress: () => router.back() },
      ]);

      // Trigger background synchronization engine immediately
      syncDatabaseWithCloud().catch((err) =>
        console.error("Background auto-sync failed silently:", err),
      );
    } catch (error) {
      console.error(
        "Database transaction failure inserting new product SKU:",
        error,
      );
      Alert.alert("डेटाबेस एरर", "नया आइटम सुरक्षित नहीं किया जा सका।");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={styles.container}
    >
      {/* Header Panel */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Feather name="arrow-left" size={24} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>नया आइटम जोड़ें</Text>
        <View style={{ width: 44 }} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContainer}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Form Container Card */}
        <View style={styles.formCard}>
          <Text style={styles.cardTitle}>
            प्रोडक्ट की जानकारी (Product Details)
          </Text>
          <View style={styles.tableDivider} />

          {/* Product Name (Mandatory) */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>सामान का नाम (Product Name) *</Text>
            <TextInput
              style={styles.textInputStyle}
              placeholder="उदा. Coke 200ml..."
              placeholderTextColor="#9CA3AF"
              value={name}
              onChangeText={setName}
            />
          </View>

          {/* Wholesale Price (Mandatory) */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>
              होलसेल रेट (Wholesale Rate - ₹) *
            </Text>
            <TextInput
              style={styles.textInputStyle}
              placeholder="उदा. 400..."
              placeholderTextColor="#9CA3AF"
              keyboardType="numeric"
              value={price}
              onChangeText={setPrice}
            />
          </View>

          {/* Brand (Optional) */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>
              ब्रांड (Brand Name - Optional)
            </Text>
            <TextInput
              style={styles.textInputStyle}
              placeholder="उदा. Coca Cola..."
              placeholderTextColor="#9CA3AF"
              value={brand}
              onChangeText={setBrand}
            />
          </View>

          {/* Volume Size Spec (Optional) */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>
              साइज/वॉल्यूम (Size Specs - Optional)
            </Text>
            <TextInput
              style={styles.textInputStyle}
              placeholder="उदा. 200ml x 24 Pcs..."
              placeholderTextColor="#9CA3AF"
              value={size}
              onChangeText={setSize}
            />
          </View>
        </View>
      </ScrollView>

      {/* FIXED FOOTER CONTROLS DRAWER */}
      <View style={styles.stickyFooterContainer}>
        <TouchableOpacity
          style={[styles.submitButton, isSaving && styles.disabledButton]}
          disabled={isSaving}
          activeOpacity={0.9}
          onPress={handleCreateSKU}
        >
          <Feather
            name="plus-circle"
            size={20}
            color="#FFFFFF"
            style={{ marginRight: 8 }}
          />
          <Text style={styles.submitButtonText}>
            {isSaving ? "सुरक्षित हो रहा है..." : "नया आइटम सुरक्षित करें"}
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
  scrollContainer: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 130,
  },
  formCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 22,
    padding: 16,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    elevation: 1,
  },
  cardTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: "#6B7280",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  tableDivider: {
    height: 1,
    backgroundColor: "#E5E7EB",
    marginVertical: 12,
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 15,
    fontWeight: "700",
    color: "#4B5563",
    marginBottom: 8,
  },
  textInputStyle: {
    backgroundColor: "#F3F4F6",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    height: 54,
    borderRadius: 12,
    paddingHorizontal: 16,
    fontSize: 18,
    fontWeight: "700",
    color: "#111827",
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
  submitButton: {
    backgroundColor: "#111827",
    height: 56,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    flexDirection: "row",
  },
  disabledButton: {
    backgroundColor: "#9CA3AF",
  },
  submitButtonText: {
    color: "#FFFFFF",
    fontSize: 17,
    fontWeight: "800",
  },
});
