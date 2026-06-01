import { getAllPricesGrouped } from "../db.js";

export async function render(container, _params, navigate) {
  container.innerHTML = `<div class="loading">Cargando historial…</div>`;

  try {
    const groups = await getAllPricesGrouped();
    renderGroups(container, groups, navigate);
  } catch (err) {
    container.innerHTML = `<div class="error">Error al cargar: ${err.message}</div>`;
  }
}

function renderGroups(container, groups, navigate) {
  if (groups.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">🔍</div>
        <p>Sin historial de precios</p>
        <p class="empty-hint">Escanea facturas para comparar precios a lo largo del tiempo</p>
        <button class="btn-primary" id="btn-go-scan">📷 Escanear factura</button>
      </div>
    `;
    container.querySelector("#btn-go-scan").addEventListener("click", () => navigate("scan"));
    return;
  }

  const totalProducts = groups.length;
  const totalRecords = groups.reduce((acc, g) => acc + g.records.length, 0);

  container.innerHTML = `
    <div class="list-header">
      <span class="list-count">${totalProducts} producto${totalProducts !== 1 ? "s" : ""} · ${totalRecords} registro${totalRecords !== 1 ? "s" : ""}</span>
    </div>
    <div class="prices-list">
      ${groups.map(g => renderGroup(g)).join("")}
    </div>
  `;
}

function renderGroup(group) {
  const { product, records } = group;
  const name = product?.nombre ?? "Producto desconocido";
  const unit = product?.unidad ?? "";

  const rows = records.map((r, i) => {
    let varHtml = "";
    if (i > 0) {
      const prev = records[i - 1].precio;
      const curr = r.precio;
      if (prev > 0) {
        const pct = ((curr - prev) / prev) * 100;
        const sign = pct >= 0 ? "+" : "";
        const cls = pct > 0 ? "price-up" : pct < 0 ? "price-down" : "price-same";
        varHtml = `<span class="price-var ${cls}">${sign}${pct.toFixed(1)}%</span>`;
      }
    }
    return `
      <tr>
        <td class="price-date">${r.fecha}</td>
        <td class="price-value">$${r.precio.toFixed(2)}</td>
        <td>${varHtml}</td>
      </tr>
    `;
  });

  const latest = records[records.length - 1];
  const first = records[0];
  let trendHtml = "";
  if (records.length > 1 && first.precio > 0) {
    const total = ((latest.precio - first.precio) / first.precio) * 100;
    const sign = total >= 0 ? "+" : "";
    const cls = total > 0 ? "price-up" : total < 0 ? "price-down" : "price-same";
    trendHtml = `<span class="product-trend ${cls}">${sign}${total.toFixed(1)}% total</span>`;
  }

  return `
    <div class="price-group">
      <div class="price-group-header">
        <div>
          <span class="price-product-name">${escHtml(name)}</span>
          <span class="price-product-unit">${escHtml(unit)}</span>
        </div>
        ${trendHtml}
      </div>
      <table class="price-table">
        <thead>
          <tr><th>Fecha</th><th>Precio</th><th>Variación</th></tr>
        </thead>
        <tbody>
          ${rows.join("")}
        </tbody>
      </table>
    </div>
  `;
}

function escHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}
