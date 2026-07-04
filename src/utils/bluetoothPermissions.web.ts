export async function ensureBluetoothPermissions(): Promise<boolean> {
  // Web pe Bluetooth printing support nahi hai — bas false return karo
  return false;
}
