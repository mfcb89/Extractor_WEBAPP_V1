import React, { useState, useEffect } from 'react';
import { FileUpload } from './components/FileUpload';
import { Loader } from './components/Loader';
import { extractDataFromPdf } from './services/geminiService';
import { exportXmlAsBase64 } from './utils/xmlConverter';
import type { UrbanisticProjectData, ParcelaAfectada, Construccion, Instalacion, PropietarioColindante, Vial } from './types';
import { Notification, NotificationType } from './components/Notification';
import { TrashIcon } from './components/icons/TrashIcon';
import { ExclamationTriangleIcon } from './components/icons/ExclamationTriangleIcon';

// Estructura de datos vacía para inicializar el formulario
const BLANK_FORM_DATA: UrbanisticProjectData = {
  datosSolicitante: {
    nombreRazonSocial: '', apellidos: '', nifCif: '', provincia: '', municipio: '', callePlaza: '', cp: '', correoElectronico: ''
  },
  representanteNotificacion: {
    nombreRazonSocial: '', apellidos: '', nif: '', correoElectronico: '', canalPreferenteNotificacion: ''
  },
  tipoDeUso: {
    categoriaActividad: '', subcategoriaEspecifica: '', seleccion: null
  },
  descripcion: {
    asunto: '', descripcionActuacion: '', costeEjecucionMaterial: null, porcentaje: null, canon: null, plazoVigencia: '', solicitudJustificacion: ''
  },
  parcelasAfectadas: [],
  parametrosUrbanisticos: {
    construcciones: [],
    instalaciones: [],
    viales: [],
    tecnicoRedactor: {
      nombre: '', titulacion: '', colegiadoNumero: ''
    },
  },
  propietariosColindantes: [],
};

const tabsConfig = [
  { name: 'Datos del solicitante/Empresa', errorKey: 'datosSolicitante' },
  { name: 'Representante/Notificación', errorKey: 'representanteNotificacion' },
  { name: 'Tipo de uso', errorKey: 'tipoDeUso' },
  { name: 'Descripción', errorKey: 'descripcion' },
  { name: 'Parcelas afectadas', errorKey: 'parcelasAfectadas' },
  { name: 'Parámetros urbanísticos', errorKey: 'parametrosUrbanisticos' },
  { name: 'Propietarios colindantes', errorKey: 'propietariosColindantes' }
];

const FormField = ({ label, id, value, onChange, error, type = "text", required = true, children }: any) => (
  <div className="mb-4">
    <label htmlFor={id} className="block text-sm font-medium text-slate-300 mb-1.5">{label}{required && <span className="text-red-500 ml-1">*</span>}</label>
    {children ? (
      children
    ) : (
      <input
        type={type}
        id={id}
        name={id}
        value={value || ''}
        onChange={onChange}
        aria-invalid={!!error}
        aria-describedby={error ? `${id}-error` : undefined}
        className={`w-full bg-slate-700 border ${error ? 'border-red-500' : 'border-slate-600'} rounded-md shadow-sm px-3 py-2 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500`}
      />
    )}
    {error && <p id={`${id}-error`} className="mt-1.5 text-sm text-red-400">{error}</p>}
  </div>
);

