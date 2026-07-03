import { PermissionsAndroid, Platform } from "react-native";

export async function ensureBluetoothPermissions(): Promise<boolean> {
  if (Platform.OS !== "android") return true;

  if (Platform.Version >= 31) {
    // Android 12+
    const granted = await PermissionsAndroid.requestMultiple([
      PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
      PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
    ]);
    return (
      granted["android.permission.BLUETOOTH_SCAN"] === "granted" &&
      granted["android.permission.BLUETOOTH_CONNECT"] === "granted"
    );
  } else {
    // Android 11 and below need location permission for BT scanning
    const granted = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
    );
    return granted === PermissionsAndroid.RESULTS.GRANTED;
  }
}
