import type { Handler } from "@netlify/functions";
import { GoogleGenerativeAI } from "@google/generative-ai";

export const handler: Handler = async (event) => {
  console.log("INICIO handler Netlify - Recibido evento");

  // 1. Chequeo API key
  if (!process.env.GEMINI_API_KEY) {
    console.error("GEMINI_API_KEY no está definida.");
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Falta la API key de Gemini." }),
    };
  }

  // 2. Solo POST permitido
  if (event.httpMethod !== "POST") {
    console.log("Método incorrecto:", event.httpMethod);
    return {
      statusCode: 405,
      body: JSON.stringify({ error: "Method Not Allowed" }),
    };
  }

  // 3. Chequeo de body
  if (!event.body) {
    console.log("Falta body.");
    return {
      statusCode: 400,
      body: JSON.stringify({ error: "Request body is missing." }),
    };
  }

  let parsedBody;
  try {
    parsedBody = JSON.parse(event.body);
  } catch (err) {
    console.error("ERROR PARSEANDO body:", err);
    return {
      statusCode: 400,
      body: JSON.stringify({ error: "Body JSON inválido", raw: event.body }),
    };
  }

  const { pdfBase64 } = parsedBody;
  if (!pdfBase64) {
    console.log("No se ha proporcionado el contenido del PDF en base64.");
    return {
      statusCode: 400,
      body: JSON.stringify({ error: "El campo 'pdfBase64' es requerido." }),
    };
  }

  try {
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const prompt = `
Analiza el PDF adjunto y extrae los datos relevantes en formato JSON.
Devuelve exclusivamente un objeto JSON válido y puro, SIN encabezados, SIN markdown, y SIN explicaciones.
El JSON debe ser directamente parseable.
Ejemplo de salida esperada:
{ "nombre": "...", "nif": "...", "campos": [...] }
`;

    const filePart = {
      inlineData: {
        data: pdfBase64,
        mimeType: "application/pdf",
      },
    };

    // Llama a Gemini
    const result = await model.generateContent([prompt, filePart]);
    const response = result.response;

    const textFromGemini = response.text();
    console.log("RESPUESTA CRUDA DE GEMINI:", textFromGemini);

    if (!textFromGemini) {
      return {
        statusCode: 500,
        body: JSON.stringify({ error: "Sin respuesta de texto válida de Gemini" }),
      };
    }

    // LIMPIEZA del output: elimina bloques ``````
    let rawReply = textFromGemini.trim();
    const codeBlockRegex = /``````/;
    const match = rawReply.match(codeBlockRegex);
    if (match) {
      rawReply = match[1];
    }

    let jsonResult;
    try {
      jsonResult = JSON.parse(rawReply);
    } catch (e) {
      console.error("ERROR EN JSON.PARSE. TEXTO RECIBIDO DE GEMINI:", rawReply);
      return {
        statusCode: 500,
        body: JSON.stringify({ error: "La respuesta de Gemini no es un JSON válido.", raw: rawReply }),
      };
    }

    console.log("JSON FINAL LIMPIO:", jsonResult);

    return {
      statusCode: 200,
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(jsonResult),
    };

  } catch (error) {
    console.error("ERROR GENERAL EN EL HANDLER:", error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Error interno del servidor.", detail: errorMessage }),
    };
  }
};
