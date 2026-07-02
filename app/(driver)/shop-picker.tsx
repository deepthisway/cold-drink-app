import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
    Alert,
    FlatList,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
import { getDB } from "../../src/db/local/sqlite";
import { useAppStore } from "../../src/store/appStore";

interface ShopItem {
  id: string;
  name: string;
  phone: string | null;
}

export default function ShopPickerScreen() {
  const router = useRouter();
  const selectShop = useAppStore((state) => state.selectShop);

  const [shops, setShops] = useState<ShopItem[]>([]);
  const [filteredShops, setFilteredShops] = useState<ShopItem[]>([]);
  const [searchQuery, setSearchQuery] = useState("");

  // Load the complete, flat register list of shops on focus
  useEffect(() => {
    async function loadShops() {
      try {
        const db = await getDB();
        const rows = await db.getAllAsync<ShopItem>(
          "SELECT id, name, phone FROM shop ORDER BY name ASC",
        );
        setShops(rows);
        setFilteredShops(rows);
      } catch (error) {
        console.error("Failed to load shops register:", error);
      }
    }
    loadShops();
  }, []);

  // Filter list smoothly as typing or voice transcription populates input
  const handleSearch = (text: string) => {
    setSearchQuery(text);
    if (text.trim() === "") {
      setFilteredShops(shops);
    } else {
      const lowerText = text.toLowerCase();
      const filtered = shops.filter((s) =>
        s.name.toLowerCase().includes(lowerText),
      );
      setFilteredShops(filtered);
    }
  };

  const handleVoiceInputPlaceholder = () => {
    Alert.alert(
      "Voice Typing",
      "Speak the shop name now...\n\n(In production, this integrates directly with Android native Speech Recognizer API via expo-speech / react-native-voice)",
    );
  };

  const handleSelectShop = (shop: ShopItem) => {
    selectShop(shop.id, shop.name);
    // Push directly down into the core cart-building SKU tile grid matrix
    router.push("/(driver)/billing");
  };

  return (
    <View style={styles.container}>
      {/* Search Header Bar */}
      <View style={styles.searchBarContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="दुकान का नाम खोजें (Search Shop...)"
          placeholderTextColor="#9CA3AF"
          value={searchQuery}
          onChangeText={handleSearch}
        />
        <TouchableOpacity
          style={styles.micButton}
          onPress={handleVoiceInputPlaceholder}
        >
          <Text style={styles.micIcon}>🎙️</Text>
        </TouchableOpacity>
      </View>

      {/* Flat List matching generic, plain sorting */}
      <FlatList
        data={filteredShops}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.shopRow}
            onPress={() => handleSelectShop(item)}
          >
            <View style={styles.shopInfo}>
              <Text style={styles.shopNameText}>{item.name}</Text>
              {item.phone ? (
                <Text style={styles.shopPhoneText}>📞 {item.phone}</Text>
              ) : null}
            </View>
            <Text style={styles.arrowIcon}>➡️</Text>
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>
              कोई दुकान नहीं मिली (No shops found)
            </Text>
          </View>
        }
      />

      {/* Persistent Full-Width New Shop Action Button */}
      <TouchableOpacity
        style={styles.newShopButton}
        onPress={() => router.push("/(driver)/new-shop")}
      >
        <Text style={styles.newShopButtonText}>
          ➕ नई दुकान जोड़ें (Add New Shop)
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F3F4F6",
    paddingTop: 50,
  },
  searchBarContainer: {
    flexDirection: "row",
    paddingHorizontal: 16,
    marginBottom: 16,
    gap: 10,
  },
  searchInput: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    height: 56,
    borderRadius: 14,
    paddingHorizontal: 18,
    fontSize: 18,
    color: "#1F2937",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  micButton: {
    width: 56,
    height: 56,
    backgroundColor: "#007AFF",
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
    elevation: 2,
  },
  micIcon: {
    fontSize: 22,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 90, // Margin buffer so content clears persistent bottom button
  },
  shopRow: {
    backgroundColor: "#FFFFFF",
    paddingVertical: 18,
    paddingHorizontal: 20,
    borderRadius: 14,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  shopInfo: {
    flex: 1,
  },
  shopNameText: {
    fontSize: 20,
    fontWeight: "600",
    color: "#1F2937",
  },
  shopPhoneText: {
    fontSize: 14,
    color: "#6B21A8",
    marginTop: 4,
  },
  arrowIcon: {
    fontSize: 18,
    color: "#9CA3AF",
  },
  emptyContainer: {
    alignItems: "center",
    marginTop: 40,
  },
  emptyText: {
    fontSize: 16,
    color: "#6B7280",
  },
  newShopButton: {
    position: "absolute",
    bottom: 16,
    left: 16,
    right: 16,
    backgroundColor: "#10B981",
    height: 60,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  newShopButtonText: {
    color: "#FFFFFF",
    fontSize: 20,
    fontWeight: "bold",
  },
});
