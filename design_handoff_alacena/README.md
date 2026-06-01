# Handoff: Alacena — Inventario familiar con escaneo de facturas

## Resumen
App web móvil para gestionar la despensa de una familia. Permite llevar el
inventario de productos, escanear facturas de supermercado con IA (Gemini) para
dar de alta compras automáticamente, registrar el histórico de precios de cada
producto y comparar su evolución en el tiempo. Pensada como alpha familiar sin
autenticación (datos compartidos).

## Sobre los archivos de diseño
Los archivos de `src/` de este bundle son una **referencia de diseño construida
en HTML/CSS/JS vanilla** — un prototipo funcional que muestra el aspecto y el
comportamiento previstos, **no** código de producción para copiar tal cual.

La tarea es **recrear estas pantallas en el entorno de tu proyecto** siguiendo
sus patrones y librerías establecidos. Si el proyecto aún no tiene front-end,
elige el framework más adecuado (React, Vue, Svelte…) e implementa allí.

> Nota: el prototipo ya incluye una capa de datos funcional (`db.js`) con dos
> backends (Firestore real + un mock en `localStorage` para modo demo) y un
> cliente de Gemini (`gemini-client.js`). Puedes reaprovechar esa **lógica** como
> guía de la API y los modelos de datos, pero la **UI** debe reconstruirse con
> tus componentes.

## Fidelidad
**Alta fidelidad (hifi).** Colores, tipografía, espaciado e interacciones son
los definitivos. Recrea la UI de forma fiel usando las librerías y patrones de
tu codebase. La paleta es cálida (cocina/despensa): crema, terracota y marrón.

---

## Pantallas / Vistas

La app es una SPA móvil con un marco fijo (máx. 480px de ancho, centrado en
escritorio): barra superior + área de contenido scrollable + barra de
navegación inferior con 4 pestañas.

### Navegación inferior (BottomNav)
- 4 pestañas: **Alacena** (icono casa), **Escanear** (cámara), **Facturas**
  (recibo), **Precios** (etiqueta).
- Fija abajo, fondo blanco translúcido con `backdrop-filter: blur(12px)` y borde
  superior. Altura 66px + safe-area.
- Icono + etiqueta (11px, 600). Pestaña activa en `--primary-dark`, icono se
  eleva 1px. Inactiva en `--muted`.
- Iconos: SVG de línea (stroke `currentColor`, `stroke-width: 1.7`, esquinas
  redondeadas). Sin emojis.

### Barra superior (TopBar)
- Sticky arriba, 56px + safe-area, fondo crema, borde inferior.
- Título en **Bitter 700, 21px**. Botón ← (volver) de 34×34px, fondo
  `--soft`, radio 10px — **solo** visible en pantallas anidadas (detalle de
  producto).

### Banner de modo demo (opcional)
- Solo si no hay Firebase configurado. Fondo `--primary-soft`, texto
  `--primary-dark`, 12.5px/500.

### 1. Alacena (inventario) — `screens/pantry.js`
- **Propósito**: ver y gestionar el stock.
- **Layout**:
  - Resumen: 2 tarjetas en fila (`gap:12px`) — nº de productos y nº de agotados.
    Número en **Bitter 700, 30px**; etiqueta 12.5px `--muted`. Agotados usa
    `--primary-dark` si > 0.
  - Botón primario ancho "＋ Añadir producto".
  - Lista de filas (`gap:10px`). Cada fila: nombre (15px/600) + subtítulo
    (último precio o "Sin precio registrado", 12.5px `--muted`) · cantidad
    (Bitter 700, 19px + unidad 11.5px) o badge "AGOTADO" (píldora roja suave) ·
    botón redondo "−" (38px) para consumir 1.
  - Orden: agotados primero, luego alfabético.
- **Interacciones**: tocar la fila → detalle de producto. Botón "−" → consume 1
  (deshabilitado si stock 0). Botón "Añadir" abre **bottom sheet**.
