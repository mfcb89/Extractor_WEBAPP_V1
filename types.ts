export interface Solicitante {
  nombreRazonSocial: string | null;
  apellidos: string | null;
  nifCif: string | null;
  provincia: string | null;
  municipio: string | null;
  callePlaza: string | null;
  cp: string | null;
  correoElectronico: string | null;
}

export interface Representante {
  nombreRazonSocial: string | null;
  apellidos: string | null;
  nif: string | null;
  correoElectronico: string | null;
  canalPreferenteNotificacion: string | null;
}

export interface TipoUso {
  categoriaActividad: string | null;
  subcategoriaEspecifica: string | null;
  seleccion: boolean | null;
}

export interface Descripcion {
  asunto: string | null;
  descripcionActuacion: string | null;
  costeEjecucionMaterial: number | null;
  porcentaje: number | null;
  canon: number | null;
  plazoVigencia: string | null;
  solicitudJustificacion: string | null;
}

export interface ParcelaAfectada {
  referenciaCatastral: string | null;
  provincia: string | null;
  localidad: string | null;
  poligono: string | null;
  parcela: string | null;
  superficieParcela: number | null;
  superficieVinculada: number | null;
  totalSuperficie: number | null;
}

export interface Construccion {
  uso: string | null;
  superficieOcupada: number | null;
  superficieConstruida: number | null;
  edificabilidad: number | null;
  numeroPlantas: number | null;
  altura: number | null;
  volumen: number | null;
  separacionAlEjeCaminos: number | null;
  separacionACaminos: number | null;
  separacionALindes: number | null;
  costeTransformacion: number | null;
  costeTotal: number | null;
}

export interface Instalacion {
  uso: string | null;
  superficieOcupada: number | null;
  superficieConstruida: number | null;
  edificabilidad: number | null;
  numeroPlantas: number | null;
  altura: number | null;
  volumen: number | null;
  separacionAlEjeCaminos: number | null;
  separacionACaminos: number | null;
  separacionALindes: number | null;
  costeTransformacion: number | null;
  costeTotal: number | null;
}

export interface Vial {
    superficieOcupada: number | null;
    costeTransformacion: number | null;
}

export interface TecnicoRedactor {
  nombre: string | null;
  titulacion: string | null;
  colegiadoNumero: string | null;
}

export interface PropietarioColindante {
  nombre: string | null;
  direccionCompleta: string | null;
  referenciaCatastral: string | null;
}

export interface UrbanisticProjectData {
  datosSolicitante: Solicitante;
  representanteNotificacion: Representante;
  tipoDeUso: TipoUso;
  descripcion: Descripcion;
  parcelasAfectadas: ParcelaAfectada[];
  parametrosUrbanisticos: {
    construcciones: Construccion[];
    instalaciones: Instalacion[];
    viales: Vial[];
    tecnicoRedactor: TecnicoRedactor;
  };
  propietariosColindantes: PropietarioColindante[];
}