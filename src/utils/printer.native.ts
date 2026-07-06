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
  date: string; // "YYYY-MM-DD"
  billNo?: number | string;
  totalBoxes: number;
  totalAmount: number;
  cashPaid: number;
  paytmPaid: number;
  udhaar: number;
  items: PrintItem[];
}

export interface EndDayInvoiceRow {
  displayLabel: string;
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
  date: string; // "YYYY-MM-DD"
  invoices: EndDayInvoiceRow[];
  totalAmount: number;
  totalBoxes: number;
  skuTotals: EndDaySkuRow[];
  udhaarList: EndDayPaymentRow[];
  paytmList: EndDayPaymentRow[];
  totalUdhaar: number;
  totalPaytm: number;
  totalCash: number;
}

// ---- Layout constants ----
// 58mm thermal printers using the default font print ~32 characters per line.
// Every line below is built to exactly this width so the printer NEVER has
// to wrap text itself — the library's own word-wrap was the root cause of
// the broken/garbled receipts.
const LINE_WIDTH = 30;

function toBtAddress(macAddress: string): string {
  return macAddress.startsWith("bt:") ? macAddress : `bt:${macAddress}`;
}

function formatDateDDMMYYYY(isoDate: string): string {
  const [y, m, d] = isoDate.split("-");
  if (!y || !m || !d) return isoDate;
  return `${d}-${m}-${y}`;
}

function formatTimeHHmm(date: Date): string {
  const hh = date.getHours().toString().padStart(2, "0");
  const mm = date.getMinutes().toString().padStart(2, "0");
  return `${hh}:${mm}`;
}

// Truncates (never wraps) a string to fit, then pads it to an exact width.
function fit(text: string, width: number): string {
  const safe = text ?? "";
  if (safe.length > width) {
    return safe.slice(0, Math.max(width - 1, 1)) + ".";
  }
  return safe.padEnd(width, " ");
}

function fitRight(text: string, width: number): string {
  const safe = (text ?? "").toString();
  if (safe.length > width) {
    return safe.slice(0, width);
  }
  return safe.padStart(width, " ");
}

// One line, left label + right value, guaranteed to be exactly LINE_WIDTH
// (or fewer) characters — never wraps.
function row(left: string, right: string, width = LINE_WIDTH): string {
  const rightStr = right ?? "";
  const rightWidth = Math.min(rightStr.length, width - 1);
  const rightPart = fitRight(rightStr, rightWidth || rightStr.length);
  const leftWidth = width - rightPart.length;
  const leftPart = fit(left ?? "", Math.max(leftWidth, 1));
  return `${leftPart}${rightPart}`;
}

function dashLine(width = LINE_WIDTH) {
  return { type: "text" as const, content: "-".repeat(width) };
}

function textLine(content: string, style?: Record<string, any>) {
  return { type: "text" as const, content, style };
}

// Item row: name | box | amount, all fixed width, fits on one line.
function itemRow(
  name: string,
  boxes: number | string,
  amount: number | string,
) {
  const nameCol = fit(name, 10); // was 16
  const boxCol = fitRight(`${boxes}`, 4); // was 6
  const amtCol = fitRight(`${amount}`, 10); // unchanged
  return textLine(`${nameCol}${boxCol}${amtCol}`);
}

