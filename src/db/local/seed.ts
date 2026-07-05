import "react-native-get-random-values";
import { v4 as uuidv4 } from "uuid";
import { getDB } from "./sqlite";

export async function seedOriginalSKUs(): Promise<void> {
  const db = await getDB();
  const timestamp = new Date().toISOString();

  await db.runAsync("DELETE FROM sku;");

  const originalProducts = [
    { name: "2L Thumbsup", brand: "Coca-Cola", price: 630.0 },
    { name: "1L Thumbsup", brand: "Coca-Cola", price: 620.0 },
    { name: "740ml Thumbsup", brand: "Coca-Cola", price: 680.0 },
    { name: "400ml Thumbsup", brand: "Coca-Cola", price: 410.0 },
    { name: "250ml Thumbsup", brand: "Coca-Cola", price: 510.0 },
    { name: "Thumbsup Can 30MRP", brand: "Coca-Cola", price: 920.0 },
    { name: "1.25L Dew", brand: "Pepsi", price: 660.0 },
    { name: "2.25L Dew", brand: "Pepsi", price: 690.0 },
    { name: "740ml Dew", brand: "Pepsi", price: 820.0 },
    { name: "400ml Dew", brand: "Pepsi", price: 520.0 },
    { name: "Sting", brand: "Pepsi", price: 520.0 },
    { name: "Maaza Tetra", brand: "Coca-Cola", price: 420.0 },
    { name: "Papli", brand: "Coca-Cola", price: 510.0 },
    { name: "Fizz 250ml", brand: "Parle", price: 510.0 },
    { name: "Fizz 160ml", brand: "Parle", price: 350.0 },
    { name: "Non-Stop", brand: "Non-Stop", price: 1150.0 },
    { name: "Hell", brand: "Hell", price: 1440.0 },
    { name: "Red Bull", brand: "Red Bull", price: 2380.0 },
    { name: "Campa Energy Can", brand: "Campa", price: 680.0 },
    { name: "Campa Sting", brand: "Campa", price: 230.0 },
    { name: "Campa 500ml", brand: "Campa", price: 400.0 },
    { name: "Campa 200ml", brand: "Campa", price: 250.0 },
    { name: "Raskik", brand: "RasKik", price: 230.0 },
    { name: "Sun Crush", brand: "Campa", price: 380.0 },
    { name: "Raskik Tetra", brand: "Campa", price: 320.0 },
    { name: "Jain Shikanji", brand: "Jain", price: 200.0 },
    { name: "Frooti 330ml", brand: "Parle", price: 510.0 },
    { name: "Frooti 150ml", brand: "Parle", price: 420.0 },
    { name: "Frooti 600ml", brand: "Parle", price: 690.0 },
    { name: "Frooti 2L", brand: "Parle", price: 510.0 },
    { name: "Frooti 70ml", brand: "Parle", price: 250.0 },
    { name: "Smooth", brand: "Parle", price: 350.0 },
    { name: "Mc2", brand: "Mc2", price: 460.0 },
    { name: "Rajasthani Jeera", brand: "Rajasthani Jeera", price: 170.0 },
    { name: "Tropicana Juice", brand: "Pepsi", price: 630.0 },
    { name: "Neembu Pani Minute Maid", brand: "Coca-Cola", price: 410.0 },
    { name: "Creambell Doodh", brand: "Pepsi", price: 520.0 },
    { name: "Real 10MRP", brand: "Dabur", price: 330.0 },
    { name: "Real 20MRP", brand: "Dabur", price: 440.0 },
    { name: "Real 1L MIX", brand: "Dabur", price: 1180.0 },
    { name: "Real 1L Cran", brand: "Dabur", price: 1380.0 },
  ];

  console.log("Seeding real product lines into the SQLite storage matrix...");

  // 3. Batch transaction processing execution loop
  for (const product of originalProducts) {
    const generatedSkuId = uuidv4();
    await db.runAsync(
      `INSERT INTO sku (id, name, brand, size, price, image_path, active, created_at, synced) 
       VALUES (?, ?, ?, null, ?, null, 1, ?, 0)`,
      [generatedSkuId, product.name, product.brand, product.price, timestamp],
    );
  }

  console.log(
    `Successfully completed catalog migration. ${originalProducts.length} live active items deployed.`,
  );
}
