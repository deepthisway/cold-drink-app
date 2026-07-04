import "react-native-get-random-values";
import { v4 as uuidv4 } from "uuid";

const DEVICE_ID_KEY = "cold_drink_device_id";

// SecureStore has no web equivalent — fall back to localStorage.
// This is only for local dev/preview in a browser; the real app runs on Android.
export async function getOrCreateDeviceId(): Promise<string> {
  if (typeof window === "undefined" || !window.localStorage) {
    return uuidv4();
  }

  let id = window.localStorage.getItem(DEVICE_ID_KEY);
  if (!id) {
    id = uuidv4();
    window.localStorage.setItem(DEVICE_ID_KEY, id);
  }
  return id;
}
