import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  Dimensions,
  FlatList,
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { getDB } from "../../src/db/local/sqlite";
import { useAppStore } from "../../src/store/appStore";

interface SKURow {
  id: string;
  name: string;
  brand: string | null;
  size: string | null;
  price: number;
  image_path: string | null;
  remaining_stock: number;
}

const { width } = Dimensions.get("window");
const GRID_TILE_SIZE = (width - 44) / 2;
const GRID_TILE_HEIGHT = GRID_TILE_SIZE * 1.4; // Slightly increased height for optimal layout proportions

export default function BillingScreen() {
  const router = useRouter();
  const currentShopName = useAppStore((state) => state.currentShopName);
  const cart = useAppStore((state) => state.cart);
  const updateCartQuantity = useAppStore((state) => state.updateCartQuantity);

  const [skus, setSkus] = useState<SKURow[]>([]);
  const [layoutStyle, setLayoutStyle] = useState<"grid" | "list">("grid");

  useEffect(() => {
    async function loadVanInventory() {
      try {
        const db = await getDB();
        const rows = await db.getAllAsync<SKURow>(
          `
        SELECT 
            s.id, s.name, s.brand, s.size, s.price, s.image_path,
            COALESCE(SUM(l.quantity), 0) as remaining_stock
        FROM sku s
        LEFT JOIN stock_ledger l ON s.id = l.sku_id
        WHERE s.active = 1
        GROUP BY s.id
        ORDER BY s.brand ASC, s.name ASC
        `,
        );
        setSkus(rows);
      } catch (error) {
        console.error("Failed to compute live inventory matrix:", error);
      }
    }
    loadVanInventory();
  }, []);

  const totalItemsCount = Object.values(cart).reduce(
    (sum, item) => sum + item.boxes,
    0,
  );
  const totalInvoiceAmount = Object.values(cart).reduce(
    (sum, item) => sum + item.boxes * item.price,
    0,
  );

  const toggleLayout = () => {
    setLayoutStyle((prev) => (prev === "grid" ? "list" : "grid"));
  };

  return (
    <View style={styles.container}>
      {/* Pinned Shop Context Header Bar */}
      <View style={styles.header}>
        <View style={styles.shopContext}>
          <Text style={styles.headerLabel}>दुकान का नाम</Text>
          <Text style={styles.shopNameText} numberOfLines={1}>
            {currentShopName || "Unknown Shop"}
          </Text>
        </View>

        <View style={styles.headerActions}>
          <TouchableOpacity
            style={styles.actionIconButton}
            activeOpacity={0.7}
            onPress={toggleLayout}
          >
            <Feather
              name={layoutStyle === "grid" ? "list" : "grid"}
              size={18}
              color="#111827"
            />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.changeButton}
            activeOpacity={0.7}
            onPress={() => router.push("/(driver)/shop-picker")}
          >
            <Feather
              name="refresh-cw"
              size={12}
              color="#4B5563"
              style={{ marginRight: 4 }}
            />
            <Text style={styles.changeButtonText}>बदलें</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Main Inventory Component List Container */}
      <FlatList
        key={layoutStyle}
        data={skus}
        keyExtractor={(item) => item.id}
        numColumns={layoutStyle === "grid" ? 2 : 1}
        columnWrapperStyle={layoutStyle === "grid" ? styles.gridRow : undefined}
        contentContainerStyle={styles.listContainer}
        showsVerticalScrollIndicator={false}
        renderItem={({ item }) => {
          const cartItem = cart[item.id];
          const chosenQty = cartItem ? cartItem.boxes : 0;
          const isSelected = chosenQty > 0;

          // ==========================================
          // 1. FIXED GRID LAYOUT WITH ABSOLUTE BACKDROP IMAGE
          // ==========================================
          if (layoutStyle === "grid") {
            return (
              <View style={[styles.tile, isSelected && styles.tileGlowing]}>
                {/* Stock Badge - Placed absolute on top layer */}
                <View style={styles.tileTopRow}>
                  <View
                    style={[
                      styles.stockBubble,
                      item.remaining_stock <= 0 && styles.stockBubbleEmpty,
                    ]}
                  >
                    <Text style={styles.stockBubbleText}>
                      स्टॉक: {item.remaining_stock}
                    </Text>
                  </View>
                </View>

                {/* Big Drink Image pushed into top zone */}
                {item.image_path ? (
                  <Image
                    source={{ uri: item.image_path }}
                    style={styles.backgroundImageGrid}
                    resizeMode="contain"
                  />
                ) : (
                  <View style={styles.fallbackGridWrapper}>
                    <Feather name="layers" size={32} color="#9CA3AF" />
                  </View>
                )}

                {/* Clear White Control Console Base */}
                <View style={styles.tileBottomCluster}>
                  <View style={styles.skuMetaGrid}>
                    <Text style={styles.skuNameGrid} numberOfLines={1}>
                      {item.name}
                    </Text>
                    <Text style={styles.skuSpecsGrid}>₹{item.price}</Text>
                  </View>

                  <View style={styles.stepperContainerGrid}>
                    <TouchableOpacity
                      style={styles.stepperBtnGrid}
                      activeOpacity={0.6}
                      onPress={() =>
                        updateCartQuantity(
                          item.id,
                          item.name,
                          item.price,
                          -1,
                          item.remaining_stock,
                        )
                      }
                    >
                      <Feather name="minus" size={14} color="#111827" />
                    </TouchableOpacity>
                    <Text style={styles.stepperQtyTextGrid}>{chosenQty}</Text>
                    <TouchableOpacity
                      style={styles.stepperBtnGrid}
                      activeOpacity={0.6}
                      onPress={() =>
                        updateCartQuantity(
                          item.id,
                          item.name,
                          item.price,
                          1,
                          item.remaining_stock,
                        )
                      }
                    >
                      <Feather name="plus" size={14} color="#111827" />
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            );
          }

          // ==========================================
          // 2. LARGE IMAGE LIST ROW VIEW
          // ==========================================
          return (
            <View
              style={[
                styles.listRowCard,
                isSelected && styles.listRowCardSelected,
              ]}
            >
              <View style={styles.imageBlockListContainer}>
                {item.image_path ? (
                  <Image
                    source={{ uri: item.image_path }}
                    style={styles.imageBlockList}
                    resizeMode="contain"
                  />
                ) : (
                  <View style={styles.imagePlaceholderList}>
                    <Feather name="layers" size={24} color="#9CA3AF" />
                  </View>
                )}
              </View>

              <View style={styles.detailsBlockList}>
                <Text style={styles.skuNameTextList} numberOfLines={1}>
                  {item.name}
                </Text>
                <Text style={styles.skuSpecsTextList}>₹{item.price}</Text>
                <View
                  style={[
                    styles.stockTagList,
                    item.remaining_stock <= 0 && styles.stockTagEmptyList,
                  ]}
                >
                  <Text style={styles.stockTagTextList}>
                    स्टॉक: {item.remaining_stock}
                  </Text>
                </View>
              </View>

              <View style={styles.controlsBlockList}>
                <TouchableOpacity
                  style={styles.stepperActionBtnList}
                  activeOpacity={0.6}
                  onPress={() =>
                    updateCartQuantity(
                      item.id,
                      item.name,
                      item.price,
                      -1,
                      item.remaining_stock,
                    )
                  }
                >
                  <Feather name="minus" size={16} color="#111827" />
                </TouchableOpacity>
                <Text style={styles.qtyDisplayValueList}>{chosenQty}</Text>
                <TouchableOpacity
                  style={styles.stepperActionBtnList}
                  activeOpacity={0.6}
                  onPress={() =>
                    updateCartQuantity(
                      item.id,
                      item.name,
                      item.price,
                      1,
                      item.remaining_stock,
                    )
                  }
                >
                  <Feather name="plus" size={16} color="#111827" />
                </TouchableOpacity>
              </View>
            </View>
          );
        }}
      />

      {/* Sticky Bottom Actions Drawer */}
      <View style={styles.stickyFooter}>
        <View style={styles.footerSummary}>
          <Text style={styles.footerBoxesText}>
            {totalItemsCount} पेटी चुनी गई
          </Text>
          <Text style={styles.footerTotalText}>कुल: ₹{totalInvoiceAmount}</Text>
        </View>

        <TouchableOpacity
          style={[
            styles.checkoutBtn,
            totalItemsCount === 0 && styles.checkoutBtnDisabled,
          ]}
          disabled={totalItemsCount === 0}
          activeOpacity={0.9}
          onPress={() => router.push("/(driver)/cart-payment")}
        >
          <Text style={styles.checkoutBtnText}>आगे बढ़ें</Text>
          <Feather
            name="arrow-right"
            size={18}
            color="#FFFFFF"
            style={{ marginLeft: 6 }}
          />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F3F4F6",
    paddingTop: 44,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderColor: "#E5E7EB",
  },
  shopContext: {
    flex: 0.65,
  },
  headerLabel: {
    fontSize: 12,
    color: "#6B7280",
    textTransform: "uppercase",
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  shopNameText: {
    fontSize: 22,
    fontWeight: "800",
    color: "#111827",
    marginTop: 2,
  },
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  actionIconButton: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: "#F3F4F6",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  changeButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F3F4F6",
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  changeButtonText: {
    color: "#4B5563",
    fontWeight: "700",
    fontSize: 14,
  },
  listContainer: {
    padding: 14,
    paddingBottom: 170,
  },

  // ==========================================
  // GRID STYLES
  // ==========================================
  gridRow: {
    justifyContent: "space-between",
    marginBottom: 14,
  },
  tile: {
    backgroundColor: "#FFFFFF",
    width: GRID_TILE_SIZE,
    height: GRID_TILE_HEIGHT,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    overflow: "hidden",
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    position: "relative",
  },
  tileGlowing: {
    borderColor: "#111827",
    borderWidth: 2.5,
  },
  backgroundImageGrid: {
    position: "absolute",
    top: 35, // Pushes top away from the stock bubble zone
    left: 10,
    right: 10,
    bottom: 90, // Keeps structural safety from blocking bottom texts
  },
  fallbackGridWrapper: {
    width: "100%",
    height: "100%",
    justifyContent: "center",
    alignItems: "center",
    paddingBottom: 80,
  },
  tileTopRow: {
    position: "absolute",
    top: 10,
    left: 10,
    zIndex: 20,
  },
  stockBubble: {
    backgroundColor: "rgba(17, 24, 39, 0.9)",
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  stockBubbleEmpty: {
    backgroundColor: "rgba(220, 38, 38, 0.95)",
  },
  stockBubbleText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "800",
  },
  tileBottomCluster: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "#FFFFFF",
    padding: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderColor: "#F1F5F9",
    alignItems: "center",
  },
  skuMetaGrid: {
    alignItems: "center",
    width: "100%",
    marginBottom: 6,
  },
  skuNameGrid: {
    fontSize: 16,
    fontWeight: "900",
    color: "#111827",
    textAlign: "center",
  },
  skuSpecsGrid: {
    fontSize: 15,
    color: "#1F2937",
    fontWeight: "800",
    marginTop: 1,
  },
  stepperContainerGrid: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    width: "100%",
    justifyContent: "space-between",
    padding: 3,
    borderWidth: 1.5,
    borderColor: "#111827",
  },
  stepperBtnGrid: {
    backgroundColor: "#F3F4F6",
    width: 34,
    height: 34,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  stepperQtyTextGrid: {
    fontSize: 18,
    fontWeight: "900",
    color: "#111827",
    minWidth: 24,
    textAlign: "center",
  },

  // ==========================================
  // LIST ROW LAYOUT STYLES
  // ==========================================
  listRowCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 22,
    padding: 12,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    elevation: 2,
  },
  listRowCardSelected: {
    borderColor: "#111827",
    borderWidth: 2.5,
  },
  imageBlockListcontainer: {
    width: 85,
    height: 95,
    borderRadius: 14,
    backgroundColor: "#F9FAFB",
    justifyContent: "center",
    alignItems: "center",
    overflow: "hidden",
  },
  imageBlockList: {
    width: "100%",
    height: "100%",
  },
  imagePlaceholderList: {
    width: 85,
    height: 95,
    borderRadius: 14,
    backgroundColor: "#F9FAFB",
    justifyContent: "center",
    alignItems: "center",
  },
  detailsBlockList: {
    flex: 1,
    paddingHorizontal: 14,
  },
  skuNameTextList: {
    fontSize: 19,
    fontWeight: "900",
    color: "#111827",
  },
  skuSpecsTextList: {
    fontSize: 15,
    color: "#4B5563",
    fontWeight: "800",
    marginTop: 2,
  },
  stockTagList: {
    alignSelf: "flex-start",
    backgroundColor: "#111827",
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
    marginTop: 6,
  },
  stockTagEmptyList: {
    backgroundColor: "#DC2626",
  },
  stockTagTextList: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "800",
  },
  controlsBlockList: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    padding: 3,
    borderWidth: 1.5,
    borderColor: "#111827",
    gap: 6,
  },
  stepperActionBtnList: {
    backgroundColor: "#F3F4F6",
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  qtyDisplayValueList: {
    fontSize: 18,
    fontWeight: "900",
    color: "#111827",
    minWidth: 24,
    textAlign: "center",
  },

  // ==========================================
  // SHARED FIXED STICKY FOOTER
  // ==========================================
  stickyFooter: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "#FFFFFF",
    paddingTop: 16,
    paddingHorizontal: 20,
    paddingBottom: 38,
    borderTopWidth: 1,
    borderColor: "#E5E7EB",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    elevation: 12,
  },
  footerSummary: {
    flex: 0.5,
  },
  footerBoxesText: {
    fontSize: 15,
    color: "#4B5563",
    fontWeight: "700",
  },
  footerTotalText: {
    fontSize: 24,
    fontWeight: "900",
    color: "#111827",
    marginTop: 1,
  },
  checkoutBtn: {
    backgroundColor: "#111827",
    flex: 0.5,
    height: 56,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    flexDirection: "row",
  },
  checkoutBtnDisabled: {
    backgroundColor: "#D1D5DB",
  },
  checkoutBtnText: {
    color: "#FFFFFF",
    fontSize: 17,
    fontWeight: "800",
  },
});
