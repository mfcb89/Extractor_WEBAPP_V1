import type { UrbanisticProjectData } from '../types';

/**
 * Sends the PDF data to a secure serverless function for processing with Gemini.
 * @param pdfBase64 The base64 encoded string of the PDF file.
 * @returns A promise that resolves to the extracted UrbanisticProjectData.
 */
export async function extractDataFromPdf(pdfBase64: string): Promise<UrbanisticProjectData> {
  // La URL apunta a la función serverless que hemos creado.
  // Netlify mapea automáticamente esta ruta a la función correcta.
  const endpoint = '/.netlify/functions/extract';

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ pdfBase64: pdfBase64 }),
    });

    if (!response.ok) {
      // Si el servidor devuelve un error, intentamos leer el mensaje.
      const errorData = await response.json();
      throw new Error(errorData.message || `Error del servidor: ${response.statusText}`);
    }

    const jsonText = await response.text();
    // Parseamos la respuesta de la función serverless.
    return JSON.parse(jsonText) as UrbanisticProjectData;

  } catch (error) {
    console.error('Error al llamar a la función serverless:', error);
    if (error instanceof SyntaxError) {
      throw new Error('La respuesta del servidor no es un JSON válido. Revisa la función serverless.');
    }
    // Re-lanzamos el error para que el componente de la UI pueda manejarlo.
    throw error;
  }
}
