import { getStock, updateStock, addProduct, ensureStockEntry } from "../db.js";

export async function render(container, params, navigate) {
  container.innerHTML = `<div class="loading">Cargando alacena…</div>`;

  try {
    const stock = await getStock();
    renderList(container, stock, navigate);
  } catch (err) {
    container.innerHTML = `<div class="error">Error al cargar: ${err.message}</div>`;
  }
}

function renderList(container, stock, navigate) {
  if (stock.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">🛒</div>
        <p>Tu alacena está vacía</p>
        <p class="empty-hint">Escanea una factura o añade productos manualmente</p>
        <button class="btn-primary" id="btn-add">+ Añadir producto</button>
      </div>
    `;
  } else {
    container.innerHTML = `
      <div class="list-header">
        <span class="list-count">${stock.length} producto${stock.length !== 1 ? "s" : ""}</span>
        <button class="btn-primary btn-sm" id="btn-add">+ Añadir</button>
      </div>
      <div class="stock-list" id="stock-list">
        ${stock
          .map(
            item => `
          <div class="stock-item" data-stock-id="${item.id}" data-product-id="${item.productId}">
            <div class="stock-info">
              <span class="stock-name">${item.product?.nombre ?? "Sin nombre"}</span>
              <span class="stock-unit">${item.product?.unidad ?? ""}</span>
            </div>
            <div class="stock-controls">
              <button class="btn-qty btn-minus" data-id="${item.id}" data-qty="${item.quantity}">−</button>
              <span class="stock-qty${item.quantity <= (item.minQuantity ?? 1) ? " low-stock" : ""}">${item.quantity}</span>
              <button class="btn-qty btn-plus" data-id="${item.id}" data-qty="${item.quantity}">+</button>
              <button class="btn-detail" data-stock-id="${item.id}" data-product-id="${item.productId}" title="Ver detalle">›</button>
            </div>
          </div>
        `
          )
          .join("")}
      </div>
    `;
  }

  container.querySelector("#btn-add")?.addEventListener("click", () => showAddModal(navigate));

  container.querySelectorAll(".btn-minus").forEach(btn => {
    btn.addEventListener("click", async e => {
      const id = e.currentTarget.dataset.id;
      const qty = Math.max(0, parseInt(e.currentTarget.dataset.qty, 10) - 1);
      try {
        await updateStock(id, qty);
        const stock = await getStock();
        renderList(container, stock, navigate);
      } catch (err) {
        showToast(`Error: ${err.message}`, "error");
      }
    });
  });

  container.querySelectorAll(".btn-plus").forEach(btn => {
    btn.addEventListener("click", async e => {
      const id = e.currentTarget.dataset.id;
      const qty = parseInt(e.currentTarget.dataset.qty, 10) + 1;
      try {
        await updateStock(id, qty);
        const stock = await getStock();
        renderList(container, stock, navigate);
      } catch (err) {
        showToast(`Error: ${err.message}`, "error");
      }
    });
  });

  container.querySelectorAll(".btn-detail").forEach(btn => {
    btn.addEventListener("click", e => {
      navigate("product", {
        stockId: e.currentTarget.dataset.stockId,
        productId: e.currentTarget.dataset.productId
      });
    });
  });
}

function showAddModal(navigate) {
  const overlay = document.createElement("div");
  overlay.className = "modal-overlay";
  overlay.innerHTML = `
    <div class="modal">
      <h2>Añadir producto</h2>
      <div class="form-group">
        <label>Nombre *</label>
        <input type="text" id="m-nombre" placeholder="Ej: Arroz" autocomplete="off">
      </div>
      <div class="form-group">
        <label>Unidad</label>
        <input type="text" id="m-unidad" placeholder="Ej: kg, L, unidades">
      </div>
      <div class="form-group">
        <label>Cantidad inicial</label>
        <input type="number" id="m-cantidad" value="1" min="0" step="0.5">
      </div>
      <div class="modal-actions">
        <button class="btn-secondary" id="m-cancel">Cancelar</button>
        <button class="btn-primary" id="m-save">Guardar</button>
      </div>
    </div>
  `;

  document.body.appendChild(overlay);
  overlay.querySelector("#m-nombre").focus();

  const close = () => overlay.remove();

  overlay.querySelector("#m-cancel").addEventListener("click", close);
  overlay.addEventListener("click", e => { if (e.target === overlay) close(); });

  overlay.querySelector("#m-save").addEventListener("click", async () => {
    const nombre = overlay.querySelector("#m-nombre").value.trim();
    const unidad = overlay.querySelector("#m-unidad").value.trim() || "unidades";
    const cantidad = parseFloat(overlay.querySelector("#m-cantidad").value) || 0;

    if (!nombre) {
      overlay.querySelector("#m-nombre").classList.add("input-error");
      return;
    }

    const saveBtn = overlay.querySelector("#m-save");
    saveBtn.disabled = true;
    saveBtn.textContent = "Guardando…";

    try {
      const productId = await addProduct(nombre, unidad);
      await ensureStockEntry(productId, cantidad);
      close();
      navigate("pantry");
    } catch (err) {
      showToast(`Error: ${err.message}`, "error");
      saveBtn.disabled = false;
      saveBtn.textContent = "Guardar";
    }
  });
}

function showToast(msg, type = "info") {
  const t = document.createElement("div");
  t.className = `toast toast-${type}`;
  t.textContent = msg;
  document.body.appendChild(t);
  setTimeout(() => t.remove(), 3500);
}
