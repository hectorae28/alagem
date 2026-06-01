// ============================================================================
// PANTALLA: DETALLE DE PRODUCTO
// ============================================================================
import { getProductDetail, setStockQuantity, consume, portionProduct } from "../db.js";

const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const fmtQty = (q) => (Number.isInteger(q) ? q : Number(q).toFixed(q < 1 ? 2 : 1));
const fmtMoney = (n) => (n == null ? "—" : Number(n).toFixed(2) + " €");
const fmtDate = (d) => new Date(d + "T00:00:00").toLocaleDateString("es-ES", { day: "2-digit", month: "short", year: "numeric" });

export async function render(ctx) {
  const id = ctx.params.id;
  ctx.setHeader({ title: "Producto", back: "pantry" });
  ctx.mount.innerHTML = `<div class="loading">Cargando…</div>`;

  const d = await getProductDetail(id);
  if (!d.product) {
    ctx.mount.innerHTML = `<div class="screen-pad"><div class="empty"><p>Producto no encontrado.</p></div></div>`;
    return;
  }
  ctx.setHeader({ title: d.product.name, back: "pantry" });

  const prices = d.prices;
  const minP = prices.length ? Math.min(...prices.map((p) => p.price)) : 0;
  const maxP = prices.length ? Math.max(...prices.map((p) => p.price)) : 1;

  ctx.mount.innerHTML = `
    <div class="screen-pad">
      <div class="detail-stock">
        <div class="ds-label">En la alacena</div>
        <div class="ds-stepper">
          <button class="step-btn" id="dec">−</button>
          <div class="ds-qty"><span id="qty-val">${fmtQty(d.quantity)}</span> <span class="ds-unit">${esc(d.unit)}</span></div>
          <button class="step-btn" id="inc">＋</button>
        </div>
        <div class="ds-set">
          <input type="number" id="set-qty" inputmode="decimal" step="0.1" min="0" value="${d.quantity}" />
          <button class="btn-ghost sm" id="set-btn">Fijar cantidad</button>
        </div>
      </div>

      <div class="card portion-card">
        <div>
          <div class="card-title">Porcionar</div>
          <div class="muted sm">Divide este producto en raciones para congelar o repartir. El stock actual pasará a 0.</div>
        </div>
        <div class="portion-controls">
          <input type="number" id="portion-n" inputmode="numeric" min="1" step="1" value="4" />
          <span class="muted sm">porciones</span>
          <button class="btn-secondary sm" id="portion-btn">Porcionar</button>
        </div>
      </div>

      <div class="prices-section">
        <div class="result-head">
          <h3>Historial de precios</h3>
          ${prices.length ? `<span class="muted">${prices.length} registros</span>` : ""}
        </div>
        ${prices.length ? renderChart(prices, minP, maxP) : ""}
        <div class="price-history">
          ${
            prices.length
              ? prices
                  .slice()
                  .reverse()
                  .map(
                    (p) => `
              <div class="ph-row">
                <div class="ph-date">${fmtDate(p.date)}</div>
                <div class="ph-price">${fmtMoney(p.price)}<span class="ph-unit">/${esc(p.unit)}</span></div>
                <div class="ph-change ${p.change == null ? "" : p.change > 0 ? "up" : p.change < 0 ? "down" : ""}">
                  ${p.change == null ? "—" : (p.change > 0 ? "▲ " : p.change < 0 ? "▼ " : "") + Math.abs(p.change).toFixed(1) + "%"}
                </div>
              </div>`
                  )
                  .join("")
              : `<div class="empty sm"><p class="muted">Aún no hay precios para este producto.</p></div>`
          }
        </div>
      </div>
    </div>
  `;

  const qtyVal = ctx.mount.querySelector("#qty-val");
  const refresh = () => render(ctx);

  ctx.mount.querySelector("#inc").addEventListener("click", async () => {
    await setStockQuantity(id, (d.quantity || 0) + 1);
    refresh();
  });
  ctx.mount.querySelector("#dec").addEventListener("click", async () => {
    await consume(id, 1);
    refresh();
  });
  ctx.mount.querySelector("#set-btn").addEventListener("click", async () => {
    const v = ctx.mount.querySelector("#set-qty").value;
    await setStockQuantity(id, v);
    refresh();
  });
  ctx.mount.querySelector("#portion-btn").addEventListener("click", async () => {
    const n = parseInt(ctx.mount.querySelector("#portion-n").value, 10) || 0;
    if (n < 1) return;
    if (!confirm(`Se creará "${d.product.name} (porción)" con ${n} porciones y el stock actual pasará a 0. ¿Continuar?`)) return;
    const newId = await portionProduct(id, n);
    ctx.navigate("product", { id: newId });
  });
}

function renderChart(prices, minP, maxP) {
  const range = maxP - minP || 1;
  const pad = range * 0.15;
  const lo = minP - pad;
  const hi = maxP + pad;
  const W = 100, H = 40;
  const pts = prices.map((p, i) => {
    const x = prices.length === 1 ? W / 2 : (i / (prices.length - 1)) * W;
    const y = H - ((p.price - lo) / (hi - lo)) * H;
    return { x, y, p };
  });
  const line = pts.map((pt) => `${pt.x.toFixed(1)},${pt.y.toFixed(1)}`).join(" ");
  const area = `0,${H} ` + line + ` ${W},${H}`;
  return `
    <div class="spark-wrap">
      <svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" class="spark">
        <polygon points="${area}" fill="url(#g)" opacity="0.18"></polygon>
        <polyline points="${line}" fill="none" stroke="var(--primary)" stroke-width="1.4" stroke-linejoin="round" stroke-linecap="round" vector-effect="non-scaling-stroke"></polyline>
        ${pts.map((pt) => `<circle cx="${pt.x.toFixed(1)}" cy="${pt.y.toFixed(1)}" r="1.6" fill="var(--primary)" vector-effect="non-scaling-stroke"></circle>`).join("")}
        <defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="var(--primary)"/><stop offset="1" stop-color="var(--primary)" stop-opacity="0"/></linearGradient></defs>
      </svg>
      <div class="spark-labels"><span>${fmtMoney(minP)}</span><span>${fmtMoney(maxP)}</span></div>
    </div>`;
}
