import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
    ActivityIndicator,
    FlatList,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import { getDB } from "../../src/db/local/sqlite";

interface StockReportItem {
  id: string;
  name: string;
  brand: string | null;
  size: string | null;
  expected_stock: number;
}

export default function RemainingStockReportScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [reportData, setReportData] = useState<StockReportItem[]>([]);

  useEffect(() => {
    async function generateReport() {
      try {
        const db = await getDB();
        const todayStr = new Date().toISOString().split("T")[0];

        // This query sums up all loads, subtracts all sales, and adds back cancellations for today
        const rows = await db.getAllAsync<StockReportItem>(
          `
            SELECT 
                s.id, s.name, s.brand, s.size,
                COALESCE(SUM(l.quantity), 0) as expected_stock
            FROM sku s
            LEFT JOIN stock_ledger l ON s.id = l.sku_id
            WHERE s.active = 1
            GROUP BY s.id
            ORDER BY s.brand ASC, s.name ASC
            `,
        );

        setReportData(rows);
      } catch (error) {
        console.error("Failed to generate stock reconciliation report:", error);
      } finally {
        setLoading(false);
      }
    }

    generateReport();
  }, []);

  const totalBoxesRemaining = reportData.reduce(
    (sum, item) => sum + item.expected_stock,
    0,
  );

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#10B981" />
        <Text style={styles.loadingText}>Compiling Ledger Data...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Text style={styles.backBtnText}>⬅️ Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Stock Reconciliation</Text>
      </View>

      {/* Summary Card */}
      <View style={styles.summaryContainer}>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>Total Boxes Expected in Van</Text>
          <Text style={styles.summaryValue}>{totalBoxesRemaining}</Text>
        </View>
      </View>

      {/* Detailed List */}
      <FlatList
        data={reportData}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContainer}
        renderItem={({ item }) => (
          <View style={styles.row}>
            <View style={styles.itemInfo}>
              <Text style={styles.itemName} numberOfLines={1}>
                {item.name}
              </Text>
              <Text style={styles.itemSpecs}>
                {item.brand} • {item.size}
              </Text>
            </View>

            <View
              style={[
                styles.stockBadge,
                item.expected_stock === 0
                  ? styles.stockBadgeEmpty
                  : item.expected_stock < 5
                    ? styles.stockBadgeLow
                    : styles.stockBadgeNormal,
              ]}
            >
              <Text
                style={[
                  styles.stockBadgeText,
                  item.expected_stock === 0
                    ? styles.stockBadgeTextEmpty
                    : item.expected_stock < 5
                      ? styles.stockBadgeTextLow
                      : styles.stockBadgeTextNormal,
                ]}
              >
                {item.expected_stock}
              </Text>
            </View>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F3F4F6",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: 50,
    paddingBottom: 16,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderColor: "#E5E7EB",
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
  loadingText: {
    marginTop: 12,
    color: "#6B7280",
    fontWeight: "500",
  },
  summaryContainer: {
    padding: 16,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderColor: "#E5E7EB",
  },
  summaryCard: {
    backgroundColor: "#10B981",
    borderRadius: 12,
    padding: 20,
    alignItems: "center",
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  summaryLabel: {
    color: "#D1FAE5",
    fontSize: 14,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  summaryValue: {
    color: "#FFFFFF",
    fontSize: 36,
    fontWeight: "bold",
  },
  listContainer: {
    padding: 16,
    paddingBottom: 40,
  },
  row: {
    flexDirection: "row",
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 16,
    marginBottom: 10,
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  itemInfo: {
    flex: 0.75,
  },
  itemName: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#1F2937",
  },
  itemSpecs: {
    fontSize: 13,
    color: "#6B7280",
    marginTop: 4,
  },
  stockBadge: {
    minWidth: 44,
    height: 44,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 12,
  },
  stockBadgeNormal: {
    backgroundColor: "#ECFDF5",
    borderWidth: 1,
    borderColor: "#A7F3D0",
  },
  stockBadgeLow: {
    backgroundColor: "#FFFBEB",
    borderWidth: 1,
    borderColor: "#FDE68A",
  },
  stockBadgeEmpty: {
    backgroundColor: "#FEF2F2",
    borderWidth: 1,
    borderColor: "#FECACA",
  },
  stockBadgeText: {
    fontSize: 18,
    fontWeight: "bold",
  },
  stockBadgeTextNormal: { color: "#059669" },
  stockBadgeTextLow: { color: "#D97706" },
  stockBadgeTextEmpty: { color: "#DC2626" },
});
