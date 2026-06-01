// ============================================================================
// PANTALLA: ESCANEAR FACTURA
// ============================================================================
import { analyzeReceipt } from "../gemini-client.js";
import { saveReceipt } from "../db.js";
import { geminiConfigured } from "../firebase-config.js";
import { icon } from "../icons.js";

const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

let state = { lines: [], date: "", total: 0, store: "" };

export async function render(ctx) {
  ctx.setHeader({ title: "Escanear factura", back: null });
  state = { lines: [], date: "", total: 0, store: "" };

  ctx.mount.innerHTML = `
    <div class="screen-pad">
      ${!geminiConfigured ? `<div class="notice">Modo demo de escaneo — al subir una imagen se devolverá una factura de ejemplo. Añade tu clave de Gemini para OCR real.</div>` : ""}

      <label class="dropzone" id="dropzone">
        <input type="file" id="file-input" accept="image/*" capture="environment" hidden />
        <div class="dz-icon">${icon("receipt", 36)}</div>
        <div class="dz-title">Sube o haz una foto de tu factura</div>
        <div class="dz-sub">JPG o PNG · se analiza con IA</div>
      </label>

      <div id="preview-wrap" hidden>
        <img id="preview-img" class="receipt-preview" alt="factura" />
      </div>

      <div id="scan-status"></div>
      <div id="result-area"></div>
    </div>
  `;

  const fileInput = ctx.mount.querySelector("#file-input");
  const dropzone = ctx.mount.querySelector("#dropzone");
  const statusEl = ctx.mount.querySelector("#scan-status");
  const resultArea = ctx.mount.querySelector("#result-area");
  const previewWrap = ctx.mount.querySelector("#preview-wrap");
  const previewImg = ctx.mount.querySelector("#preview-img");

  fileInput.addEventListener("change", async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const dataUrl = await fileToDataUrl(file);
    previewImg.src = dataUrl;
    previewWrap.hidden = false;
    dropzone.classList.add("compact");

    statusEl.innerHTML = `<div class="scanning"><span class="spinner"></span> Analizando factura con IA…</div>`;
    resultArea.innerHTML = "";

    try {
      const base64 = dataUrl.split(",")[1];
      const mime = file.type || "image/jpeg";
      const data = await analyzeReceipt(base64, mime);
      statusEl.innerHTML = "";
      buildEditable(data, resultArea, ctx);
    } catch (err) {
      statusEl.innerHTML = `<div class="error-box"><strong>No se pudo analizar la factura.</strong><br>${esc(err.message)}</div>`;
    }
  });
}

function buildEditable(data, area, ctx) {
  state.date = data.fecha || new Date().toISOString().slice(0, 10);
  state.total = data.total || 0;
  state.store = data.store || data.tienda || "";
  state.lines = (data.productos || []).map((p) => ({
    name: p.nombre || "",
    quantity: p.cantidad ?? 1,
    unit: p.unidad || "ud",
    price: p.precio ?? "",
  }));

  area.innerHTML = `
    <div class="result-head">
      <h3>Revisa y corrige</h3>
      <span class="muted">${state.lines.length} líneas detectadas</span>
    </div>

    <div class="meta-row">
      <label class="field">
        <span>Fecha</span>
        <input type="date" id="r-date" value="${esc(state.date)}" />
      </label>
      <label class="field">
        <span>Tienda</span>
        <input type="text" id="r-store" placeholder="opcional" value="${esc(state.store)}" />
      </label>
    </div>

    <div class="lines" id="lines"></div>
    <button class="btn-ghost block" id="add-line">＋ Añadir línea</button>

    <div class="total-row">
      <span>Total factura</span>
      <input type="number" id="r-total" inputmode="decimal" step="0.01" value="${state.total}" />
    </div>

    <button class="btn-primary block big" id="save-receipt">Guardar en la alacena</button>
  `;

  const linesEl = area.querySelector("#lines");
  drawLines(linesEl, area, ctx);

  area.querySelector("#add-line").addEventListener("click", () => {
    state.lines.push({ name: "", quantity: 1, unit: "ud", price: "" });
    drawLines(linesEl, area, ctx);
  });

  area.querySelector("#r-date").addEventListener("input", (e) => (state.date = e.target.value));
  area.querySelector("#r-store").addEventListener("input", (e) => (state.store = e.target.value));
  area.querySelector("#r-total").addEventListener("input", (e) => (state.total = e.target.value));

  area.querySelector("#save-receipt").addEventListener("click", async (e) => {
    const btn = e.target;
    const valid = state.lines.filter((l) => l.name && l.name.trim());
    if (!valid.length) { alert("Añade al menos un producto con nombre."); return; }
    btn.disabled = true;
    btn.textContent = "Guardando…";
    try {
      await saveReceipt({ date: state.date, total: state.total, store: state.store, lines: state.lines });
      ctx.navigate("receipts");
    } catch (err) {
      btn.disabled = false;
      btn.textContent = "Guardar en la alacena";
      alert("Error al guardar: " + err.message);
    }
  });
}

function drawLines(linesEl, area, ctx) {
  linesEl.innerHTML = state.lines
    .map(
      (l, i) => `
    <div class="line-card" data-i="${i}">
      <input class="line-name" data-f="name" data-i="${i}" type="text" placeholder="Producto" value="${esc(l.name)}" />
      <div class="line-fields">
        <input class="line-qty" data-f="quantity" data-i="${i}" type="number" inputmode="decimal" step="0.1" value="${esc(l.quantity)}" aria-label="cantidad" />
        <input class="line-unit" data-f="unit" data-i="${i}" type="text" value="${esc(l.unit)}" aria-label="unidad" />
        <div class="price-input">
          <input class="line-price" data-f="price" data-i="${i}" type="number" inputmode="decimal" step="0.01" placeholder="0.00" value="${esc(l.price)}" aria-label="precio" />
          <span>€</span>
        </div>
        <button class="line-del" data-del="${i}" aria-label="eliminar línea">✕</button>
      </div>
    </div>`
    )
    .join("");

  linesEl.querySelectorAll("input[data-f]").forEach((inp) =>
    inp.addEventListener("input", (e) => {
      const i = +e.target.getAttribute("data-i");
      const f = e.target.getAttribute("data-f");
      state.lines[i][f] = e.target.value;
    })
  );
  linesEl.querySelectorAll("[data-del]").forEach((b) =>
    b.addEventListener("click", () => {
      state.lines.splice(+b.getAttribute("data-del"), 1);
      drawLines(linesEl, area, ctx);
    })
  );
}

function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