- **Bottom sheet "Nuevo producto"**: sube desde abajo (`slideup .25s`), backdrop
  oscuro. Campos: Nombre, Cantidad, Unidad. Botones Cancelar / Guardar.

### 2. Escanear factura — `screens/scan.js`
- **Propósito**: subir/fotografiar una factura → IA extrae líneas → revisar →
  guardar.
- **Layout**:
  - (Modo demo) aviso `--primary-soft`.
  - **Dropzone**: borde discontinuo `2px dashed #d9c39e`, icono recibo
    (`--primary`), título 15px/600, subtítulo `--muted`. Acepta `image/*` con
    `capture="environment"`. Al subir se vuelve compacta (fila).
  - Preview de la imagen (máx. 200px alto).
  - Estado de carga: spinner + "Analizando factura con IA…".
  - **Tabla editable**: meta-fila (Fecha tipo date, Tienda) · tarjetas de línea
    (Nombre arriba; fila de Cantidad / Unidad / Precio con sufijo €/ botón ✕) ·
    botón "＋ Añadir línea" · fila Total (input alineado a la derecha, Bitter
    700) · botón primario grande "Guardar en la alacena".
- **Interacciones**: editar cualquier campo, añadir/eliminar líneas. Guardar →
  navega a Facturas.

### 3. Detalle de producto — `screens/product.js`
- **Propósito**: ajustar stock, porcionar y ver el histórico de precios.
- **Layout**:
  - **Tarjeta de stock**: etiqueta "EN LA ALACENA", stepper grande (− / número
    Bitter 38px + unidad / ＋), botones redondos 46px en `--primary-soft`.
    Debajo: input + botón "Fijar cantidad".
  - **Tarjeta Porcionar**: explicación + input nº porciones + botón secundario
    "Porcionar". (Divide el producto: stock actual → 0 y crea
    "{nombre} (porción)").
  - **Histórico de precios**: gráfico sparkline SVG (área + línea + puntos en
    `--primary`) con etiquetas min/max; debajo lista cronológica: fecha ·
    precio (Bitter) · variación % (▲ rojo si sube, ▼ verde si baja).

### 4. Facturas — `screens/receipts.js`
- **Propósito**: ver facturas guardadas y sus líneas.
- **Layout**: tarjetas expandibles. Cabecera: tienda (700) + fecha
  (`--muted`, capitalizada) + total (Bitter 17px) + nº artículos + chevron que
  rota al abrir. Cuerpo: líneas (nombre / cantidad·unidad / precio) separadas
  por borde discontinuo + botón fantasma rojo "Eliminar factura".
- **Estado vacío**: icono recibo + CTA "Escanear una factura".

### 5. Precios — `screens/prices.js`
- **Propósito**: comparar la evolución de precios por producto.
- **Layout**: buscador arriba (filtra por nombre). Tarjetas por producto:
  cabecera con nombre + nº registros + último precio (Bitter 18px) + tendencia
  total % (▲ rojo / ▼ verde). Línea de tiempo: punto (el más reciente en
  `--primary` con halo), fecha, precio y variación % respecto al anterior.
- Tocar una tarjeta → detalle del producto.

---

## Interacciones y comportamiento
- **Navegación**: SPA por hash (`#pantry`, `#scan`, `#receipts`, `#prices`,
  `#product?id=…`). La pestaña Alacena queda activa también en el detalle.
- **Consumir**: resta del stock, nunca baja de 0.
- **Porcionar**: confirma, pone el stock original a 0, crea producto
  "{nombre} (porción)" con N de stock y navega a su detalle.
- **Guardar factura**: por cada línea busca/crea producto por nombre
  normalizado, suma al stock, y crea un registro de precio fechado.
- **Animaciones**: bottom sheet `slideup .25s cubic-bezier(.2,.8,.2,1)`; backdrop
  `fade .2s`; spinner `spin .7s linear infinite`; chevron rota 180º.
- **Estados**: cargando ("Cargando…"), vacío (icono + texto), error (caja roja
  `--up` con el mensaje).

