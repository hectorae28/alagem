import {
  getProductById,
  getStockByProductId,
  updateStock,
  getPriceHistory,
  porcionar
} from "../db.js";

export async function render(container, params, navigate) {
  const { productId, stockId } = params || {};

  if (!productId) {
    container.innerHTML = `<div class="error">Parámetros incorrectos</div>`;
    return;
  }

  container.innerHTML = `<div class="loading">Cargando producto…</div>`;

  try {
    const [product, stock, prices] = await Promise.all([
      getProductById(productId),
      stockId ? getStockByProductId(productId) : getStockByProductId(productId),
      getPriceHistory(productId)
    ]);

    if (!product) {
      container.innerHTML = `<div class="error">Producto no encontrado</div>`;
      return;
    }

    const currentStock = stock ?? { quantity: 0 };
    const lastPrice = prices.length ? prices[prices.length - 1] : null;

    container.innerHTML = `
      <div class="product-screen">
        <div class="product-header">
          <h2 class="product-title">${product.nombre}</h2>
          <span class="product-unit">${product.unidad}</span>
        </div>

        <div class="card">
          <h3>Stock actual</h3>
          <div class="qty-editor">
            <button class="btn-qty btn-minus" id="qty-minus">−</button>
            <input type="number" id="qty-input" class="qty-big" value="${currentStock.quantity}" min="0" step="0.5">
            <button class="btn-qty btn-plus" id="qty-plus">+</button>
          </div>
          <button class="btn-primary btn-sm" id="btn-save-qty">Guardar cantidad</button>
        </div>

        ${lastPrice ? `
          <div class="card">
            <h3>Último precio registrado</h3>
            <p class="price-big">$${lastPrice.precio.toFixed(2)} <span class="price-date">(${lastPrice.fecha})</span></p>
          </div>
        ` : ""}

        <div class="card">
          <h3>Porcionar producto</h3>
          <p class="hint">Convierte el stock actual en porciones individuales</p>
          <button class="btn-secondary btn-sm" id="btn-porcionar">✂️ Porcionar</button>
        </div>

        <div class="card">
          <h3>Historial de precios</h3>
          ${renderPriceHistory(prices)}
        </div>
      </div>
    `;

    // Stock controls
    const qtyInput = container.querySelector("#qty-input");

    container.querySelector("#qty-minus").addEventListener("click", () => {
      const v = Math.max(0, parseFloat(qtyInput.value || 0) - 1);
      qtyInput.value = v;
    });

    container.querySelector("#qty-plus").addEventListener("click", () => {
      qtyInput.value = parseFloat(qtyInput.value || 0) + 1;
    });

    container.querySelector("#btn-save-qty").addEventListener("click", async () => {
      const qty = parseFloat(qtyInput.value) || 0;
      try {
        const s = stock ?? await getStockByProductId(productId);
        if (s) {
          await updateStock(s.id, qty);
        }
        showToast("Stock actualizado ✓", "success");
      } catch (err) {
        showToast(`Error: ${err.message}`, "error");
      }
    });

    // Porcionar
    container.querySelector("#btn-porcionar").addEventListener("click", () => {
      showPorcionarModal(product, stock, navigate);
    });

  } catch (err) {
    container.innerHTML = `<div class="error">Error: ${err.message}</div>`;
  }
}

function renderPriceHistory(prices) {
  if (prices.length === 0) {
    return `<p class="hint">Sin registros de precio</p>`;
  }

  return `
    <ul class="price-history-list">
      ${prices
        .map((p, i) => {
          let variacion = "";
          if (i > 0) {
            const diff = ((p.precio - prices[i - 1].precio) / prices[i - 1].precio) * 100;
            const sign = diff >= 0 ? "+" : "";
            const cls = diff > 0 ? "price-up" : diff < 0 ? "price-down" : "";
            variacion = `<span class="price-var ${cls}">${sign}${diff.toFixed(1)}%</span>`;
          }
          return `
            <li class="price-record">
              <span class="price-date">${p.fecha}</span>
              <span class="price-value">$${p.precio.toFixed(2)}</span>
              ${variacion}
            </li>
          `;
        })
        .join("")}
    </ul>
  `;
}

function showPorcionarModal(product, stock, navigate) {
  const overlay = document.createElement("div");
  overlay.className = "modal-overlay";
  overlay.innerHTML = `
    <div class="modal">
      <h2>Porcionar: ${product.nombre}</h2>
      <p class="hint">El stock actual se pondrá a 0 y se creará un nuevo producto con el nombre indicado.</p>
      <div class="form-group">
        <label>Nombre de la porción</label>
        <input type="text" id="p-nombre" value="${product.nombre} (porción)">
      </div>
      <div class="form-group">
        <label>Unidad de la porción</label>
        <input type="text" id="p-unidad" value="porciones">
      </div>
      <div class="form-group">
        <label>Número de porciones</label>
        <input type="number" id="p-num" value="4" min="1">
      </div>
      <div class="modal-actions">
        <button class="btn-secondary" id="p-cancel">Cancelar</button>
        <button class="btn-primary" id="p-confirm">Confirmar</button>
      </div>
    </div>
  `;

  document.body.appendChild(overlay);

  const close = () => overlay.remove();
  overlay.querySelector("#p-cancel").addEventListener("click", close);
  overlay.addEventListener("click", e => { if (e.target === overlay) close(); });

  overlay.querySelector("#p-confirm").addEventListener("click", async () => {
    const porcionNombre = overlay.querySelector("#p-nombre").value.trim();
    const porcionUnidad = overlay.querySelector("#p-unidad").value.trim() || "porciones";
    const numeroPorciones = parseInt(overlay.querySelector("#p-num").value, 10) || 1;

    if (!porcionNombre) {
      overlay.querySelector("#p-nombre").classList.add("input-error");
      return;
    }

    const btn = overlay.querySelector("#p-confirm");
    btn.disabled = true;
    btn.textContent = "Porcionando…";

    try {
      const s = stock ?? await import("../db.js").then(m => m.getStockByProductId(product.id));
      if (!s) throw new Error("No se encontró el stock del producto");
      await porcionar(s.id, porcionNombre, porcionUnidad, numeroPorciones);
      close();
      showToast(`Porcionado en ${numeroPorciones} ${porcionUnidad} ✓`, "success");
      navigate("pantry");
    } catch (err) {
      showToast(`Error: ${err.message}`, "error");
      btn.disabled = false;
      btn.textContent = "Confirmar";
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
