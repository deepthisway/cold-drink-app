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
// नया फंक्शन इम्पोर्ट करें
import {
    printEndDayReports,
    printItemWiseReport,
} from "../../src/utils/printer";

interface SkuSale {
  name: string;
  boxes: number;
}

export default function DailyReportsScreen() {
  const router = useRouter();
  const printerAddress = useAppStore((state) => state.printerAddress);

  const [targetDate, setTargetDate] = useState(new Date());
  const [loading, setLoading] = useState(false);

  // अलग-अलग प्रिंटिंग स्टेट्स
  const [printingAll, setPrintingAll] = useState(false);
  const [printingItems, setPrintingItems] = useState(false);

  // Data States
  const [totalBoxes, setTotalBoxes] = useState(0);
  const [totalAmount, setTotalAmount] = useState(0);
  const [skuSales, setSkuSales] = useState<SkuSale[]>([]);

  const [fullReportData, setFullReportData] = useState<any>(null);

  const formattedDateString = targetDate.toISOString().split("T")[0];
  const displayDate = targetDate.toLocaleDateString("en-IN", {
    weekday: "short",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  useEffect(() => {
    fetchDataForDate(formattedDateString);
  }, [formattedDateString]);

  const changeDate = (days: number) => {
    const newDate = new Date(targetDate);
    newDate.setDate(newDate.getDate() + days);
    setTargetDate(newDate);
  };

  const fetchDataForDate = async (dateStr: string) => {
    setLoading(true);
    try {
      const db = await getDB();

      const skuRows = await db.getAllAsync<SkuSale>(
        `SELECT sk.name as name, SUM(ii.boxes) as boxes
         FROM invoice_item ii
         JOIN invoice i ON i.id = ii.invoice_id
         JOIN sku sk ON sk.id = ii.sku_id
         WHERE i.invoice_date = ? AND i.status = 'active'
         GROUP BY sk.id
         ORDER BY boxes DESC`,
        [dateStr],
      );
      setSkuSales(skuRows);

      const invoiceRows = await db.getAllAsync<{
        shop_name: string;
        total_boxes: number;
        total_amount: number;
        status: string;
        udhaar_amount: number;
        paytm_amount: number;
      }>(
        `SELECT s.name as shop_name, i.total_boxes, i.total_amount, i.status, i.udhaar_amount, i.paytm_amount
         FROM invoice i JOIN shop s ON s.id = i.shop_id
         WHERE i.invoice_date = ? ORDER BY i.created_at ASC`,
        [dateStr],
      );

      const invoices = invoiceRows.map((row) => ({
        displayLabel: row.shop_name,
        boxes: row.total_boxes,
        amount: row.total_amount,
        cancelled: row.status === "cancelled",
      }));

      const activeInvoices = invoiceRows.filter((r) => r.status === "active");

      const tAmount = activeInvoices.reduce(
        (sum, r) => sum + r.total_amount,
        0,
      );
      const tBoxes = activeInvoices.reduce((sum, r) => sum + r.total_boxes, 0);

      setTotalAmount(tAmount);
      setTotalBoxes(tBoxes);

      const udhaarList = activeInvoices
        .filter((r) => r.udhaar_amount > 0)
        .map((r) => ({ shopName: r.shop_name, amount: r.udhaar_amount }));

      const paytmList = activeInvoices
        .filter((r) => r.paytm_amount > 0)
        .map((r) => ({ shopName: r.shop_name, amount: r.paytm_amount }));

      const tUdhaar = udhaarList.reduce((sum, r) => sum + r.amount, 0);
      const tPaytm = paytmList.reduce((sum, r) => sum + r.amount, 0);

      setFullReportData({
        date: dateStr,
        invoices,
        totalAmount: tAmount,
        totalBoxes: tBoxes,
        skuTotals: skuRows,
        udhaarList,
        paytmList,
        totalUdhaar: tUdhaar,
        totalPaytm: tPaytm,
      });
    } catch (error) {
      console.error("Failed to load daily report:", error);
    } finally {
      setLoading(false);
    }
  };

  // पूरा हिसाब प्रिंट करने के लिए
  const handlePrintAll = async () => {
    if (!fullReportData || fullReportData.invoices.length === 0) {
      Alert.alert("कोई डेटा नहीं", "इस दिन कोई बिल नहीं बना है।");
      return;
    }

    setPrintingAll(true);
    try {
      const success = await printEndDayReports(fullReportData, printerAddress);
      if (success) Alert.alert("सफलता", "पूरी रिपोर्ट प्रिंट हो गई है।");
    } catch (error) {
      Alert.alert("एरर", "प्रिंट करने में समस्या आई।");
    } finally {
      setPrintingAll(false);
    }
  };

  // सिर्फ आइटम की रिपोर्ट प्रिंट करने के लिए
  const handlePrintItemsOnly = async () => {
    if (!fullReportData || fullReportData.invoices.length === 0) {
      Alert.alert("कोई डेटा नहीं", "इस दिन कोई आइटम नहीं बिका है।");
      return;
    }

    setPrintingItems(true);
    try {
      const success = await printItemWiseReport(fullReportData, printerAddress);
      if (success) Alert.alert("सफलता", "आइटम लिस्ट प्रिंट हो गई है।");
    } catch (error) {
      Alert.alert("एरर", "प्रिंट करने में समस्या आई।");
    } finally {
      setPrintingItems(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Feather name="arrow-left" size={24} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>सेल्स रिपोर्ट</Text>
        <View style={{ width: 44 }} />
      </View>

      {/* Date Navigator */}
      <View style={styles.dateNavigator}>
        <TouchableOpacity style={styles.dateBtn} onPress={() => changeDate(-1)}>
          <Feather name="chevron-left" size={24} color="#4B5563" />
        </TouchableOpacity>
        <Text style={styles.dateText}>{displayDate}</Text>
        <TouchableOpacity style={styles.dateBtn} onPress={() => changeDate(1)}>
          <Feather name="chevron-right" size={24} color="#4B5563" />
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#111827" />
        </View>
      ) : (
        <View style={{ flex: 1 }}>
          {/* Summary Cards */}
          <View style={styles.summaryRow}>
            <View style={styles.summaryBox}>
              <Text style={styles.summaryLabel}>कुल पेटी (Boxes)</Text>
              <Text style={styles.summaryValue}>{totalBoxes}</Text>
            </View>
            <View style={styles.summaryBox}>
              <Text style={styles.summaryLabel}>कुल बिक्री (Sales)</Text>
              <Text style={[styles.summaryValue, { color: "#10B981" }]}>
                ₹{totalAmount}
              </Text>
            </View>
          </View>

          {/* Item wise breakdown */}
          <View style={styles.listContainer}>
            <Text style={styles.sectionTitle}>
              आइटम के हिसाब से बिक्री (Item Wise)
            </Text>

            {skuSales.length === 0 ? (
              <Text style={styles.emptyText}>इस दिन कोई बिक्री नहीं हुई।</Text>
            ) : (
              <FlatList
                data={skuSales}
                keyExtractor={(item) => item.name}
                renderItem={({ item }) => (
                  <View style={styles.skuRow}>
                    <Text style={styles.skuName}>{item.name}</Text>
                    <View style={styles.skuBadge}>
                      <Text style={styles.skuBadgeText}>{item.boxes} Box</Text>
                    </View>
                  </View>
                )}
              />
            )}
          </View>
        </View>
      )}

      {/* Sticky Bottom Actions - 2 Buttons */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={[
            styles.printBtn,
            styles.printBtnSecondary,
            printingItems && styles.printBtnDisabled,
          ]}
          onPress={handlePrintItemsOnly}
          disabled={printingAll || printingItems || loading}
        >
          {printingItems ? (
            <ActivityIndicator color="#111827" />
          ) : (
            <>
              <Feather name="list" size={20} color="#111827" />
              <Text style={styles.printBtnSecondaryText}>
                सिर्फ आइटम रिपोर्ट
              </Text>
            </>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.printBtn, printingAll && styles.printBtnDisabled]}
          onPress={handlePrintAll}
          disabled={printingAll || printingItems || loading}
        >
          {printingAll ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <>
              <Feather name="printer" size={20} color="#FFFFFF" />
              <Text style={styles.printBtnText}>पूरी रिपोर्ट प्रिंट करें</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F3F4F6", paddingTop: 50 },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderColor: "#E5E7EB",
  },
  backBtn: {
    width: 44,
    height: 44,
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitle: { fontSize: 20, fontWeight: "800", color: "#111827" },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  dateNavigator: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderBottomWidth: 1,
    borderColor: "#E5E7EB",
  },
  dateBtn: { padding: 8, backgroundColor: "#F3F4F6", borderRadius: 8 },
  dateText: { fontSize: 16, fontWeight: "700", color: "#111827" },
  summaryRow: { flexDirection: "row", gap: 16, padding: 20 },
  summaryBox: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    alignItems: "center",
  },
  summaryLabel: {
    fontSize: 13,
    color: "#6B7280",
    fontWeight: "600",
    marginBottom: 8,
  },
  summaryValue: { fontSize: 24, fontWeight: "bold", color: "#111827" },
  listContainer: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#4B5563",
    marginBottom: 16,
  },
  skuRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderColor: "#F3F4F6",
  },
  skuName: { fontSize: 16, fontWeight: "600", color: "#111827" },
  skuBadge: {
    backgroundColor: "#EFF6FF",
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  skuBadgeText: { fontSize: 14, fontWeight: "700", color: "#2563EB" },
  emptyText: {
    color: "#6B7280",
    textAlign: "center",
    marginTop: 40,
    fontSize: 15,
  },

  // Footer Updates For 2 Buttons
  footer: {
    padding: 20,
    backgroundColor: "#FFFFFF",
    borderTopWidth: 1,
    borderColor: "#E5E7EB",
    gap: 12, // दोनों बटन्स के बीच में जगह
  },
  printBtn: {
    backgroundColor: "#111827",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    borderRadius: 16,
    gap: 10,
  },
  printBtnSecondary: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#D1D5DB",
  },
  printBtnDisabled: {
    opacity: 0.6,
  },
  printBtnText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "bold",
  },
  printBtnSecondaryText: {
    color: "#111827",
    fontSize: 16,
    fontWeight: "bold",
  },
});
