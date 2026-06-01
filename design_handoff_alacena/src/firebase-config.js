// ============================================================================
// CONFIGURACIÓN DE FIREBASE Y GEMINI
// ----------------------------------------------------------------------------
// Reemplaza los valores PLACEHOLDER por los de tu proyecto antes de hacer
// pruebas reales. Mientras tengan los valores placeholder, la app arranca en
// MODO DEMO (datos locales en el navegador, sin red).
// ============================================================================

export const firebaseConfig = {
  apiKey: "TU_FIREBASE_API_KEY",
  authDomain: "tu-proyecto.firebaseapp.com",
  projectId: "tu-proyecto",
  storageBucket: "tu-proyecto.appspot.com",
  messagingSenderId: "000000000000",
  appId: "1:000000000000:web:0000000000000000000000",
};

// Clave de la API de Gemini (Google AI Studio).
export const geminiApiKey = "TU_GEMINI_API_KEY";

// Modelo de Gemini a utilizar para el OCR de facturas.
export const geminiModel = "gemini-1.5-flash";

// ----------------------------------------------------------------------------
// Detección de configuración. Si cualquier valor sigue siendo placeholder,
// activamos el modo demo para que la interfaz sea totalmente navegable sin
// credenciales reales.
// ----------------------------------------------------------------------------
const PLACEHOLDERS = ["TU_FIREBASE_API_KEY", "tu-proyecto", ""];

export const firebaseConfigured =
  !PLACEHOLDERS.includes(firebaseConfig.apiKey) &&
  !PLACEHOLDERS.includes(firebaseConfig.projectId);

export const geminiConfigured = geminiApiKey !== "TU_GEMINI_API_KEY" && geminiApiKey.length > 0;
