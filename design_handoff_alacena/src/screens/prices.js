// ============================================================================
// PANTALLA: PRECIOS (historial cronológico por producto)
// ============================================================================
import { getAllPriceHistory } from "../db.js";
import { icon } from "../icons.js";

const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const fmtMoney = (n) => (n == null ? "—" : Number(n).toFixed(2) + " €");
const fmtDate = (d) => new Date(d + "T00:00:00").toLocaleDateString("es-ES", { day: "2-digit", month: "short", year: "2-digit" });

export async function render(ctx) {
  ctx.setHeader({ title: "Precios", back: null });
  ctx.mount.innerHTML = `<div class="loading">Cargando precios…</div>`;

  let groups = await getAllPriceHistory();

  if (!groups.length) {
    ctx.mount.innerHTML = `<div class="screen-pad"><div class="empty">
      <div class="empty-icon">${icon("tag", 30)}</div>
      <p>Aún no hay precios registrados.</p>
      <p class="muted">Escanea facturas para empezar a comparar.</p>
    </div></div>`;
    return;
  }

  ctx.mount.innerHTML = `
    <div class="screen-pad">
      <div class="search-bar">
        <input type="text" id="price-search" placeholder="Buscar producto…" autocomplete="off" />
      </div>
      <div class="list" id="price-list"></div>
    </div>
  `;

  const listEl = ctx.mount.querySelector("#price-list");
  const draw = (filter) => {
    const f = (filter || "").toLowerCase().trim();
    const shown = f ? groups.filter((g) => g.productName.toLowerCase().includes(f)) : groups;
    listEl.innerHTML = shown.map(cardHtml).join("") || `<div class="empty sm"><p class="muted">Sin resultados.</p></div>`;
    listEl.querySelectorAll("[data-go]").forEach((el) =>
      el.addEventListener("click", () => ctx.navigate("product", { id: el.getAttribute("data-go") }))
    );
  };
  draw("");
  ctx.mount.querySelector("#price-search").addEventListener("input", (e) => draw(e.target.value));
}

function cardHtml(g) {
  const trendClass = g.totalChange == null ? "" : g.totalChange > 0.5 ? "up" : g.totalChange < -0.5 ? "down" : "flat";
  const trendTxt =
    g.totalChange == null
      ? "—"
      : (g.totalChange > 0 ? "▲ " : g.totalChange < 0 ? "▼ " : "") + Math.abs(g.totalChange).toFixed(1) + "%";

  return `
    <div class="price-card" data-go="${g.productId}">
      <div class="pc-head">
        <div>
          <div class="pc-name">${esc(g.productName)}</div>
          <div class="muted sm">${g.count} registro${g.count !== 1 ? "s" : ""} · /${esc(g.unit)}</div>
        </div>
        <div class="pc-right">
          <div class="pc-latest">${fmtMoney(g.latest)}</div>
          <div class="pc-trend ${trendClass}">${trendTxt}</div>
        </div>
      </div>
      <div class="pc-timeline">
        ${g.entries
          .map(
            (e, i) => `
          <div class="tl-item">
            <span class="tl-dot ${i === 0 ? "latest" : ""}"></span>
            <span class="tl-date">${fmtDate(e.date)}</span>
            <span class="tl-price">${fmtMoney(e.price)}</span>
            <span class="tl-change ${e.change == null ? "" : e.change > 0 ? "up" : e.change < 0 ? "down" : ""}">
              ${e.change == null ? "" : (e.change > 0 ? "+" : "") + e.change.toFixed(1) + "%"}
            </span>
          </div>`
          )
          .join("")}
      </div>
    </div>`;
}