function App() {
  const [formData, setFormData] = useState<UrbanisticProjectData>(BLANK_FORM_DATA);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [notification, setNotification] = useState<{ message: string; type: NotificationType } | null>(null);
  const [validationErrors, setValidationErrors] = useState<any>({});
  const [activeTab, setActiveTab] = useState<string>(tabsConfig[0].name);

  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => setNotification(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [notification]);

  const handleFileChange = async (selectedFile: File | null) => {
    setFormData(BLANK_FORM_DATA);
    setNotification(null);
    setValidationErrors({});
    if (!selectedFile) return;

    setIsLoading(true);
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const base64 = (reader.result as string)?.split(',')[1];
        if (!base64) throw new Error("Could not read file content.");
        const data = await extractDataFromPdf(base64);
        setFormData(data);
        setNotification({ message: 'Datos extraídos del PDF correctamente.', type: 'success' });
      } catch (e) {
        const errorMessage = e instanceof Error ? e.message : 'An unknown error occurred.';
        setNotification({ message: errorMessage, type: 'error' });
      } finally {
        setIsLoading(false);
      }
    };
    reader.onerror = () => {
      setNotification({ message: 'Failed to read file.', type: 'error' });
      setIsLoading(false);
    };
    reader.readAsDataURL(selectedFile);
  };
  
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    const [section, field] = name.split('.');
    
    // @ts-ignore
    const val = type === 'checkbox' ? e.target.checked : value;

    if (section && field) {
      // @ts-ignore
      setFormData(prev => ({ ...prev, [section]: { ...prev[section], [field]: val } }));
    } else {
      // @ts-ignore
      setFormData(prev => ({ ...prev, [name]: val }));
    }
  };
  
  const handleNestedInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    const [section, subSection, field] = name.split('.');
    // @ts-ignore
    setFormData(prev => ({ ...prev, [section]: { ...prev[section], [subSection]: { ...prev[section][subSection], [field]: value }}}));
  };

  const handleTableChange = (tableName: keyof UrbanisticProjectData, index: number, field: string, value: string) => {
    setFormData(prev => {
      // @ts-ignore
      const newTable = [...prev[tableName]];
      // @ts-ignore
      newTable[index] = { ...newTable[index], [field]: value };
      return { ...prev, [tableName]: newTable };
    });
  };

  const handleNestedTableChange = (section: keyof UrbanisticProjectData, tableName: string, index: number, field: string, value: any) => {
    setFormData(prev => {
      // @ts-ignore
      const tableData = prev[section][tableName] as any[];
      const newTable = [...tableData];
      newTable[index] = { ...newTable[index], [field]: value };
      // @ts-ignore
      return { ...prev, [section]: { ...prev[section], [tableName]: newTable }};
    });
  };

  const addRow = (tableName: keyof UrbanisticProjectData, newRow: any) => {
    // @ts-ignore
    setFormData(prev => ({ ...prev, [tableName]: [...prev[tableName], newRow] }));
  };

  const addNestedRow = (section: keyof UrbanisticProjectData, tableName: string, newRow: any) => {
    // @ts-ignore
    setFormData(prev => ({ ...prev, [section]: { ...prev[section], [tableName]: [...prev[section][tableName], newRow]}}));
  };
  
  const removeRow = (tableName: keyof UrbanisticProjectData, index: number) => {
    // @ts-ignore
    setFormData(prev => ({ ...prev, [tableName]: prev[tableName].filter((_: any, i: number) => i !== index) }));
  };
  
  const removeNestedRow = (section: keyof UrbanisticProjectData, tableName: string, index: number) => {
    // @ts-ignore
    setFormData(prev => ({ ...prev, [section]: { ...prev[section], [tableName]: prev[section][tableName].filter((_: any, i:number) => i !== index) }}));
  };

  const validateForm = (): boolean => {
    const newErrors: any = {};
    let firstErrorTab: string | null = null;
    let isValid = true;

    // Helper to set errors and track the first tab with an error
    const setError = (tabName: string, section: string, field: string, message: string) => {
        isValid = false;
        if (!newErrors[section]) newErrors[section] = {};
        newErrors[section][field] = message;
        if (!firstErrorTab) firstErrorTab = tabName;
    };

    if (!formData.datosSolicitante.nombreRazonSocial) setError(tabsConfig[0].name, 'datosSolicitante', 'nombreRazonSocial', 'El nombre es obligatorio.');
    if (formData.datosSolicitante.correoElectronico && !/\S+@\S+\.\S+/.test(formData.datosSolicitante.correoElectronico)) setError(tabsConfig[0].name, 'datosSolicitante', 'correoElectronico', 'El formato del correo electrónico no es válido.');
    if (formData.representanteNotificacion.correoElectronico && !/\S+@\S+\.\S+/.test(formData.representanteNotificacion.correoElectronico)) setError(tabsConfig[1].name, 'representanteNotificacion', 'correoElectronico', 'El formato del correo electrónico no es válido.');

    // --- Parámetros Urbanísticos Validation ---
    const parametrosTabName = tabsConfig[5].name;
    const parametrosErrors: any = { construcciones: [], instalaciones: [], viales: [] };
    let hasParametrosError = false;

    const validatePositiveNumber = (value: any) => {
        if (value === null || value === undefined || String(value).trim() === '') {
            return true; // Empty values are valid
        }
        const num = Number(value);
        return !isNaN(num) && num >= 0;
    };
    
    const numericFields = ['superficieOcupada', 'superficieConstruida', 'edificabilidad', 'numeroPlantas', 'altura', 'volumen', 'separacionAlEjeCaminos', 'separacionACaminos', 'separacionALindes', 'costeTransformacion', 'costeTotal'];

    // Validate Construcciones
    formData.parametrosUrbanisticos.construcciones.forEach((item, index) => {
        const itemErrors: any = {};
        numericFields.forEach(field => {
            // @ts-ignore
            if (!validatePositiveNumber(item[field])) {
                itemErrors[field] = 'Debe ser un valor positivo.';
                hasParametrosError = true;
            }
        });
        parametrosErrors.construcciones[index] = itemErrors;
    });

    // Validate Instalaciones
    formData.parametrosUrbanisticos.instalaciones.forEach((item, index) => {
        const itemErrors: any = {};
        numericFields.forEach(field => {
            // @ts-ignore
            if (!validatePositiveNumber(item[field])) {
                itemErrors[field] = 'Debe ser un valor positivo.';
                hasParametrosError = true;
            }
        });
        parametrosErrors.instalaciones[index] = itemErrors;
    });
    
    // Validate Viales
    const vialFields = ['superficieOcupada', 'costeTransformacion'];
    formData.parametrosUrbanisticos.viales.forEach((item, index) => {
        const itemErrors: any = {};
        vialFields.forEach(field => {
            // @ts-ignore
            if (!validatePositiveNumber(item[field])) {
                itemErrors[field] = 'Debe ser un valor positivo.';
                hasParametrosError = true;
            }
        });
        parametrosErrors.viales[index] = itemErrors;
    });

    if (hasParametrosError) {
        isValid = false;
        newErrors.parametrosUrbanisticos = parametrosErrors;
        if (!firstErrorTab) firstErrorTab = parametrosTabName;
    }

    setValidationErrors(newErrors);
    if (!isValid && firstErrorTab) {
        setActiveTab(firstErrorTab);
    }
    return isValid;
  };
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validateForm()) {
        setNotification({ message: 'Formulario validado correctamente. Listo para ser enviado.', type: 'success' });
        console.log("Datos enviados:", formData);
    } else {
        setNotification({ message: 'Se encontraron errores en el formulario. Por favor, corríjalos.', type: 'error' });
    }
  };

  const handleExportXml = () => {
    if (validateForm()) {
      try {
          const base64Xml = exportXmlAsBase64(formData);
          const dataUri = `data:application/xml;base64,${base64Xml}`;
          
          const a = document.createElement('a');
          a.href = dataUri;
          a.download = 'formulario_dic.xml';
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);

          setNotification({ message: 'Archivo XML exportado con éxito.', type: 'success'});
      } catch (error) {
          console.error("Error generating XML:", error);
          setNotification({ message: 'Se ha producido un error al generar el archivo XML.', type: 'error'});
      }
    } else {
        setNotification({ message: 'Se encontraron errores en el formulario. Por favor, corríjalos antes de exportar.', type: 'error' });
    }
  };

  const renderTabContent = () => {
    const newConstructionRow = { uso: '', superficieOcupada: null, superficieConstruida: null, edificabilidad: null, numeroPlantas: null, altura: null, volumen: null, separacionAlEjeCaminos: null, separacionACaminos: null, separacionALindes: null, costeTransformacion: null, costeTotal: null };
    const newInstalacionRow = { ...newConstructionRow };
    const newVialRow = { superficieOcupada: null, costeTransformacion: null };
    
    switch (activeTab) {
      case tabsConfig[0].name: return <DatosSolicitanteTab data={formData.datosSolicitante} handleChange={handleInputChange} errors={validationErrors.datosSolicitante || {}} />;
      case tabsConfig[1].name: return <RepresentanteTab data={formData.representanteNotificacion} handleChange={handleInputChange} errors={validationErrors.representanteNotificacion || {}} />;
      case tabsConfig[2].name: return <TipoUsoTab data={formData.tipoDeUso} handleChange={handleInputChange} errors={validationErrors.tipoDeUso || {}} />;
      case tabsConfig[3].name: return <DescripcionTab data={formData.descripcion} handleChange={handleInputChange} errors={validationErrors.descripcion || {}} />;
      case tabsConfig[4].name: return <ParcelasAfectadasTab data={formData.parcelasAfectadas} handleAdd={() => addRow('parcelasAfectadas', { referenciaCatastral: '', provincia: '', localidad: '', poligono: '', parcela: '', superficieParcela: null, superficieVinculada: null, totalSuperficie: null })} handleRemove={(index) => removeRow('parcelasAfectadas', index)} handleChange={(index, field, value) => handleTableChange('parcelasAfectadas', index, field, value)} errors={validationErrors.parcelasAfectadas || []} />;
      case tabsConfig[5].name: return <ParametrosUrbanisticosTab 
          data={formData.parametrosUrbanisticos} 
          handleAddConstruction={() => addNestedRow('parametrosUrbanisticos', 'construcciones', newConstructionRow)} 
          handleRemoveConstruction={(index) => removeNestedRow('parametrosUrbanisticos', 'construcciones', index)} 
          handleChangeConstruction={(index, field, value) => handleNestedTableChange('parametrosUrbanisticos', 'construcciones', index, field, value)} 
          handleAddInstalacion={() => addNestedRow('parametrosUrbanisticos', 'instalaciones', newInstalacionRow)} 
          handleRemoveInstalacion={(index) => removeNestedRow('parametrosUrbanisticos', 'instalaciones', index)} 
          handleChangeInstalacion={(index, field, value) => handleNestedTableChange('parametrosUrbanisticos', 'instalaciones', index, field, value)}
          handleAddVial={() => addNestedRow('parametrosUrbanisticos', 'viales', newVialRow)}
          handleRemoveVial={(index) => removeNestedRow('parametrosUrbanisticos', 'viales', index)}
          handleChangeVial={(index, field, value) => handleNestedTableChange('parametrosUrbanisticos', 'viales', index, field, value)}
          handleTecnicoChange={handleNestedInputChange} 
          errors={validationErrors.parametrosUrbanisticos || {}} />;
      case tabsConfig[6].name: return <PropietariosColindantesTab data={formData.propietariosColindantes} handleAdd={() => addRow('propietariosColindantes', { nombre: '', direccionCompleta: '', referenciaCatastral: '' })} handleRemove={(index) => removeRow('propietariosColindantes', index)} handleChange={(index, field, value) => handleTableChange('propietariosColindantes', index, field, value)} errors={validationErrors.propietariosColindantes || []} />;
      default: return null;
    }
  };
  
  const hasErrorsInTab = (errorKey: string) => {
    const errors = validationErrors[errorKey];
    if (!errors) return false;

    if (errorKey === 'parametrosUrbanisticos') {
        return (errors.construcciones && errors.construcciones.some((item: any) => item && Object.keys(item).length > 0)) ||
               (errors.instalaciones && errors.instalaciones.some((item: any) => item && Object.keys(item).length > 0)) ||
               (errors.viales && errors.viales.some((item: any) => item && Object.keys(item).length > 0));
    }

    if (Array.isArray(errors)) return errors.some(item => item && Object.keys(item).length > 0);
    return Object.keys(errors).length > 0;
  };

  return (
    <div className="bg-slate-900 min-h-screen text-slate-200 font-sans">
      {notification && <Notification message={notification.message} type={notification.type} onClose={() => setNotification(null)} />}
      <main className="container mx-auto px-4 py-8 max-w-7xl">
        <header className="text-center mb-10">
          <h1 className="text-4xl font-bold text-cyan-400 mb-2 tracking-tight">Extractor de Datos Urbanísticos</h1>
          <p className="text-slate-400 max-w-2xl mx-auto">Sube un PDF para rellenar automáticamente el formulario usando IA. Luego, revisa, valida y exporta los datos.</p>
        </header>

        <section className="mb-10 max-w-3xl mx-auto">
          <FileUpload onFileChange={handleFileChange} />
        </section>

        {isLoading && <Loader />}
        
        {!isLoading && (
          <form onSubmit={handleSubmit} noValidate>
            <div className="bg-slate-800 rounded-lg shadow-2xl shadow-slate-950/50 ring-1 ring-slate-700">
              <div className="px-6 pt-2 border-b border-slate-700">
                <nav className="-mb-px flex space-x-4 overflow-x-auto" aria-label="Tabs">
                  {tabsConfig.map(tab => {
                    const hasError = hasErrorsInTab(tab.errorKey);
                    return (
                      <button
                        key={tab.name}
                        type="button"
                        onClick={() => setActiveTab(tab.name)}
                        className={`group whitespace-nowrap shrink-0 px-1 py-4 text-sm font-medium transition-colors duration-200 focus:outline-none flex items-center gap-2 ${activeTab === tab.name ? 'border-b-2 border-cyan-400 text-cyan-400' : `border-b-2 border-transparent text-slate-400 hover:text-slate-200 ${hasError ? 'text-red-400' : ''}`}`}
                        aria-current={activeTab === tab.name ? 'page' : undefined}
                      >
                        {hasError && <ExclamationTriangleIcon className="w-4 h-4 text-red-500" />}
                        {tab.name}
                      </button>
                    )
                  })}
                </nav>
              </div>
              <div className="p-6">
                {renderTabContent()}
              </div>
            </div>
            <div className="mt-8 flex justify-end items-center gap-4">
              <button type="button" onClick={handleExportXml} className="bg-slate-600 hover:bg-slate-500 text-white font-bold py-2.5 px-6 rounded-lg transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-2 focus:ring-offset-slate-900 shadow-md">
                Exportar XML
              </button>
              <button type="submit" className="bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white font-bold py-2.5 px-6 rounded-lg transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:ring-offset-2 focus:ring-offset-slate-900 shadow-lg shadow-cyan-500/20 hover:shadow-xl hover:shadow-cyan-500/30">
                Validar y Enviar
              </button>
            </div>
          </form>
        )}
      </main>
      <footer className="text-center py-6 text-slate-500 text-sm">
        <p>Powered by Google Gemini</p>
      </footer>
    </div>
  );
}

