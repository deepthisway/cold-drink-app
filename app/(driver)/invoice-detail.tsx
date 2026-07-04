import { Feather } from "@expo/vector-icons";
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
import { getDB } from "../../src/db/local/sqlite";
import { useAppStore } from "../../src/store/appStore";
import { printReceipt } from "../../src/utils/printer";

interface InvoiceMetadata {
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

interface InvoiceItemBreakdown {
  name: string;
  boxes: number;
  price: number;
  amount: number;
}

export default function InvoiceDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const printerAddress = useAppStore((state) => state.printerAddress);

  const [metadata, setMetadata] = useState<InvoiceMetadata | null>(null);
  const [items, setItems] = useState<InvoiceItemBreakdown[]>([]);
  const [loading, setLoading] = useState(true);
  const [reprinting, setReprinting] = useState(false);

  useEffect(() => {
    if (id) {
      loadFullInvoiceDetails(id);
    }
  }, [id]);

  async function loadFullInvoiceDetails(invoiceId: string) {
    try {
      const db = await getDB();

      // 1. Load context metadata details
      const metaRows = await db.getAllAsync<InvoiceMetadata>(
        `SELECT i.id, s.name as shop_name, i.invoice_date, i.total_amount, 
                i.total_boxes, i.cash_amount, i.paytm_amount, i.udhaar_amount, i.status
         FROM invoice i
         JOIN shop s ON s.id = i.shop_id
         WHERE i.id = ?`,
        [invoiceId],
      );

      if (metaRows.length > 0) {
        setMetadata(metaRows[0]);
      }

      // 2. Load accurate product item rows lines
      const itemRows = await db.getAllAsync<InvoiceItemBreakdown>(
        `SELECT sk.name, ii.boxes, sk.price, ii.amount 
         FROM invoice_item ii
         JOIN sku sk ON sk.id = ii.sku_id
         WHERE ii.invoice_id = ?`,
        [invoiceId],
      );
      setItems(itemRows);
    } catch (error) {
      console.error("Failed to query full invoice sub-arrays mapping:", error);
    } finally {
      setLoading(false);
    }
  }

  const handlePrintCommand = async () => {
    if (!metadata || reprinting) return;
    setReprinting(true);

    try {
      const success = await printReceipt(
        {
          shopName: metadata.shop_name,
          date: metadata.invoice_date,
          totalBoxes: metadata.total_boxes,
          totalAmount: metadata.total_amount,
          cashPaid: metadata.cash_amount,
          paytmPaid: metadata.paytm_amount,
          udhaar: metadata.udhaar_amount,
          items: items,
        },
        printerAddress,
      );

      if (success) {
        Alert.alert("सफलता (Success)", "बिल दोबारा प्रिंट हो गया है।");
      }
    } catch (error) {
      Alert.alert("एरर", "प्रिंट करने में समस्या आई।");
    } finally {
      setReprinting(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#111827" />
      </View>
    );
  }

  if (!metadata) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>बिल का डेटा नहीं मिला।</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Pinned Top Navigation Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Feather name="arrow-left" size={24} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>बिल का विवरण</Text>
        <View style={{ width: 44 }} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContainer}
        showsVerticalScrollIndicator={false}
      >
        {/* Core Invoice Summary Receipt Frame */}
        <View style={styles.receiptPaperCard}>
          <Text style={styles.invoiceMetaLabel}>दुकान विवरण</Text>
          <Text style={styles.shopNameText}>{metadata.shop_name}</Text>
          <Text style={styles.dateTimestampText}>
            तारीख: {metadata.invoice_date}
          </Text>

          <View style={styles.receiptLineDivider} />

          {/* Clean Itemization Headings Layer */}
          <View style={styles.tableHeaderRow}>
            <Text style={[styles.thText, { flex: 0.5 }]}>सामान (Item)</Text>
            <Text style={[styles.thText, { flex: 0.25, textAlign: "center" }]}>
              पेटी
            </Text>
            <Text style={[styles.thText, { flex: 0.25, textAlign: "right" }]}>
              कुल दाम
            </Text>
          </View>
          <View style={styles.receiptLineDivider} />

          {/* Product Items Loop Rows */}
          {items.map((item, index) => (
            <View key={index} style={styles.itemTableRow}>
              <Text
                style={[styles.tdItemNameText, { flex: 0.5 }]}
                numberOfLines={1}
              >
                {item.name}
              </Text>
              <Text
                style={[styles.tdQtyText, { flex: 0.25, textAlign: "center" }]}
              >
                {item.boxes}
              </Text>
              <Text
                style={[styles.tdPriceText, { flex: 0.25, textAlign: "right" }]}
              >
                ₹{item.amount}
              </Text>
            </View>
          ))}

          <View style={styles.receiptLineDivider} />

          {/* Aggregates Calculations Summary Block */}
          <View style={styles.aggregateSummaryRow}>
            <Text style={styles.aggregateLabel}>कुल पेटी (Total Boxes):</Text>
            <Text style={styles.aggregateValue}>
              {metadata.total_boxes} पेटी
            </Text>
          </View>
          <View style={[styles.aggregateSummaryRow, { marginTop: 6 }]}>
            <Text style={styles.aggregateLabelBig}>
              कुल राशि (Grand Total):
            </Text>
            <Text style={styles.aggregateValueBig}>
              ₹{metadata.total_amount}
            </Text>
          </View>
        </View>

