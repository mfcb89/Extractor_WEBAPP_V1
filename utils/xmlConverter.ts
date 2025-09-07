import type { UrbanisticProjectData, Vial } from '../types';

/**
 * Converts form data to an XML string, sanitizes it for ISO-8859-1,
 * and returns the result as a pure base64 encoded string of the ISO-8859-1 bytes.
 * @param data The form data object.
 * @returns A base64 encoded string.
 */
export const exportXmlAsBase64 = (data: UrbanisticProjectData): string => {
    const sanitizeForLatin1 = (str: any): string => {
        if (str === null || typeof str === 'undefined') {
            return '';
        }
        let s = String(str);
        // Basic XML sanitization
        s = s.replace(/&/g, '&amp;')
             .replace(/</g, '&lt;')
             .replace(/>/g, '&gt;')
             .replace(/"/g, '&quot;')
             .replace(/'/g, '&apos;');

        // Replace common non-ISO-8859-1 characters with equivalents
        s = s.replace(/[“”]/g, '"')
             .replace(/[‘’]/g, "'")
             .replace(/[–—]/g, '-')
             .replace(/€/g, 'EUR') // Euro sign is not in ISO-8859-1
             .replace(/…/g, '...'); // Ellipsis

        // Filter out any remaining characters not in the ISO-8859-1 range (0-255)
        let result = '';
        for (let i = 0; i < s.length; i++) {
            const charCode = s.charCodeAt(i);
            if (charCode <= 255) {
                result += s.charAt(i);
            }
        }
        return result;
    };

    const cdataLatin1 = (tagName: string, value: any): string => {
        return `<${tagName}><![CDATA[${sanitizeForLatin1(value)}]]></${tagName}>`;
    };

    const formatNum = (num: number | null | undefined): string => {
        if (num === null || typeof num === 'undefined' || isNaN(num)) return '';
        return String(num);
    };

    let xmlString = '<?xml version="1.0" encoding="ISO-8859-1"?>' + '<XML>';
    
    const { datosSolicitante, representanteNotificacion, descripcion, parcelasAfectadas, parametrosUrbanisticos, propietariosColindantes } = data;
    xmlString += cdataLatin1('IDFORM', 'DIC');
    xmlString += cdataLatin1('c0002', datosSolicitante.nombreRazonSocial);
    const nifCif = datosSolicitante.nifCif || '';
    const nifCifType = /^[A-Z]/.test(nifCif) ? 'CIF' : 'NIF';
    xmlString += `<NiXCiF_c0003>${cdataLatin1('c0003', nifCif)}${cdataLatin1('c0003_T', nifCifType)}</NiXCiF_c0003>`;
    xmlString += `<c0004><c0004Com1><![CDATA[]]></c0004Com1>${cdataLatin1('c0004Com1_T', datosSolicitante.provincia)}<c0004Com2><![CDATA[]]></c0004Com2>${cdataLatin1('c0004Com2_T', datosSolicitante.municipio)}</c0004>`;
    xmlString += cdataLatin1('c0007', datosSolicitante.callePlaza);
    xmlString += cdataLatin1('c0010', datosSolicitante.cp);
    xmlString += cdataLatin1('EMAILSOL', datosSolicitante.correoElectronico);
    xmlString += cdataLatin1('CANALSOL', 'TELEMATICA');

    xmlString += cdataLatin1('c0013', representanteNotificacion.nombreRazonSocial);
    xmlString += cdataLatin1('c0012', representanteNotificacion.apellidos);
    const nifRep = representanteNotificacion.nif || '';
    const nifRepType = /^[A-Z]/.test(nifRep) ? 'CIF' : 'NIF';
    xmlString += `<NiXCiF_c0014>${cdataLatin1('c0014', nifRep)}${cdataLatin1('c0014_T', nifRepType)}</NiXCiF_c0014>`;
    xmlString += cdataLatin1('c0022', representanteNotificacion.correoElectronico);
    xmlString += cdataLatin1('CANALREP', representanteNotificacion.canalPreferenteNotificacion || 'TELEMATICA');

    xmlString += cdataLatin1('RADIOI1', 'No');
    xmlString += cdataLatin1('RADIOI2', 'No');
    xmlString += cdataLatin1('RADIOI3', 'No');
    xmlString += cdataLatin1('RADIODT', 'Si');
    xmlString += cdataLatin1('RADIOT1', 'No');
    xmlString += cdataLatin1('RADIOT2', 'No');
    xmlString += cdataLatin1('RADIOT3', 'No');
    xmlString += cdataLatin1('RADIOT4', 'No');
    xmlString += cdataLatin1('RADIOT5', 'No');
    xmlString += cdataLatin1('RADIOT6', 'No');
    xmlString += cdataLatin1('RADIOT7', 'No');
    xmlString += cdataLatin1('RADIOT8', 'No');
    xmlString += cdataLatin1('RADIOE1', 'No');
    xmlString += cdataLatin1('RADIOO1', 'No');

    xmlString += cdataLatin1('ASUNTDESC', descripcion.asunto);
    xmlString += cdataLatin1('c0030', descripcion.descripcionActuacion);
    xmlString += cdataLatin1('leyCosteEjecu', formatNum(descripcion.costeEjecucionMaterial));
    xmlString += cdataLatin1('leyPorcentaje', formatNum(descripcion.porcentaje));
    xmlString += cdataLatin1('leyCoste', formatNum(descripcion.canon));
    xmlString += cdataLatin1('PLZVIG', descripcion.plazoVigencia);
    xmlString += cdataLatin1('c0034', descripcion.solicitudJustificacion);

    xmlString += '<c0140>';
    parcelasAfectadas.forEach(p => {
        xmlString += '<ITEM_c0140>';
        xmlString += cdataLatin1('CL00c0140', p.referenciaCatastral);
        xmlString += cdataLatin1('CL01c0140', '');
        xmlString += cdataLatin1('CL01c0140TeV', p.provincia);
        xmlString += cdataLatin1('CL02c0140', '');
        xmlString += cdataLatin1('CL02c0140TeV', p.localidad);
        xmlString += cdataLatin1('CL03c0140', p.poligono);
        xmlString += cdataLatin1('CL04c0140', p.parcela);
        xmlString += cdataLatin1('CL05c0140', formatNum(p.superficieParcela));
        xmlString += cdataLatin1('CL06c0140', formatNum(p.superficieVinculada));
        xmlString += '</ITEM_c0140>';
    });
    xmlString += '</c0140>';

    const totalSuperficieParcela = parcelasAfectadas.reduce((sum, p) => sum + (Number(p.superficieParcela) || 0), 0);
    const totalSuperficieVinculada = parcelasAfectadas.reduce((sum, p) => sum + (Number(p.superficieVinculada) || 0), 0);
    xmlString += cdataLatin1('c0141', formatNum(totalSuperficieParcela));
    xmlString += cdataLatin1('c0142', formatNum(totalSuperficieVinculada));

    xmlString += '<c0049>';
    parametrosUrbanisticos.construcciones.forEach(c => {
        xmlString += '<ITEM_c0049>';
        xmlString += cdataLatin1('CL00c0049', c.uso);
        xmlString += cdataLatin1('CL01c0049', formatNum(c.superficieOcupada));
        xmlString += cdataLatin1('CL02c0049', formatNum(c.numeroPlantas));
        xmlString += cdataLatin1('CL03c0049', formatNum(c.altura));
        xmlString += cdataLatin1('CL04c0049', formatNum(c.superficieConstruida));
        xmlString += cdataLatin1('CL05c0049', formatNum(c.edificabilidad));
        xmlString += cdataLatin1('CL06c0049', formatNum(c.separacionACaminos));
        xmlString += cdataLatin1('CL07c0049', formatNum(c.separacionALindes));
        xmlString += cdataLatin1('CL08c0049', formatNum(c.separacionAlEjeCaminos));
        xmlString += cdataLatin1('CL09c0049', formatNum(c.costeTransformacion));
        xmlString += cdataLatin1('CL10c0049', formatNum(c.costeTotal));
        xmlString += '</ITEM_c0049>';
    });
    xmlString += '</c0049>';

    xmlString += cdataLatin1('c0059', ''); 
    xmlString += '<c0060></c0060>';
    xmlString += cdataLatin1('c0061', '');
    xmlString += cdataLatin1('c0064', '');
    xmlString += cdataLatin1('c0065', '');
    xmlString += cdataLatin1('c0070', '');

    xmlString += '<c0071>';
    parametrosUrbanisticos.instalaciones.forEach(i => {
        xmlString += '<ITEM_c0071>';
        xmlString += cdataLatin1('CL00c0071', i.uso);
        xmlString += cdataLatin1('CL01c0071', formatNum(i.superficieOcupada));
        xmlString += cdataLatin1('CL02c0071', formatNum(i.superficieConstruida));
        xmlString += cdataLatin1('CL03c0071', formatNum(i.numeroPlantas));
        xmlString += cdataLatin1('CL04c0071', formatNum(i.altura));
        xmlString += cdataLatin1('CL05c0071', formatNum(i.edificabilidad));
        xmlString += cdataLatin1('CL06c0071', formatNum(i.separacionACaminos));
        xmlString += cdataLatin1('CL07c0071', formatNum(i.separacionALindes));
        xmlString += cdataLatin1('CL08c0071', formatNum(i.separacionAlEjeCaminos));
        xmlString += cdataLatin1('CL09c0071', formatNum(i.costeTransformacion));
        xmlString += cdataLatin1('CL10c0071', formatNum(i.costeTotal));
        xmlString += '</ITEM_c0071>';
    });
    
    parametrosUrbanisticos.viales.forEach((v: Vial) => {
        xmlString += '<ITEM_c0071>';
        xmlString += cdataLatin1('CL00c0071', 'Vial/Circulación');
        xmlString += cdataLatin1('CL01c0071', formatNum(v.superficieOcupada));
        xmlString += cdataLatin1('CL02c0071', '');
        xmlString += cdataLatin1('CL03c0071', '');
        xmlString += cdataLatin1('CL04c0071', '');
        xmlString += cdataLatin1('CL05c0071', '');
        xmlString += cdataLatin1('CL06c0071', '');
        xmlString += cdataLatin1('CL07c0071', '');
        xmlString += cdataLatin1('CL08c0071', '');
        xmlString += cdataLatin1('CL09c0071', formatNum(v.costeTransformacion));
        xmlString += cdataLatin1('CL10c0071', '');
        xmlString += '</ITEM_c0071>';
    });
    xmlString += '</c0071>';
    
    xmlString += cdataLatin1('c0081', '');
    xmlString += cdataLatin1('c0082', '');
    xmlString += cdataLatin1('c0085', '');
    xmlString += cdataLatin1('c0135', '');
    xmlString += cdataLatin1('c0134', '');
    xmlString += cdataLatin1('SUPVINC', formatNum(totalSuperficieVinculada));

    xmlString += cdataLatin1('ad1', '');
    xmlString += cdataLatin1('ad2', '');
    xmlString += cdataLatin1('ad3', '');
    xmlString += cdataLatin1('ad4', '');
    xmlString += cdataLatin1('ad5', '');
    xmlString += cdataLatin1('ad6', '');
    xmlString += cdataLatin1('ad7', '');
    xmlString += cdataLatin1('ad8', '');

    xmlString += cdataLatin1('c0130', parametrosUrbanisticos.tecnicoRedactor.nombre);
    xmlString += cdataLatin1('c0131', parametrosUrbanisticos.tecnicoRedactor.titulacion);
    xmlString += cdataLatin1('c0132', parametrosUrbanisticos.tecnicoRedactor.colegiadoNumero);

    xmlString += '<c0143>';
    propietariosColindantes.forEach(pc => {
        xmlString += '<ITEM_c0143>';
        xmlString += cdataLatin1('CL00c0143', pc.nombre);
        xmlString += cdataLatin1('CL01c0143', '');
        xmlString += cdataLatin1('CL01c0143TeV', '');
        xmlString += cdataLatin1('CL02c0143', '');
        xmlString += cdataLatin1('CL02c0143TeV', '');
        xmlString += cdataLatin1('CL03c0143', pc.direccionCompleta);
        xmlString += cdataLatin1('CL04c0143', '');
        xmlString += cdataLatin1('CL05c0143', '');
        xmlString += cdataLatin1('CL06c0143', '');
        xmlString += cdataLatin1('CL07c0143', pc.referenciaCatastral);
        xmlString += cdataLatin1('CL08c0143', '');
        xmlString += cdataLatin1('CL08c0143TeV', '');
        xmlString += cdataLatin1('CL09c0143', '');
        xmlString += cdataLatin1('CL09c0143TeV', '');
        xmlString += cdataLatin1('CL10c0143', '');
        xmlString += cdataLatin1('CL11c0143', '');
        xmlString += '</ITEM_c0143>';
    });
    xmlString += '</c0143>';
    
    xmlString += '</XML>';

    // The `btoa` function in browsers expects a string where each character's
    // code point is in the range 0-255. Our sanitized string fits this requirement.
    return btoa(xmlString);
};