// --- Tab Components ---

const DatosSolicitanteTab = ({ data, handleChange, errors }: any) => (
  <div className="grid md:grid-cols-2 gap-x-6">
    <FormField label="Nombre / Razón social" id="datosSolicitante.nombreRazonSocial" value={data.nombreRazonSocial} onChange={handleChange} error={errors.nombreRazonSocial} />
    <FormField label="Apellidos" id="datosSolicitante.apellidos" value={data.apellidos} onChange={handleChange} error={errors.apellidos} required={false} />
    <FormField label="NIF / CIF" id="datosSolicitante.nifCif" value={data.nifCif} onChange={handleChange} error={errors.nifCif} />
    <FormField label="Correo electrónico" id="datosSolicitante.correoElectronico" value={data.correoElectronico} onChange={handleChange} error={errors.correoElectronico} type="email" />
    <FormField label="Provincia" id="datosSolicitante.provincia" value={data.provincia} onChange={handleChange} error={errors.provincia} />
    <FormField label="Municipio" id="datosSolicitante.municipio" value={data.municipio} onChange={handleChange} error={errors.municipio} />
    <FormField label="Calle / Plaza" id="datosSolicitante.callePlaza" value={data.callePlaza} onChange={handleChange} error={errors.callePlaza} />
    <FormField label="CP" id="datosSolicitante.cp" value={data.cp} onChange={handleChange} error={errors.cp} />
  </div>
);

