import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { getDB } from "../../src/db/local/sqlite";
import { useAppStore } from "../../src/store/appStore";
import { printEndDayReports } from "../../src/utils/printer";

export default function DriverHomeScreen() {
  const router = useRouter();
  const resetInvoiceSession = useAppStore((state) => state.resetInvoiceSession);
  const printerAddress = useAppStore((state) => state.printerAddress);

  const [billCount, setBillCount] = useState(0);
  const [boxesSold, setBoxesSold] = useState(0);
  const [endDayVisible, setEndDayVisible] = useState(false);
  const [printingEndDay, setPrintingEndDay] = useState(false);

  useEffect(() => {
    fetchTodayStats();
  }, []);

  async function fetchTodayStats() {
    try {
      const db = await getDB();
      const todayStr = new Date().toISOString().split("T")[0];

      const result = await db.getFirstAsync<{ count: number; boxes: number }>(
        `SELECT COUNT(*) as count, COALESCE(SUM(total_boxes), 0) as boxes 
         FROM invoice 
         WHERE invoice_date = ? AND status = 'active'`,
        [todayStr],
      );

      if (result) {
        setBillCount(result.count);
        setBoxesSold(result.boxes);
      }
    } catch (error) {
      console.error("Error fetching dashboard stats:", error);
    }
  }

  const handleNewBill = () => {
    resetInvoiceSession();
    router.push("/(driver)/shop-picker");
  };

  const handleEndDayConfirm = async () => {
    setEndDayVisible(false);
    setPrintingEndDay(true);

    try {
      const db = await getDB();
      const todayStr = new Date().toISOString().split("T")[0];

      // 1. Invoice-wise data (active + cancelled dono, shop naam ke saath)
      const invoiceRows = await db.getAllAsync<{
        shop_name: string;
        total_boxes: number;
        total_amount: number;
        status: string;
      }>(
        `SELECT s.name as shop_name, i.total_boxes, i.total_amount, i.status
         FROM invoice i
         JOIN shop s ON s.id = i.shop_id
         WHERE i.invoice_date = ?
         ORDER BY i.created_at ASC`,
        [todayStr],
      );

      const invoices = invoiceRows.map((row) => ({
        displayLabel: row.shop_name,
        boxes: row.total_boxes,
        amount: row.total_amount,
        cancelled: row.status === "cancelled",
      }));

      const activeInvoices = invoiceRows.filter((r) => r.status === "active");
      const totalAmount = activeInvoices.reduce(
        (sum, r) => sum + r.total_amount,
        0,
      );
      const totalBoxes = activeInvoices.reduce(
        (sum, r) => sum + r.total_boxes,
        0,
      );

      // 2. SKU-wise totals (sirf active invoices ka)
      const skuRows = await db.getAllAsync<{ name: string; boxes: number }>(
        `SELECT sk.name as name, SUM(ii.boxes) as boxes
         FROM invoice_item ii
         JOIN invoice i ON i.id = ii.invoice_id
         JOIN sku sk ON sk.id = ii.sku_id
         WHERE i.invoice_date = ? AND i.status = 'active'
         GROUP BY sk.id
         ORDER BY sk.name ASC`,
        [todayStr],
      );

      // 3. Payments — udhaar aur paytm wale shop-wise (sirf active invoices)
      const paymentRows = await db.getAllAsync<{
        shop_name: string;
        udhaar_amount: number;
        paytm_amount: number;
      }>(
        `SELECT s.name as shop_name, i.udhaar_amount, i.paytm_amount
         FROM invoice i
         JOIN shop s ON s.id = i.shop_id
         WHERE i.invoice_date = ? AND i.status = 'active'`,
        [todayStr],
      );

      const udhaarList = paymentRows
        .filter((r) => r.udhaar_amount > 0)
        .map((r) => ({ shopName: r.shop_name, amount: r.udhaar_amount }));

      const paytmList = paymentRows
        .filter((r) => r.paytm_amount > 0)
        .map((r) => ({ shopName: r.shop_name, amount: r.paytm_amount }));

      const totalUdhaar = udhaarList.reduce((sum, r) => sum + r.amount, 0);
      const totalPaytm = paytmList.reduce((sum, r) => sum + r.amount, 0);

      if (invoices.length === 0) {
        Alert.alert(
          "No Bills Today",
          "Aaj koi bill nahi bana, print karne ke liye kuch nahi hai.",
        );
        setPrintingEndDay(false);
        return;
      }

      const success = await printEndDayReports(
        {
          date: todayStr,
          invoices,
          totalAmount,
          totalBoxes,
          skuTotals: skuRows,
          udhaarList,
          paytmList,
          totalUdhaar,
          totalPaytm,
        },
        printerAddress,
      );

      if (success) {
        Alert.alert("Success", "Teeno reports print ho gaye!");
      }
      // agar fail hua, printEndDayReports khud apna error alert dikha chuka hai
    } catch (error) {
      console.error("End day report generation failed:", error);
      Alert.alert(
        "Error",
        "Reports banane mein dikkat aayi. Dobara try karein.",
      );
    } finally {
      setPrintingEndDay(false);
    }
  };

  const handleLogoLongPress = () => {
    router.push("/(admin)/pin-entry");
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          delayLongPress={800}
          onLongPress={handleLogoLongPress}
          activeOpacity={0.8}
        >
          <Text style={styles.logoText}>🥤 ColdDrinkApp</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.printerBtn}
          onPress={() => router.push("/(driver)/printer-settings")}
        >
          <Text style={styles.printerBtnText}>🖨️ Printer</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.flagButton}
          onPress={() => setEndDayVisible(true)}
        >
          <Text style={styles.flagIcon}>🏁</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.menuContainer}>
        <TouchableOpacity
          style={[styles.card, styles.newBillCard]}
          onPress={handleNewBill}
        >
          <Text style={styles.cardIcon}>⚡</Text>
          <Text style={styles.cardTitle}>नया बिल बनाएँ</Text>
          <Text style={styles.cardSubTitle}>Generate New Invoice</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.card, styles.historyCard]}
          onPress={() => router.push("/(driver)/old-invoices")}
        >
          <Text style={styles.cardIcon}>📄</Text>
          <Text style={styles.cardTitle}>पुराने बिल देखें</Text>
          <Text style={styles.cardSubTitle}>Old Invoices</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.statusStrip}>
        <Text style={styles.statusText}>
          Today: <Text style={styles.boldText}>{billCount} bills</Text> ·{" "}
          <Text style={styles.boldText}>{boxesSold} boxes sold</Text>
        </Text>
      </View>

      <Modal visible={endDayVisible} transparent={true} animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalEmoji}>⚠️</Text>
            <Text style={styles.modalTitle}>क्या आज का काम खत्म हो गया?</Text>
            <Text style={styles.modalMessage}>
              Make sure all current bills are completely printed before hitting
              end day. This will print the invoice summary, item totals, and
              payment reports back-to-back.
            </Text>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.btn, styles.btnCancel]}
                onPress={() => setEndDayVisible(false)}
              >
                <Text style={styles.btnCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.btn, styles.btnConfirm]}
                onPress={handleEndDayConfirm}
              >
                <Text style={styles.btnConfirmText}>End Day</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {printingEndDay && (
        <View style={styles.printingOverlay}>
          <ActivityIndicator size="large" color="#FFFFFF" />
          <Text style={styles.printingText}>Reports print ho rahe hain...</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F3F4F6", paddingTop: 50 },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 24,
    marginBottom: 30,
  },
  logoText: { fontSize: 22, fontWeight: "700", color: "#1F2937" },
  flagButton: {
    width: 44,
    height: 44,
    backgroundColor: "#E5E7EB",
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
  },
  flagIcon: { fontSize: 20 },
  menuContainer: {
    flex: 1,
    paddingHorizontal: 24,
    justifyContent: "center",
    gap: 24,
  },
  card: {
    flex: 0.35,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  newBillCard: { backgroundColor: "#007AFF" },
  historyCard: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  cardIcon: { fontSize: 40, marginBottom: 12 },
  cardTitle: {
    fontSize: 26,
    fontWeight: "bold",
    textAlign: "center",
    color: "#FFFFFF",
  },
  historyCardText: { color: "#1F2937" },
  cardSubTitle: { fontSize: 14, marginTop: 4, opacity: 0.8, color: "#FFFFFF" },
  statusStrip: {
    backgroundColor: "#FFFFFF",
    paddingVertical: 16,
    borderTopWidth: 1,
    borderColor: "#E5E7EB",
    alignItems: "center",
  },
  statusText: { fontSize: 16, color: "#4B5563" },
  boldText: { fontWeight: "700", color: "#1F2937" },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  modalContent: {
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    padding: 24,
    alignItems: "center",
    width: "100%",
    elevation: 5,
  },
  modalEmoji: { fontSize: 44, marginBottom: 12 },
  modalTitle: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#1F2937",
    textAlign: "center",
    marginBottom: 8,
  },
  modalMessage: {
    fontSize: 14,
    color: "#4B5563",
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 24,
  },
  modalActions: { flexDirection: "row", gap: 12, width: "100%" },
  btn: { flex: 1, paddingVertical: 16, borderRadius: 12, alignItems: "center" },
  btnCancel: { backgroundColor: "#F3F4F6" },
  btnCancelText: { color: "#4B5563", fontWeight: "600", fontSize: 16 },
  btnConfirm: { backgroundColor: "#EF4444" },
  btnConfirmText: { color: "#FFFFFF", fontWeight: "600", fontSize: 16 },
  printerBtn: { backgroundColor: "#E5E7EB", padding: 8, borderRadius: 8 },
  printerBtnText: { fontSize: 14 },
  printingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    alignItems: "center",
  },
  printingText: {
    color: "#FFFFFF",
    fontSize: 16,
    marginTop: 12,
    fontWeight: "600",
  },
});
