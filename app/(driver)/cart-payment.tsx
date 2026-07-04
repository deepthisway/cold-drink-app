import { printReceipt } from "@/src/utils/printer";
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

export default function CartPaymentScreen() {
  const router = useRouter();
  const {
    currentShopId,
    currentShopName,
    cart,
    deviceId,
    printerAddress,
    resetInvoiceSession,
  } = useAppStore();

  const [cashInput, setCashInput] = useState("");
  const [paytmInput, setPaytmInput] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Compute total layout calculations
  const totalBoxes = Object.values(cart).reduce(
    (sum, item) => sum + item.boxes,
    0,
  );
  const totalAmount = Object.values(cart).reduce(
    (sum, item) => sum + item.boxes * item.price,
    0,
  );

  const cashAmount = parseFloat(cashInput) || 0;
  const paytmAmount = parseFloat(paytmInput) || 0;

  // Udhaar is strictly auto-calculated as the remaining balance
  const udhaarAmount = Math.max(0, totalAmount - (cashAmount + paytmAmount));

  // Shortcut to clear inputs and mark full amount paid via cash instantly
  const handleFullCashShortcut = () => {
    setCashInput(totalAmount.toString());
    setPaytmInput("");
  };

  const handlePrintAndSave = async () => {
    if (isSubmitting) return;

    if (cashAmount + paytmAmount > totalAmount) {
      Alert.alert(
        "Error",
        "दर्ज की गई राशि कुल बिल से अधिक है! (Entered money exceeds total bill!)",
      );
      return;
    }

    if (!currentShopId) {
      Alert.alert("Error", "Shop context is missing.");
      return;
    }

    setIsSubmitting(true);

    try {
      const db = await getDB();
      const invoiceId = uuidv4();
      const todayStr = new Date().toISOString().split("T")[0];
      const timestamp = new Date().toISOString();

      // 1. Actually attempt to print FIRST, so we know whether it succeeded
      const printSuccess = await printReceipt(
        {
          shopName: currentShopName || "Unknown Shop",
          date: todayStr,
          totalBoxes,
          totalAmount,
          cashPaid: cashAmount,
          paytmPaid: paytmAmount,
          udhaar: udhaarAmount,
          items: Object.values(cart).map((item) => ({
            name: item.name,
            boxes: item.boxes,
            price: item.price,
            amount: item.boxes * item.price,
          })),
        },
        printerAddress,
      );

      // 2. Save invoice with the REAL printed status, not a hardcoded 1
      await db.runAsync(
        `INSERT INTO invoice (
        id, display_number, shop_id, invoice_date, created_at, 
        total_amount, total_boxes, cash_amount, paytm_amount, udhaar_amount, 
        status, printed, device_id, synced
      ) VALUES (?, null, ?, ?, ?, ?, ?, ?, ?, ?, 'active', ?, ?, 0)`,
        [
          invoiceId,
          currentShopId,
          todayStr,
          timestamp,
          totalAmount,
          totalBoxes,
          cashAmount,
          paytmAmount,
          udhaarAmount,
          printSuccess ? 1 : 0,
          deviceId,
        ],
      );

      for (const item of Object.values(cart)) {
        const itemId = uuidv4();
        const ledgerId = uuidv4();
        const itemTotal = item.boxes * item.price;

        await db.runAsync(
          "INSERT INTO invoice_item (id, invoice_id, sku_id, boxes, amount, synced) VALUES (?, ?, ?, ?, ?, 0)",
          [itemId, invoiceId, item.skuId, item.boxes, itemTotal],
        );

        await db.runAsync(
          `INSERT INTO stock_ledger (
          id, sku_id, entry_date, quantity, entry_type, invoice_id, created_at, device_id, synced
        ) VALUES (?, ?, ?, ?, 'sale', ?, ?, ?, 0)`,
          [
            ledgerId,
            item.skuId,
            todayStr,
            -item.boxes,
            invoiceId,
            timestamp,
            deviceId,
          ],
        );
      }

      resetInvoiceSession();

      if (!printSuccess) {
        // Invoice is saved either way (offline-safe), but let them know printing failed
        Alert.alert(
          "Saved, but Printing Failed",
          "बिल सहेजा गया लेकिन प्रिंट नहीं हुआ। आप इसे बाद में 'Old Invoices' से दोबारा प्रिंट कर सकते हैं। (Invoice saved but did not print. You can reprint it later from Old Invoices.)",
          [{ text: "OK", onPress: () => router.replace("/(driver)") }],
          { cancelable: false },
        );
      } else {
        Alert.alert(
          "Success",
          "बिल सहेजा गया और प्रिंट हो गया! (Invoice Saved & Printed!)",
          [{ text: "OK", onPress: () => router.replace("/(driver)") }],
          { cancelable: false },
        );
      }
    } catch (error) {
      console.error("Failed to commit invoice records:", error);
      Alert.alert(
        "Database Error",
        "Could not compile and save invoice. Please try again.",
      );
      setIsSubmitting(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={styles.container}
    >
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        {/* Cart Review Card Header */}
        <View style={styles.cardHeader}>
          <Text style={styles.shopName}>🏪 {currentShopName}</Text>
          <TouchableOpacity
            style={styles.editLink}
            onPress={() => router.back()}
          >
            <Text style={styles.editLinkText}>📝 Edit Items</Text>
          </TouchableOpacity>
        </View>

        {/* Dynamic Items Table */}
        <View style={styles.tableCard}>
          <Text style={styles.cardTitle}>सामान की सूची (Items Summary)</Text>
          <View style={styles.tableDivider} />

          {Object.values(cart).map((item) => (
            <View key={item.skuId} style={styles.itemRow}>
              <Text style={styles.itemNameText} numberOfLines={1}>
                {item.name}
              </Text>
              <Text style={styles.itemQtyText}>{item.boxes} Box</Text>
              <Text style={styles.itemPriceText}>
                ₹{item.boxes * item.price}
              </Text>
            </View>
          ))}

          <View style={styles.tableDivider} />
          <View style={styles.grandTotalRow}>
            <Text style={styles.totalLabel}>Grand Total:</Text>
            <Text style={styles.totalValue}>₹{totalAmount}</Text>
          </View>
        </View>

        {/* Payment Configuration Form Block */}
        <View style={styles.paymentCard}>
          <View style={styles.paymentCardHeader}>
            <Text style={styles.cardTitle}>
              भुगतान का विवरण (Payment Split)
            </Text>
            <TouchableOpacity
              style={styles.shortcutBtn}
              onPress={handleFullCashShortcut}
            >
              <Text style={styles.shortcutBtnText}>💵 Full Cash</Text>
            </TouchableOpacity>
          </View>

          {/* Cash Input */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>नकद प्राप्त (Cash Received)</Text>
            <TextInput
              style={styles.numericInput}
              placeholder="₹0"
              placeholderTextColor="#9CA3AF"
              keyboardType="numeric"
              value={cashInput}
              onChangeText={setCashInput}
            />
          </View>

          {/* Paytm Input */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Paytm / Online Received</Text>
            <TextInput
              style={styles.numericInput}
              placeholder="₹0"
              placeholderTextColor="#9CA3AF"
              keyboardType="numeric"
              value={paytmInput}
              onChangeText={setPaytmInput}
            />
          </View>

          {/* Passive Remainder Read-Only Output Fields */}
          <View style={styles.udhaarRow}>
            <Text style={styles.udhaarLabel}>
              बाकी उधार (Auto Udhaar Balance):
            </Text>
            <Text
              style={[
                styles.udhaarValue,
                udhaarAmount > 0 && styles.udhaarAlertText,
              ]}
            >
              ₹{udhaarAmount}
            </Text>
          </View>
        </View>

        {/* Massive Execution Action Button */}
        <TouchableOpacity
          style={[styles.printButton, isSubmitting && styles.disabledButton]}
          disabled={isSubmitting}
          onPress={handlePrintAndSave}
        >
          <Text style={styles.printButtonText}>
            {isSubmitting ? "Saving..." : "🖨️ बिल निकालें (Print & Save Bill)"}
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
    paddingHorizontal: 16,
    paddingBottom: 40,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  shopName: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#1F2937",
    flex: 0.7,
  },
  editLink: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: "#E5E7EB",
    borderRadius: 8,
  },
  editLinkText: {
    color: "#4B5563",
    fontWeight: "600",
    fontSize: 14,
  },
  tableCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#374151",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  tableDivider: {
    height: 1,
    backgroundColor: "#E5E7EB",
    marginVertical: 12,
  },
  itemRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 6,
  },
  itemNameText: {
    fontSize: 18,
    color: "#1F2937",
    fontWeight: "500",
    flex: 0.5,
  },
  itemQtyText: {
    fontSize: 16,
    color: "#6B7280",
    flex: 0.25,
    textAlign: "center",
    fontWeight: "600",
  },
  itemPriceText: {
    fontSize: 18,
    color: "#1F2937",
    fontWeight: "600",
    flex: 0.25,
    textAlign: "right",
  },
  grandTotalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  totalLabel: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#4B5563",
  },
  totalValue: {
    fontSize: 26,
    fontWeight: "bold",
    color: "#007AFF",
  },
  paymentCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    marginBottom: 24,
  },
  paymentCardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  shortcutBtn: {
    backgroundColor: "#EFF6FF",
    borderWidth: 1,
    borderColor: "#BFDBFE",
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  shortcutBtnText: {
    color: "#1D4ED8",
    fontWeight: "700",
    fontSize: 14,
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#4B5563",
    marginBottom: 6,
  },
  numericInput: {
    backgroundColor: "#F9FAFB",
    borderWidth: 1,
    borderColor: "#D1D5DB",
    height: 54,
    borderRadius: 10,
    paddingHorizontal: 16,
    fontSize: 20,
    fontWeight: "bold",
    color: "#1F2937",
  },
  udhaarRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#F9FAFB",
    padding: 14,
    borderRadius: 10,
    marginTop: 8,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  udhaarLabel: {
    fontSize: 15,
    fontWeight: "600",
    color: "#4B5563",
  },
  udhaarValue: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#10B981",
  },
  udhaarAlertText: {
    color: "#EF4444",
  },
  printButton: {
    backgroundColor: "#007AFF",
    height: 60,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  disabledButton: {
    backgroundColor: "#9CA3AF",
  },
  printButtonText: {
    color: "#FFFFFF",
    fontSize: 20,
    fontWeight: "bold",
  },
});