const RepresentanteTab = ({ data, handleChange, errors }: any) => (
  <div className="grid md:grid-cols-2 gap-x-6">
    <FormField label="Nombre / Razón social" id="representanteNotificacion.nombreRazonSocial" value={data.nombreRazonSocial} onChange={handleChange} error={errors.nombreRazonSocial} />
    <FormField label="Apellidos" id="representanteNotificacion.apellidos" value={data.apellidos} onChange={handleChange} error={errors.apellidos} required={false}/>
    <FormField label="NIF" id="representanteNotificacion.nif" value={data.nif} onChange={handleChange} error={errors.nif} />
    <FormField label="Correo electrónico" id="representanteNotificacion.correoElectronico" value={data.correoElectronico} onChange={handleChange} error={errors.correoElectronico} type="email" />
    <FormField label="Canal preferente notificación" id="representanteNotificacion.canalPreferenteNotificacion" value={data.canalPreferenteNotificacion} onChange={handleChange} error={errors.canalPreferenteNotificacion} />
  </div>
);

const TipoUsoTab = ({ data, handleChange, errors }: any) => (
  <div className="grid md:grid-cols-2 gap-x-6">
    <FormField label="Categoría de Actividad" id="tipoDeUso.categoriaActividad" value={data.categoriaActividad} onChange={handleChange} error={errors.categoriaActividad} />
    <FormField label="Subcategoría Específica" id="tipoDeUso.subcategoriaEspecifica" value={data.subcategoriaEspecifica} onChange={handleChange} error={errors.subcategoriaEspecifica} />
    <FormField label="Selección" id="tipoDeUso.seleccion" required={false}>
      <div className="flex items-center space-x-6 mt-2">
        <label className="flex items-center cursor-pointer"><input type="radio" name="tipoDeUso.seleccion" value="true" checked={data.seleccion === true} onChange={() => handleChange({ target: { name: 'tipoDeUso.seleccion', value: true, type: 'radio' } })} className="form-radio h-4 w-4 text-cyan-600 bg-slate-700 border-slate-600 focus:ring-cyan-500" /> <span className="ml-2 text-slate-200">Sí</span></label>
        <label className="flex items-center cursor-pointer"><input type="radio" name="tipoDeUso.seleccion" value="false" checked={data.seleccion === false} onChange={() => handleChange({ target: { name: 'tipoDeUso.seleccion', value: false, type: 'radio' } })} className="form-radio h-4 w-4 text-cyan-600 bg-slate-700 border-slate-600 focus:ring-cyan-500" /> <span className="ml-2 text-slate-200">No</span></label>
      </div>
    </FormField>
  </div>
);

