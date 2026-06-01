// ============================================================================
// CLIENTE GEMINI (gemini-client.js)
// ----------------------------------------------------------------------------
// Envía la imagen de una factura a Gemini y devuelve el JSON estructurado.
// En MODO DEMO (sin clave) devuelve una factura de ejemplo tras un pequeño
// retardo, para poder probar el flujo de escaneo completo.
// ============================================================================

import { geminiApiKey, geminiModel, geminiConfigured } from "./firebase-config.js";

const PROMPT =
  'Eres un asistente OCR. Extrae de esta factura de supermercado: lista de ' +
  'productos (nombre, cantidad, unidad, precio unitario o total), total de la ' +
  'factura y fecha. Devuelve solo JSON válido con el formato: ' +
  '{ "productos": [{"nombre": "...", "cantidad": 0, "unidad": "...", "precio": 0}], ' +
  '"total": 0, "fecha": "YYYY-MM-DD" }';

// Quita posibles vallas markdown ```json ... ``` y parsea.
function parseJsonResponse(text) {
  if (!text) throw new Error("Respuesta vacía de Gemini");
  let cleaned = text.trim();
  cleaned = cleaned.replace(/^```(?:json)?/i, "").replace(/```$/, "").trim();
  // Intenta recortar al primer { ... último }
  const first = cleaned.indexOf("{");
  const last = cleaned.lastIndexOf("}");
  if (first >= 0 && last >= 0) cleaned = cleaned.slice(first, last + 1);
  try {
    return JSON.parse(cleaned);
  } catch (e) {
    throw new Error("No se pudo interpretar la respuesta de Gemini como JSON. Texto recibido:\n" + text);
  }
}

function demoResult() {
  const today = new Date().toISOString().slice(0, 10);
  return {
    productos: [
      { nombre: "Leche entera", cantidad: 6, unidad: "L", precio: 1.12 },
      { nombre: "Pan de molde", cantidad: 1, unidad: "paquete", precio: 1.35 },
      { nombre: "Aceite de oliva virgen", cantidad: 1, unidad: "L", precio: 8.45 },
      { nombre: "Yogur natural", cantidad: 2, unidad: "pack", precio: 1.59 },
      { nombre: "Plátanos", cantidad: 1.2, unidad: "kg", precio: 1.49 },
    ],
    total: 15.59,
    fecha: today,
  };
}

// base64Image: string base64 SIN el prefijo "data:...;base64,"
// mimeType: p.ej. "image/jpeg"
export async function analyzeReceipt(base64Image, mimeType = "image/jpeg") {
  if (!geminiConfigured) {
    await new Promise((r) => setTimeout(r, 1200)); // simula latencia
    return { ...demoResult(), _demo: true };
  }

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${geminiModel}:generateContent?key=${geminiApiKey}`;
  const body = {
    contents: [
      {
        parts: [
          { text: PROMPT },
          { inline_data: { mime_type: mimeType, data: base64Image } },
        ],
      },
    ],
    generationConfig: { temperature: 0.1 },
  };

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Error de Gemini (${res.status}): ${errText}`);
  }

  const json = await res.json();
  const text = json?.candidates?.[0]?.content?.parts?.[0]?.text;
  return parseJsonResponse(text);
}
