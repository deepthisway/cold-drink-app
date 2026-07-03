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
import { supabase } from "../../src/db/sync/supabase";

interface CloudInvoice {
  id: string;
  shop_id: string;
  invoice_date: string;
  total_amount: number;
  total_boxes: number;
  status: "active" | "cancelled";
  device_id: string;
  created_at: string;
  shop_name?: string; // We'll map this locally to avoid complex joins
}

export default function AllCloudInvoicesScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [invoices, setInvoices] = useState<CloudInvoice[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const fetchCloudInvoices = async () => {
    try {
      // 1. Fetch all invoices from Supabase
      const { data: invData, error: invErr } = await supabase
        .from("invoice")
        .select("*")
        .order("created_at", { ascending: false });

      if (invErr) throw invErr;

      // 2. Fetch shops to map the names
      const { data: shopData, error: shopErr } = await supabase
        .from("shop")
        .select("id, name");

      if (shopErr) throw shopErr;

      // 3. Combine them
      const mappedInvoices = (invData || []).map((inv: any) => {
        const shop = shopData?.find((s) => s.id === inv.shop_id);
        return {
          ...inv,
          shop_name: shop ? shop.name : "Unknown Shop",
        };
      });

      setInvoices(mappedInvoices);
    } catch (error: any) {
      console.error("Failed to fetch cloud invoices:", error.message);
      Alert.alert("Network Error", "Could not fetch data from Supabase.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchCloudInvoices();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchCloudInvoices();
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#F97316" />
        <Text style={styles.loadingText}>Fetching from Cloud...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Text style={styles.backBtnText}>⬅️ Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>All Cloud Invoices</Text>
      </View>

      <FlatList
        data={invoices}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContainer}
        refreshing={refreshing}
        onRefresh={onRefresh}
        ListEmptyComponent={
          <View style={styles.centerList}>
            <Text style={styles.emptyText}>
              No invoices synced to cloud yet.
            </Text>
          </View>
        }
        renderItem={({ item }) => {
          const isCancelled = item.status === "cancelled";
          return (
            <View
              style={[
                styles.invoiceRow,
                isCancelled && styles.invoiceRowCancelled,
              ]}
            >
              <View style={styles.invoiceMeta}>
                <Text
                  style={[
                    styles.shopNameText,
                    isCancelled && styles.textStrikethrough,
                  ]}
                >
                  {item.shop_name}
                </Text>
                <Text style={styles.subText}>
                  📅{" "}
                  {new Date(item.created_at).toLocaleString("en-IN", {
                    timeZone: "Asia/Kolkata",
                  })}
                </Text>
                <Text style={styles.subText}>
                  📱 Device: {item.device_id || "Unknown"}
                </Text>
              </View>

              <View style={styles.invoiceAmountContainer}>
                {isCancelled ? (
                  <View style={styles.cancelledBadge}>
                    <Text style={styles.cancelledBadgeText}>Canceled</Text>
                  </View>
                ) : (
                  <Text style={styles.amountText}>₹{item.total_amount}</Text>
                )}
                <Text style={styles.boxCountText}>
                  📦 {item.total_boxes} Boxes
                </Text>
              </View>
            </View>
          );
        }}
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
  centerList: {
    paddingTop: 40,
    alignItems: "center",
  },
  loadingText: {
    marginTop: 12,
    color: "#6B7280",
    fontWeight: "500",
  },
  emptyText: {
    fontSize: 16,
    color: "#6B7280",
  },
  listContainer: {
    padding: 16,
  },
  invoiceRow: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 16,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    elevation: 1,
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
    marginBottom: 4,
  },
  subText: {
    fontSize: 12,
    color: "#6B7280",
    marginTop: 2,
    fontWeight: "500",
  },
  invoiceAmountContainer: {
    flex: 0.35,
    alignItems: "flex-end",
    justifyContent: "center",
    gap: 4,
  },
  amountText: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#10B981", // Green for successful cloud sync amounts
  },
  boxCountText: {
    fontSize: 14,
    color: "#4B5563",
    fontWeight: "600",
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
});