const DescripcionTab = ({ data, handleChange, errors }: any) => (
  <div className="grid md:grid-cols-2 gap-x-6">
    <FormField label="Asunto" id="descripcion.asunto" value={data.asunto} onChange={handleChange} error={errors.asunto} />
    <FormField label="Coste ejecución material (€)" id="descripcion.costeEjecucionMaterial" value={data.costeEjecucionMaterial} onChange={handleChange} error={errors.costeEjecucionMaterial} type="number" />
    <FormField label="Porcentaje (%)" id="descripcion.porcentaje" value={data.porcentaje} onChange={handleChange} error={errors.porcentaje} type="number" />
    <FormField label="Canon (€)" id="descripcion.canon" value={data.canon} onChange={handleChange} error={errors.canon} type="number" />
    <FormField label="Plazo de vigencia" id="descripcion.plazoVigencia" value={data.plazoVigencia} onChange={handleChange} error={errors.plazoVigencia} />
    <div className="md:col-span-2">
      <FormField label="Descripción de la actuación" id="descripcion.descripcionActuacion" value={data.descripcionActuacion} required={false}>
          <textarea id="descripcion.descripcionActuacion" name="descripcion.descripcionActuacion" rows={3} value={data.descripcionActuacion || ''} onChange={handleChange} className="w-full bg-slate-700 border border-slate-600 rounded-md shadow-sm px-3 py-2 focus:outline-none focus:ring-2 focus:ring-cyan-500"></textarea>
      </FormField>
      <FormField label="Solicitud (Justificación)" id="descripcion.solicitudJustificacion" value={data.solicitudJustificacion}>
          <textarea id="descripcion.solicitudJustificacion" name="descripcion.solicitudJustificacion" rows={4} value={data.solicitudJustificacion || ''} onChange={handleChange} className="w-full bg-slate-700 border border-slate-600 rounded-md shadow-sm px-3 py-2 focus:outline-none focus:ring-2 focus:ring-cyan-500"></textarea>
      </FormField>
    </div>
  </div>
);

const Table = ({ headers, children, isEmpty, emptyMessage }: { headers: string[], children: React.ReactNode, isEmpty: boolean, emptyMessage: string }) => (
  <div className="overflow-x-auto rounded-lg ring-1 ring-slate-700">
    <table className="min-w-full divide-y divide-slate-700">
      <thead className="bg-slate-900/50">
        <tr>
          {headers.map(header => <th key={header} scope="col" className="px-3 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">{header}</th>)}
        </tr>
      </thead>
      <tbody className="bg-slate-800 divide-y divide-slate-700">
        {isEmpty ? (
          <tr>
            <td colSpan={headers.length} className="text-center py-8 text-slate-400">{emptyMessage}</td>
          </tr>
        ) : (
          children
        )}
      </tbody>
    </table>
  </div>
);

