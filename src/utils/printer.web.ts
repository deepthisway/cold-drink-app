import { Alert } from "react-native";

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

// Bluetooth thermal printing isn't available in a browser — this stub keeps
// the web build compiling for UI preview purposes without crashing.
export const printReceipt = async (
  _invoice: PrintInvoiceData,
  _savedPrinterAddress: string | null,
): Promise<boolean> => {
  Alert.alert(
    "Not Available on Web",
    "Printing only works on the Android app with a connected Bluetooth printer.",
  );
  return false;
};

export const printEndDayReports = async (
  _data: any,
  _savedPrinterAddress: string | null,
): Promise<boolean> => {
  Alert.alert(
    "Not Available on Web",
    "End day reports only print on the Android app.",
  );
  return false;
};