        {/* Breakdown Distribution Splits block */}
        <View style={styles.splitPaymentsDetailsCard}>
          <Text style={styles.sectionTitleLabel}>
            भुगतान विवरण (Payment Matrix)
          </Text>
          <View style={styles.receiptLineDivider} />

          <View style={styles.splitPaymentDataRow}>
            <Text style={styles.splitPaymentLabel}>
              नकद प्राप्त (Cash Paid):
            </Text>
            <Text style={styles.splitPaymentValue}>
              ₹{metadata.cash_amount}
            </Text>
          </View>

          <View style={styles.splitPaymentDataRow}>
            <Text style={styles.splitPaymentLabel}>
              Paytm / ऑनलाइन प्राप्त:
            </Text>
            <Text style={[styles.splitPaymentValue, { color: "#2563EB" }]}>
              ₹{metadata.paytm_amount}
            </Text>
          </View>

          <View style={styles.splitPaymentDataRow}>
            <Text style={styles.splitPaymentLabel}>
              बाकी उधार (Udhaar Balance):
            </Text>
            <Text
              style={[
                styles.splitPaymentValue,
                metadata.udhaar_amount > 0
                  ? styles.alertTextColor
                  : { color: "#10B981" },
              ]}
            >
              ₹{metadata.udhaar_amount}
            </Text>
          </View>
        </View>
      </ScrollView>

      {/* Raised Fixed Bottom Action Trigger Strip */}
      <View style={styles.fixedFooterContainer}>
        <TouchableOpacity
          style={[
            styles.actionSubmitBtn,
            reprinting && styles.btnDisabledState,
          ]}
          activeOpacity={0.9}
          onPress={handlePrintCommand}
          disabled={reprinting}
        >
          {reprinting ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <>
              <Feather
                name="printer"
                size={20}
                color="#FFFFFF"
                style={{ marginRight: 8 }}
              />
              <Text style={styles.actionSubmitBtnText}>
                दोबारा प्रिंट करें (Reprint Invoice)
              </Text>
            </>
          )}
        </TouchableOpacity>
      </View>
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
  errorText: {
    fontSize: 16,
    color: "#6B7280",
    fontWeight: "700",
  },
  scrollContainer: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 150, // Runway offset parameter prevents element hiding beneath sticky actions strip
  },
  receiptPaperCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 22,
    padding: 20,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    marginBottom: 16,
    elevation: 1,
  },
  invoiceMetaLabel: {
    fontSize: 12,
    color: "#6B7280",
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  shopNameText: {
    fontSize: 22,
    fontWeight: "900",
    color: "#111827",
    marginTop: 4,
  },
  dateTimestampText: {
    fontSize: 14,
    color: "#4B5563",
    fontWeight: "700",
    marginTop: 2,
  },
  receiptLineDivider: {
    height: 1,
    backgroundColor: "#F3F4F6",
    marginVertical: 14,
  },
  tableHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  thText: {
    fontSize: 13,
    color: "#6B7280",
    fontWeight: "700",
    textTransform: "uppercase",
  },
  itemTableRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 10,
  },
  tdItemNameText: {
    fontSize: 18,
    color: "#111827",
    fontWeight: "700",
  },
  tdQtyText: {
    fontSize: 16,
    color: "#4B5563",
    fontWeight: "700",
  },
  tdPriceText: {
    fontSize: 18,
    color: "#111827",
    fontWeight: "800",
  },
  aggregateSummaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  aggregateLabel: {
    fontSize: 15,
    fontWeight: "700",
    color: "#4B5563",
  },
  aggregateValue: {
    fontSize: 16,
    fontWeight: "800",
    color: "#111827",
  },
  aggregateLabelBig: {
    fontSize: 16,
    fontWeight: "700",
    color: "#4B5563",
  },
  aggregateValueBig: {
    fontSize: 26,
    fontWeight: "900",
    color: "#111827",
  },
  splitPaymentsDetailsCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 22,
    padding: 16,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    elevation: 1,
  },
  sectionTitleLabel: {
    fontSize: 13,
    fontWeight: "700",
    color: "#6B7280",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  splitPaymentDataRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 8,
  },
  splitPaymentLabel: {
    fontSize: 15,
    fontWeight: "700",
    color: "#4B5563",
  },
  splitPaymentValue: {
    fontSize: 19,
    fontWeight: "800",
    color: "#111827",
  },
  alertTextColor: {
    color: "#DC2626",
  },
  fixedFooterContainer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "#FFFFFF",
    borderTopWidth: 1,
    borderColor: "#E5E7EB",
    paddingTop: 14,
    paddingHorizontal: 20,
    paddingBottom: 38, // Clean raised layout clearance avoids structural hardware buttons conflicts
    elevation: 16,
  },
  actionSubmitBtn: {
    backgroundColor: "#111827",
    height: 56,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    flexDirection: "row",
  },
  btnDisabledState: {
    backgroundColor: "#9CA3AF",
  },
  actionSubmitBtnText: {
    color: "#FFFFFF",
    fontSize: 17,
    fontWeight: "800",
  },
});
