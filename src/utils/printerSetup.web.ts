export interface PairedDevice {
  name: string;
  address: string;
}

export async function scanPairedPrinters(): Promise<PairedDevice[]> {
  return [];
}

export async function testPrintConnection(_address: string): Promise<boolean> {
  return false;
}
