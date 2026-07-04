import { printReceipt } from "@/src/utils/printer";
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

  // Compute totals
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
  const udhaarAmount = Math.max(0, totalAmount - (cashAmount + paytmAmount));

  const handleFullCashShortcut = () => {
    setCashInput(totalAmount.toString());
    setPaytmInput("");
  };

  const handlePrintAndSave = async () => {
    if (isSubmitting) return;

    if (cashAmount + paytmAmount > totalAmount) {
      Alert.alert("गलत राशि (Error)", "दर्ज की गई राशि कुल बिल से अधिक है!");
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
        Alert.alert(
          "बिल सुरक्षित हुआ, प्रिंट फेल",
          "बिल सहेजा गया लेकिन प्रिंट नहीं हुआ। आप इसे बाद में 'Old Invoices' से दोबारा प्रिंट कर सकते हैं।",
          [{ text: "ठीक है (OK)", onPress: () => router.replace("/(driver)") }],
          { cancelable: false },
        );
      } else {
        Alert.alert(
          "सफलता (Success)",
          "बिल सुरक्षित हो गया और प्रिंट भी निकाल दिया गया है!",
          [{ text: "ठीक है (OK)", onPress: () => router.replace("/(driver)") }],
          { cancelable: false },
        );
      }
    } catch (error) {
      console.error("Failed to commit invoice records:", error);
      Alert.alert("डेटाबेस एरर", "बिल सुरक्षित नहीं किया जा सका।");
      setIsSubmitting(false);
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
        <Text style={styles.headerTitle} numberOfLines={1}>
          {currentShopName}
        </Text>
        <View style={{ width: 44 }} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContainer}
        showsVerticalScrollIndicator={false}
      >
        {/* Items Table Summary */}
        <View style={styles.tableCard}>
          <Text style={styles.cardTitle}>सामान की सूची (Cart Summary)</Text>
          <View style={styles.tableDivider} />

          {Object.values(cart).map((item) => (
            <View key={item.skuId} style={styles.itemRow}>
              <Text style={styles.itemNameText} numberOfLines={1}>
                {item.name}
              </Text>
              <Text style={styles.itemQtyText}>{item.boxes} पेटी</Text>
              <Text style={styles.itemPriceText}>
                ₹{item.boxes * item.price}
              </Text>
            </View>
          ))}

          <View style={styles.tableDivider} />
          <View style={styles.grandTotalRow}>
            <Text style={styles.totalLabel}>कुल बिल (Grand Total):</Text>
            <Text style={styles.totalValue}>₹{totalAmount}</Text>
          </View>
        </View>

        {/* Payment Configuration Inputs Block */}
        <View style={styles.paymentCard}>
          <View style={styles.paymentCardHeader}>
            <Text style={styles.cardTitle}>भुगतान विवरण (Payment)</Text>
            <TouchableOpacity
              style={styles.shortcutBtn}
              activeOpacity={0.7}
              onPress={handleFullCashShortcut}
            >
              {/* <Feather
                name="dollar-sign"
                size={14}
                color="#111827"
                style={{ marginRight: 2 }}
              /> */}
              <Text style={styles.shortcutBtnText}>पूरा नकद</Text>
            </TouchableOpacity>
          </View>

          {/* Cash Received input stack */}
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

          {/* Paytm Received input stack */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Paytm / ऑनलाइन प्राप्त</Text>
            <TextInput
              style={styles.numericInput}
              placeholder="₹0"
              placeholderTextColor="#9CA3AF"
              keyboardType="numeric"
              value={paytmInput}
              onChangeText={setPaytmInput}
            />
          </View>

          {/* Automatic Dynamic Udhaar Readout Row */}
          <View style={styles.udhaarRow}>
            <Text style={styles.udhaarLabel}>बाकी उधार (Udhaar Balance):</Text>
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

        {/* Massive Primary Printing Execution Button */}
        <TouchableOpacity
          style={[styles.printButton, isSubmitting && styles.disabledButton]}
          disabled={isSubmitting}
          activeOpacity={0.9}
          onPress={handlePrintAndSave}
        >
          <Feather
            name="printer"
            size={20}
            color="#FFFFFF"
            style={{ marginRight: 8 }}
          />
          <Text style={styles.printButtonText}>
            {isSubmitting ? "सुरक्षित हो रहा है..." : "बिल निकालें"}
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
    textAlign: "center",
  },
  scrollContainer: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 60,
  },
  tableCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 22,
    padding: 16,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    marginBottom: 16,
    elevation: 1,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#4B5563",
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
    paddingVertical: 8,
  },
  itemNameText: {
    fontSize: 18,
    color: "#111827",
    fontWeight: "700",
    flex: 0.5,
  },
  itemQtyText: {
    fontSize: 16,
    color: "#4B5563",
    flex: 0.25,
    textAlign: "center",
    fontWeight: "700",
  },
  itemPriceText: {
    fontSize: 18,
    color: "#111827",
    fontWeight: "700",
    flex: 0.25,
    textAlign: "right",
  },
  grandTotalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 4,
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: "700",
    color: "#4B5563",
  },
  totalValue: {
    fontSize: 26,
    fontWeight: "900",
    color: "#111827",
  },
  paymentCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 22,
    padding: 16,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    marginBottom: 20,
    elevation: 1,
  },
  paymentCardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  shortcutBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderWidth: 2,
    borderColor: "#111827", // Thicker slate-black frame
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 10,
  },
  shortcutBtnText: {
    color: "#111827",
    fontWeight: "800",
    fontSize: 14,
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: "700",
    color: "#4B5563",
    marginBottom: 8,
  },
  numericInput: {
    backgroundColor: "#F3F4F6",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    height: 54,
    borderRadius: 12,
    paddingHorizontal: 16,
    fontSize: 22,
    fontWeight: "800",
    color: "#111827",
  },
  udhaarRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#F9FAFB",
    padding: 14,
    borderRadius: 14,
    marginTop: 8,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  udhaarLabel: {
    fontSize: 15,
    fontWeight: "700",
    color: "#4B5563",
  },
  udhaarValue: {
    fontSize: 22,
    fontWeight: "900",
    color: "#10B981",
  },
  udhaarAlertText: {
    color: "#DC2626",
  },
  printButton: {
    backgroundColor: "#111827",
    height: 58,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    flexDirection: "row",
    marginBottom: 30,
  },
  disabledButton: {
    backgroundColor: "#9CA3AF",
  },
  printButtonText: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "800",
  },
});
