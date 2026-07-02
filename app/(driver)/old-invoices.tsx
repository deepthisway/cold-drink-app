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

interface InvoiceListItem {
  id: string;
  display_number: number | null;
  shop_name: string;
  invoice_date: string;
  total_amount: number;
  total_boxes: number;
  status: "active" | "cancelled";
}

interface GroupedInvoices {
  title: string;
  data: InvoiceListItem[];
}

export default function OldInvoicesScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [groupedInvoices, setGroupedInvoices] = useState<GroupedInvoices[]>([]);

  useEffect(() => {
    async function loadInvoiceHistory() {
      try {
        const db = await getDB();

        // Fetch raw log list, joining against shop to fetch the friendly shop name
        const rows = await db.getAllAsync<InvoiceListItem>(`
          SELECT 
            i.id, i.display_number, i.invoice_date, i.total_amount, i.total_boxes, i.status,
            s.name as shop_name
          FROM invoice i
          JOIN shop s ON i.shop_id = s.id
          ORDER BY i.created_at DESC
        `);

        // Group rows logically by date for structured rendering
        const groups: Record<string, InvoiceListItem[]> = {};
        rows.forEach((row) => {
          if (!groups[row.invoice_date]) {
            groups[row.invoice_date] = [];
          }
          groups[row.invoice_date].push(row);
        });

        const formattedGroups = Object.keys(groups).map((date) => ({
          title: date,
          data: groups[date],
        }));

        setGroupedInvoices(formattedGroups);
      } catch (error) {
        console.error("Failed to parse invoice database history:", error);
      } finally {
        setLoading(false);
      }
    }

    loadInvoiceHistory();
  }, []);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header Context Bar */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => router.replace("/(driver)")}
        >
          <Text style={styles.backBtnText}>⬅️ Home</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>बिल का इतिहास (Invoice History)</Text>
      </View>

      {groupedInvoices.length === 0 ? (
        <View style={styles.center}>
          <Text style={styles.emptyText}>
            कोई बिल नहीं मिला (No invoices found)
          </Text>
        </View>
      ) : (
        <FlatList
          data={groupedInvoices}
          keyExtractor={(item) => item.title}
          contentContainerStyle={styles.listContainer}
          renderItem={({ item: group }) => (
            <View style={styles.groupContainer}>
              {/* Date Group Sticky Section Title */}
              <Text style={styles.groupTitle}>📅 {group.title}</Text>

              {group.data.map((invoice, index) => {
                const isCancelled = invoice.status === "cancelled";

                return (
                  <TouchableOpacity
                    key={invoice.id}
                    style={[
                      styles.invoiceRow,
                      isCancelled && styles.invoiceRowCancelled,
                    ]}
                    onPress={() =>
                      router.push({
                        pathname: "/(driver)/invoice-detail",
                        params: { id: invoice.id },
                      })
                    }
                  >
                    <View style={styles.invoiceMeta}>
                      <Text
                        style={[
                          styles.shopNameText,
                          isCancelled && styles.textStrikethrough,
                        ]}
                      >
                        {invoice.shop_name}
                      </Text>
                      <Text style={styles.boxCountText}>
                        📦 {invoice.total_boxes} Boxes
                      </Text>
                    </View>

                    <View style={styles.invoiceAmountContainer}>
                      {isCancelled ? (
                        <View style={styles.cancelledBadge}>
                          <Text style={styles.cancelledBadgeText}>
                            Canceled
                          </Text>
                        </View>
                      ) : (
                        <Text style={styles.amountText}>
                          ₹{invoice.total_amount}
                        </Text>
                      )}
                      <Text style={styles.arrowIcon}>➡️</Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}
        />
      )}
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
  emptyText: {
    fontSize: 16,
    color: "#6B7280",
  },
  listContainer: {
    padding: 16,
  },
  groupContainer: {
    marginBottom: 20,
  },
  groupTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#6B7280",
    textTransform: "uppercase",
    marginBottom: 10,
    letterSpacing: 0.5,
  },
  invoiceRow: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 16,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  invoiceRowCancelled: {
    backgroundColor: "#FEF2F2",
    borderColor: "#FEE2E2",
  },
  invoiceMeta: {
    flex: 0.65,
  },
  shopNameText: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1F2937",
  },
  boxCountText: {
    fontSize: 14,
    color: "#6B7280",
    marginTop: 4,
    fontWeight: "500",
  },
  invoiceAmountContainer: {
    flex: 0.35,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: 8,
  },
  amountText: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#1F2937",
  },
  cancelledBadge: {
    backgroundColor: "#EF4444",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  cancelledBadgeText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "bold",
  },
  textStrikethrough: {
    textDecorationLine: "line-through",
    color: "#9CA3AF",
  },
  arrowIcon: {
    fontSize: 16,
    color: "#9CA3AF",
  },
});
