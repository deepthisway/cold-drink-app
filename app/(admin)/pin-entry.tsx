import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  Alert,
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useAppStore } from "../../src/store/appStore";

const CORRECT_PIN = "9393";

export default function PinEntryScreen() {
  const router = useRouter();
  const setAdminStatus = useAppStore((state) => state.setAdminStatus);
  const [pin, setPin] = useState("");

  useEffect(() => {
    if (pin.length === 4) {
      if (pin === CORRECT_PIN) {
        setAdminStatus(true);
        router.replace("/(admin)/dashboard");
      } else {
        Alert.alert("Access Denied", "गलत पिन (Incorrect PIN)", [
          { text: "OK", onPress: () => setPin("") },
        ]);
      }
    }
  }, [pin]);

  const handlePress = (digit: string) => {
    if (pin.length < 4) {
      setPin((prev) => prev + digit);
    }
  };

  const handleDelete = () => {
    setPin((prev) => prev.slice(0, -1));
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => router.replace("/(driver)")}
        >
          <Text style={styles.backBtnText}>❌ Cancel</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.content}>
        <Text style={styles.title}>Admin Access</Text>
        <Text style={styles.subtitle}>Enter 4-digit PIN to continue</Text>

        {/* PIN Dot Indicators */}
        <View style={styles.dotContainer}>
          {[0, 1, 2, 3].map((index) => (
            <View
              key={index}
              style={[
                styles.dot,
                pin.length > index ? styles.dotFilled : styles.dotEmpty,
              ]}
            />
          ))}
        </View>

        {/* Numpad */}
        <View style={styles.numpad}>
          {[
            ["1", "2", "3"],
            ["4", "5", "6"],
            ["7", "8", "9"],
          ].map((row, rowIndex) => (
            <View key={rowIndex} style={styles.numpadRow}>
              {row.map((digit) => (
                <TouchableOpacity
                  key={digit}
                  style={styles.numpadBtn}
                  onPress={() => handlePress(digit)}
                >
                  <Text style={styles.numpadBtnText}>{digit}</Text>
                </TouchableOpacity>
              ))}
            </View>
          ))}
          <View style={styles.numpadRow}>
            <View style={styles.numpadBtnEmpty} />
            <TouchableOpacity
              style={styles.numpadBtn}
              onPress={() => handlePress("0")}
            >
              <Text style={styles.numpadBtnText}>0</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.numpadBtn} onPress={handleDelete}>
              <Text style={styles.numpadBtnText}>⌫</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#1F2937", // Dark theme for Admin contrast
  },
  header: {
    padding: 16,
    alignItems: "flex-start",
  },
  backBtn: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: "#374151",
    borderRadius: 8,
  },
  backBtnText: {
    color: "#D1D5DB",
    fontSize: 16,
    fontWeight: "600",
  },
  content: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingBottom: 40,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#FFFFFF",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: "#9CA3AF",
    marginBottom: 40,
  },
  dotContainer: {
    flexDirection: "row",
    gap: 20,
    marginBottom: 60,
  },
  dot: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
  },
  dotEmpty: {
    borderColor: "#4B5563",
    backgroundColor: "transparent",
  },
  dotFilled: {
    borderColor: "#10B981",
    backgroundColor: "#10B981",
  },
  numpad: {
    width: "100%",
    maxWidth: 320,
    gap: 16,
  },
  numpadRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "100%",
  },
  numpadBtn: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#374151",
    justifyContent: "center",
    alignItems: "center",
  },
  numpadBtnEmpty: {
    width: 80,
    height: 80,
  },
  numpadBtnText: {
    fontSize: 32,
    color: "#FFFFFF",
    fontWeight: "400",
  },
});
