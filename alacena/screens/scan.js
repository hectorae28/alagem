import { analyzeReceipt } from "../gemini-client.js";
import { addProduct, ensureStockEntry, addReceipt, addPriceRecord } from "../db.js";

export async function render(container, _params, navigate) {
  container.innerHTML = `
    <div class="scan-screen">
      <div class="upload-area" id="upload-area" role="button" tabindex="0" aria-label="Seleccionar imagen de factura">
        <input type="file" id="file-input" accept="image/*" capture="environment" hidden>
        <div class="upload-placeholder">
          <span class="upload-icon">📷</span>
          <p>Toca para fotografiar o seleccionar una factura</p>
          <p class="upload-hint">JPG, PNG, WebP</p>
        </div>
      </div>
      <div id="scan-status"></div>
      <div id="scan-result"></div>
    </div>
  `;

  const uploadArea = container.querySelector("#upload-area");
  const fileInput = container.querySelector("#file-input");
  const statusDiv = container.querySelector("#scan-status");
  const resultDiv = container.querySelector("#scan-result");

  uploadArea.addEventListener("click", () => fileInput.click());
  uploadArea.addEventListener("keydown", e => { if (e.key === "Enter" || e.key === " ") fileInput.click(); });

  fileInput.addEventListener("change", async e => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async ev => {
      const dataUrl = ev.target.result;
      const base64 = dataUrl.split(",")[1];
      const mimeType = file.type;

      uploadArea.innerHTML = `<img src="${dataUrl}" class="receipt-preview" alt="Factura seleccionada">`;
      statusDiv.innerHTML = `<div class="status-info">🔍 Analizando con IA…</div>`;
      resultDiv.innerHTML = "";

      try {
        const result = await analyzeReceipt(base64, mimeType);
        statusDiv.innerHTML = `<div class="status-success">✓ Análisis completado — revisa y edita los datos</div>`;
        renderEditableTable(result, resultDiv, navigate);
      } catch (err) {
        statusDiv.innerHTML = `<div class="error">❌ ${err.message}</div>`;
      }
    };
    reader.readAsDataURL(file);
  });
}

function renderEditableTable(result, container, navigate) {
  const today = new Date().toISOString().split("T")[0];
  const productos = Array.isArray(result.productos) ? result.productos : [];

  container.innerHTML = `
    <div class="result-section">
      <h3>Productos detectados</h3>
      <div class="receipt-meta">
        <div class="form-group">
          <label>Fecha de la factura</label>
          <input type="date" id="r-fecha" value="${result.fecha || today}">
        </div>
        <div class="form-group">
          <label>Total</label>
          <input type="number" id="r-total" value="${result.total || 0}" step="0.01" min="0">
        </div>
      </div>

      <div class="table-wrapper">
        <table class="product-table">
          <thead>
            <tr>
              <th>Producto</th>
              <th>Cant.</th>
              <th>Unidad</th>
              <th>Precio</th>
              <th></th>
            </tr>
          </thead>
          <tbody id="p-tbody">
            ${productos.map((p, i) => buildRow(i, p)).join("")}
          </tbody>
        </table>
      </div>

      <button class="btn-ghost btn-sm" id="btn-add-row">+ Añadir fila</button>

      <div class="save-actions">
        <button class="btn-primary btn-full" id="btn-save">💾 Guardar en alacena</button>
      </div>
    </div>
  `;

  wireRowListeners(container.querySelector("#p-tbody"));

  container.querySelector("#btn-add-row").addEventListener("click", () => {
    const tbody = container.querySelector("#p-tbody");
    const tr = document.createElement("tr");
    tr.innerHTML = buildRow(Date.now(), { nombre: "", cantidad: 1, unidad: "unidades", precio: 0 });
    tbody.appendChild(tr);
    wireRowListeners(tbody);
    tr.querySelector("input").focus();
  });

  container.querySelector("#btn-save").addEventListener("click", () => saveReceipt(container, navigate));
}

function buildRow(index, p) {
  return `
    <tr data-index="${index}">
      <td><input type="text" class="p-nombre" value="${escHtml(p.nombre || "")}" placeholder="Producto"></td>
      <td><input type="number" class="p-cantidad" value="${p.cantidad ?? 1}" min="0" step="0.1"></td>
      <td><input type="text" class="p-unidad" value="${escHtml(p.unidad || "unidades")}"></td>
      <td><input type="number" class="p-precio" value="${p.precio ?? 0}" step="0.01" min="0"></td>
      <td><button class="btn-remove-row" title="Eliminar">✕</button></td>
    </tr>
  `;
}

function wireRowListeners(tbody) {
  tbody.querySelectorAll(".btn-remove-row").forEach(btn => {
    btn.onclick = () => btn.closest("tr").remove();
  });
}

async function saveReceipt(container, navigate) {
  const fecha = container.querySelector("#r-fecha").value || new Date().toISOString().split("T")[0];
  const total = parseFloat(container.querySelector("#r-total").value) || 0;
  const rows = container.querySelectorAll("#p-tbody tr");

  const lineas = [];
  for (const row of rows) {
    const nombre = row.querySelector(".p-nombre").value.trim();
    if (!nombre) continue;
    lineas.push({
      nombre,
      cantidad: parseFloat(row.querySelector(".p-cantidad").value) || 0,
      unidad: row.querySelector(".p-unidad").value.trim() || "unidades",
      precio: parseFloat(row.querySelector(".p-precio").value) || 0
    });
  }

  if (lineas.length === 0) {
    showToast("No hay productos para guardar", "error");
    return;
  }

  const saveBtn = container.querySelector("#btn-save");
  saveBtn.disabled = true;
  saveBtn.textContent = "Guardando…";

  try {
    const lineasConId = [];
    for (const linea of lineas) {
      const productId = await addProduct(linea.nombre, linea.unidad);
      await ensureStockEntry(productId, linea.cantidad);
      if (linea.precio > 0) {
        await addPriceRecord(productId, linea.precio, fecha, null);
      }
      lineasConId.push({ ...linea, productId });
    }

    const receiptId = await addReceipt({
      fecha,
      total,
      hasImage: true,
      lineas: lineasConId
    });

    // Backfill receiptId on price records (best-effort, non-blocking)
    // Omitted for alpha simplicity

    showToast("Factura guardada correctamente ✓", "success");
    navigate("pantry");
  } catch (err) {
    showToast(`Error al guardar: ${err.message}`, "error");
    saveBtn.disabled = false;
    saveBtn.textContent = "💾 Guardar en alacena";
  }
}

function escHtml(str) {
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function showToast(msg, type = "info") {
  const t = document.createElement("div");
  t.className = `toast toast-${type}`;
  t.textContent = msg;
  document.body.appendChild(t);
  setTimeout(() => t.remove(), 3500);
}
