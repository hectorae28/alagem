import { getReceipts, deleteReceipt } from "../db.js";

export async function render(container, _params, navigate) {
  container.innerHTML = `<div class="loading">Cargando facturas…</div>`;

  try {
    const receipts = await getReceipts();
    renderList(container, receipts, navigate);
  } catch (err) {
    container.innerHTML = `<div class="error">Error al cargar: ${err.message}</div>`;
  }
}

function renderList(container, receipts, navigate) {
  if (receipts.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">🧾</div>
        <p>No hay facturas guardadas</p>
        <p class="empty-hint">Escanea una factura para empezar</p>
        <button class="btn-primary" id="btn-go-scan">📷 Escanear factura</button>
      </div>
    `;
    container.querySelector("#btn-go-scan").addEventListener("click", () => navigate("scan"));
    return;
  }

  container.innerHTML = `
    <div class="list-header">
      <span class="list-count">${receipts.length} factura${receipts.length !== 1 ? "s" : ""}</span>
    </div>
    <div class="receipts-list">
      ${receipts
        .map(
          r => `
        <div class="receipt-card" data-id="${r.id}">
          <div class="receipt-card-header">
            <div class="receipt-card-meta">
              <span class="receipt-date">${r.fecha || "Fecha desconocida"}</span>
              <span class="receipt-total">$${(r.total || 0).toFixed(2)}</span>
            </div>
            <div class="receipt-card-actions">
              <button class="btn-expand" data-id="${r.id}" title="Ver líneas">▼</button>
              <button class="btn-delete" data-id="${r.id}" title="Eliminar">🗑</button>
            </div>
          </div>
          <div class="receipt-lines hidden" id="lines-${r.id}">
            ${renderLines(r.lineas || [])}
          </div>
        </div>
      `
        )
        .join("")}
    </div>
  `;

  container.querySelectorAll(".btn-expand").forEach(btn => {
    btn.addEventListener("click", e => {
      const id = e.currentTarget.dataset.id;
      const linesDiv = container.querySelector(`#lines-${id}`);
      const isOpen = !linesDiv.classList.contains("hidden");
      linesDiv.classList.toggle("hidden");
      e.currentTarget.textContent = isOpen ? "▼" : "▲";
    });
  });

  container.querySelectorAll(".btn-delete").forEach(btn => {
    btn.addEventListener("click", async e => {
      const id = e.currentTarget.dataset.id;
      const receipt = receipts.find(r => r.id === id);
      const fecha = receipt?.fecha || "esta factura";

      if (!confirm(`¿Eliminar la factura del ${fecha}?`)) return;

      try {
        await deleteReceipt(id);
        const updated = await getReceipts();
        renderList(container, updated, navigate);
        showToast("Factura eliminada", "success");
      } catch (err) {
        showToast(`Error: ${err.message}`, "error");
      }
    });
  });
}

function renderLines(lineas) {
  if (!lineas || lineas.length === 0) {
    return `<p class="hint no-lines">Sin líneas de detalle</p>`;
  }

  return `
    <table class="lines-table">
      <thead>
        <tr>
          <th>Producto</th>
          <th>Cant.</th>
          <th>Precio</th>
        </tr>
      </thead>
      <tbody>
        ${lineas
          .map(
            l => `
          <tr>
            <td>${escHtml(l.nombre || "")}</td>
            <td>${l.cantidad ?? ""} ${escHtml(l.unidad || "")}</td>
            <td>$${(l.precio || 0).toFixed(2)}</td>
          </tr>
        `
          )
          .join("")}
      </tbody>
    </table>
  `;
}

function escHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function showToast(msg, type = "info") {
  const t = document.createElement("div");
  t.className = `toast toast-${type}`;
  t.textContent = msg;
  document.body.appendChild(t);
  setTimeout(() => t.remove(), 3500);
}
