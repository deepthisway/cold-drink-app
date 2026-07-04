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

export interface EndDayInvoiceRow {
  displayLabel: string; // shop name (ya "Cancelled" wala tag)
  boxes: number;
  amount: number;
  cancelled: boolean;
}

export interface EndDaySkuRow {
  name: string;
  boxes: number;
}

export interface EndDayPaymentRow {
  shopName: string;
  amount: number;
}

export interface EndDayReportData {
  date: string;
  invoices: EndDayInvoiceRow[];
  totalAmount: number;
  totalBoxes: number;
  skuTotals: EndDaySkuRow[];
  udhaarList: EndDayPaymentRow[];
  paytmList: EndDayPaymentRow[];
  totalUdhaar: number;
  totalPaytm: number;
}

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
        content: "Deep Cold Drinks",
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

export const printEndDayReports = async (
  data: EndDayReportData,
  savedPrinterAddress: string | null,
): Promise<boolean> => {
  try {
    const hasPermission = await ensureBluetoothPermissions();
    if (!hasPermission) {
      Alert.alert(
        "Permission Needed",
        "Bluetooth permission is required to print.",
      );
      return false;
    }

    let targetAddress = savedPrinterAddress;
    if (!targetAddress) {
      const { paired } = await ThermalPrinter.scanDevices();
      if (!paired || paired.length === 0) {
        Alert.alert("No Printer", "No paired Bluetooth printer found.");
        return false;
      }
      targetAddress = paired[0].address;
    }

    // ---- Document 1: Invoice-wise report ----
    const invoiceDoc: any[] = [
      {
        type: "text",
        content: "DAILY INVOICE REPORT",
        style: { align: "center", bold: true, size: "double" },
      },
      { type: "text", content: data.date, style: { align: "center" } },
      { type: "line" },
      {
        type: "table",
        headers: ["Shop", "Box", "Amt"],
        rows: data.invoices.map((inv) => [
          inv.cancelled ? `${inv.displayLabel} (CANC)` : inv.displayLabel,
          inv.cancelled ? "-" : `${inv.boxes}`,
          inv.cancelled ? "CANC" : `${inv.amount}`,
        ]),
        columnWidths: [20, 6, 10],
        alignments: ["left", "center", "right"],
      },
      { type: "line" },
      {
        type: "text",
        content: `TOTAL BILLS: ${data.invoices.filter((i) => !i.cancelled).length}`,
        style: { bold: true },
      },
      {
        type: "text",
        content: `TOTAL AMOUNT: Rs ${data.totalAmount}`,
        style: { bold: true },
      },
      {
        type: "text",
        content: `TOTAL BOXES: ${data.totalBoxes}`,
        style: { bold: true },
      },
      { type: "feed", lines: 3 },
      { type: "cut" },
    ];

    // ---- Document 2: SKU-wise item report ----
    const itemDoc: any[] = [
      {
        type: "text",
        content: "DAILY ITEM REPORT",
        style: { align: "center", bold: true, size: "double" },
      },
      { type: "text", content: data.date, style: { align: "center" } },
      { type: "line" },
      {
        type: "table",
        headers: ["Item", "Box"],
        rows: data.skuTotals.map((s) => [s.name, `${s.boxes}`]),
        columnWidths: [26, 10],
        alignments: ["left", "right"],
      },
      { type: "line" },
      {
        type: "text",
        content: `TOTAL BOXES: ${data.totalBoxes}`,
        style: { bold: true },
      },
      { type: "feed", lines: 3 },
      { type: "cut" },
    ];

    // ---- Document 3: Payments report ----
    const paymentDoc: any[] = [
      {
        type: "text",
        content: "DAILY PAYMENT REPORT",
        style: { align: "center", bold: true, size: "double" },
      },
      { type: "text", content: data.date, style: { align: "center" } },
      { type: "line" },
      { type: "text", content: "UDHAAR", style: { bold: true } },
      ...data.udhaarList.map((u) => ({
        type: "table" as const,
        headers: [],
        rows: [[u.shopName, `${u.amount}`]],
        columnWidths: [26, 10],
        alignments: ["left" as const, "right" as const],
      })),
      {
        type: "text",
        content: `TOTAL UDHAAR: Rs ${data.totalUdhaar}`,
        style: { bold: true },
      },
      { type: "line" },
      { type: "text", content: "PAYTM", style: { bold: true } },
      ...data.paytmList.map((p) => ({
        type: "table" as const,
        headers: [],
        rows: [[p.shopName, `${p.amount}`]],
        columnWidths: [26, 10],
        alignments: ["left" as const, "right" as const],
      })),
      {
        type: "text",
        content: `TOTAL PAYTM: Rs ${data.totalPaytm}`,
        style: { bold: true },
      },
      { type: "feed", lines: 3 },
      { type: "cut" },
    ];

    const job = {
      printers: [
        {
          address: toBtAddress(targetAddress),
          options: { paperWidthMm: 58, marginMm: 1 },
        },
      ],
      documents: [invoiceDoc, itemDoc, paymentDoc], // teeno ek ke baad ek print honge
    };

    const result = await ThermalPrinter.printReceipt(job);
    return result?.success ?? false;
  } catch (err: any) {
    console.error("End day print failed:", err);
    Alert.alert(
      "Printer Error",
      err?.message || "Failed to print end day reports.",
    );
    return false;
  }
};
