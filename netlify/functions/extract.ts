import type { Handler } from "@netlify/functions";
import { GoogleGenAI } from '@google/genai';

export const handler: Handler = async (event) => {
  console.log("INICIO handler Netlify - Recibido evento");

  // Inicialización segura de Gemini
  console.log("API KEY en función serverless:", process.env.GEMINI_API_KEY);
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

  if (event.httpMethod !== 'POST') {
    console.log("Método incorrecto:", event.httpMethod);
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method Not Allowed' }),
    };
  }
  if (!event.body) {
    console.log("Request body is missing.");
    return {
      statusCode: 400,
      body: JSON.stringify({ error: 'Request body is missing.' }),
    };
  }

  const { pdfBase64 } = JSON.parse(event.body);
  if (!pdfBase64) {
    console.log("No se ha proporcionado el contenido del PDF.");
    return {
      statusCode: 400,
      body: JSON.stringify({ error: 'No se ha proporcionado el contenido del PDF.' }),
    };
  }

  try {
    console.log("Enviando PDF a Gemini...");
    let response;
    try {
      response = await ai.models.generateContent({
        model: "gemini-pro-vision",
        prompt: [
          { mimeType: "application/pdf", data: pdfBase64 },
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
      console.log("RESPUESTA DE GEMINI:", response && response.text);
    } catch (e) {
      console.log("ERROR EN LLAMADA A GEMINI:", e);
      return {
        statusCode: 500,
        body: JSON.stringify({ error: "Error en llamada a Gemini", detail: e instanceof Error ? e.message : String(e) }),
      };
    }

    if (!response || !response.text) {
      console.log("Gemini no devolvió respuesta válida:", response);
      return {
        statusCode: 500,
        body: JSON.stringify({ error: "Sin respuesta válida de Gemini", raw: response }),
      };
    }

    // Limpieza robusta del JSON
    let rawReply = response.text.trim();
    if (rawReply.startsWith('```
      rawReply = rawReply.replace(/^```json\s*/, '').replace(/```
    }
    const firstBrace = rawReply.indexOf('{');
    if (firstBrace !== -1) rawReply = rawReply.slice(firstBrace);

    let jsonResult = null;
    try {
      jsonResult = JSON.parse(rawReply);
    } catch {
      console.log("ERROR EN JSON.PARSE. TEXTO CRUDO:", rawReply);
      return {
        statusCode: 500,
        body: JSON.stringify({ error: 'La respuesta de Gemini no es un JSON válido.', raw: response.text })
      };
    }

    const cleanJson = JSON.parse(JSON.stringify(jsonResult, (key, value) =>
      (typeof value === 'number' && isNaN(value)) ? null : value
    ));

    console.log("JSON FINAL LIMPIO:", cleanJson);

    return {
      statusCode: 200,
      body: JSON.stringify(cleanJson)
    };

  } catch (error) {
    console.log("ERROR GENERAL EN EL HANDLER:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error instanceof Error ? error.message : String(error) }),
    };
  }
};
