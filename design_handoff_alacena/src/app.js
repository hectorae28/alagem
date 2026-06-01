// ============================================================================
// APP (app.js) — enrutador SPA + inicialización
// ============================================================================
import { initDb, isDemoMode } from "./db.js";
import { icon } from "./icons.js";
import { render as renderPantry } from "./screens/pantry.js";
import { render as renderScan } from "./screens/scan.js";
import { render as renderProduct } from "./screens/product.js";
import { render as renderReceipts } from "./screens/receipts.js";
import { render as renderPrices } from "./screens/prices.js";

const screens = {
  pantry: { render: renderPantry, tab: "pantry" },
  scan: { render: renderScan, tab: "scan" },
  receipts: { render: renderReceipts, tab: "receipts" },
  prices: { render: renderPrices, tab: "prices" },
  product: { render: renderProduct, tab: "pantry" }, // pantalla anidada
};

const TABS = [
  { id: "pantry", label: "Alacena", icon: "home" },
  { id: "scan", label: "Escanear", icon: "camera" },
  { id: "receipts", label: "Facturas", icon: "receipt" },
  { id: "prices", label: "Precios", icon: "tag" },
];

const mount = document.getElementById("screen");
const titleEl = document.getElementById("topbar-title");
const backBtn = document.getElementById("topbar-back");
const navEl = document.getElementById("bottomnav");

let current = { name: "pantry", params: {} };

function setHeader({ title, back }) {
  titleEl.textContent = title;
  backBtn.hidden = !back;
  backBtn.onclick = back ? () => navigate(back) : null;
}

function highlightTab(tabId) {
  navEl.querySelectorAll(".nav-item").forEach((el) =>
    el.classList.toggle("active", el.getAttribute("data-tab") === tabId)
  );
}

export async function navigate(name, params = {}) {
  const screen = screens[name];
  if (!screen) return;
  current = { name, params };
  // refleja la ruta para poder refrescar sin perder pantalla
  const q = params.id ? `?id=${encodeURIComponent(params.id)}` : "";
  history.replaceState(current, "", `#${name}${q}`);
  highlightTab(screen.tab);
  mount.scrollTop = 0;
  try {
    await screen.render({ mount, navigate, setHeader, params });
  } catch (err) {
    console.error(err);
    mount.innerHTML = `<div class="screen-pad"><div class="error-box"><strong>Algo falló al cargar esta pantalla.</strong><br>${String(err.message || err)}</div></div>`;
  }
}

function buildNav() {
  navEl.innerHTML = TABS.map(
    (t) => `
    <button class="nav-item" data-tab="${t.id}">
      <span class="nav-icon">${icon(t.icon, 23)}</span>
      <span class="nav-label">${t.label}</span>
    </button>`
  ).join("");
  navEl.querySelectorAll(".nav-item").forEach((el) =>
    el.addEventListener("click", () => navigate(el.getAttribute("data-tab")))
  );
}

function parseHash() {
  const h = location.hash.replace(/^#/, "");
  if (!h) return { name: "pantry", params: {} };
  const [name, query] = h.split("?");
  const params = {};
  if (query) query.split("&").forEach((kv) => { const [k, v] = kv.split("="); params[k] = decodeURIComponent(v || ""); });
  return { name: screens[name] ? name : "pantry", params };
}

async function boot() {
  buildNav();
  document.getElementById("app").classList.remove("booting");
  await initDb();

  // Banner de modo demo
  if (isDemoMode()) {
    document.getElementById("demo-banner").hidden = false;
  }

  const start = parseHash();
  await navigate(start.name, start.params);

  window.addEventListener("hashchange", () => {
    const r = parseHash();
    if (r.name !== current.name || r.params.id !== current.params.id) navigate(r.name, r.params);
  });
}

boot();
