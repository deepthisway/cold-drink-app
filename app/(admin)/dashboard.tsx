import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import {
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
    setAdminStatus(false);
    router.replace("/(driver)");
  };

  return (
    <View style={styles.container}>
      {/* Header - Brought Down */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>एडमिन पैनल</Text>
          <Text style={styles.headerSubtitle}>(Admin Dashboard)</Text>
        </View>
        <TouchableOpacity style={styles.exitBtn} onPress={handleExit}>
          <Feather name="lock" size={16} color="#DC2626" />
          <Text style={styles.exitBtnText}>बंद करें</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* Section 1: Inventory */}
        <Text style={styles.sectionHeader}>स्टॉक मैनेजमेंट (INVENTORY)</Text>

        <TouchableOpacity
          style={styles.menuRow}
          activeOpacity={0.7}
          onPress={() => router.push("/(admin)/load-stock")}
        >
          <View style={[styles.iconWrapper, { backgroundColor: "#EFF6FF" }]}>
            <Feather name="package" size={24} color="#2563EB" />
          </View>
          <View style={styles.menuTextContent}>
            <Text style={styles.menuTitle}>आज का स्टॉक भरें</Text>
            <Text style={styles.menuDesc}>(Load Daily Stock)</Text>
          </View>
          <Feather name="chevron-right" size={22} color="#9CA3AF" />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.menuRow}
          activeOpacity={0.7}
          onPress={() => router.push("/(admin)/items-prices")}
        >
          <View style={[styles.iconWrapper, { backgroundColor: "#F5F3FF" }]}>
            <Feather name="tag" size={24} color="#7C3AED" />
          </View>
          <View style={styles.menuTextContent}>
            <Text style={styles.menuTitle}>सामान और रेट</Text>
            <Text style={styles.menuDesc}>(Items & Pricing)</Text>
          </View>
          <Feather name="chevron-right" size={22} color="#9CA3AF" />
        </TouchableOpacity>

        {/* Section 2: Audit, Reports & Cloud */}
        <Text style={styles.sectionHeader}>
          रिपोर्ट और डेटा (AUDIT & REPORTS)
        </Text>

        {/* NEW DAILY REPORTS BUTTON */}
        <TouchableOpacity
          style={styles.menuRow}
          activeOpacity={0.7}
          onPress={() => router.push("/(admin)/daily-reports")}
        >
          <View style={[styles.iconWrapper, { backgroundColor: "#FEF2F2" }]}>
            <Feather name="file-text" size={24} color="#DC2626" />
          </View>
          <View style={styles.menuTextContent}>
            <Text style={styles.menuTitle}>डेली सेल्स और रिपोर्ट</Text>
            <Text style={styles.menuDesc}>(Date-wise Sales & Print)</Text>
          </View>
          <Feather name="chevron-right" size={22} color="#9CA3AF" />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.menuRow}
          activeOpacity={0.7}
          onPress={() => router.push("/(admin)/remaining-stock-report")}
        >
          <View style={[styles.iconWrapper, { backgroundColor: "#ECFDF5" }]}>
            <Feather name="bar-chart-2" size={24} color="#10B981" />
          </View>
          <View style={styles.menuTextContent}>
            <Text style={styles.menuTitle}>स्टॉक का हिसाब</Text>
            <Text style={styles.menuDesc}>(Stock Reconciliation)</Text>
          </View>
          <Feather name="chevron-right" size={22} color="#9CA3AF" />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.menuRow}
          activeOpacity={0.7}
          onPress={() => router.push("/(admin)/all-invoices")}
        >
          <View style={[styles.iconWrapper, { backgroundColor: "#FFF7ED" }]}>
            <Feather name="cloud" size={24} color="#F97316" />
          </View>
          <View style={styles.menuTextContent}>
            <Text style={styles.menuTitle}>क्लाउड बिल और डेटा</Text>
            <Text style={styles.menuDesc}>(Cloud Invoices)</Text>
          </View>
          <Feather name="chevron-right" size={22} color="#9CA3AF" />
        </TouchableOpacity>

        {/* Section 3: Settings */}
        <Text style={styles.sectionHeader}>सेटिंग्स (SETTINGS)</Text>

        <TouchableOpacity
          style={styles.menuRow}
          activeOpacity={0.7}
          onPress={() => router.push("/(driver)/printer-settings")}
        >
          <View style={[styles.iconWrapper, { backgroundColor: "#F3F4F6" }]}>
            <Feather name="printer" size={24} color="#4B5563" />
          </View>
          <View style={styles.menuTextContent}>
            <Text style={styles.menuTitle}>प्रिंटर सेटिंग्स</Text>
            <Text style={styles.menuDesc}>(Printer Setup)</Text>
          </View>
          <Feather name="chevron-right" size={22} color="#9CA3AF" />
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F3F4F6",
    paddingTop: 50, // Added Top Padding to bring header down
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 24,
    paddingVertical: 20,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderColor: "#E5E7EB",
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "800",
    color: "#111827",
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    fontSize: 14,
    color: "#6B7280",
    fontWeight: "500",
    marginTop: 2,
  },
  exitBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FEF2F2",
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#FEE2E2",
    gap: 8,
  },
  exitBtnText: {
    color: "#DC2626",
    fontWeight: "700",
    fontSize: 15,
  },
  content: {
    padding: 20,
    paddingBottom: 40,
  },
  sectionHeader: {
    fontSize: 13,
    fontWeight: "700",
    color: "#6B7280",
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 12,
    marginTop: 12,
  },
  menuRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.02,
    shadowRadius: 4,
    elevation: 1,
  },
  iconWrapper: {
    width: 52,
    height: 52,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16,
  },
  menuTextContent: {
    flex: 1,
  },
  menuTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 4,
  },
  menuDesc: {
    fontSize: 14,
    color: "#6B7280",
  },
  footer: {
    padding: 16,
    alignItems: "center",
    borderTopWidth: 1,
    borderColor: "#E5E7EB",
    backgroundColor: "#FFFFFF",
  },
  syncStatusBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F3F4F6",
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    gap: 10,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#10B981",
  },
  footerText: {
    fontSize: 14,
    color: "#4B5563",
    fontWeight: "600",
  },
});
