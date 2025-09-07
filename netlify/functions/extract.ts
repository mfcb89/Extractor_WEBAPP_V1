import type { Handler } from "@netlify/functions";
import { GoogleGenAI } from '@google/genai';

// La API Key se obtiene de forma segura desde las variables de entorno de Netlify.
// ¡NUNCA se escribe directamente en el código!
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

// Se ha modificado el schema para usar valores de texto literales en lugar del enum 'Type'.
// Esto evita errores de ejecución en el entorno de Netlify.
const schema = {
  type: "OBJECT",
  properties: {
    datosSolicitante: {
      type: "OBJECT",
      properties: {
        nombreRazonSocial: { type: "STRING" },
        apellidos: { type: "STRING" },
        nifCif: { type: "STRING" },
        provincia: { type: "STRING" },
        municipio: { type: "STRING" },
        callePlaza: { type: "STRING" },
        cp: { type: "STRING" },
        correoElectronico: { type: "STRING" },
      },
    },
    representanteNotificacion: {
      type: "OBJECT",
      properties: {
        nombreRazonSocial: { type: "STRING" },
        apellidos: { type: "STRING" },
        nif: { type: "STRING" },
        correoElectronico: { type: "STRING" },
        canalPreferenteNotificacion: { type: "STRING" },
      },
    },
    tipoDeUso: {
      type: "OBJECT",
      properties: {
        categoriaActividad: { type: "STRING" },
        subcategoriaEspecifica: { type: "STRING" },
        seleccion: { type: "BOOLEAN" },
      },
    },
    descripcion: {
      type: "OBJECT",
      properties: {
        asunto: { type: "STRING" },
        descripcionActuacion: { type: "STRING" },
        costeEjecucionMaterial: { type: "NUMBER" },
        porcentaje: { type: "NUMBER" },
        canon: { type: "NUMBER" },
        plazoVigencia: { type: "STRING" },
        solicitudJustificacion: { type: "STRING", description: 'Transcripción literal del apartado SOLICITO de las conclusiones.' },
      },
    },
    parcelasAfectadas: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: {
          referenciaCatastral: { type: "STRING" },
          provincia: { type: "STRING" },
          localidad: { type: "STRING" },
          poligono: { type: "STRING" },
          parcela: { type: "STRING" },
          superficieParcela: { type: "NUMBER" },
          superficieVinculada: { type: "NUMBER" },
          totalSuperficie: { type: "NUMBER" },
        },
      },
    },
    parametrosUrbanisticos: {
      type: "OBJECT",
      properties: {
        construcciones: {
          type: "ARRAY",
          items: {
            type: "OBJECT",
            properties: {
              uso: { type: "STRING" },
              superficieOcupada: { type: "NUMBER" },
              superficieConstruida: { type: "NUMBER" },
              edificabilidad: { type: "NUMBER" },
              numeroPlantas: { type: "INTEGER" },
              altura: { type: "NUMBER" },
              volumen: { type: "NUMBER" },
              separacionAlEjeCaminos: { type: "NUMBER" },
              separacionACaminos: { type: "NUMBER" },
              separacionALindes: { type: "NUMBER" },
              costeTransformacion: { type: "NUMBER" },
              costeTotal: { type: "NUMBER" },
            },
          },
        },
        instalaciones: {
          type: "ARRAY",
          items: {
            type: "OBJECT",
            properties: {
              uso: { type: "STRING" },
              superficieOcupada: { type: "NUMBER" },
              superficieConstruida: { type: "NUMBER" },
              edificabilidad: { type: "NUMBER" },
              numeroPlantas: { type: "INTEGER" },
              altura: { type: "NUMBER" },
              volumen: { type: "NUMBER" },
              separacionAlEjeCaminos: { type: "NUMBER" },
              separacionACaminos: { type: "NUMBER" },
              separacionALindes: { type: "NUMBER" },
              costeTransformacion: { type: "NUMBER" },
              costeTotal: { type: "NUMBER" },
            },
          },
        },
        viales: {
            type: "ARRAY",
            items: {
                type: "OBJECT",
                properties: {
                    superficieOcupada: { type: "NUMBER" },
                    costeTransformacion: { type: "NUMBER" },
                },
            },
        },
        tecnicoRedactor: {
          type: "OBJECT",
          properties: {
            nombre: { type: "STRING" },
            titulacion: { type: "STRING" },
            colegiadoNumero: { type: "STRING" },
          },
        },
      },
    },
    propietariosColindantes: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: {
          nombre: { type: "STRING" },
          direccionCompleta: { type: "STRING" },
          referenciaCatastral: { type: "STRING" },
        },
      },
    },
  },
};