const TableRowInput = ({ value, onChange }: { value: any, onChange: (e: React.ChangeEvent<HTMLInputElement>) => void }) => (
    <input type="text" value={value || ''} onChange={onChange} className="w-full bg-transparent px-3 py-2 border-0 focus:outline-none focus:ring-1 focus:ring-cyan-500 rounded-sm text-sm" />
);

const TableInputCell = ({ value, onChange, error }: { value: any, onChange: (e: React.ChangeEvent<HTMLInputElement>) => void, error?: string }) => (
    <td className="px-1 py-1 align-top whitespace-nowrap">
        <div className="w-28">
            <input 
                type="text" 
                value={value || ''} 
                onChange={onChange} 
                className={`w-full bg-transparent px-2 py-2 border ${error ? 'border-red-500' : 'border-transparent'} focus:outline-none focus:ring-1 focus:ring-cyan-500 rounded-sm text-sm`} 
            />
            {error && <p className="mt-1 text-xs text-red-400 px-2">{error}</p>}
        </div>
    </td>
);

const ParcelasAfectadasTab = ({ data, handleAdd, handleRemove, handleChange }: { data: ParcelaAfectada[], handleAdd: () => void, handleRemove: (index: number) => void, handleChange: (index: number, field: keyof ParcelaAfectada, value: string) => void, errors: any[] }) => (
  <div>
    <h3 className="text-xl font-semibold mb-4 text-slate-100">Parcelas afectadas</h3>
    <Table headers={['Ref. catastral', 'Provincia', 'Localidad', 'Polígono', 'Parcela', 'Sup. parcela m²', 'Sup. vinculada m²', 'Total m²', 'Acciones']} isEmpty={!data.length} emptyMessage="Aún no se han añadido parcelas.">
      {data.map((row, index) => (
        <tr key={index} className="hover:bg-slate-700/50 even:bg-slate-800/50">
          <td><TableRowInput value={row.referenciaCatastral} onChange={e => handleChange(index, 'referenciaCatastral', e.target.value)} /></td>
          <td><TableRowInput value={row.provincia} onChange={e => handleChange(index, 'provincia', e.target.value)} /></td>
          <td><TableRowInput value={row.localidad} onChange={e => handleChange(index, 'localidad', e.target.value)} /></td>
          <td><TableRowInput value={row.poligono} onChange={e => handleChange(index, 'poligono', e.target.value)} /></td>
          <td><TableRowInput value={row.parcela} onChange={e => handleChange(index, 'parcela', e.target.value)} /></td>
          <td><TableRowInput value={row.superficieParcela} onChange={e => handleChange(index, 'superficieParcela', e.target.value)} /></td>
          <td><TableRowInput value={row.superficieVinculada} onChange={e => handleChange(index, 'superficieVinculada', e.target.value)} /></td>
          <td><TableRowInput value={row.totalSuperficie} onChange={e => handleChange(index, 'totalSuperficie', e.target.value)} /></td>
          <td className="px-3 py-2 text-center"><button type="button" onClick={() => handleRemove(index)} aria-label="Eliminar fila" className="text-slate-400 hover:text-red-500 p-1 rounded-full transition-colors"><TrashIcon className="w-5 h-5"/></button></td>
        </tr>
      ))}
    </Table>
    <button type="button" onClick={handleAdd} className="mt-4 bg-slate-600 hover:bg-slate-500 text-white font-bold py-2 px-4 rounded-md text-sm transition-colors">Añadir Fila</button>
  </div>
);

