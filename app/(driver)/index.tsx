import { Feather } from "@expo/vector-icons";
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

  // Date Formatting (आज की तारीख)
  const today = new Date();
  const formattedDate = today.toLocaleDateString("en-IN", {
    weekday: "long",
    day: "numeric",
    month: "short",
  });

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

      const invoiceRows = await db.getAllAsync<{
        shop_name: string;
        total_boxes: number;
        total_amount: number;
        status: string;
      }>(
        `SELECT s.name as shop_name, i.total_boxes, i.total_amount, i.status
         FROM invoice i JOIN shop s ON s.id = i.shop_id
         WHERE i.invoice_date = ? ORDER BY i.created_at ASC`,
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

      const skuRows = await db.getAllAsync<{ name: string; boxes: number }>(
        `SELECT sk.name as name, SUM(ii.boxes) as boxes
         FROM invoice_item ii JOIN invoice i ON i.id = ii.invoice_id JOIN sku sk ON sk.id = ii.sku_id
         WHERE i.invoice_date = ? AND i.status = 'active'
         GROUP BY sk.id ORDER BY sk.name ASC`,
        [todayStr],
      );

      const paymentRows = await db.getAllAsync<{
        shop_name: string;
        udhaar_amount: number;
        paytm_amount: number;
      }>(
        `SELECT s.name as shop_name, i.udhaar_amount, i.paytm_amount
         FROM invoice i JOIN shop s ON s.id = i.shop_id
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
          "कोई बिल नहीं (No Bills)",
          "आज कोई बिल नहीं बना है, रिपोर्ट निकालने के लिए कुछ नहीं है।",
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
        Alert.alert("सफलता (Success)", "आज की रिपोर्ट प्रिंट हो गई है।");
      }
    } catch (error) {
      console.error("End day report generation failed:", error);
      Alert.alert(
        "एरर (Error)",
        "रिपोर्ट प्रिंट करने में समस्या आई। कृपया फिर से कोशिश करें।",
      );
    } finally {
      setPrintingEndDay(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* Header Area */}
      <View style={styles.header}>
        {/* Left: Empty Spacer for Balance */}
        <View style={styles.iconPlaceholder} />

        {/* Center: Brand (Long press for Admin) */}
        <TouchableOpacity
          activeOpacity={0.8}
          delayLongPress={1000}
          onLongPress={() => router.push("/(admin)/pin-entry")}
          style={styles.brandCenter}
        >
          <Text style={styles.brandTitle}>Deep Drinks</Text>
          <Text style={styles.dateText}>{formattedDate}</Text>
        </TouchableOpacity>

        {/* Right: End Day Flag (Red) */}
        <TouchableOpacity
          style={styles.endDayBtn}
          onPress={() => setEndDayVisible(true)}
        >
          <Feather name="power" size={22} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      {/* Subtle Stats Pill */}
      <View style={styles.statsContainer}>
        <View style={styles.statPill}>
          <Text style={styles.statPillText}>
            आज का काम: <Text style={styles.statPillBold}>{billCount} बिल</Text>{" "}
            | <Text style={styles.statPillBold}>{boxesSold} पेटी</Text>
          </Text>
        </View>
      </View>

      {/* Centered Large Action Buttons */}
      <View style={styles.centerActionContainer}>
        <TouchableOpacity
          style={[styles.bigCard, styles.primaryCard]}
          activeOpacity={0.9}
          onPress={handleNewBill}
        >
          <Feather
            name="plus-circle"
            size={48}
            color="#FFFFFF"
            style={styles.cardIcon}
          />
          <Text style={styles.primaryCardText}>नया बिल</Text>
          <Text style={styles.primaryCardSubText}>(New Bill)</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.bigCard, styles.secondaryCard]}
          activeOpacity={0.7}
          onPress={() => router.push("/(driver)/old-invoices")}
        >
          <Feather
            name="file-text"
            size={42}
            color="#111827"
            style={styles.cardIcon}
          />
          <Text style={styles.secondaryCardText}>पुराने बिल</Text>
          <Text style={styles.secondaryCardSubText}>(Old Invoices)</Text>
        </TouchableOpacity>
      </View>

      {/* End Day Modal */}
      <Modal visible={endDayVisible} transparent={true} animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalIconCircle}>
              <Feather name="printer" size={28} color="#DC2626" />
            </View>
            <Text style={styles.modalTitle}>काम खत्म करें (End Day)</Text>
            <Text style={styles.modalMessage}>
              क्या आज का काम पूरा हो गया है? यह बटन दबाने से आज की पूरी रिपोर्ट
              और हिसाब प्रिंट हो जाएगा। प्रिंटर चालू रखें।
            </Text>
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.btn, styles.btnCancel]}
                onPress={() => setEndDayVisible(false)}
              >
                <Text style={styles.btnCancelText}>रद्द करें (Cancel)</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.btn, styles.btnConfirm]}
                onPress={handleEndDayConfirm}
              >
                <Text style={styles.btnConfirmText}>रिपोर्ट निकालें</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Printing Loading Overlay */}
      {printingEndDay && (
        <View style={styles.printingOverlay}>
          <View style={styles.printingBox}>
            <ActivityIndicator size="large" color="#111827" />
            <Text style={styles.printingText}>रिपोर्ट प्रिंट हो रही है...</Text>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F3F4F6",
    paddingTop: 60,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  iconPlaceholder: {
    width: 48,
    height: 48,
  },
  endDayBtn: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: "#DC2626", // Red background for End Day
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#DC2626",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  brandCenter: {
    alignItems: "center",
    flex: 1,
  },
  brandTitle: {
    fontSize: 24,
    fontWeight: "800",
    color: "#111827",
    textAlign: "center",
  },
  dateText: {
    fontSize: 14,
    color: "#6B7280",
    fontWeight: "600",
    marginTop: 4,
  },
  statsContainer: {
    alignItems: "center",
    marginBottom: 30,
  },
  statPill: {
    backgroundColor: "#FFFFFF",
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  statPillText: {
    fontSize: 15,
    color: "#4B5563",
  },
  statPillBold: {
    fontWeight: "700",
    color: "#111827",
  },
  centerActionContainer: {
    flex: 1,
    paddingHorizontal: 24,
    justifyContent: "center",
    paddingBottom: 60, // Shift slightly up for optical centering
    gap: 24,
  },
  bigCard: {
    height: 160, // Fixed height to make them chunky and easy to tap
    borderRadius: 24,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  primaryCard: {
    backgroundColor: "#111827", // Black/Dark slate
  },
  secondaryCard: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  cardIcon: {
    marginBottom: 12,
  },
  primaryCardText: {
    fontSize: 26,
    fontWeight: "bold",
    color: "#FFFFFF",
  },
  primaryCardSubText: {
    fontSize: 14,
    color: "#9CA3AF",
    marginTop: 4,
  },
  secondaryCardText: {
    fontSize: 26,
    fontWeight: "bold",
    color: "#111827",
  },
  secondaryCardSubText: {
    fontSize: 14,
    color: "#6B7280",
    marginTop: 4,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    padding: 24,
  },
  modalContent: {
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    padding: 24,
    alignItems: "center",
  },
  modalIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "#FEE2E2", // Light red bg for icon
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#111827",
    marginBottom: 12,
  },
  modalMessage: {
    fontSize: 16,
    color: "#4B5563",
    textAlign: "center",
    lineHeight: 24,
    marginBottom: 28,
  },
  modalActions: {
    flexDirection: "row",
    gap: 12,
    width: "100%",
  },
  btn: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: "center",
  },
  btnCancel: {
    backgroundColor: "#F3F4F6",
  },
  btnCancelText: {
    color: "#4B5563",
    fontWeight: "700",
    fontSize: 16,
  },
  btnConfirm: {
    backgroundColor: "#DC2626", // Red confirm button
  },
  btnConfirmText: {
    color: "#FFFFFF",
    fontWeight: "700",
    fontSize: 16,
  },
  printingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "center",
    alignItems: "center",
  },
  printingBox: {
    backgroundColor: "#FFFFFF",
    padding: 30,
    borderRadius: 20,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 5,
  },
  printingText: {
    color: "#111827",
    fontSize: 18,
    marginTop: 20,
    fontWeight: "700",
  },
});
