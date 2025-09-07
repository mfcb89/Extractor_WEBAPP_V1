import type { Handler } from "@netlify/functions";
import { GoogleGenAI } from '@google/genai';

export const handler: Handler = async (event) => {
  // Debug temporal: imprime la API key (quítalo después de probar)
  console.log("API KEY en función serverless:", process.env.GEMINI_API_KEY);

  // Inicializa SIEMPRE dentro del handler, no fuera
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

    // Ejemplo de llamada segura: pon tu propia lógica Gemini aquí
    // const response = await ai.models.generateContent({ ... });
    // Simulación de resultado:
    // const response = { text: '{ "resultado": 42 }' };
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

    // Mientras tanto, solo responde éxito para test:
    return {
      statusCode: 200,
      body: JSON.stringify({ success: true }),
    };

  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error instanceof Error ? error.message : String(error) }),
    };
  }
};