const ParametrosUrbanisticosTab = ({ data, handleAddConstruction, handleRemoveConstruction, handleChangeConstruction, handleAddInstalacion, handleRemoveInstalacion, handleChangeInstalacion, handleAddVial, handleRemoveVial, handleChangeVial, handleTecnicoChange, errors }: any) => {
    const construccionHeaders = ['Uso', 'Sup. Ocup. m²', 'Sup. Const. m²', 'Edific.', 'Nº Plantas', 'Altura', 'Volumen', 'Sep. Eje', 'Sep. Camino', 'Sep. Lindes', 'Coste Transf. €/m²', 'Coste Total €', 'Acción'];
    const errorsConstrucciones = errors?.construcciones || [];
    const errorsInstalaciones = errors?.instalaciones || [];
    const errorsViales = errors?.viales || [];
    
    return (
      <div className="space-y-10">
        <div>
          <h3 className="text-xl font-semibold mb-4 text-slate-100">Construcciones</h3>
          <Table headers={construccionHeaders} isEmpty={!data.construcciones.length} emptyMessage="Aún no se han añadido construcciones.">
            {data.construcciones.map((row: Construccion, index: number) => (
              <tr key={index} className="hover:bg-slate-700/50 even:bg-slate-800/50">
                <TableInputCell value={row.uso} onChange={e => handleChangeConstruction(index, 'uso', e.target.value)} error={errorsConstrucciones[index]?.uso}/>
                <TableInputCell value={row.superficieOcupada} onChange={e => handleChangeConstruction(index, 'superficieOcupada', e.target.value)} error={errorsConstrucciones[index]?.superficieOcupada}/>
                <TableInputCell value={row.superficieConstruida} onChange={e => handleChangeConstruction(index, 'superficieConstruida', e.target.value)} error={errorsConstrucciones[index]?.superficieConstruida}/>
                <TableInputCell value={row.edificabilidad} onChange={e => handleChangeConstruction(index, 'edificabilidad', e.target.value)} error={errorsConstrucciones[index]?.edificabilidad}/>
                <TableInputCell value={row.numeroPlantas} onChange={e => handleChangeConstruction(index, 'numeroPlantas', e.target.value)} error={errorsConstrucciones[index]?.numeroPlantas}/>
                <TableInputCell value={row.altura} onChange={e => handleChangeConstruction(index, 'altura', e.target.value)} error={errorsConstrucciones[index]?.altura}/>
                <TableInputCell value={row.volumen} onChange={e => handleChangeConstruction(index, 'volumen', e.target.value)} error={errorsConstrucciones[index]?.volumen}/>
                <TableInputCell value={row.separacionAlEjeCaminos} onChange={e => handleChangeConstruction(index, 'separacionAlEjeCaminos', e.target.value)} error={errorsConstrucciones[index]?.separacionAlEjeCaminos}/>
                <TableInputCell value={row.separacionACaminos} onChange={e => handleChangeConstruction(index, 'separacionACaminos', e.target.value)} error={errorsConstrucciones[index]?.separacionACaminos}/>
                <TableInputCell value={row.separacionALindes} onChange={e => handleChangeConstruction(index, 'separacionALindes', e.target.value)} error={errorsConstrucciones[index]?.separacionALindes}/>
                <TableInputCell value={row.costeTransformacion} onChange={e => handleChangeConstruction(index, 'costeTransformacion', e.target.value)} error={errorsConstrucciones[index]?.costeTransformacion}/>
                <TableInputCell value={row.costeTotal} onChange={e => handleChangeConstruction(index, 'costeTotal', e.target.value)} error={errorsConstrucciones[index]?.costeTotal}/>
                <td className="px-3 py-2 text-center align-middle"><button type="button" onClick={() => handleRemoveConstruction(index)} aria-label="Eliminar construcción" className="text-slate-400 hover:text-red-500 p-1 rounded-full transition-colors"><TrashIcon className="w-5 h-5"/></button></td>
              </tr>
            ))}
          </Table>
          <button type="button" onClick={handleAddConstruction} className="mt-4 bg-slate-600 hover:bg-slate-500 text-white font-bold py-2 px-4 rounded-md text-sm transition-colors">Añadir Construcción</button>
        </div>

        <div>
          <h3 className="text-xl font-semibold mb-4 text-slate-100">Instalaciones</h3>
          <Table headers={construccionHeaders} isEmpty={!data.instalaciones.length} emptyMessage="Aún no se han añadido instalaciones.">
            {data.instalaciones.map((row: Instalacion, index: number) => (
              <tr key={index} className="hover:bg-slate-700/50 even:bg-slate-800/50">
                <TableInputCell value={row.uso} onChange={e => handleChangeInstalacion(index, 'uso', e.target.value)} error={errorsInstalaciones[index]?.uso}/>
                <TableInputCell value={row.superficieOcupada} onChange={e => handleChangeInstalacion(index, 'superficieOcupada', e.target.value)} error={errorsInstalaciones[index]?.superficieOcupada}/>
                <TableInputCell value={row.superficieConstruida} onChange={e => handleChangeInstalacion(index, 'superficieConstruida', e.target.value)} error={errorsInstalaciones[index]?.superficieConstruida}/>
                <TableInputCell value={row.edificabilidad} onChange={e => handleChangeInstalacion(index, 'edificabilidad', e.target.value)} error={errorsInstalaciones[index]?.edificabilidad}/>
                <TableInputCell value={row.numeroPlantas} onChange={e => handleChangeInstalacion(index, 'numeroPlantas', e.target.value)} error={errorsInstalaciones[index]?.numeroPlantas}/>
                <TableInputCell value={row.altura} onChange={e => handleChangeInstalacion(index, 'altura', e.target.value)} error={errorsInstalaciones[index]?.altura}/>
                <TableInputCell value={row.volumen} onChange={e => handleChangeInstalacion(index, 'volumen', e.target.value)} error={errorsInstalaciones[index]?.volumen}/>
                <TableInputCell value={row.separacionAlEjeCaminos} onChange={e => handleChangeInstalacion(index, 'separacionAlEjeCaminos', e.target.value)} error={errorsInstalaciones[index]?.separacionAlEjeCaminos}/>
                <TableInputCell value={row.separacionACaminos} onChange={e => handleChangeInstalacion(index, 'separacionACaminos', e.target.value)} error={errorsInstalaciones[index]?.separacionACaminos}/>
                <TableInputCell value={row.separacionALindes} onChange={e => handleChangeInstalacion(index, 'separacionALindes', e.target.value)} error={errorsInstalaciones[index]?.separacionALindes}/>
                <TableInputCell value={row.costeTransformacion} onChange={e => handleChangeInstalacion(index, 'costeTransformacion', e.target.value)} error={errorsInstalaciones[index]?.costeTransformacion}/>
                <TableInputCell value={row.costeTotal} onChange={e => handleChangeInstalacion(index, 'costeTotal', e.target.value)} error={errorsInstalaciones[index]?.costeTotal}/>
                <td className="px-3 py-2 text-center align-middle"><button type="button" onClick={() => handleRemoveInstalacion(index)} aria-label="Eliminar instalación" className="text-slate-400 hover:text-red-500 p-1 rounded-full transition-colors"><TrashIcon className="w-5 h-5"/></button></td>
              </tr>
            ))}
          </Table>
          <button type="button" onClick={handleAddInstalacion} className="mt-4 bg-slate-600 hover:bg-slate-500 text-white font-bold py-2 px-4 rounded-md text-sm transition-colors">Añadir Instalación</button>
        </div>

        <div>
            <h3 className="text-xl font-semibold mb-4 text-slate-100">Viales</h3>
            <Table headers={['Sup. Ocupada m²', 'Coste Transf. (€/m²)', 'Acciones']} isEmpty={!data.viales.length} emptyMessage="Aún no se han añadido viales.">
                {data.viales.map((row: Vial, index: number) => (
                    <tr key={index} className="hover:bg-slate-700/50 even:bg-slate-800/50">
                        <TableInputCell value={row.superficieOcupada} onChange={e => handleChangeVial(index, 'superficieOcupada', e.target.value)} error={errorsViales[index]?.superficieOcupada} />
                        <TableInputCell value={row.costeTransformacion} onChange={e => handleChangeVial(index, 'costeTransformacion', e.target.value)} error={errorsViales[index]?.costeTransformacion} />
                        <td className="px-3 py-2 text-center align-middle"><button type="button" onClick={() => handleRemoveVial(index)} aria-label="Eliminar vial" className="text-slate-400 hover:text-red-500 p-1 rounded-full transition-colors"><TrashIcon className="w-5 h-5"/></button></td>
                    </tr>
                ))}
            </Table>
            <button type="button" onClick={handleAddVial} className="mt-4 bg-slate-600 hover:bg-slate-500 text-white font-bold py-2 px-4 rounded-md text-sm transition-colors">Añadir Vial</button>
        </div>
        
        <div>
            <h3 className="text-xl font-semibold mb-4 text-slate-100">Técnico redactor</h3>
            <div className="grid md:grid-cols-3 gap-x-6 p-4 bg-slate-900/50 rounded-md ring-1 ring-slate-700">
                <FormField label="Nombre" id="parametrosUrbanisticos.tecnicoRedactor.nombre" value={data.tecnicoRedactor.nombre} onChange={handleTecnicoChange} error={errors.tecnicoRedactor?.nombre} />
                <FormField label="Titulación" id="parametrosUrbanisticos.tecnicoRedactor.titulacion" value={data.tecnicoRedactor.titulacion} onChange={handleTecnicoChange} error={errors.tecnicoRedactor?.titulacion} />
                <FormField label="Colegiado nº" id="parametrosUrbanisticos.tecnicoRedactor.colegiadoNumero" value={data.tecnicoRedactor.colegiadoNumero} onChange={handleTecnicoChange} error={errors.tecnicoRedactor?.colegiadoNumero} />
            </div>
        </div>
      </div>
    );
};

