import type { Handler } from "@netlify/functions";

// Netlify permite fetch nativo en runtimes modernos.

export const handler: Handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: "Method Not Allowed" }),
    };
  }

  if (!event.body) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: "Request body is missing." }),
    };
  }

  let parsedBody;
  try {
    parsedBody = JSON.parse(event.body);
  } catch (err) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: "Body JSON inválido", raw: event.body }),
    };
  }

  const { pdfBase64 } = parsedBody;
  if (!pdfBase64) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: "No se ha proporcionado el contenido del PDF." }),
    };
  }

  try {
    const geminiApiKey = process.env.GEMINI_API_KEY;
    const apiUrl =
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-pro-vision:generateContent?key=" +
      geminiApiKey;

    const geminiRequest = {
      contents: [
        {
          parts: [
            {
              mimeType: "application/pdf",
              data: pdfBase64,
            },
            {
              text: `
Analiza el PDF adjunto y extrae los datos relevantes en formato JSON.
Devuelve exclusivamente un objeto JSON válido y puro, SIN encabezados, SIN markdown y SIN explicaciones.
Por ejemplo:
{ "nombre": "...", "nif": "...", "campos": ... }
`
            }
          ]
        }
      ]
    };

    const res = await fetch(apiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(geminiRequest),
    });

    const data = await res.json();

    // --- Extracción y limpieza robusta del texto ---
    let rawReply = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || "";
    // Si viene envuelto en bloque ```
    if (/^```/.test(rawReply) && /```
      // quita la primera línea con ``` y posible lenguaje
      rawReply = rawReply.replace(/^``````$/, "");
    }
    // Si hay texto antes del {, córtalo
    const i = rawReply.indexOf("{");
    if (i !== -1) rawReply = rawReply.slice(i);

    let jsonResult = null;
    try {
      jsonResult = JSON.parse(rawReply);
    } catch {
      return {
        statusCode: 500,
        body: JSON.stringify({
          error: "La respuesta de Gemini no es un JSON válido.",
          raw: rawReply,
        }),
      };
    }

    // Sustituye NaN por null si se cuela alguno
    const cleanJson = JSON.parse(
      JSON.stringify(jsonResult, (key, value) =>
        typeof value === "number" && isNaN(value) ? null : value
      )
    );

    return {
      statusCode: 200,
      body: JSON.stringify(cleanJson),
    };
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: error instanceof Error ? error.message : String(error),
      }),
    };
  }
};
