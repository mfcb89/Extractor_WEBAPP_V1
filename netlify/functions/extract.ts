import type { Handler } from "@netlify/functions";
import { GoogleGenAI } from '@google/genai';

export const handler: Handler = async (event) => {
  // Opcional: solo para debug, quitar tras comprobar en los logs
  console.log("API KEY en función serverless:", process.env.GEMINI_API_KEY);

  // Inicializa SIEMPRE dentro del handler
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

  try {
    const { pdfBase64 } = JSON.parse(event.body);
    if (!pdfBase64) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'No se ha proporcionado el contenido del PDF.' }),
      };
    }

    // --- AQUÍ va tu lógica Gemini real ---
    // const response = await ai.models.generateContent({ ... });
    // Por seguridad, mientras haces pruebas:
    return {
      statusCode: 200,
      body: JSON.stringify({ success: true }),
    };

    //
    // Si quieres reintegrar tu parsing real:
    //
    // let jsonResult = null;
    // try {
    //   jsonResult = JSON.parse(response.text);
    // } catch {
    //   return {
    //     statusCode: 500,
    //     body: JSON.stringify({ error: 'La respuesta de Gemini no es un JSON válido.' })
    //   };
    // }
    // const cleanJson = JSON.parse(JSON.stringify(jsonResult, (key, value) =>
    //   (typeof value === 'number' && isNaN(value)) ? null : value
    // ));
    // return {
    //   statusCode: 200,
    //   body: JSON.stringify(cleanJson)
    // };

  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error instanceof Error ? error.message : String(error) }),
    };
  }
};
