import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
    Alert,
    Modal,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import { getDB } from "../../src/db/local/sqlite";
import { useAppStore } from "../../src/store/appStore";

export default function DriverHomeScreen() {
  const router = useRouter();
  const resetInvoiceSession = useAppStore((state) => state.resetInvoiceSession);

  // Local states for today's real-time counter updates
  const [billCount, setBillCount] = useState(0);
  const [boxesSold, setBoxesSold] = useState(0);
  const [endDayVisible, setEndDayVisible] = useState(false);

  // Fetch metrics every time the driver lands on this page
  useEffect(() => {
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
    fetchTodayStats();
  }, []);

  const handleNewBill = () => {
    resetInvoiceSession(); // Clear stale selections or carts
    router.push("/(driver)/shop-picker");
  };

  const handleEndDayConfirm = async () => {
    setEndDayVisible(false);
    // TODO: Wire up the 2" thermal printer SDK stream trigger here
    Alert.alert(
      "Printing Reports",
      "Printing Invoice Summary, SKU Totals, and Payments back-to-back...",
    );
  };

  const handleLogoLongPress = () => {
    // Hidden back-door entry path for Admin panel
    router.push("/(admin)/pin-entry");
  };

  return (
    <View style={styles.container}>
      {/* Header Bar */}
      <View style={styles.header}>
        <TouchableOpacity
          delayLongPress={800}
          onLongPress={handleLogoLongPress}
          activeOpacity={0.8}
        >
          <Text style={styles.logoText}>🥤 ColdDrinkApp</Text>
        </TouchableOpacity>

        {/* Subtle Flag Icon for End Day */}
        <TouchableOpacity
          style={styles.flagButton}
          onPress={() => setEndDayVisible(true)}
        >
          <Text style={styles.flagIcon}>🏁</Text>
        </TouchableOpacity>
      </View>

      {/* Main Big Tappable Action Cards */}
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

      {/* Non-interactive Status Progress Strip */}
      <View style={styles.statusStrip}>
        <Text style={styles.statusText}>
          Today: <Text style={styles.boldText}>{billCount} bills</Text> ·{" "}
          <Text style={styles.boldText}>{boxesSold} boxes sold</Text>
        </Text>
      </View>

      {/* End Day Confirmation Dialog */}
      <Modal visible={endDayVisible} transparent={true} animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalEmoji}>⚠️</Text>
            <Text style={styles.modalTitle}>क्या आज का काम खत्म हो गया?</Text>
            <Text style={styles.modalMessage}>
              Make sure all current bills are completely printed before hitting
              end day. This will lock today's sales records and print summaries.
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F3F4F6",
    paddingTop: 50,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 24,
    marginBottom: 30,
  },
  logoText: {
    fontSize: 22,
    fontWeight: "700",
    color: "#1F2937",
  },
  flagButton: {
    width: 44,
    height: 44,
    backgroundColor: "#E5E7EB",
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
  },
  flagIcon: {
    fontSize: 20,
  },
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
  newBillCard: {
    backgroundColor: "#007AFF",
  },
  historyCard: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  cardIcon: {
    fontSize: 40,
    marginBottom: 12,
  },
  cardTitle: {
    fontSize: 26,
    fontWeight: "bold",
    textAlign: "center",
    color: "#FFFFFF",
  },
  historyCardText: {
    color: "#1F2937",
  },
  cardSubTitle: {
    fontSize: 14,
    marginTop: 4,
    opacity: 0.8,
    color: "#FFFFFF",
  },
  statusStrip: {
    backgroundColor: "#FFFFFF",
    paddingVertical: 16,
    borderTopWidth: 1,
    borderColor: "#E5E7EB",
    alignItems: "center",
  },
  statusText: {
    fontSize: 16,
    color: "#4B5563",
  },
  boldText: {
    fontWeight: "700",
    color: "#1F2937",
  },
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
  modalEmoji: {
    fontSize: 44,
    marginBottom: 12,
  },
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
  modalActions: {
    flexDirection: "row",
    gap: 12,
    width: "100%",
  },
  btn: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: "center",
  },
  btnCancel: {
    backgroundColor: "#F3F4F6",
  },
  btnCancelText: {
    color: "#4B5563",
    fontWeight: "600",
    fontSize: 16,
  },
  btnConfirm: {
    backgroundColor: "#EF4444",
  },
  btnConfirmText: {
    color: "#FFFFFF",
    fontWeight: "600",
    fontSize: 16,
  },
});

// Overwrite stylistic typography variables tailored for text variants on history card colors
styles.historyCard = {
  ...styles.historyCard,
  backgroundColor: "#FFFFFF",
};