const PropietariosColindantesTab = ({ data, handleAdd, handleRemove, handleChange }: { data: PropietarioColindante[], handleAdd: () => void, handleRemove: (index: number) => void, handleChange: (index: number, field: keyof PropietarioColindante, value: string) => void, errors: any[] }) => (
    <div>
      <h3 className="text-xl font-semibold mb-4 text-slate-100">Propietarios colindantes</h3>
      <Table headers={['Nombre', 'Dirección completa', 'Ref. catastral', 'Acciones']} isEmpty={!data.length} emptyMessage="Aún no se han añadido propietarios.">
          {data.map((row, index) => (
              <tr key={index} className="hover:bg-slate-700/50 even:bg-slate-800/50">
                  <td><TableRowInput value={row.nombre} onChange={e => handleChange(index, 'nombre', e.target.value)} /></td>
                  <td><TableRowInput value={row.direccionCompleta} onChange={e => handleChange(index, 'direccionCompleta', e.target.value)} /></td>
                  <td><TableRowInput value={row.referenciaCatastral} onChange={e => handleChange(index, 'referenciaCatastral', e.target.value)} /></td>
                  <td className="px-3 py-2 text-center"><button type="button" onClick={() => handleRemove(index)} aria-label="Eliminar propietario" className="text-slate-400 hover:text-red-500 p-1 rounded-full transition-colors"><TrashIcon className="w-5 h-5"/></button></td>
              </tr>
          ))}
      </Table>
      <button type="button" onClick={handleAdd} className="mt-4 bg-slate-600 hover:bg-slate-500 text-white font-bold py-2 px-4 rounded-md text-sm transition-colors">Añadir Fila</button>
    </div>
);

export default App;