import { ThermalPrinter } from "@finan-me/react-native-thermal-printer";
import { Alert } from "react-native";
import { ensureBluetoothPermissions } from "./bluetoothPermissions";

export interface PrintItem {
  name: string;
  boxes: number;
  price: number;
  amount: number;
}

export interface PrintInvoiceData {
  shopName: string;
  date: string;
  totalBoxes: number;
  totalAmount: number;
  cashPaid: number;
  paytmPaid: number;
  udhaar: number;
  items: PrintItem[];
}

// Address must be in "bt:AA:BB:CC:DD:EE:FF" format for this library
function toBtAddress(macAddress: string): string {
  return macAddress.startsWith("bt:") ? macAddress : `bt:${macAddress}`;
}

export const printReceipt = async (
  invoice: PrintInvoiceData,
  savedPrinterAddress: string | null,
): Promise<boolean> => {
  try {
    const hasPermission = await ensureBluetoothPermissions();
    if (!hasPermission) {
      Alert.alert(
        "Permission Needed",
        "Bluetooth permission is required to print. Please allow it and try again.",
      );
      return false;
    }

    let targetAddress = savedPrinterAddress;

    // If no saved printer, scan and grab the first paired device
    if (!targetAddress) {
      const { paired } = await ThermalPrinter.scanDevices();
      if (!paired || paired.length === 0) {
        Alert.alert(
          "No Printer",
          "No paired Bluetooth printer found. Please set up your printer first.",
        );
        return false;
      }
      targetAddress = paired[0].address;
    }

    const documentBody: any[] = [
      {
        type: "text",
        content: "SHARMA COLD DRINKS",
        style: { align: "center", bold: true, size: "double" },
      },
      {
        type: "text",
        content: "Wholesale Distributor",
        style: { align: "center" },
      },
      { type: "line" },
      { type: "text", content: `Shop: ${invoice.shopName}` },
      { type: "text", content: `Date: ${invoice.date}` },
      { type: "line" },
      {
        type: "table",
        headers: ["Item", "Qty", "Amount"],
        rows: invoice.items.map((item) => [
          item.name.substring(0, 14),
          `${item.boxes}`,
          `${item.amount}`,
        ]),
        columnWidths: [16, 6, 10],
        alignments: ["left", "center", "right"],
      },
      { type: "line" },
      {
        type: "text",
        content: `Total Boxes: ${invoice.totalBoxes}`,
        style: { align: "right" },
      },
      {
        type: "text",
        content: `GRAND TOTAL: Rs ${invoice.totalAmount}`,
        style: { align: "right", bold: true, size: "double_width" },
      },
      { type: "line" },
      { type: "text", content: `Cash Paid: Rs ${invoice.cashPaid}` },
    ];

    if (invoice.paytmPaid > 0) {
      documentBody.push({
        type: "text",
        content: `Paytm/Online: Rs ${invoice.paytmPaid}`,
      });
    }
    if (invoice.udhaar > 0) {
      documentBody.push({
        type: "text",
        content: `UDHAAR DUE: Rs ${invoice.udhaar}`,
        style: { bold: true },
      });
    }

    documentBody.push(
      { type: "line" },
      {
        type: "text",
        content: "Thank You! Please Visit Again.",
        style: { align: "center" },
      },
      { type: "feed", lines: 3 },
      { type: "cut" },
    );

    const job = {
      printers: [
        {
          address: toBtAddress(targetAddress),
          options: {
            paperWidthMm: 58,
            marginMm: 1,
          },
        },
      ],
      documents: [documentBody],
    };

    const result = await ThermalPrinter.printReceipt(job);
    return result?.success ?? false;
  } catch (err: any) {
    console.error("Printer execution failed:", err);
    const message = err?.message || "Failed to communicate with the printer.";
    const suggestion = err?.suggestion ? `\n\n${err.suggestion}` : "";
    Alert.alert("Printer Error", `${message}${suggestion}`);
    return false;
  }
};
