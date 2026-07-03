import { useRouter } from "expo-router";
import {
    SafeAreaView,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import { useAppStore } from "../../src/store/appStore";

export default function AdminDashboardScreen() {
  const router = useRouter();
  const setAdminStatus = useAppStore((state) => state.setAdminStatus);

  const handleExit = () => {
    // Lock the admin session and return to the driver's idle screen
    setAdminStatus(false);
    router.replace("/(driver)");
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Admin Dashboard</Text>
        <TouchableOpacity style={styles.exitBtn} onPress={handleExit}>
          <Text style={styles.exitBtnText}>Lock & Exit</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* Load Stock Action Card */}
        <TouchableOpacity
          style={[styles.card, styles.stockCard]}
          onPress={() => router.push("/(admin)/load-stock")}
        >
          <Text style={styles.cardIcon}>📦</Text>
          <View style={styles.cardTextContainer}>
            <Text style={styles.cardTitle}>Load Stock</Text>
            <Text style={styles.cardDesc}>Add boxes to the van for today</Text>
          </View>
        </TouchableOpacity>

        {/* Items & Prices Action Card */}
        <TouchableOpacity
          style={[styles.card, styles.priceCard]}
          onPress={() => router.push("/(admin)/items-prices")}
        >
          <Text style={styles.cardIcon}>🏷️</Text>
          <View style={styles.cardTextContainer}>
            <Text style={styles.cardTitle}>Items & Prices</Text>
            <Text style={styles.cardDesc}>
              Manage SKUs, active status, and fixed pricing
            </Text>
          </View>
        </TouchableOpacity>

        {/* Expected Remaining Stock Action Card */}
        <TouchableOpacity
          style={[styles.card, styles.reportCard]}
          onPress={() => router.push("/(admin)/remaining-stock-report")}
        >
          <Text style={styles.cardIcon}>📊</Text>
          <View style={styles.cardTextContainer}>
            <Text style={styles.cardTitle}>Stock Reconciliation</Text>
            <Text style={styles.cardDesc}>
              Expected vs Actual van inventory report
            </Text>
          </View>
        </TouchableOpacity>

        {/* NEW: Cloud Invoices Action Card */}
        <TouchableOpacity
          style={[styles.card, styles.cloudCard]}
          onPress={() => router.push("/(admin)/all-invoices")}
        >
          <Text style={styles.cardIcon}>☁️</Text>
          <View style={styles.cardTextContainer}>
            <Text style={styles.cardTitle}>Cloud Invoices</Text>
            <Text style={styles.cardDesc}>
              View all synced bills directly from Supabase
            </Text>
          </View>
        </TouchableOpacity>
      </ScrollView>

      <View style={styles.footer}>
        <Text style={styles.footerText}>🟢 Silent Background Sync Active</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F3F4F6",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderColor: "#E5E7EB",
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#1F2937",
  },
  exitBtn: {
    backgroundColor: "#FEF2F2",
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#FEE2E2",
  },
  exitBtnText: {
    color: "#EF4444",
    fontWeight: "600",
    fontSize: 14,
  },
  content: {
    padding: 16,
    gap: 16,
    paddingBottom: 30,
  },
  card: {
    flexDirection: "row",
    alignItems: "center",
    padding: 20,
    borderRadius: 16,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  stockCard: { backgroundColor: "#3B82F6" },
  priceCard: { backgroundColor: "#8B5CF6" },
  reportCard: { backgroundColor: "#10B981" },
  cloudCard: { backgroundColor: "#F97316" }, // Nice distinct orange for cloud actions
  cardIcon: {
    fontSize: 36,
    marginRight: 16,
  },
  cardTextContainer: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#FFFFFF",
    marginBottom: 4,
  },
  cardDesc: {
    fontSize: 14,
    color: "#F9FAFB",
    opacity: 0.9,
  },
  footer: {
    padding: 16,
    alignItems: "center",
    borderTopWidth: 1,
    borderColor: "#E5E7EB",
    backgroundColor: "#FFFFFF",
  },
  footerText: {
    fontSize: 13,
    color: "#6B7280",
    fontWeight: "500",
  },
});
