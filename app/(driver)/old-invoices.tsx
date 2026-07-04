import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { getDB } from "../../src/db/local/sqlite";
import { useAppStore } from "../../src/store/appStore";
import { printReceipt } from "../../src/utils/printer";

interface InvoiceLog {
  id: string;
  shop_name: string;
  invoice_date: string;
  total_amount: number;
  total_boxes: number;
  cash_amount: number;
  paytm_amount: number;
  udhaar_amount: number;
  status: string;
}

export default function OldInvoicesScreen() {
  const router = useRouter();
  const printerAddress = useAppStore((state) => state.printerAddress);

  const [invoices, setInvoices] = useState<InvoiceLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [reprintingId, setReprintingId] = useState<string | null>(null);

  useEffect(() => {
    loadTodayInvoices();
  }, []);

  async function loadTodayInvoices() {
    try {
      const db = await getDB();
      const todayStr = new Date().toISOString().split("T")[0];

      const rows = await db.getAllAsync<InvoiceLog>(
        `SELECT i.id, s.name as shop_name, i.invoice_date, i.total_amount, 
                i.total_boxes, i.cash_amount, i.paytm_amount, i.udhaar_amount, i.status
         FROM invoice i
         JOIN shop s ON s.id = i.shop_id
         WHERE i.invoice_date = ?
         ORDER BY i.created_at DESC`,
        [todayStr],
      );
      setInvoices(rows);
    } catch (error) {
      console.error("Failed to load today's invoice registry logs:", error);
    } finally {
      setLoading(false);
    }
  }

  const handleReprint = async (invoice: InvoiceLog) => {
    if (reprintingId) return;
    setReprintingId(invoice.id);

    try {
      const db = await getDB();
      const itemRows = await db.getAllAsync<{
        name: string;
        boxes: number;
        price: number;
        amount: number;
      }>(
        `SELECT sk.name, ii.boxes, sk.price, ii.amount 
         FROM invoice_item ii
         JOIN sku sk ON sk.id = ii.sku_id
         WHERE ii.invoice_id = ?`,
        [invoice.id],
      );

      const success = await printReceipt(
        {
          shopName: invoice.shop_name,
          date: invoice.invoice_date,
          totalBoxes: invoice.total_boxes,
          totalAmount: invoice.total_amount,
          cashPaid: invoice.cash_amount,
          paytmPaid: invoice.paytm_amount,
          udhaar: invoice.udhaar_amount,
          items: itemRows,
        },
        printerAddress,
      );

      if (success) {
        Alert.alert("सफलता (Success)", "बिल दोबारा प्रिंट हो गया है।");
      }
    } catch (error) {
      console.error("Reprint pipeline failed:", error);
      Alert.alert("एरर", "दोबारा प्रिंट करने में समस्या आई।");
    } finally {
      setReprintingId(null);
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#111827" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header Panel */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Feather name="arrow-left" size={24} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>आज के कुल बिल</Text>
        <View style={{ width: 44 }} />
      </View>

      {/* History Log Feed Stacks */}
      <FlatList
        data={invoices}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContainer}
        showsVerticalScrollIndicator={false}
        renderItem={({ item }) => (
          /* FIX: Wrap the whole card in a pressable layout targeting dynamic segments */
          <TouchableOpacity
            style={styles.invoiceCard}
            activeOpacity={0.7}
            onPress={() =>
              router.push({
                pathname: "/(driver)/invoice-detail",
                params: { id: item.id },
              })
            }
          >
            {/* Top row description */}
            <View style={styles.cardHeader}>
              <View style={{ flex: 1, paddingRight: 8 }}>
                <Text style={styles.shopNameText} numberOfLines={1}>
                  {item.shop_name}
                </Text>
                <Text style={styles.summarySubText}>
                  कुल सामान:{" "}
                  <Text style={styles.boldLabel}>{item.total_boxes} पेटी</Text>
                </Text>
              </View>

              {/* Reprint Action stays safely insulated */}
              <TouchableOpacity
                style={styles.reprintBtn}
                activeOpacity={0.6}
                onPress={() => handleReprint(item)}
                disabled={reprintingId !== null}
              >
                {reprintingId === item.id ? (
                  <ActivityIndicator size="small" color="#111827" />
                ) : (
                  <>
                    <Feather name="printer" size={16} color="#111827" />
                    <Text style={styles.reprintBtnText}>प्रिंट</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>

            <View style={styles.divider} />

            {/* Structured Split Payments Summary Row */}
            <View style={styles.paymentsRow}>
              <View style={styles.paymentMetric}>
                <Text style={styles.metricLabel}>कुल बिल</Text>
                <Text style={styles.metricValue}>₹{item.total_amount}</Text>
              </View>

              <View style={[styles.paymentMetric, styles.metricBorderLeft]}>
                <Text style={styles.metricLabel}>नकद (Cash)</Text>
                <Text style={[styles.metricValue, { color: "#374151" }]}>
                  ₹{item.cash_amount}
                </Text>
              </View>

              <View style={[styles.paymentMetric, styles.metricBorderLeft]}>
                <Text style={styles.metricLabel}>Paytm</Text>
                <Text style={[styles.metricValue, { color: "#2563EB" }]}>
                  ₹{item.paytm_amount}
                </Text>
              </View>

              <View style={[styles.paymentMetric, styles.metricBorderLeft]}>
                <Text style={styles.metricLabel}>उधार</Text>
                <Text
                  style={[
                    styles.metricValue,
                    item.udhaar_amount > 0
                      ? styles.alertText
                      : { color: "#10B981" },
                  ]}
                >
                  ₹{item.udhaar_amount}
                </Text>
              </View>
            </View>
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Feather name="file-text" size={48} color="#9CA3AF" />
            <Text style={styles.emptyText}>आज कोई बिल नहीं बनाया गया है।</Text>
          </View>
        }
      />
    </View>
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
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F3F4F6",
  },
  listContainer: {
    padding: 16,
    paddingBottom: 60,
  },
  invoiceCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 22,
    padding: 16,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    marginBottom: 14,
    elevation: 1,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  shopNameText: {
    fontSize: 19,
    fontWeight: "800",
    color: "#111827",
  },
  summarySubText: {
    fontSize: 14,
    color: "#6B7280",
    marginTop: 4,
    fontWeight: "600",
  },
  boldLabel: {
    color: "#111827",
    fontWeight: "800",
  },
  reprintBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderWidth: 2,
    borderColor: "#111827",
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 12,
    gap: 4,
  },
  reprintBtnText: {
    color: "#111827",
    fontWeight: "800",
    fontSize: 14,
  },
  divider: {
    height: 1,
    backgroundColor: "#F3F4F6",
    marginVertical: 14,
  },
  paymentsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  paymentMetric: {
    flex: 1,
    alignItems: "center",
  },
  metricBorderLeft: {
    borderLeftWidth: 1,
    borderColor: "#E5E7EB",
  },
  metricLabel: {
    fontSize: 12,
    color: "#6B7280",
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.3,
    marginBottom: 4,
  },
  metricValue: {
    fontSize: 16,
    fontWeight: "800",
    color: "#111827",
  },
  alertText: {
    color: "#DC2626",
  },
  emptyContainer: {
    alignItems: "center",
    marginTop: 80,
    gap: 12,
  },
  emptyText: {
    fontSize: 16,
    color: "#6B7280",
    fontWeight: "600",
  },
});
