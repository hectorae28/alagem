// SPA router — no build step, pure ES modules

const SCREENS = {
  pantry:   { title: "Alacena",   tab: "pantry" },
  scan:     { title: "Escanear",  tab: "scan" },
  product:  { title: "Producto",  tab: "pantry", back: true },
  receipts: { title: "Facturas",  tab: "receipts" },
  prices:   { title: "Precios",   tab: "prices" }
};

let currentScreen = "pantry";
let currentParams = {};
let navHistory = [];

const screenContent = document.getElementById("screen-content");
const screenTitle  = document.getElementById("screen-title");
const btnBack      = document.getElementById("btn-back");
const bottomNav    = document.getElementById("bottom-nav");

// Bottom nav clicks
bottomNav.querySelectorAll(".nav-btn").forEach(btn => {
  btn.addEventListener("click", () => {
    navHistory = [];
    navigate(btn.dataset.screen);
  });
});

// Back button
btnBack.addEventListener("click", () => {
  if (navHistory.length > 0) {
    const prev = navHistory.pop();
    navigateInternal(prev.screen, prev.params, false);
  }
});

export function navigate(screen, params = {}) {
  if (screen !== currentScreen || screen === "pantry") {
    navHistory.push({ screen: currentScreen, params: currentParams });
  }
  navigateInternal(screen, params, true);
}

function navigateInternal(screen, params, pushToHistory) {
  if (!SCREENS[screen]) {
    console.warn("Unknown screen:", screen);
    return;
  }

  currentScreen = screen;
  currentParams = params;

  const meta = SCREENS[screen];
  screenTitle.textContent = meta.title;

  btnBack.classList.toggle("hidden", !meta.back && navHistory.length === 0);

  // Update bottom nav active state
  bottomNav.querySelectorAll(".nav-btn").forEach(btn => {
    btn.classList.toggle("active", btn.dataset.screen === meta.tab);
  });

  screenContent.innerHTML = "";
  loadScreen(screen, params);
}

async function loadScreen(screen, params) {
  try {
    const mod = await import(`./screens/${screen}.js`);
    await mod.render(screenContent, params, navigate);
  } catch (err) {
    screenContent.innerHTML = `
      <div class="error">
        <strong>Error al cargar la pantalla "${screen}"</strong><br>
        ${err.message}
      </div>
    `;
    console.error(err);
  }
}

// Boot
navigate("pantry");
