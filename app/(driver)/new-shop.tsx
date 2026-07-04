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

export default function NewShopScreen() {
  const router = useRouter();
  const [shopName, setShopName] = useState("");
  const [phone, setPhone] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const handleCreateShop = async () => {
    if (!shopName.trim()) {
      Alert.alert("त्रुटि (Error)", "कृपया दुकान का नाम दर्ज करें!");
      return;
    }

    setIsSaving(true);
    try {
      const db = await getDB();
      const newShopId = uuidv4();
      const timestamp = new Date().toISOString();

      await db.runAsync(
        `INSERT INTO shop (id, name, phone, address, active, created_at, synced) 
         VALUES (?, ?, ?, null, 1, ?, 0)`,
        [newShopId, shopName.trim(), phone.trim() || null, timestamp],
      );

      Alert.alert("सफलता (Success)", "नई दुकान सफलतापूर्वक जोड़ दी गई है!", [
        { text: "ठीक है (OK)", onPress: () => router.back() },
      ]);
    } catch (error) {
      console.error("Failed to insert new shop layout row:", error);
      Alert.alert("डेटाबेस एरर", "दुकान सुरक्षित नहीं की जा सकी।");
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
        <Text style={styles.headerTitle}>नई दुकान जोड़ें</Text>
        <View style={{ width: 44 }} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContainer}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Form Container Card */}
        <View style={styles.formCard}>
          <Text style={styles.cardTitle}>दुकान की जानकारी (Shop Details)</Text>
          <View style={styles.tableDivider} />

          {/* Shop Name Input Group (Mandatory) */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>दुकान का नाम (Shop Name) *</Text>
            <TextInput
              style={styles.textInputStyle}
              placeholder="नाम दर्ज करें..."
              placeholderTextColor="#9CA3AF"
              value={shopName}
              onChangeText={setShopName}
            />
          </View>

          {/* Phone Number Input Group (Optional) */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>
              मोबाइल नंबर (Phone Number - Optional)
            </Text>
            <TextInput
              style={styles.textInputStyle}
              placeholder="10 अंकों का नंबर (यदि हो तो)..."
              placeholderTextColor="#9CA3AF"
              keyboardType="phone-pad"
              maxLength={10}
              value={phone}
              onChangeText={setPhone}
            />
          </View>
        </View>
      </ScrollView>

      {/* FIXED FOOTER CONTROLS CONTAINER */}
      <View style={styles.stickyFooterContainer}>
        <TouchableOpacity
          style={[styles.submitButton, isSaving && styles.disabledButton]}
          disabled={isSaving}
          activeOpacity={0.9}
          onPress={handleCreateShop}
        >
          <Feather
            name="check-square"
            size={20}
            color="#FFFFFF"
            style={{ marginRight: 8 }}
          />
          <Text style={styles.submitButtonText}>
            {isSaving
              ? "सुरक्षित हो रहा है..."
              : "दुकान सुरक्षित करें (Save Shop)"}
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
