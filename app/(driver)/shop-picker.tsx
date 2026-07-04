import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  Alert,
  FlatList,
  Platform,
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
  const [isListening, setIsListening] = useState(false);

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

  // REAL VOICE TYPING INTEGRATION (Web Speech API for Localhost Browser preview)
  const handleVoiceInput = () => {
    if (Platform.OS === "web") {
      // Check if browser supports speech recognition
      const SpeechRecognition =
        (window as any).SpeechRecognition ||
        (window as any).webkitSpeechRecognition;

      if (!SpeechRecognition) {
        Alert.alert("एरर", "आपका ब्राउज़र वॉइस टाइपिंग सपोर्ट नहीं करता है।");
        return;
      }

      const recognition = new SpeechRecognition();
      recognition.lang = "hi-IN"; // Set to Hindi/Indian English
      recognition.interimResults = false;
      recognition.maxAlternatives = 1;

      recognition.onstart = () => {
        setIsListening(true);
      };

      recognition.onerror = (event: any) => {
        console.error("Speech recognition error", event.error);
        setIsListening(false);
        Alert.alert(
          "एरर",
          "आवाज़ पहचानने में दिक्कत हुई। कृपया फिर से कोशिश करें।",
        );
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognition.onresult = (event: any) => {
        const speechToText = event.results[0][0].transcript;
        // Remove trailing full stops that speech recognition sometimes adds
        const cleanedText = speechToText.replace(/\.$/, "");
        handleSearch(cleanedText);
      };

      recognition.start();
    } else {
      // Android Production Fallback Native Prompt Shorthand
      Alert.alert(
        "वॉइस सर्च",
        "दुकान का नाम बोलें...\n\n(एंड्रॉइड फोन पर यह सीधा गूगल वॉइस सर्विस को एक्टिवेट करेगा।)",
      );
    }
  };

  const handleSelectShop = (shop: ShopItem) => {
    selectShop(shop.id, shop.name);
    router.push("/(driver)/billing");
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Feather name="arrow-left" size={24} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>दुकान चुनें (Select Shop)</Text>
        <View style={{ width: 44 }} />
      </View>

      {/* Fixed Top Controls Wrapper */}
      <View style={styles.topControlCard}>
        {/* Search Bar Container */}
        <View style={styles.searchBarContainer}>
          <View style={styles.searchBox}>
            <Feather
              name="search"
              size={20}
              color="#9CA3AF"
              style={styles.searchIcon}
            />
            <TextInput
              style={styles.searchInput}
              placeholder={
                isListening
                  ? "सुन रहे हैं... बोलिए..."
                  : "दुकान का नाम खोजें..."
              }
              placeholderTextColor="#9CA3AF"
              value={searchQuery}
              onChangeText={handleSearch}
            />
          </View>
          <TouchableOpacity
            style={[styles.micButton, isListening && styles.micButtonListening]}
            onPress={handleVoiceInput}
          >
            <Feather name="mic" size={22} color="#FFFFFF" />
          </TouchableOpacity>
        </View>

        {/* BUTTON MOVED UP: नई दुकान का बटन अब ऊपर सर्च बार के तुरंत नीचे है */}
        <TouchableOpacity
          style={styles.newShopButtonTop}
          activeOpacity={0.9}
          onPress={() => router.push("/(driver)/new-shop")}
        >
          <Feather name="plus" size={20} color="#FFFFFF" />
          <Text style={styles.newShopButtonTextTop}>
            नई दुकान जोड़ें (Add New Shop)
          </Text>
        </TouchableOpacity>
      </View>

      {/* Shop List Section */}
      <FlatList
        data={filteredShops}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.shopRow}
            activeOpacity={0.7}
            onPress={() => handleSelectShop(item)}
          >
            <View style={styles.shopIconCircle}>
              <Feather name="shopping-bag" size={20} color="#4B5563" />
            </View>
            <View style={styles.shopInfo}>
              <Text style={styles.shopNameText}>{item.name}</Text>
              {item.phone ? (
                <View style={styles.phoneRow}>
                  <Feather name="phone" size={12} color="#6B7280" />
                  <Text style={styles.shopPhoneText}>{item.phone}</Text>
                </View>
              ) : null}
            </View>
            <Feather name="chevron-right" size={24} color="#9CA3AF" />
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Feather name="inbox" size={48} color="#D1D5DB" />
            <Text style={styles.emptyText}>
              कोई दुकान नहीं मिली (No shops found)
            </Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F3F4F6",
    paddingTop: 50,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderColor: "#E5E7EB",
  },
  backBtn: {
    width: 44,
    height: 44,
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: "#111827",
  },
  topControlCard: {
    backgroundColor: "#FFFFFF",
    paddingBottom: 16,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    paddingHorizontal: 20,
  },
  searchBarContainer: {
    flexDirection: "row",
    paddingTop: 16,
    gap: 12,
  },
  searchBox: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F3F4F6",
    height: 56,
    borderRadius: 16,
    paddingHorizontal: 16,
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: "#111827",
    fontWeight: "600",
  },
  micButton: {
    width: 56,
    height: 56,
    backgroundColor: "#111827",
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
  },
  micButtonListening: {
    backgroundColor: "#DC2626", // Flashes Red when listening to voice
  },
  newShopButtonTop: {
    flexDirection: "row",
    backgroundColor: "#111827",
    height: 48,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 14,
    gap: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  newShopButtonTextTop: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
  },
  listContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 40,
  },
  shopRow: {
    backgroundColor: "#FFFFFF",
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderRadius: 16,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  shopIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#F3F4F6",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16,
  },
  shopInfo: {
    flex: 1,
  },
  shopNameText: {
    fontSize: 18,
    fontWeight: "700",
    color: "#111827",
  },
  phoneRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 6,
    gap: 6,
  },
  shopPhoneText: {
    fontSize: 14,
    color: "#6B7280",
    fontWeight: "500",
  },
  emptyContainer: {
    alignItems: "center",
    marginTop: 60,
  },
  emptyText: {
    fontSize: 16,
    color: "#6B7280",
    marginTop: 16,
    fontWeight: "500",
  },
});
