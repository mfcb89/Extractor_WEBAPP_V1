import type { Handler } from "@netlify/functions";
import { GoogleGenAI } from '@google/genai';

// Inicializa el cliente con la API Key explícita
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export const handler: Handler = async (event) => {
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

    // ... TU lógica Gemini aquí ...
    // Supongamos que response.text es el JSON resultante
    const response = await ai.models.generateContent({ /* ... */ });

    let jsonResult: any = null;
    try {
      jsonResult = JSON.parse(response.text);
    } catch {
      // Si Gemini no responde un JSON válido, señaliza el error
      return {
        statusCode: 500,
        body: JSON.stringify({ error: 'La respuesta de Gemini no es un JSON válido.' })
      };
    }

    // Limpia los valores NaN (JS los convierte en null al hacer esto)
    const cleanJson = JSON.parse(JSON.stringify(jsonResult, (key, value) =>
      (typeof value === 'number' && isNaN(value)) ? null : value
    ));

    return {
      statusCode: 200,
      body: JSON.stringify(cleanJson)
    };

  } catch (error) {
    // Manejo robusto de errores, siempre JSON simple
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error instanceof Error ? error.message : String(error) }),
    };
  }
};