## Gestión de estado / datos
Modelos (colecciones):
- `products` `{ id, name, normalizedName, unit, createdAt }`
- `stock` `{ id, productId, quantity, unit, updatedAt }`
- `receipts` `{ id, date, total, store, lines:[{productId,name,quantity,unit,price}], createdAt }`
- `prices` `{ id, productId, productName, price, unit, date, receiptId, createdAt }`

API de alto nivel (ver `db.js`): `getPantry`, `addProductWithStock`, `consume`,
`setStockQuantity`, `getProductDetail`, `portionProduct`, `saveReceipt`,
`getReceipts`, `deleteReceipt`, `getAllPriceHistory`, `normalizeName`.

Normalización de nombres (evita duplicados): minúsculas, sin tildes, sin
símbolos, espacios colapsados. Si el nombre normalizado ya existe, se reutiliza.

OCR: `analyzeReceipt(base64, mime)` → `gemini-1.5-flash`. Devuelve
`{ productos:[{nombre,cantidad,unidad,precio}], total, fecha }`.

## Design tokens
```
Colores
  --bg          #fef9f0   fondo crema (lienzo de la app)
  --surface     #ffffff   tarjetas
  --surface-2   #f7efe1   inputs / fondos suaves
  --soft        #f0e8d8   chips / botón volver
  --line        #ece0cb   bordes
  --primary     #e07b39   terracota (acción principal)
  --primary-dark#c5641f   activo / hover
  --primary-soft#fbeadb   fondos de acento
  --text        #2d1f0f   texto principal
  --muted       #8a7a63   texto secundario
  --up          #c0492f   sube de precio (negativo)
  --down        #2f7d4f   baja de precio (positivo)

Tipografía
  Títulos/números:  "Bitter" (serif), 500/600/700
  Texto/UI:         "DM Sans", 400/500/600/700
  Escala: 11–13px secundario · 15px cuerpo · 17–21px títulos · 30–38px destacados

Radios:   16px (tarjetas) · 11px (inputs/botones) · 9px (mini) · 22px (sheet) · 999px (píldoras)
Sombras:  --shadow    0 1px 2px rgba(45,31,15,.04), 0 6px 18px rgba(45,31,15,.06)
          --shadow-sm 0 1px 2px rgba(45,31,15,.06)
Marco:    --app-w 480px · --nav-h 66px · --top-h 56px
Espaciado base: 4 / 8 / 10 / 12 / 14 / 16 / 18 px
```

## Assets
- Sin imágenes externas. Iconos: SVG de línea inline definidos en `icons.js`
  (`home`, `camera`, `receipt`, `search`, `basket`, `tag`).
- Fuentes: Google Fonts — **Bitter** y **DM Sans**.
- Las imágenes de facturas las aporta el usuario (input file / cámara).

## Archivos (referencia de diseño en `src/`)
```
index.html          Shell: topbar, banner demo, contenedor, bottomnav, fuentes
styles.css          Todo el CSS (tokens + componentes), mobile-first
app.js              Router SPA por hash + init + nav
icons.js            Iconos SVG de línea
firebase-config.js  Placeholders Firebase/Gemini + detección de config
db.js               Capa de datos: adaptador Firestore real + mock localStorage
gemini-client.js    Llamada a Gemini (OCR) + fallback demo
screens/pantry.js   Inventario
screens/scan.js     Escaneo + tabla editable
screens/product.js  Detalle, stock, porcionar, histórico
screens/receipts.js Facturas
screens/prices.js   Comparación de precios
firebase.json       Hosting + ref. a reglas
firestore.rules     Reglas (desarrollo: abierto — endurecer antes de producción)
```

## Cómo correr el prototipo de referencia
Necesita un servidor (usa ES modules; no funciona con `file://`):
```
cd src && npx serve .     # o: python3 -m http.server
```
Arranca en **modo demo** (datos de ejemplo en `localStorage`) hasta que se
rellenen las claves en `firebase-config.js`.
