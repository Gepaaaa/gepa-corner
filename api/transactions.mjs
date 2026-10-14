// @ts-nocheck
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_FILE = path.join(__dirname, "../data/transactions.json");

// Shared in-memory transaction cache for fast invoice lookup & resilient status syncing
export const memoryTransactions = new Map();

// Load initial transactions from file if exists
try {
  if (fs.existsSync(DATA_FILE)) {
    const raw = fs.readFileSync(DATA_FILE, "utf-8");
    const arr = JSON.parse(raw);
    if (Array.isArray(arr)) {
      for (const item of arr) {
        if (item && (item.order_id || item.orderId)) {
          const key = item.order_id || item.orderId;
          memoryTransactions.set(key, item);
        }
      }
    }
  }
} catch (e) {
  console.warn("Could not load transactions from disk:", e.message);
}

// Helper to save transactions to disk
export function saveTransactionsToDisk() {
  try {
    const dir = path.dirname(DATA_FILE);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    const arr = Array.from(memoryTransactions.values());
    fs.writeFileSync(DATA_FILE, JSON.stringify(arr, null, 2), "utf-8");
  } catch (e) {
    console.warn("Could not save transactions to disk:", e.message);
  }
}
