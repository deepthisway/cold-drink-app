import { Alert } from "react-native";
import {
    BluetoothEscposPrinter,
    BluetoothManager,
} from "react-native-thermal-receipt-printer-image-qr";

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

export const printReceipt = async (invoice: PrintInvoiceData) => {
  try {
    // 1. Check if Bluetooth is enabled
    const isEnabled = await BluetoothManager.checkBluetoothEnabled();
    if (!isEnabled) {
      Alert.alert(
        "Bluetooth Off",
        "Please turn on Bluetooth to print the receipt.",
      );
      return false;
    }

    // 2. Connect to the paired printer (Finds the first connected POS printer)
    const devices = await BluetoothManager.enableBluetooth();
    const pairedDevices = devices.reduce((acc: any[], deviceGroup: any) => {
      // Library returns grouped devices, we extract the paired ones
      if (deviceGroup && deviceGroup.paired) {
        return acc.concat(deviceGroup.paired || []);
      }
      return acc;
    }, []);

    if (pairedDevices.length === 0) {
      Alert.alert(
        "No Printer",
        "No paired Bluetooth printer found. Please pair it in Android settings first.",
      );
      return false;
    }

    // Connect to the first paired device (assuming it's your MT580P)
    const printerAddress = pairedDevices[0].address;
    await BluetoothManager.connect(printerAddress);

    // 3. Start Formatting the 58mm Receipt
    await BluetoothEscposPrinter.printerAlign(
      BluetoothEscposPrinter.ALIGN.CENTER,
    );
    await BluetoothEscposPrinter.printText(
      "--------------------------------\n\r",
      {},
    );
    await BluetoothEscposPrinter.printText("SHARMA COLD DRINKS\n\r", {
      fonttype: 1,
      widthtimes: 1,
      heigthtimes: 1,
    });
    await BluetoothEscposPrinter.printText("Wholesale Distributor\n\r", {});
    await BluetoothEscposPrinter.printText(
      "--------------------------------\n\r",
      {},
    );

    // Shop & Date Info
    await BluetoothEscposPrinter.printerAlign(
      BluetoothEscposPrinter.ALIGN.LEFT,
    );
    await BluetoothEscposPrinter.printText(`Shop: ${invoice.shopName}\n\r`, {});
    await BluetoothEscposPrinter.printText(`Date: ${invoice.date}\n\r`, {});
    await BluetoothEscposPrinter.printText(
      "--------------------------------\n\r",
      {},
    );

    // Items Header
    await BluetoothEscposPrinter.printText(
      "Item             Qty      Amount\n\r",
      {},
    );
    await BluetoothEscposPrinter.printText(
      "--------------------------------\n\r",
      {},
    );

    // Items Loop
    for (const item of invoice.items) {
      // Simple text padding to align columns on 32-character 58mm paper
      let name = item.name.substring(0, 14).padEnd(15, " ");
      let qty = `${item.boxes}`.padStart(3, " ");
      let amt = `${item.amount}`.padStart(9, " ");
      await BluetoothEscposPrinter.printText(`${name} ${qty} ${amt}\n\r`, {});
    }

    await BluetoothEscposPrinter.printText(
      "--------------------------------\n\r",
      {},
    );

    // Totals
    await BluetoothEscposPrinter.printerAlign(
      BluetoothEscposPrinter.ALIGN.RIGHT,
    );
    await BluetoothEscposPrinter.printText(
      `Total Boxes: ${invoice.totalBoxes}\n\r`,
      {},
    );
    await BluetoothEscposPrinter.printText(
      `GRAND TOTAL: Rs ${invoice.totalAmount}\n\r`,
      { widthtimes: 1 },
    );
    await BluetoothEscposPrinter.printText(
      "--------------------------------\n\r",
      {},
    );

    // Payment Breakdown
    await BluetoothEscposPrinter.printerAlign(
      BluetoothEscposPrinter.ALIGN.LEFT,
    );
    await BluetoothEscposPrinter.printText(
      `Cash Paid: Rs ${invoice.cashPaid}\n\r`,
      {},
    );
    if (invoice.paytmPaid > 0) {
      await BluetoothEscposPrinter.printText(
        `Paytm/Online: Rs ${invoice.paytmPaid}\n\r`,
        {},
      );
    }
    if (invoice.udhaar > 0) {
      await BluetoothEscposPrinter.printText(
        `UDHAAR DUE: Rs ${invoice.udhaar}\n\r`,
        { widthtimes: 1 },
      );
    }

    // Footer
    await BluetoothEscposPrinter.printerAlign(
      BluetoothEscposPrinter.ALIGN.CENTER,
    );
    await BluetoothEscposPrinter.printText(
      "--------------------------------\n\r",
      {},
    );
    await BluetoothEscposPrinter.printText(
      "Thank You! Please Visit Again.\n\r",
      {},
    );
    await BluetoothEscposPrinter.printText("\n\r\n\r\n\r", {}); // Feed paper out

    return true;
  } catch (err) {
    console.error("Printer execution failed:", err);
    Alert.alert("Printer Error", "Failed to communicate with the printer.");
    return false;
  }
};
