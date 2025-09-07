import type { Handler } from "@netlify/functions";
// 1. Corregido el nombre de la clase
import { GoogleGenerativeAI } from "@google/generative-ai";

export const handler: Handler = async (event) => {
  console.log("INICIO handler Netlify - Recibido evento");

  // Verifica que la API key exista
  if (!process.env.GEMINI_API_KEY) {
    console.error("GEMINI_API_KEY no está definida en las variables de entorno.");
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Configuración del servidor incompleta: falta la API key de Gemini." }),
    };
  }

  // 2. Corregida la inicialización del cliente
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

  if (event.httpMethod !== "POST") {
    console.log("Método incorrecto:", event.httpMethod);
    return {
      statusCode: 405,
      body: JSON.stringify({ error: "Method Not Allowed" }),
    };
  }

  if (!event.body) {
    console.log("Request body is missing.");
    return {
      statusCode: 400,
      body: JSON.stringify({ error: "Request body is missing." }),
    };
  }

  console.log("RAW event.body recibido. Longitud:", event.body.length);
  let parsedBody;
  try {
    parsedBody = JSON.parse(event.body);
  } catch (err) {
    console.error("ERROR AL PARSEAR event.body:", err, "body recibido:", event.body);
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
    console.log("Obteniendo modelo de Gemini y preparando la llamada...");

    // 3. Corregida la forma de llamar al modelo
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" }); // Usamos gemini-1.5-flash que es más rápido y económico para estas tareas. Puedes usar "gemini-pro-vision" si lo prefieres.

    const prompt = `
Analiza el PDF adjunto y extrae los datos relevantes en formato JSON.
Devuelve exclusivamente un objeto JSON válido y puro, SIN encabezados, SIN markdown (```json), y SIN explicaciones.
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

    const result = await model.generateContent([prompt, filePart]);
    const response = result.response;
    
    // 4. Corregido el acceso al texto de la respuesta
    const textFromGemini = response.text();
    console.log("RESPUESTA CRUDA DE GEMINI:", textFromGemini);

    if (!textFromGemini) {
      console.log("Gemini no devolvió texto válido:", response);
      return {
        statusCode: 500,
        body: JSON.stringify({ error: "Sin respuesta de texto válida de Gemini", raw: response }),
      };
    }

    // ------ LIMPIEZA ROBUSTA DEL JSON ------
    let rawReply = textFromGemini.trim();
    // Si viene envuelto en bloque ```json ... ``` lo elimina
    const match = rawReply.match(/```(json)?\s*([\s\S]*?)\s*```/);
    if (match) {
        rawReply = match[2];
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
