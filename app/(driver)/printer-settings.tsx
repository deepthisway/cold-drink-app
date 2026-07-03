import { ensureBluetoothPermissions } from "@/src/utils/bluetoothPermissions";
import { ThermalPrinter } from "@finan-me/react-native-thermal-printer";
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
import { useAppStore } from "../../src/store/appStore";

interface PairedDevice {
  name: string;
  address: string;
}

export default function PrinterSettingsScreen() {
  const router = useRouter();
  const { printerAddress, setPrinterAddress } = useAppStore();

  const [loading, setLoading] = useState(true);
  const [devices, setDevices] = useState<PairedDevice[]>([]);
  const [connectingTo, setConnectingTo] = useState<string | null>(null);

  useEffect(() => {
    scanDevices();
  }, []);

  const scanDevices = async () => {
    setLoading(true);
    try {
      const hasPermission = await ensureBluetoothPermissions();
      if (!hasPermission) {
        Alert.alert(
          "Permission Needed",
          "Please allow Bluetooth permissions to scan for printers.",
        );
        setLoading(false);
        return;
      }

      const { paired } = await ThermalPrinter.scanDevices();
      setDevices(
        (paired || []).map((d: any) => ({
          name: d.name || "Unknown Device",
          address: d.address,
        })),
      );
    } catch (error) {
      console.error("Bluetooth Scan Error:", error);
      Alert.alert("Scan Failed", "Could not scan for Bluetooth devices.");
    } finally {
      setLoading(false);
    }
  };

  const connectAndTestPrinter = async (device: PairedDevice) => {
    setConnectingTo(device.address);
    try {
      const address = device.address.startsWith("bt:")
        ? device.address
        : `bt:${device.address}`;

      const job = {
        printers: [{ address, options: { paperWidthMm: 58, marginMm: 1 } }],
        documents: [
          [
            { type: "text", content: "--------------------------------" },
            {
              type: "text",
              content: "PRINTER CONNECTED SUCCESSFULLY!",
              style: { align: "center", bold: true },
            },
            { type: "text", content: "--------------------------------" },
            { type: "feed", lines: 2 },
          ],
        ],
      };

      const result = await ThermalPrinter.printReceipt(job);

      if (result?.success) {
        setPrinterAddress(device.address);
        Alert.alert(
          "Success!",
          `Connected to ${device.name} and saved as default printer.`,
        );
      } else {
        throw new Error("Print job did not succeed");
      }
    } catch (error: any) {
      console.error("Printer Connection Error:", error);
      Alert.alert(
        "Connection Failed",
        `Could not connect to ${device.name}. Is it turned on?`,
      );
    } finally {
      setConnectingTo(null);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Text style={styles.backBtnText}>⬅️ Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Printer Setup</Text>
      </View>

      <View style={styles.statusCard}>
        <Text style={styles.statusTitle}>Current Printer:</Text>
        <Text
          style={
            printerAddress ? styles.statusConnected : styles.statusDisconnected
          }
        >
          {printerAddress ? `Connected (${printerAddress})` : "Not Configured"}
        </Text>
        <TouchableOpacity style={styles.scanBtn} onPress={scanDevices}>
          <Text style={styles.scanBtnText}>🔄 Rescan Devices</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>Scanning Bluetooth...</Text>
        </View>
      ) : (
        <FlatList
          data={devices}
          keyExtractor={(item) => item.address}
          contentContainerStyle={styles.listContainer}
          ListHeaderComponent={
            <Text style={styles.listHeader}>Paired Bluetooth Devices</Text>
          }
          ListEmptyComponent={
            <Text style={styles.emptyText}>
              No paired devices found. Pair your printer in Android Settings
              first.
            </Text>
          }
          renderItem={({ item }) => {
            const isSelected = item.address === printerAddress;
            const isConnecting = connectingTo === item.address;

            return (
              <TouchableOpacity
                style={[
                  styles.deviceRow,
                  isSelected && styles.deviceRowSelected,
                ]}
                onPress={() => connectAndTestPrinter(item)}
                disabled={isConnecting}
              >
                <View style={styles.deviceInfo}>
                  <Text style={styles.deviceName}>
                    {item.name || "Unknown Device"}
                  </Text>
                  <Text style={styles.deviceMac}>{item.address}</Text>
                </View>

                {isConnecting ? (
                  <ActivityIndicator size="small" color="#007AFF" />
                ) : isSelected ? (
                  <View style={styles.badgeActive}>
                    <Text style={styles.badgeActiveText}>Ready</Text>
                  </View>
                ) : (
                  <Text style={styles.connectLink}>Connect</Text>
                )}
              </TouchableOpacity>
            );
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F3F4F6" },
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
  backBtnText: { fontSize: 14, fontWeight: "600", color: "#4B5563" },
  headerTitle: { fontSize: 18, fontWeight: "bold", color: "#1F2937" },
  statusCard: {
    backgroundColor: "#FFFFFF",
    margin: 16,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  statusTitle: {
    fontSize: 14,
    color: "#6B7280",
    fontWeight: "600",
    marginBottom: 4,
  },
  statusConnected: {
    fontSize: 18,
    color: "#10B981",
    fontWeight: "bold",
    marginBottom: 16,
  },
  statusDisconnected: {
    fontSize: 18,
    color: "#EF4444",
    fontWeight: "bold",
    marginBottom: 16,
  },
  scanBtn: {
    backgroundColor: "#EFF6FF",
    padding: 12,
    borderRadius: 8,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#BFDBFE",
  },
  scanBtnText: { color: "#1D4ED8", fontWeight: "bold" },
  listContainer: { paddingHorizontal: 16, paddingBottom: 40 },
  listHeader: {
    fontSize: 14,
    fontWeight: "700",
    color: "#6B7280",
    textTransform: "uppercase",
    marginBottom: 12,
  },
  deviceRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    padding: 16,
    borderRadius: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  deviceRowSelected: { borderColor: "#007AFF", backgroundColor: "#F0F9FF" },
  deviceInfo: { flex: 0.8 },
  deviceName: { fontSize: 16, fontWeight: "bold", color: "#1F2937" },
  deviceMac: { fontSize: 13, color: "#6B7280", marginTop: 2 },
  connectLink: { color: "#007AFF", fontWeight: "600" },
  badgeActive: {
    backgroundColor: "#10B981",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  badgeActiveText: { color: "#FFFFFF", fontSize: 12, fontWeight: "bold" },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  loadingText: { marginTop: 12, color: "#6B7280", fontWeight: "500" },
  emptyText: { color: "#6B7280", textAlign: "center", marginTop: 20 },
});
