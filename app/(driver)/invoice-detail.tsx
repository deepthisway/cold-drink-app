import { useAppStore } from "@/src/store/appStore";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import "react-native-get-random-values";
import { v4 as uuidv4 } from "uuid";
import { getDB } from "../../src/db/local/sqlite";

interface InvoiceDetail {
  id: string;
  invoice_date: string;
  total_amount: number;
  total_boxes: number;
  cash_amount: number;
  paytm_amount: number;
  udhaar_amount: number;
  status: "active" | "cancelled";
  shop_name: string;
  shop_phone: string | null;
}

interface InvoiceItemDetail {
  id: string;
  sku_name: string;
  boxes: number;
  amount: number;
}

export default function InvoiceDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();

  const [loading, setLoading] = useState(true);
  const [invoice, setInvoice] = useState<InvoiceDetail | null>(null);
  const [items, setItems] = useState<InvoiceItemDetail[]>([]);
  const [isActionLoading, setIsActionLoading] = useState(false);
  const printerAddress = useAppStore((state) => state.printerAddress);

  useEffect(() => {
    async function loadInvoiceDetails() {
      if (!id) return;
      try {
        const db = await getDB();

        // 1. Fetch main invoice joined with shop information
        const invoiceData = await db.getFirstAsync<InvoiceDetail>(
          `
          SELECT i.*, s.name as shop_name, s.phone as shop_phone
          FROM invoice i
          JOIN shop s ON i.shop_id = s.id
          WHERE i.id = ?
        `,
          [id],
        );

        // 2. Fetch specific items mapped inside this invoice
        const itemsData = await db.getAllAsync<InvoiceItemDetail>(
          `
          SELECT ii.id, ii.boxes, ii.amount, sk.name as sku_name
          FROM invoice_item ii
          JOIN sku sk ON ii.sku_id = sk.id
          WHERE ii.invoice_id = ?
        `,
          [id],
        );

        setInvoice(invoiceData || null);
        setItems(itemsData);
      } catch (error) {
        console.error("Failed to load deep invoice record details:", error);
      } finally {
        setLoading(false);
      }
    }

    loadInvoiceDetails();
  }, [id]);

  const handleReprint = async () => {
    if (!invoice) return;

    const printSuccess = await printReceipt(
      {
        shopName: invoice.shop_name,
        date: invoice.invoice_date,
        totalBoxes: invoice.total_boxes,
        totalAmount: invoice.total_amount,
        cashPaid: invoice.cash_amount,
        paytmPaid: invoice.paytm_amount,
        udhaar: invoice.udhaar_amount,
        items: items.map((item) => ({
          name: item.sku_name,
          boxes: item.boxes,
          price: 0, // not needed for reprint layout
          amount: item.amount,
        })),
      },
      printerAddress,
    );

    if (printSuccess) {
      Alert.alert("Success", "Receipt reprinted successfully.");
    }
    // printReceipt already shows its own error alert on failure, no need to duplicate
  };

  const handleCancelInvoice = () => {
    Alert.alert(
      "क्या आप निश्चित हैं?",
      "Do you want to cancel this bill? This will reverse the van stock and mark this invoice as cancelled permanently.",
      [
        { text: "No", style: "cancel" },
        {
          text: "Yes, Cancel Bill",
          style: "destructive",
          onPress: executeCancellation,
        },
      ],
    );
  };

  const executeCancellation = async () => {
    if (!invoice || isActionLoading) return;
    setIsActionLoading(true);

    try {
      const db = await getDB();
      const todayStr = new Date().toISOString().split("T")[0];
      const timestamp = new Date().toISOString();

      // 1. Flip invoice state status to cancelled
      await db.runAsync(
        "UPDATE invoice SET status = 'cancelled', synced = 0 WHERE id = ?",
        [invoice.id],
      );

      // 2. Fetch line items to construct counter-balancing positive ledger rows
      const lineItems = await db.getAllAsync<{ sku_id: string; boxes: number }>(
        "SELECT sku_id, boxes FROM invoice_item WHERE invoice_id = ?",
        [invoice.id],
      );

      // Append positive entries back to the ledger to restore stock levels in the van
      for (const item of lineItems) {
        const reversalLedgerId = uuidv4();
        await db.runAsync(
          `INSERT INTO stock_ledger (
            id, sku_id, entry_date, quantity, entry_type, invoice_id, created_at, synced
          ) VALUES (?, ?, ?, ?, 'cancel_reversal', ?, ?, 0)`,
          [
            reversalLedgerId,
            item.sku_id,
            todayStr,
            item.boxes,
            invoice.id,
            timestamp,
          ],
        );
      }

      setInvoice({ ...invoice, status: "cancelled" });
      Alert.alert(
        "Success",
        "बिल निरस्त कर दिया गया है! (Invoice has been successfully cancelled!)",
        [
          {
            text: "OK",
            onPress: () => router.replace("/(driver)/old-invoices"),
          },
        ],
      );
    } catch (error) {
      console.error(
        "Failed to execute invoice cancellation routing logs:",
        error,
      );
      Alert.alert(
        "Error",
        "Could not complete background cancellation protocol.",
      );
    } finally {
      setIsActionLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  if (!invoice) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>
          Invoice data entry record could not be found.
        </Text>
      </View>
    );
  }

  const isCancelled = invoice.status === "cancelled";

  return (
    <View style={styles.container}>
      {/* Header Panel Navigation Ribbon */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Text style={styles.backBtnText}>⬅️ Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Invoice Information</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContainer}>
        {/* Core Detail Target Summary Box */}
        <View
          style={[styles.infoCard, isCancelled && styles.infoCardCancelled]}
        >
          <View style={styles.infoRowSpace}>
            <Text
              style={[styles.shopName, isCancelled && styles.strikethrough]}
            >
              {invoice.shop_name}
            </Text>
            {isCancelled && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>CANCELLED</Text>
              </View>
            )}
          </View>
          {invoice.shop_phone && (
            <Text style={styles.subDetailText}>📞 {invoice.shop_phone}</Text>
          )}
          <Text style={styles.subDetailText}>
            📅 Date: {invoice.invoice_date}
          </Text>
        </View>

        {/* Detailed Item Layout Card */}
        <View style={styles.itemsCard}>
          <Text style={styles.cardHeaderTitle}>
            सामान का विवरण (Items Breakdown)
          </Text>
          <View style={styles.divider} />
          {items.map((item) => (
            <View key={item.id} style={styles.itemRow}>
              <Text
                style={[styles.itemText, isCancelled && styles.strikethrough]}
              >
                {item.sku_name}
              </Text>
              <Text style={styles.itemBoxes}>{item.boxes} Box</Text>
              <Text
                style={[styles.itemAmt, isCancelled && styles.strikethrough]}
              >
                ₹{item.amount}
              </Text>
            </View>
          ))}
          <View style={styles.divider} />
          <View style={styles.totalRow}>
            <Text style={styles.totalLabelText}>Grand Total:</Text>
            <Text
              style={[
                styles.totalValueText,
                isCancelled && styles.strikethrough,
              ]}
            >
              ₹{invoice.total_amount}
            </Text>
          </View>
        </View>

        {/* Detailed Financial Summary Audit Card */}
        <View style={styles.paymentCard}>
          <Text style={styles.cardHeaderTitle}>
            भुगतान का विवरण (Payment Breakdown)
          </Text>
          <View style={styles.divider} />

          <View style={styles.paymentRow}>
            <Text style={styles.paymentLabel}>नकद प्राप्त (Cash Paid):</Text>
            <Text style={styles.paymentValue}>₹{invoice.cash_amount}</Text>
          </View>

          <View style={styles.paymentRow}>
            <Text style={styles.paymentLabel}>Paytm / Online:</Text>
            <Text style={styles.paymentValue}>₹{invoice.paytm_amount}</Text>
          </View>

          <View style={[styles.paymentRow, styles.udhaarHighlightRow]}>
            <Text style={styles.udhaarLabel}>बाकी उधार (Udhaar Due):</Text>
            <Text
              style={[
                styles.udhaarValue,
                invoice.udhaar_amount > 0 &&
                  !isCancelled &&
                  styles.udhaarAlertText,
              ]}
            >
              ₹{invoice.udhaar_amount}
            </Text>
          </View>
        </View>

        {/* Action Controls Panel Layout */}
        <View style={styles.actionsContainer}>
          <TouchableOpacity
            style={styles.reprintBtn}
            onPress={handleReprint}
            disabled={isActionLoading}
          >
            <Text style={styles.reprintBtnText}>🖨️ Reprint Copy</Text>
          </TouchableOpacity>

          {!isCancelled && (
            <TouchableOpacity
              style={styles.cancelBtn}
              onPress={handleCancelInvoice}
              disabled={isActionLoading}
            >
              <Text style={styles.cancelBtnText}>
                ❌ Cancel Bill (Revert Stock)
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>
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
    alignItems: "center",
    paddingHorizontal: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderColor: "#E5E7EB",
    backgroundColor: "#FFFFFF",
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
  errorText: {
    fontSize: 16,
    color: "#EF4444",
  },
  scrollContainer: {
    padding: 16,
    paddingBottom: 30,
  },
  infoCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    marginBottom: 16,
  },
  infoCardCancelled: {
    backgroundColor: "#FEF2F2",
    borderColor: "#FEE2E2",
  },
  infoRowSpace: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  shopName: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#1F2937",
    flex: 0.7,
  },
  badge: {
    backgroundColor: "#EF4444",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  badgeText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "bold",
  },
  subDetailText: {
    fontSize: 14,
    color: "#6B7280",
    marginTop: 4,
    fontWeight: "500",
  },
  itemsCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    marginBottom: 16,
  },
  cardHeaderTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#4B5563",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  divider: {
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
  itemText: {
    fontSize: 18,
    color: "#1F2937",
    fontWeight: "500",
    flex: 0.5,
  },
  itemBoxes: {
    fontSize: 16,
    color: "#6B7280",
    fontWeight: "600",
    flex: 0.25,
    textAlign: "center",
  },
  itemAmt: {
    fontSize: 18,
    color: "#1F2937",
    fontWeight: "600",
    flex: 0.25,
    textAlign: "right",
  },
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  totalLabelText: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#4B5563",
  },
  totalValueText: {
    fontSize: 24,
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
  paymentRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 6,
  },
  paymentLabel: {
    fontSize: 16,
    color: "#4B5563",
    fontWeight: "500",
  },
  paymentValue: {
    fontSize: 16,
    color: "#1F2937",
    fontWeight: "600",
  },
  udhaarHighlightRow: {
    backgroundColor: "#F9FAFB",
    padding: 10,
    borderRadius: 8,
    marginTop: 6,
    alignItems: "center",
  },
  udhaarLabel: {
    fontSize: 16,
    fontWeight: "600",
    color: "#4B5563",
  },
  udhaarValue: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#10B981",
  },
  udhaarAlertText: {
    color: "#EF4444",
  },
  actionsContainer: {
    gap: 14,
  },
  reprintBtn: {
    backgroundColor: "#007AFF",
    height: 56,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
  },
  reprintBtnText: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "bold",
  },
  cancelBtn: {
    backgroundColor: "#FEF2F2",
    borderWidth: 1,
    borderColor: "#FEE2E2",
    height: 56,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
  },
  cancelBtnText: {
    color: "#EF4444",
    fontSize: 16,
    fontWeight: "bold",
  },
  strikethrough: {
    textDecorationLine: "line-through",
    color: "#9CA3AF",
  },
});
