// ============================================================================
// PANTALLA: FACTURAS
// ============================================================================
import { getReceipts, deleteReceipt } from "../db.js";
import { icon } from "../icons.js";

const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const fmtMoney = (n) => (n == null ? "—" : Number(n).toFixed(2) + " €");
const fmtQty = (q) => (Number.isInteger(q) ? q : Number(q).toFixed(1));
const fmtDate = (d) => new Date(d + "T00:00:00").toLocaleDateString("es-ES", { weekday: "short", day: "2-digit", month: "long", year: "numeric" });

export async function render(ctx) {
  ctx.setHeader({ title: "Facturas", back: null });
  ctx.mount.innerHTML = `<div class="loading">Cargando facturas…</div>`;

  const receipts = await getReceipts();

  if (!receipts.length) {
    ctx.mount.innerHTML = `<div class="screen-pad"><div class="empty">
      <div class="empty-icon">${icon("receipt", 30)}</div>
      <p>Todavía no has guardado facturas.</p>
      <button class="btn-primary" id="go-scan">Escanear una factura</button>
    </div></div>`;
    ctx.mount.querySelector("#go-scan").addEventListener("click", () => ctx.navigate("scan"));
    return;
  }

  ctx.mount.innerHTML = `
    <div class="screen-pad">
      <div class="list receipts">
        ${receipts
          .map(
            (r) => `
          <div class="receipt-card" data-id="${r.id}">
            <div class="receipt-head" data-toggle="${r.id}">
              <div>
                <div class="receipt-store">${esc(r.store || "Compra")}</div>
                <div class="receipt-date muted">${fmtDate(r.date)}</div>
              </div>
              <div class="receipt-total">
                <span>${fmtMoney(r.total)}</span>
                <span class="muted sm">${(r.lines || []).length} art.</span>
              </div>
              <span class="chevron" data-id="${r.id}">▾</span>
            </div>
            <div class="receipt-body" id="body-${r.id}" hidden>
              <div class="receipt-lines">
                ${(r.lines || [])
                  .map(
                    (l) => `
                  <div class="rline">
                    <span class="rline-name">${esc(l.name)}</span>
                    <span class="rline-qty muted">${fmtQty(l.quantity)} ${esc(l.unit)}</span>
                    <span class="rline-price">${fmtMoney(l.price)}</span>
                  </div>`
                  )
                  .join("")}
              </div>
              <button class="btn-ghost danger sm" data-del="${r.id}">Eliminar factura</button>
            </div>
          </div>`
          )
          .join("")}
      </div>
    </div>
  `;

  ctx.mount.querySelectorAll("[data-toggle]").forEach((el) =>
    el.addEventListener("click", () => {
      const id = el.getAttribute("data-toggle");
      const body = ctx.mount.querySelector("#body-" + CSS.escape(id));
      const chev = el.querySelector(".chevron");
      body.hidden = !body.hidden;
      chev.classList.toggle("open", !body.hidden);
    })
  );

  ctx.mount.querySelectorAll("[data-del]").forEach((b) =>
    b.addEventListener("click", async (e) => {
      e.stopPropagation();
      if (!confirm("¿Eliminar esta factura? El stock y los precios ya registrados no se modificarán.")) return;
      await deleteReceipt(b.getAttribute("data-del"));
      render(ctx);
    })
  );
}