function itemHeader() {
  return textLine(
    `${fit("Item", 10)}${fitRight("Box", 4)}${fitRight("Amt", 10)}`,
  );
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

    const printTime = new Date();
    const cash = invoice.cashPaid ?? 0;
    const paytm = invoice.paytmPaid ?? 0;
    const udhaar = invoice.udhaar ?? 0;

    const documentBody: any[] = [
      textLine("Cold Drinks Sale", {
        align: "center",
        bold: true,
        size: "double",
      }),
      textLine("Wholesale Distributor", { align: "center" }),
      dashLine(),
      textLine(`Bill No : ${invoice.billNo ?? "-"}`),
      textLine(
        `Date : ${formatDateDDMMYYYY(invoice.date)} ${formatTimeHHmm(printTime)}`,
      ),
      textLine(`Shop : ${fit(invoice.shopName ?? "", 24)}`.trimEnd()),
      dashLine(),
      itemHeader(),
      dashLine(),
      ...invoice.items.map((item) =>
        itemRow(item.name, item.boxes, item.amount),
      ),
      dashLine(),
      textLine(
        row(`TOTAL : ${invoice.totalBoxes} box`, `Rs ${invoice.totalAmount}`),
        {
          bold: true,
        },
      ),
      dashLine(),
      textLine(row("Cash", `Rs ${cash}`)),
    ];

    if (paytm > 0) {
      documentBody.push(textLine(row("Paytm", `Rs ${paytm}`)));
    }
    if (udhaar > 0) {
      documentBody.push(
        textLine(row("Udhaar", `Rs ${udhaar}`), { bold: true }),
      );
    }

    documentBody.push(
      dashLine(),
      textLine("Thank you", { align: "center" }),
      { type: "feed", lines: 3 },
      { type: "cut" },
    );

    const job = {
      printers: [
        {
          address: toBtAddress(targetAddress),
          options: { paperWidthMm: 58, marginMm: 1 },
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

/**
 * Single, consolidated end-of-day report — exactly one print job containing:
 *  - total boxes sold
 *  - total bill amount
 *  - total paytm
 *  - total udhaar
 *  - total cash in hand
 *  - udhaar list (shop + amount)
 *  - paytm list (shop + amount)
 *
 * Every line is fixed-width text (see LINE_WIDTH) — no "table" type, so
 * nothing can wrap mid-word and scramble the columns.
 */
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

    // Defensive fallbacks — a caller bug should never surface as "undefined"
    // on a printed receipt.
    const totalBoxes = data.totalBoxes ?? 0;
    const totalAmount = data.totalAmount ?? 0;
    const totalPaytm = data.totalPaytm ?? 0;
    const totalUdhaar = data.totalUdhaar ?? 0;
    const totalCash =
      data.totalCash ?? Math.max(0, totalAmount - totalUdhaar - totalPaytm);

    const summaryDoc: any[] = [
      textLine("DAY END REPORT", {
        align: "center",
        bold: true,
        size: "double",
      }),
      textLine(formatDateDDMMYYYY(data.date), { align: "center" }),
      dashLine(),
      textLine(row("Total Boxes Sold", `${totalBoxes}`), { bold: true }),
      textLine(row("Total Bill Amt", `Rs ${totalAmount}`), { bold: true }),
      dashLine(),
      textLine(row("Total Paytm", `Rs ${totalPaytm}`)),
      textLine(row("Total Udhaar", `Rs ${totalUdhaar}`)),
      textLine(row("Cash In Hand", `Rs ${totalCash}`), { bold: true }),
      dashLine(),
      textLine("UDHAAR", { bold: true, align: "center" }),
    ];

    if (!data.udhaarList || data.udhaarList.length === 0) {
      summaryDoc.push(textLine("-- No Udhaar Today --", { align: "center" }));
    } else {
      for (const u of data.udhaarList) {
        summaryDoc.push(textLine(row(fit(u.shopName, 16), `${u.amount}`)));
      }
    }

    summaryDoc.push(
      dashLine(),
      textLine("PAYTM", { bold: true, align: "center" }),
    );

    if (!data.paytmList || data.paytmList.length === 0) {
      summaryDoc.push(
        textLine("-- No Online Payment Today --", { align: "center" }),
      );
    } else {
      for (const p of data.paytmList) {
        summaryDoc.push(textLine(row(fit(p.shopName, 16), `${p.amount}`)));
      }
    }

    summaryDoc.push(dashLine(), { type: "feed", lines: 3 }, { type: "cut" });

    const job = {
      printers: [
        {
          address: toBtAddress(targetAddress),
          options: { paperWidthMm: 58, marginMm: 1 },
        },
      ],
      documents: [summaryDoc],
    };

    const result = await ThermalPrinter.printReceipt(job);
    return result?.success ?? false;
  } catch (err: any) {
    console.error("End day print failed:", err);
    Alert.alert(
      "Printer Error",
      err?.message || "Failed to print end day report.",
    );
    return false;
  }
};

export const printItemWiseReport = async (
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

    const itemDoc: any[] = [
      textLine("DAILY ITEM REPORT", {
        align: "center",
        bold: true,
        size: "double",
      }),
      textLine(formatDateDDMMYYYY(data.date), { align: "center" }),
      dashLine(),
      // FIXED: was fit("Item", 22) + fitRight("Box", 10) = 32 chars,
      // overflowing the printer's real 24-char line width. Shrunk to
      // 14 + 10 = 24 to match LINE_WIDTH.
      textLine(`${fit("Item", 14)}${fitRight("Box", 10)}`),
      dashLine(),
      ...data.skuTotals.map((s) =>
        textLine(`${fit(s.name, 14)}${fitRight(`${s.boxes}`, 10)}`),
      ),
      dashLine(),
      textLine(row("TOTAL BOX", `${data.totalBoxes ?? 0}`), { bold: true }),
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
      documents: [itemDoc],
    };

    const result = await ThermalPrinter.printReceipt(job);
    return result?.success ?? false;
  } catch (err: any) {
    console.error("Item print failed:", err);
    Alert.alert(
      "Printer Error",
      err?.message || "Failed to print item report.",
    );
    return false;
  }
};
