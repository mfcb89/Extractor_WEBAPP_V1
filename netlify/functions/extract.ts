import type { Handler } from "@netlify/functions";
import { GoogleGenAI } from '@google/genai';

export const handler: Handler = async (event) => {
  // Opcional: solo durante debug, quítalo después de pruebas
  console.log("API KEY en función serverless:", process.env.GEMINI_API_KEY);

  // Inicializa siempre dentro del handler
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method Not Allowed' }),
    };
  }
  if (!event.body) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: 'Request body is missing.' }),
    };
  }

  const { pdfBase64 } = JSON.parse(event.body);
  if (!pdfBase64) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: 'No se ha proporcionado el contenido del PDF.' }),
    };
  }

  try {
    // --- Llama a Gemini ---
    const response = await ai.models.generateContent({
      model: "gemini-pro-vision", // Cambia por tu modelo si es distinto
      prompt: [
        {
          mimeType: "application/pdf",
          data: pdfBase64
        },
        {
          text: `
Analiza el PDF adjunto y extrae los datos relevantes en formato JSON. 
Devuelve exclusivamente un objeto JSON válido y puro, SIN encabezados, SIN markdown y SIN explicaciones.
Por ejemplo:
{ "nombre": "...", "nif": "...", "campos": ... }
`
        }
      ]
    });

    // Debug temporal: para ver exactamente la salida del modelo
    console.log("RESPUESTA DE GEMINI:", response.text);

    // --- Limpieza robusta del JSON ---
    let rawReply = response.text.trim();

    // Elimina markdown `````` al final
    if (rawReply.startsWith('```
      rawReply = rawReply.replace(/^```json\s*/, '').replace(/```
    }

    // Si hay encabezado, corta desde la primera llave {
    const firstBrace = rawReply.indexOf('{');
    if (firstBrace !== -1) rawReply = rawReply.slice(firstBrace);

    let jsonResult = null;
    try {
      jsonResult = JSON.parse(rawReply);
    } catch {
      return {
        statusCode: 500,
        body: JSON.stringify({ error: 'La respuesta de Gemini no es un JSON válido.', raw: response.text })
      };
    }

    // Limpia valores NaN por null (extra-safe)
    const cleanJson = JSON.parse(JSON.stringify(jsonResult, (key, value) =>
      (typeof value === 'number' && isNaN(value)) ? null : value
    ));

    return {
      statusCode: 200,
      body: JSON.stringify(cleanJson)
    };

  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error instanceof Error ? error.message : String(error) }),
    };
  }
};
