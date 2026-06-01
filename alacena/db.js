import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import {
  getFirestore,
  collection,
  doc,
  getDocs,
  getDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { firebaseConfig } from "./firebase-config.js";

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

export { db };

export function normalizeProductName(nombre) {
  return nombre
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9\s]/g, "")
    .trim()
    .replace(/\s+/g, " ");
}

// --- Productos ---

export async function findProductByNormalizedName(nombreNormalizado) {
  const q = query(collection(db, "products"), where("nombreNormalizado", "==", nombreNormalizado));
  const snap = await getDocs(q);
  if (snap.empty) return null;
  return { id: snap.docs[0].id, ...snap.docs[0].data() };
}

export async function addProduct(nombre, unidad) {
  const nombreNormalizado = normalizeProductName(nombre);
  const existing = await findProductByNormalizedName(nombreNormalizado);
  if (existing) return existing.id;
  const ref = await addDoc(collection(db, "products"), {
    nombre,
    nombreNormalizado,
    unidad: unidad || "unidades",
    updatedAt: new Date().toISOString()
  });
  return ref.id;
}

export async function getProductById(productId) {
  const snap = await getDoc(doc(db, "products", productId));
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() };
}

// --- Stock ---

export async function getStockByProductId(productId) {
  const q = query(collection(db, "stock"), where("productId", "==", productId));
  const snap = await getDocs(q);
  if (snap.empty) return null;
  return { id: snap.docs[0].id, ...snap.docs[0].data() };
}

export async function ensureStockEntry(productId, quantity = 0) {
  const existing = await getStockByProductId(productId);
  if (existing) return existing.id;
  const ref = await addDoc(collection(db, "stock"), {
    productId,
    quantity,
    minQuantity: 1,
    location: "",
    updatedAt: new Date().toISOString()
  });
  return ref.id;
}

export async function updateStock(stockId, quantity) {
  await updateDoc(doc(db, "stock", stockId), {
    quantity,
    updatedAt: new Date().toISOString()
  });
}

export async function getStock() {
  const snap = await getDocs(collection(db, "stock"));
  const items = [];
  for (const stockDoc of snap.docs) {
    const data = { id: stockDoc.id, ...stockDoc.data() };
    const productSnap = await getDoc(doc(db, "products", data.productId));
    data.product = productSnap.exists() ? { id: productSnap.id, ...productSnap.data() } : null;
    items.push(data);
  }
  items.sort((a, b) => (a.product?.nombre || "").localeCompare(b.product?.nombre || "", "es"));
  return items;
}

// --- Porcionar ---

export async function porcionar(stockId, porcionNombre, porcionUnidad, numeroPorciones) {
  await updateStock(stockId, 0);
  const porcionProductId = await addProduct(porcionNombre, porcionUnidad);
  const existingStock = await getStockByProductId(porcionProductId);
  if (existingStock) {
    await updateStock(existingStock.id, numeroPorciones);
  } else {
    await ensureStockEntry(porcionProductId, numeroPorciones);
  }
}

// --- Facturas ---

export async function addReceipt(receipt) {
  const ref = await addDoc(collection(db, "receipts"), {
    ...receipt,
    creadoEn: new Date().toISOString()
  });
  return ref.id;
}

export async function getReceipts() {
  const q = query(collection(db, "receipts"), orderBy("creadoEn", "desc"));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

export async function deleteReceipt(receiptId) {
  await deleteDoc(doc(db, "receipts", receiptId));
}

// --- Precios ---

export async function addPriceRecord(productId, precio, fecha, receiptId) {
  await addDoc(collection(db, "prices"), {
    productId,
    precio,
    fecha,
    receiptId: receiptId || null,
    creadoEn: new Date().toISOString()
  });
}

export async function getPriceHistory(productId) {
  const q = query(
    collection(db, "prices"),
    where("productId", "==", productId),
    orderBy("fecha", "asc")
  );
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

export async function getAllPricesGrouped() {
  const pricesSnap = await getDocs(query(collection(db, "prices"), orderBy("fecha", "asc")));
  const productsMap = {};
  for (const d of pricesSnap.docs) {
    const price = { id: d.id, ...d.data() };
    if (!productsMap[price.productId]) {
      productsMap[price.productId] = { productId: price.productId, records: [] };
    }
    productsMap[price.productId].records.push(price);
  }
  // Fetch product names
  const result = [];
  for (const [productId, group] of Object.entries(productsMap)) {
    const product = await getProductById(productId);
    result.push({ product, records: group.records });
  }
  result.sort((a, b) => (a.product?.nombre || "").localeCompare(b.product?.nombre || "", "es"));
  return result;
}
