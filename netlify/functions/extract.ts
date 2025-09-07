import type { Handler } from "@netlify/functions";
import { GoogleGenAI } from '@google/genai';

export const handler: Handler = async (event) => {
  console.log("INICIO handler Netlify - Recibido evento");

  // Inicializa Gemini solo dentro del handler
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

  // --- LOGGEO Y PARSEO SEGURO DEL BODY ---
  console.log("RAW event.body:", event.body);
  let parsedBody;
  try {
    parsedBody = JSON.parse(event.body);
    console.log("parsedBody:", parsedBody);
  } catch (err) {
    console.log("ERROR AL PARSEAR event.body:", err, "body recibido:", event.body);
    return {
      statusCode: 400,
      body: JSON.stringify({ error: "Body JSON inválido", raw: event.body })
    };
  }
  const { pdfBase64 } = parsedBody;
  if (!pdfBase64) {
    console.log("No se ha proporcionado el contenido del PDF. Body recibido:", parsedBody);
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

    // ------ LIMPIEZA ROBUSTA DEL JSON ------
    let rawReply = response.text.trim();

    // Elimina bloque markdown ``````
    if (rawReply.startsWith("```
      rawReply = rawReply.replace(/^```[a-z]*\s*/i, "").replace(/```
    }

    // Si hay texto antes del JSON, corta desde la primera llave {
    const firstBrace = rawReply.indexOf("{");
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

    // Sustituye NaN por null si se cuela alguno
    const cleanJson = JSON.parse(JSON.stringify(jsonResult, (key, value) =>
      (typeof value === "number" && isNaN(value)) ? null : value
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
