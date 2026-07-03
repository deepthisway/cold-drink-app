import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
    Dimensions,
    FlatList,
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
const TILE_SIZE = (width - 48) / 2; // Clean 2-column grid scaling with padding margins

export default function BillingGridScreen() {
  const router = useRouter();
  const currentShopName = useAppStore((state) => state.currentShopName);
  const cart = useAppStore((state) => state.cart);
  const updateCartQuantity = useAppStore((state) => state.updateCartQuantity);

  const [skus, setSkus] = useState<SKURow[]>([]);

  // Fetch all active items alongside their current real-time calculated van stock
  useEffect(() => {
    async function loadVanInventory() {
      try {
        const db = await getDB();
        const todayStr = new Date().toISOString().split("T")[0];

        // Aggregates matching load rows minus sales across the cumulative daily ledger logs
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

  // Compute total running tallies dynamically for the sticky lower action ribbon
  const totalItemsCount = Object.values(cart).reduce(
    (sum, item) => sum + item.boxes,
    0,
  );
  const totalInvoiceAmount = Object.values(cart).reduce(
    (sum, item) => sum + item.boxes * item.price,
    0,
  );

  return (
    <View style={styles.container}>
      {/* Pinned Shop Context Header Strip */}
      <View style={styles.header}>
        <View style={styles.shopContext}>
          <Text style={styles.headerLabel}>Billing for:</Text>
          <Text style={styles.shopNameText} numberOfLines={1}>
            🏪 {currentShopName || "Unknown Shop"}
          </Text>
        </View>
        <TouchableOpacity
          style={styles.changeButton}
          onPress={() => router.push("/(driver)/shop-picker")}
        >
          <Text style={styles.changeButtonText}>Change</Text>
        </TouchableOpacity>
      </View>

      {/* Main Responsive Grid Layout */}
      <FlatList
        data={skus}
        keyExtractor={(item) => item.id}
        numColumns={2}
        columnWrapperStyle={styles.gridRow}
        contentContainerStyle={styles.gridContainer}
        renderItem={({ item }) => {
          const cartItem = cart[item.id];
          const chosenQty = cartItem ? cartItem.boxes : 0;
          const isSelected = chosenQty > 0;

          return (
            <View style={[styles.tile, isSelected && styles.tileGlowing]}>
              {/* Van Stock Corner Bubble */}
              <View style={styles.stockBubble}>
                <Text style={styles.stockBubbleText}>
                  {item.remaining_stock}
                </Text>
              </View>

              {/* Visual Shorthand Placeholders */}
              <Text style={styles.bottlePlaceholder}>🍾</Text>

              <Text style={styles.skuName} numberOfLines={1}>
                {item.name}
              </Text>
              <Text style={styles.skuSpecs}>
                {item.size || ""} · ₹{item.price}
              </Text>

              {/* Large, Tappable One-Thumb Incremental Steppers */}
              <View style={styles.stepperContainer}>
                <TouchableOpacity
                  style={styles.stepperBtn}
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
                  <Text style={styles.stepperBtnText}>-</Text>
                </TouchableOpacity>

                <Text style={styles.stepperQtyText}>{chosenQty}</Text>

                <TouchableOpacity
                  style={styles.stepperBtn}
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
                  <Text style={styles.stepperBtnText}>+</Text>
                </TouchableOpacity>
              </View>
            </View>
          );
        }}
      />

      {/* Sticky Bottom Summary Checkout Panel */}
      <View style={styles.stickyFooter}>
        <View style={styles.footerSummary}>
          <Text style={styles.footerBoxesText}>
            {totalItemsCount} Boxes Selected
          </Text>
          <Text style={styles.footerTotalText}>
            Total: ₹{totalInvoiceAmount}
          </Text>
        </View>

        <TouchableOpacity
          style={[
            styles.checkoutBtn,
            totalItemsCount === 0 && styles.checkoutBtnDisabled,
          ]}
          disabled={totalItemsCount === 0}
          onPress={() => router.push("/(driver)/cart-payment")}
        >
          <Text style={styles.checkoutBtnText}>आगे बढ़ें (Proceed) ➡️</Text>
        </TouchableOpacity>
      </View>
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
    backgroundColor: "#FFFFFF",
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderColor: "#E5E7EB",
  },
  shopContext: {
    flex: 0.75,
  },
  headerLabel: {
    fontSize: 12,
    color: "#6B7280",
    textTransform: "uppercase",
    fontWeight: "600",
  },
  shopNameText: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#1F2937",
    marginTop: 2,
  },
  changeButton: {
    backgroundColor: "#E5E7EB",
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 8,
  },
  changeButtonText: {
    color: "#4B5563",
    fontWeight: "600",
    fontSize: 14,
  },
  gridContainer: {
    padding: 16,
    paddingBottom: 110, // Gives clean breathing room over the lower bar layout
  },
  gridRow: {
    justifyContent: "space-between",
    marginBottom: 16,
  },
  tile: {
    backgroundColor: "#FFFFFF",
    width: TILE_SIZE,
    height: TILE_SIZE + 20,
    borderRadius: 18,
    padding: 14,
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    position: "relative",
    elevation: 1,
  },
  tileGlowing: {
    borderColor: "#3B82F6",
    backgroundColor: "#EFF6FF", // Soft subtle selection glow
    borderWidth: 2,
  },
  stockBubble: {
    position: "absolute",
    top: 8,
    right: 8,
    backgroundColor: "#374151",
    borderRadius: 10,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  stockBubbleText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "bold",
  },
  bottlePlaceholder: {
    fontSize: 36,
    marginTop: 8,
  },
  skuName: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1F2937",
    textAlign: "center",
    marginTop: 4,
  },
  skuSpecs: {
    fontSize: 13,
    color: "#6B7280",
    fontWeight: "500",
  },
  stepperContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F3F4F6",
    borderRadius: 10,
    width: "100%",
    justifyContent: "space-between",
    padding: 2,
    marginTop: 6,
  },
  stepperBtn: {
    backgroundColor: "#FFFFFF",
    width: 36,
    height: 36,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
    elevation: 1,
  },
  stepperBtnText: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#1F2937",
  },
  stepperQtyText: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#1F2937",
    minWidth: 24,
    textAlign: "center",
  },
  stickyFooter: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "#FFFFFF",
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderTopWidth: 1,
    borderColor: "#E5E7EB",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    elevation: 8,
  },
  footerSummary: {
    flex: 0.5,
  },
  footerBoxesText: {
    fontSize: 14,
    color: "#4B5563",
    fontWeight: "600",
  },
  footerTotalText: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#1F2937",
    marginTop: 2,
  },
  checkoutBtn: {
    backgroundColor: "#007AFF",
    flex: 0.5,
    height: 54,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
  },
  checkoutBtnDisabled: {
    backgroundColor: "#D1D5DB",
  },
  checkoutBtnText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "bold",
  },
});
