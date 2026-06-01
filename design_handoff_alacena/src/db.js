// ============================================================================
// CAPA DE DATOS (db.js)
// ----------------------------------------------------------------------------
// Expone una API de alto nivel para la app. Internamente elige entre:
//   - Firestore real (SDK v9 modular vía CDN) si firebaseConfigured === true
//   - Un mock respaldado por localStorage (MODO DEMO) en caso contrario
//
// Colecciones:
//   products  { id, name, normalizedName, unit, createdAt }
//   stock     { id, productId, quantity, unit, updatedAt }
//   receipts  { id, date, total, store, lines:[{productId,name,quantity,unit,price}], createdAt }
//   prices    { id, productId, productName, price, unit, date, receiptId, createdAt }
// ============================================================================

import { firebaseConfig, firebaseConfigured } from "./firebase-config.js";

// ----------------------------------------------------------------------------
// Utilidades
// ----------------------------------------------------------------------------
export function normalizeName(name) {
  return (name || "")
    .toLowerCase()
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\(porci?on\)/g, "")
    .replace(/[^a-z0-9 ]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

const nowISO = () => new Date().toISOString();
const todayISO = () => new Date().toISOString().slice(0, 10);

// ----------------------------------------------------------------------------
// Adaptador MOCK (localStorage)
// ----------------------------------------------------------------------------
const MOCK_KEY = "alacena_mock_db_v1";

function readMock() {
  try {
    const raw = localStorage.getItem(MOCK_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {}
  return null;
}
function writeMock(data) {
  localStorage.setItem(MOCK_KEY, JSON.stringify(data));
}
function uid() {
  return "id_" + Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}

function seedMock() {
  const daysAgo = (n) => new Date(Date.now() - n * 86400000).toISOString().slice(0, 10);
  const p = (name, unit) => ({ id: uid(), name, normalizedName: normalizeName(name), unit, createdAt: nowISO() });

  const leche = p("Leche entera", "L");
  const huevos = p("Huevos", "docena");
  const arroz = p("Arroz redondo", "kg");
  const aceite = p("Aceite de oliva virgen", "L");
  const cafe = p("Café molido", "paquete");
  const pasta = p("Pasta macarrones", "paquete");
  const tomate = p("Tomate triturado", "lata");
  const pollo = p("Pechuga de pollo", "kg");
  const manzanas = p("Manzanas", "kg");
  const detergente = p("Detergente lavadora", "bote");

  const products = [leche, huevos, arroz, aceite, cafe, pasta, tomate, pollo, manzanas, detergente];

  const stock = [
    { id: uid(), productId: leche.id, quantity: 4, unit: "L", updatedAt: nowISO() },
    { id: uid(), productId: huevos.id, quantity: 2, unit: "docena", updatedAt: nowISO() },
    { id: uid(), productId: arroz.id, quantity: 1, unit: "kg", updatedAt: nowISO() },
    { id: uid(), productId: aceite.id, quantity: 1, unit: "L", updatedAt: nowISO() },
    { id: uid(), productId: cafe.id, quantity: 2, unit: "paquete", updatedAt: nowISO() },
    { id: uid(), productId: pasta.id, quantity: 5, unit: "paquete", updatedAt: nowISO() },
    { id: uid(), productId: tomate.id, quantity: 6, unit: "lata", updatedAt: nowISO() },
    { id: uid(), productId: pollo.id, quantity: 0, unit: "kg", updatedAt: nowISO() },
    { id: uid(), productId: manzanas.id, quantity: 1.5, unit: "kg", updatedAt: nowISO() },
    { id: uid(), productId: detergente.id, quantity: 1, unit: "bote", updatedAt: nowISO() },
  ];

  const prices = [
    // Leche: histórico con subidas
    { id: uid(), productId: leche.id, productName: leche.name, price: 0.89, unit: "L", date: daysAgo(95), receiptId: null, createdAt: nowISO() },
    { id: uid(), productId: leche.id, productName: leche.name, price: 0.95, unit: "L", date: daysAgo(55), receiptId: null, createdAt: nowISO() },
    { id: uid(), productId: leche.id, productName: leche.name, price: 1.09, unit: "L", date: daysAgo(12), receiptId: null, createdAt: nowISO() },
    // Aceite: subida fuerte
    { id: uid(), productId: aceite.id, productName: aceite.name, price: 6.49, unit: "L", date: daysAgo(120), receiptId: null, createdAt: nowISO() },
    { id: uid(), productId: aceite.id, productName: aceite.name, price: 8.20, unit: "L", date: daysAgo(40), receiptId: null, createdAt: nowISO() },
    { id: uid(), productId: aceite.id, productName: aceite.name, price: 7.95, unit: "L", date: daysAgo(12), receiptId: null, createdAt: nowISO() },
    // Café
    { id: uid(), productId: cafe.id, productName: cafe.name, price: 3.20, unit: "paquete", date: daysAgo(60), receiptId: null, createdAt: nowISO() },
    { id: uid(), productId: cafe.id, productName: cafe.name, price: 3.49, unit: "paquete", date: daysAgo(12), receiptId: null, createdAt: nowISO() },
    // Arroz
    { id: uid(), productId: arroz.id, productName: arroz.name, price: 1.15, unit: "kg", date: daysAgo(30), receiptId: null, createdAt: nowISO() },
    // Huevos
    { id: uid(), productId: huevos.id, productName: huevos.name, price: 2.10, unit: "docena", date: daysAgo(30), receiptId: null, createdAt: nowISO() },
    { id: uid(), productId: huevos.id, productName: huevos.name, price: 2.45, unit: "docena", date: daysAgo(12), receiptId: null, createdAt: nowISO() },
  ];

  const receipts = [
    {
      id: uid(),
      date: daysAgo(12),
      store: "Mercadona",
      total: 24.97,
      lines: [
        { productId: leche.id, name: leche.name, quantity: 4, unit: "L", price: 1.09 },
        { productId: aceite.id, name: aceite.name, quantity: 1, unit: "L", price: 7.95 },
        { productId: cafe.id, name: cafe.name, quantity: 1, unit: "paquete", price: 3.49 },
        { productId: huevos.id, name: huevos.name, quantity: 1, unit: "docena", price: 2.45 },
      ],
      createdAt: nowISO(),
    },
    {
      id: uid(),
      date: daysAgo(30),
      store: "Carrefour",
      total: 14.85,
      lines: [
        { productId: arroz.id, name: arroz.name, quantity: 1, unit: "kg", price: 1.15 },
        { productId: huevos.id, name: huevos.name, quantity: 2, unit: "docena", price: 2.10 },
        { productId: pasta.id, name: pasta.name, quantity: 3, unit: "paquete", price: 0.85 },
      ],
      createdAt: nowISO(),
    },
  ];

  const data = { products, stock, receipts, prices };
  writeMock(data);
  return data;
}

function mockAdapter() {
  let data = readMock() || seedMock();
  const save = () => writeMock(data);
  return {
    async getAll(coll) {
      return JSON.parse(JSON.stringify(data[coll] || []));
    },
    async get(coll, id) {
      const found = (data[coll] || []).find((d) => d.id === id);
      return found ? JSON.parse(JSON.stringify(found)) : null;
    },
    async add(coll, doc) {
      const id = uid();
      data[coll] = data[coll] || [];
      data[coll].push({ id, ...doc });
      save();
      return id;
    },
    async set(coll, id, doc) {
      data[coll] = data[coll] || [];
      const idx = data[coll].findIndex((d) => d.id === id);
      if (idx >= 0) data[coll][idx] = { id, ...doc };
      else data[coll].push({ id, ...doc });
      save();
    },
    async update(coll, id, patch) {
      const idx = (data[coll] || []).findIndex((d) => d.id === id);
      if (idx >= 0) data[coll][idx] = { ...data[coll][idx], ...patch };
      save();
    },
    async remove(coll, id) {
      data[coll] = (data[coll] || []).filter((d) => d.id !== id);
      save();
    },
  };
}

// ----------------------------------------------------------------------------
// Adaptador REAL (Firestore v9 modular)
// ----------------------------------------------------------------------------
async function firestoreAdapter() {
  const { initializeApp } = await import("https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js");
  const fs = await import("https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js");
  const app = initializeApp(firebaseConfig);
  const db = fs.getFirestore(app);

  return {
    async getAll(coll) {
      const snap = await fs.getDocs(fs.collection(db, coll));
      return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    },
    async get(coll, id) {
      const snap = await fs.getDoc(fs.doc(db, coll, id));
      return snap.exists() ? { id: snap.id, ...snap.data() } : null;
    },
    async add(coll, doc) {
      const ref = await fs.addDoc(fs.collection(db, coll), doc);
      return ref.id;
    },
    async set(coll, id, doc) {
      await fs.setDoc(fs.doc(db, coll, id), doc);
    },
    async update(coll, id, patch) {
      await fs.updateDoc(fs.doc(db, coll, id), patch);
    },
    async remove(coll, id) {
      await fs.deleteDoc(fs.doc(db, coll, id));
    },
  };
}

// ----------------------------------------------------------------------------
// Inicialización
// ----------------------------------------------------------------------------
let adapter = null;
let _demoMode = !firebaseConfigured;

export function isDemoMode() {
  return _demoMode;
}

export async function initDb() {
  if (adapter) return adapter;
  if (firebaseConfigured) {
    try {
      adapter = await firestoreAdapter();
      _demoMode = false;
    } catch (e) {
      console.error("Fallo al iniciar Firestore, usando modo demo:", e);
      adapter = mockAdapter();
      _demoMode = true;
    }
  } else {
    adapter = mockAdapter();
    _demoMode = true;
  }
  return adapter;
}

function a() {
  if (!adapter) throw new Error("db no inicializada: llama a initDb() primero");
  return adapter;
}

// ----------------------------------------------------------------------------
// API de alto nivel
// ----------------------------------------------------------------------------

// Devuelve el inventario: una fila por producto con su stock y último precio.
export async function getPantry() {
  const [products, stock, prices] = await Promise.all([
    a().getAll("products"),
    a().getAll("stock"),
    a().getAll("prices"),
  ]);
  const stockByProduct = {};
  stock.forEach((s) => (stockByProduct[s.productId] = s));
  const lastPriceByProduct = {};
  prices.forEach((p) => {
    const cur = lastPriceByProduct[p.productId];
    if (!cur || p.date > cur.date) lastPriceByProduct[p.productId] = p;
  });

  return products
    .map((prod) => {
      const s = stockByProduct[prod.id];
      const lp = lastPriceByProduct[prod.id];
      return {
        productId: prod.id,
        stockId: s ? s.id : null,
        name: prod.name,
        unit: (s && s.unit) || prod.unit || "ud",
        quantity: s ? s.quantity : 0,
        lastPrice: lp ? lp.price : null,
      };
    })
    .sort((x, y) => {
      // Agotados primero, luego alfabético
      if ((x.quantity === 0) !== (y.quantity === 0)) return x.quantity === 0 ? -1 : 1;
      return x.name.localeCompare(y.name, "es");
    });
}

// Busca un producto por nombre normalizado o crea uno nuevo. Devuelve su id.
async function findOrCreateProduct(name, unit) {
  const norm = normalizeName(name);
  const products = await a().getAll("products");
  const existing = products.find((p) => p.normalizedName === norm);
  if (existing) return existing.id;
  return a().add("products", { name, normalizedName: norm, unit: unit || "ud", createdAt: nowISO() });
}

// Devuelve la entrada de stock de un producto (o null).
async function getStockEntry(productId) {
  const stock = await a().getAll("stock");
  return stock.find((s) => s.productId === productId) || null;
}

// Añade producto manualmente con stock inicial.
export async function addProductWithStock({ name, unit, quantity }) {
  const productId = await findOrCreateProduct(name, unit);
  const existing = await getStockEntry(productId);
  const qty = Number(quantity) || 0;
  if (existing) {
    await a().update("stock", existing.id, { quantity: existing.quantity + qty, unit: unit || existing.unit, updatedAt: nowISO() });
  } else {
    await a().add("stock", { productId, quantity: qty, unit: unit || "ud", updatedAt: nowISO() });
  }
  return productId;
}

// Consume cantidad de un producto (no baja de 0).
export async function consume(productId, amount) {
  const s = await getStockEntry(productId);
  if (!s) return;
  const next = Math.max(0, +(s.quantity - (Number(amount) || 0)).toFixed(3));
  await a().update("stock", s.id, { quantity: next, updatedAt: nowISO() });
}

// Fija la cantidad exacta de stock.
export async function setStockQuantity(productId, quantity) {
  const s = await getStockEntry(productId);
  const qty = Math.max(0, Number(quantity) || 0);
  if (s) await a().update("stock", s.id, { quantity: qty, updatedAt: nowISO() });
  else await a().add("stock", { productId, quantity: qty, unit: "ud", updatedAt: nowISO() });
}

// Detalle de producto: datos + stock + historial de precios (cronológico).
export async function getProductDetail(productId) {
  const [product, prices] = await Promise.all([a().get("products", productId), a().getAll("prices")]);
  const s = await getStockEntry(productId);
  const history = prices
    .filter((p) => p.productId === productId)
    .sort((x, y) => (x.date < y.date ? -1 : 1));
  // Variación % respecto al registro anterior
  history.forEach((h, i) => {
    if (i === 0 || !history[i - 1].price) h.change = null;
    else h.change = ((h.price - history[i - 1].price) / history[i - 1].price) * 100;
  });
  return {
    product,
    stock: s,
    quantity: s ? s.quantity : 0,
    unit: (s && s.unit) || (product && product.unit) || "ud",
    prices: history,
  };
}

// Porcionar: el stock original pasa a 0 y se crea "{nombre} (porción)" con
// quantity = count como producto y entrada de stock nuevos.
export async function portionProduct(productId, count) {
  const product = await a().get("products", productId);
  if (!product) return null;
  const s = await getStockEntry(productId);
  if (s) await a().update("stock", s.id, { quantity: 0, updatedAt: nowISO() });

  const portionName = `${product.name} (porción)`;
  const norm = normalizeName(portionName) + " porcion";
  const newProductId = await a().add("products", {
    name: portionName,
    normalizedName: norm,
    unit: "porción",
    createdAt: nowISO(),
  });
  await a().add("stock", { productId: newProductId, quantity: Number(count) || 0, unit: "porción", updatedAt: nowISO() });
  return newProductId;
}

// Guarda una factura: actualiza/crea productos, suma stock, registra precios.
export async function saveReceipt({ date, total, store, lines }) {
  const cleanDate = date || todayISO();
  const savedLines = [];

  for (const line of lines) {
    if (!line.name || !line.name.trim()) continue;
    const productId = await findOrCreateProduct(line.name, line.unit);
    const qty = Number(line.quantity) || 0;
    const price = line.price === "" || line.price == null ? null : Number(line.price);

    // Stock += cantidad
    const existing = await getStockEntry(productId);
    if (existing) {
      await a().update("stock", existing.id, { quantity: existing.quantity + qty, unit: line.unit || existing.unit, updatedAt: nowISO() });
    } else {
      await a().add("stock", { productId, quantity: qty, unit: line.unit || "ud", updatedAt: nowISO() });
    }
    savedLines.push({ productId, name: line.name, quantity: qty, unit: line.unit || "ud", price });
  }

  const receiptId = await a().add("receipts", {
    date: cleanDate,
    total: Number(total) || 0,
    store: store || "",
    lines: savedLines,
    createdAt: nowISO(),
  });

  // Registrar precios ligados a la factura
  for (const l of savedLines) {
    if (l.price == null || isNaN(l.price)) continue;
    await a().add("prices", {
      productId: l.productId,
      productName: l.name,
      price: l.price,
      unit: l.unit,
      date: cleanDate,
      receiptId,
      createdAt: nowISO(),
    });
  }
  return receiptId;
}

export async function getReceipts() {
  const receipts = await a().getAll("receipts");
  return receipts.sort((x, y) => (x.date < y.date ? 1 : -1));
}

export async function deleteReceipt(id) {
  await a().remove("receipts", id);
}

// Historial de precios agrupado por producto, con variación % entre registros.
export async function getAllPriceHistory() {
  const prices = await a().getAll("prices");
  const byProduct = {};
  prices.forEach((p) => {
    (byProduct[p.productId] = byProduct[p.productId] || []).push(p);
  });

  const groups = Object.keys(byProduct).map((pid) => {
    const list = byProduct[pid].sort((x, y) => (x.date < y.date ? -1 : 1));
    list.forEach((h, i) => {
      if (i === 0) h.change = null;
      else h.change = ((h.price - list[i - 1].price) / list[i - 1].price) * 100;
    });
    const first = list[0].price;
    const last = list[list.length - 1].price;
    return {
      productId: pid,
      productName: list[list.length - 1].productName,
      unit: list[list.length - 1].unit,
      entries: list.slice().reverse(), // más reciente primero
      count: list.length,
      latest: last,
      totalChange: first ? ((last - first) / first) * 100 : null,
    };
  });

  return groups.sort((x, y) => x.productName.localeCompare(y.productName, "es"));
}
