import { ThermalPrinter } from "@finan-me/react-native-thermal-printer";
import { ensureBluetoothPermissions } from "./bluetoothPermissions";

export interface PairedDevice {
  name: string;
  address: string;
}

export async function scanPairedPrinters(): Promise<PairedDevice[]> {
  const hasPermission = await ensureBluetoothPermissions();
  console.log("Bluetooth permission granted?", hasPermission);
  if (!hasPermission) {
    throw new Error("PERMISSION_DENIED");
  }

  const result = await ThermalPrinter.scanDevices();
  console.log("Scan result:", JSON.stringify(result));
  return (result.paired || []).map((d: any) => ({
    name: d.name || "Unknown Device",
    address: d.address,
  }));
}

export async function testPrintConnection(address: string): Promise<boolean> {
  const btAddress = address.startsWith("bt:") ? address : `bt:${address}`;

  const job = {
    printers: [
      { address: btAddress, options: { paperWidthMm: 58, marginMm: 1 } },
    ],
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

  const result = await ThermalPrinter.printReceipt(job as any);
  return result?.success ?? false;
}
