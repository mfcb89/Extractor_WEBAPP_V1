// netlify/functions/extract.ts
import type { Handler } from "@netlify/functions";
import { GoogleGenerativeAI } from "@google/generative-ai";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

export const handler: Handler = async (event) => {
  // Preflight CORS
  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 204, headers: corsHeaders, body: "" };
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({ error: "Falta la variable de entorno GEMINI_API_KEY" }),
    };
  }

  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      headers: corsHeaders,
      body: JSON.stringify({ error: "Method Not Allowed" }),
    };
  }

  if (!event.body) {
    return {
      statusCode: 400,
      headers: corsHeaders,
      body: JSON.stringify({ error: "Request body is missing." }),
    };
  }

  // Parseo del body
  let parsedBody: { pdfBase64?: string };
  try {
    parsedBody = JSON.parse(event.body);
  } catch {
    return {
      statusCode: 400,
      headers: corsHeaders,
      body: JSON.stringify({ error: "Body JSON inválido" }),
    };
  }

  let { pdfBase64 } = parsedBody || {};
  if (!pdfBase64) {
    return {
      statusCode: 400,
      headers: corsHeaders,
      body: JSON.stringify({ error: "No se ha proporcionado el contenido del PDF." }),
    };
  }

  // Permite tanto "AAAA..." como "data:application/pdf;base64,AAAA..."
  const commaIdx = pdfBase64.indexOf(",");
  if (commaIdx !== -1) {
    const prefix = pdfBase64.slice(0, commaIdx);
    if (/^data:application\/pdf;base64$/i.test(prefix)) {
      pdfBase64 = pdfBase64.slice(commaIdx + 1);
    }
  }

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    // Modelo multimodal con soporte para PDF
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-pro" });

    const result = await model.generateContent([
      { inlineData: { data: pdfBase64, mimeType: "application/pdf" } },
      {
        text:
          "Analiza el PDF adjunto y extrae los datos relevantes en formato JSON.\n" +
          "Devuelve exclusivamente un objeto JSON válido y puro, SIN encabezados, SIN markdown y SIN explicaciones.\n" +
          'Por ejemplo: { "nombre": "...", "nif": "...", "campos": ... }',
      },
    ]);

    const response = await result.response;
    let rawReply = (response.text() || "").trim();

    // ------ LIMPIEZA ROBUSTA DEL JSON ------
    // Quita bloque ```...``` si existe, sin regex mal terminadas
    if (/^```/.test(rawReply) && /```$/.test(rawReply)) {
      // Elimina línea inicial ```(json|...) y la marca de cierre ```
      rawReply = rawReply.replace(/^```[^\n]*\n?/, "").replace(/\n?```$/, "");
    }

    // Recorta desde la primera { hasta la última }
    const firstBrace = rawReply.indexOf("{");
    const lastBrace = rawReply.lastIndexOf("}");
    if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
      rawReply = rawReply.slice(firstBrace, lastBrace + 1);
    }

    // Intenta parsear
    let jsonResult: unknown;
    try {
      jsonResult = JSON.parse(rawReply);
    } catch {
      return {
        statusCode: 500,
        headers: corsHeaders,
        body: JSON.stringify({
          error: "La respuesta de Gemini no es un JSON válido.",
          raw: rawReply,
        }),
      };
    }

    // Sustituye NaN por null
    const cleanJson = JSON.parse(
      JSON.stringify(jsonResult, (_k, v) =>
        typeof v === "number" && Number.isNaN(v) ? null : v
      )
    );

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
      body: JSON.stringify(cleanJson),
    };
  } catch (e) {
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({
        error: e instanceof Error ? e.message : String(e),
      }),
    };
  }
};
