// ============================================================================
// PANTALLA: ALACENA (inventario)
// ============================================================================
import { getPantry, consume, addProductWithStock } from "../db.js";
import { icon } from "../icons.js";

const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const fmtQty = (q) => (Number.isInteger(q) ? q : Number(q).toFixed(q < 1 ? 2 : 1));
const fmtMoney = (n) => (n == null ? "—" : n.toFixed(2) + " €");

export async function render(ctx) {
  ctx.setHeader({ title: "Alacena", back: null });
  ctx.mount.innerHTML = `<div class="loading">Cargando inventario…</div>`;

  const items = await getPantry();
  const low = items.filter((i) => i.quantity === 0);

  ctx.mount.innerHTML = `
    <div class="screen-pad">
      <div class="pantry-summary">
        <div class="stat">
          <span class="stat-num">${items.length}</span>
          <span class="stat-label">productos</span>
        </div>
        <div class="stat">
          <span class="stat-num ${low.length ? "warn" : ""}">${low.length}</span>
          <span class="stat-label">agotados</span>
        </div>
      </div>

      <button class="btn-primary block" id="add-product"><span class="btn-ic">＋</span> Añadir producto</button>

      <div class="list" id="pantry-list"></div>
    </div>

    <div class="sheet-backdrop" id="add-sheet" hidden>
      <div class="sheet">
        <div class="sheet-handle"></div>
        <h3>Nuevo producto</h3>
        <label class="field">
          <span>Nombre</span>
          <input id="np-name" type="text" placeholder="p.ej. Leche entera" autocomplete="off" />
        </label>
        <div class="field-row">
          <label class="field">
            <span>Cantidad</span>
            <input id="np-qty" type="number" inputmode="decimal" value="1" min="0" step="0.1" />
          </label>
          <label class="field">
            <span>Unidad</span>
            <input id="np-unit" type="text" placeholder="ud, kg, L…" value="ud" />
          </label>
        </div>
        <div class="sheet-actions">
          <button class="btn-ghost" id="np-cancel">Cancelar</button>
          <button class="btn-primary" id="np-save">Guardar</button>
        </div>
      </div>
    </div>
  `;

  const listEl = ctx.mount.querySelector("#pantry-list");
  renderList(items, listEl, ctx);

  // --- Hoja "añadir producto" ---
  const sheet = ctx.mount.querySelector("#add-sheet");
  const openSheet = () => { sheet.hidden = false; ctx.mount.querySelector("#np-name").focus(); };
  const closeSheet = () => { sheet.hidden = true; };
  ctx.mount.querySelector("#add-product").addEventListener("click", openSheet);
  ctx.mount.querySelector("#np-cancel").addEventListener("click", closeSheet);
  sheet.addEventListener("click", (e) => { if (e.target === sheet) closeSheet(); });
  ctx.mount.querySelector("#np-save").addEventListener("click", async () => {
    const name = ctx.mount.querySelector("#np-name").value.trim();
    if (!name) return;
    const quantity = ctx.mount.querySelector("#np-qty").value;
    const unit = ctx.mount.querySelector("#np-unit").value.trim() || "ud";
    await addProductWithStock({ name, unit, quantity });
    closeSheet();
    render(ctx);
  });
}

function renderList(items, listEl, ctx) {
  if (!items.length) {
    listEl.innerHTML = `<div class="empty">
      <div class="empty-icon">${icon("basket", 30)}</div>
      <p>Tu alacena está vacía.</p>
      <p class="muted">Añade productos o escanea una factura.</p>
    </div>`;
    return;
  }

  listEl.innerHTML = items
    .map(
      (it) => `
    <div class="row" data-id="${it.productId}">
      <div class="row-main" data-go="${it.productId}">
        <div class="row-title">${esc(it.name)}</div>
        <div class="row-sub">${it.lastPrice != null ? "Últ. " + fmtMoney(it.lastPrice) + " / " + esc(it.unit) : "Sin precio registrado"}</div>
      </div>
      <div class="row-qty ${it.quantity === 0 ? "out" : ""}">
        ${it.quantity === 0 ? `<span class="badge-out">agotado</span>` : `<span class="qty-num">${fmtQty(it.quantity)}</span><span class="qty-unit">${esc(it.unit)}</span>`}
      </div>
      <button class="consume-btn" data-consume="${it.productId}" ${it.quantity === 0 ? "disabled" : ""} aria-label="Consumir uno">−</button>
    </div>`
    )
    .join("");

  listEl.querySelectorAll("[data-go]").forEach((el) =>
    el.addEventListener("click", () => ctx.navigate("product", { id: el.getAttribute("data-go") }))
  );
  listEl.querySelectorAll("[data-consume]").forEach((el) =>
    el.addEventListener("click", async (e) => {
      e.stopPropagation();
      await consume(el.getAttribute("data-consume"), 1);
      render(ctx);
    })
  );
}