// Esta es la función principal que se ejecutará en el servidor
export const handler: Handler = async (event) => {
  // Solo permitimos peticiones POST
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }
  
  if (!event.body) {
      return { statusCode: 400, body: JSON.stringify({ message: 'Request body is missing.' }) };
  }

  try {
    const { pdfBase64 } = JSON.parse(event.body);
    if (!pdfBase64) {
      return { statusCode: 400, body: JSON.stringify({ message: 'No se ha proporcionado el contenido del PDF.' }) };
    }
    
    const prompt = `Eres un asistente de IA especializado en la extracción de datos de documentos de proyectos urbanísticos. Tu única función es analizar el PDF proporcionado y devolver un objeto JSON que contenga los datos extraídos, adhiriéndote estrictamente al \`responseSchema\`.

**Reglas de Extracción Obligatorias:**

1.  **Salida Única y Exclusiva**: Tu respuesta debe ser **únicamente el objeto JSON** válido. No incluyas absolutamente ningún texto introductorio, explicaciones, comentarios, ni formateo markdown como \`\`\`json.
2.  **Extracción Literal**: Todos los valores deben extraerse textualmente del documento PDF. No inventes, infieras, calcules o deduzcas información.
3.  **Datos Ausentes**: Si un campo específico no se encuentra explícitamente en el documento, su valor en el JSON **debe ser \`null\`**. No omitas el campo ni dejes la cadena vacía.
4.  **Identificación de Tablas**: Presta especial atención a los títulos de las tablas para asegurar que extraes los datos de la fuente correcta. Por ejemplo, busca "Cuadro de características de las construcciones", "Presupuesto de ejecución material", "Separación a lindes y caminos", etc.
5.  **Reglas de Normalización**:
    *   **Valores Numéricos**: Deben ser representados como números (integer o float). Usa el punto (\`.\`) como separador decimal. Nunca incluyas unidades (como m², €, etc.) ni separadores de miles.
    *   **Identificadores (NIF, CIF, Referencia Catastral)**: Conviértelos a mayúsculas y elimina todos los espacios, puntos y guiones. Deben ser una cadena de texto continua.

**Reglas de Extracción Específicas por Campo:**

*   **Propietarios Colindantes**: La información debe obtenerse exclusivamente de la tabla titulada "Titulares de parcelas colindantes" o una denominación muy similar. Si no existe dicha tabla, el array de colindantes debe ser un array vacío (\`[]\`).
*   **Solicitud (Justificación)**: El valor del campo \`solicitudJustificacion\` debe ser una transcripción literal y completa del texto que aparece bajo el epígrafe "SOLICITO" o "CONCLUSIONES" en el documento.

**Instrucciones de Mapeo para Parámetros Urbanísticos:**
Analiza las tablas del documento para rellenar los siguientes arrays dentro de la clave \`parametrosUrbanisticos\`:

*   **Para los arrays \`construcciones\` e \`instalaciones\`:** Busca tablas de características o de presupuesto. Para cada fila que represente una construcción o una instalación, extrae:
    *   \`uso\`: El nombre o tipo de la edificación (ej: "Nave 1", "Oficinas").
    *   \`superficieOcupada\`: El valor de la columna "Superficie Ocupada" (en m²).
    *   \`superficieConstruida\`: El valor de la columna "Superficie Construida" (en m²).
    *   \`edificabilidad\`: El valor de la columna "Edificabilidad".
    *   \`numeroPlantas\`: El valor de la columna "Nº Plantas".
    *   \`altura\`: El valor de la columna "Altura".
    *   \`volumen\`: El valor de la columna "Volumen".
    *   \`separacionAlEjeCaminos\`: Busca una tabla titulada "Separación a lindes y caminos" o similar y extrae el valor de la columna "Separación al eje de caminos".
    *   \`separacionACaminos\`: De la misma tabla anterior, extrae el valor de la columna "Separación a caminos".
    *   \`separacionALindes\`: De la misma tabla, extrae el valor de la columna "Separación a lindes".
    *   \`costeTransformacion\`: Busca en la tabla de presupuesto el valor de la columna "Coste transformación" o "€/m²".
    *   \`costeTotal\`: El valor de la columna "Coste Total", "Presupuesto" o "PEM".

*   **Para el array \`viales\`:** Busca una tabla de "Urbanización", "Viales" o "Circulación". Para cada fila, extrae:
    *   \`superficieOcupada\`: El valor de la columna "Superficie" o "Superficie Ocupada".
    *   \`costeTransformacion\`: El valor de la columna "Coste" o "Coste Transformación (€/m²)".

Procede con el análisis y devuelve únicamente el objeto JSON resultante.`;

    const pdfPart = { inlineData: { mimeType: 'application/pdf', data: pdfBase64 }};
    const textPart = { text: prompt };

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: { parts: [pdfPart, textPart] },
      config: { responseMimeType: "application/json", responseSchema: schema },
    });

    return {
      statusCode: 200,
      body: response.text, // Devuelve el JSON de Gemini como texto.
    };

  } catch (error) {
    console.error('Error en la función serverless:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ message: error.message || 'Ha ocurrido un error al procesar el PDF en el servidor.' }),
    };
  }
};