import { GEMINI_API_KEY } from "./firebase-config.js";

const GEMINI_URL =
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent";

const OCR_PROMPT =
  'Eres un asistente OCR. Extrae de esta factura de supermercado: lista de productos (nombre, cantidad, unidad, precio unitario o total), total de la factura y fecha. Devuelve solo JSON válido con el formato: { "productos": [{"nombre": "...", "cantidad": 0, "unidad": "...", "precio": 0}], "total": 0, "fecha": "YYYY-MM-DD" }';

export async function analyzeReceipt(base64Image, mimeType) {
  if (GEMINI_API_KEY === "YOUR_GEMINI_API_KEY") {
    throw new Error("Configura tu GEMINI_API_KEY en firebase-config.js antes de usar el escaneo");
  }

  const response = await fetch(`${GEMINI_URL}?key=${GEMINI_API_KEY}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [
        {
          parts: [
            { text: OCR_PROMPT },
            { inlineData: { mimeType, data: base64Image } }
          ]
        }
      ]
    })
  });

  if (!response.ok) {
    const errText = await response.text().catch(() => "");
    throw new Error(`Gemini API error ${response.status}: ${errText || response.statusText}`);
  }

  const data = await response.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;

  if (!text) {
    throw new Error("Gemini no devolvió contenido");
  }

  // Strip markdown code fences if present
  const clean = text.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "").trim();

  try {
    return JSON.parse(clean);
  } catch {
    throw new Error(
      `No se pudo parsear la respuesta de Gemini. Respuesta recibida:\n\n${text.substring(0, 400)}`
    );
  }
}
