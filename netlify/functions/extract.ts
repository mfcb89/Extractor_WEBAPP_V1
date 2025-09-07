import type { Handler } from "@netlify/functions";
import { GoogleGenAI } from '@google/genai';

export const handler: Handler = async (event) => {
  // Debug temporal: quita este log cuando ya sepas que funciona!
  console.log("API KEY en función serverless:", process.env.GEMINI_API_KEY);

  // Inicialización SEGURA dentro del handler
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
    // Llama a Gemini para analizar el PDF (ajusta modelo e instrucciones según tu caso)
    const response = await ai.models.generateContent({
      model: "gemini-pro-vision", // Cambia si usas otro modelo
      prompt: [
        {
          mimeType: "application/pdf",
          data: pdfBase64
        },
        {
          text: `
Analiza el PDF adjunto y extrae los datos relevantes en formato JSON. 
Devuelve solo el JSON plano sin explicaciones, por ejemplo: 
{ "nombre": "...", "nif": "...", "campos": ... }
`
        }
      ]
    });

    // Debug temporal para ver exactamente qué responde Gemini
    console.log("RESPUESTA DE GEMINI:", response.text);

    let jsonResult = null;
    try {
      jsonResult = JSON.parse(response.text);
    } catch {
      return {
        statusCode: 500,
        body: JSON.stringify({ error: 'La respuesta de Gemini no es un JSON válido.', raw: response.text })
      };
    }
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
