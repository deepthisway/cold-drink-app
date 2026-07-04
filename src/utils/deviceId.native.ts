import * as SecureStore from "expo-secure-store";
import "react-native-get-random-values";
import { v4 as uuidv4 } from "uuid";

const DEVICE_ID_KEY = "cold_drink_device_id";

export async function getOrCreateDeviceId(): Promise<string> {
  let id = await SecureStore.getItemAsync(DEVICE_ID_KEY);
  if (!id) {
    id = uuidv4();
    await SecureStore.setItemAsync(DEVICE_ID_KEY, id);
  }
  return id;
}
