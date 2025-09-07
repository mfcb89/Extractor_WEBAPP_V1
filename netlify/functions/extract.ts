import type { Handler } from "@netlify/functions";
import { GoogleGenAI } from '@google/genai';

export const handler: Handler = async (event) => {
  console.log("API KEY en función serverless:", process.env.GEMINI_API_KEY);

  // Inicializa el cliente AQUÍ (dentro del handler)
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

    // ... Tu lógica Gemini aquí ...
    // const response = await ai.models.generateContent({ ... });

    // OPCIONAL: aquí el resto de tu código de robustez y limpieza

    return {
      statusCode: 200,
      body: JSON.stringify({ success: true }) // Cambia por tu dato real
    };

  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error instanceof Error ? error.message : String(error) }),
    };
  }
};
