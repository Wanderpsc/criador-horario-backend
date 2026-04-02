import { Building, Save, User, Printer, Upload, X, Eye } from 'lucide-react';
import { useEffect, useState, useRef } from 'react';
import toast from 'react-hot-toast';
import api from '../services/api';
import { invalidatePrintHeaderCache, buildPrintHeaderHtml, printHeaderCss, printFooterCss, buildPrintFooterHtml, type PrintHeaderData } from '../utils/printHeader';

interface ResponsibleData {
  responsibleName: string;
  responsibleCPF: string;
  responsiblePhone: string;
  responsibleEmail: string;
}

export default function SchoolSettings() {
  const [formData, setFormData] = useState({
    schoolName: '',
    workingDays: 5,
    academicYear: new Date().getFullYear()
  });

  const [responsibleData, setResponsibleData] = useState<ResponsibleData>({
    responsibleName: '',
    responsibleCPF: '',
    responsiblePhone: '',
    responsibleEmail: ''
  });

  const [loading, setLoading] = useState(false);
  const [editingResponsible, setEditingResponsible] = useState(false);

  // Print Header States
  const [printHeaderData, setPrintHeaderData] = useState<PrintHeaderData>({
    emblemBase64: '',
    emblemBase64Right: '',
    line1: '',
    line2: '',
    line3: '',
    line4: '',
    line5: '',
    line6: '',
    line7: '',
  });
  const [editingPrintHeader, setEditingPrintHeader] = useState(false);
  const [savingPrintHeader, setSavingPrintHeader] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const fileInputRightRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadSchoolData();
    loadPrintHeaderData();
  }, []);

  const loadSchoolData = async () => {
    try {
      const response = await api.get('/schools/profile');
      if (response.data.success) {
        const data = response.data.data;
        // Carregar dados da escola
        setFormData({
          schoolName: data.schoolName || '',
          workingDays: data.workingDays || 5,
          academicYear: data.academicYear || new Date().getFullYear()
        });
        // Carregar dados do responsável
        setResponsibleData({
          responsibleName: data.responsibleName || '',
          responsibleCPF: data.responsibleCPF || '',
          responsiblePhone: data.responsiblePhone || '',
          responsibleEmail: data.responsibleEmail || ''
        });
      }
    } catch (error: any) {
      console.error('Erro ao carregar dados:', error);
    }
  };

  const loadPrintHeaderData = async () => {
    try {
      const response = await api.get('/schools/print-header');
      if (response.data.success) {
        setPrintHeaderData({
          emblemBase64: response.data.data.printHeader?.emblemBase64 || '',
          emblemBase64Right: response.data.data.printHeader?.emblemBase64Right || '',
          line1: response.data.data.printHeader?.line1 || '',
          line2: response.data.data.printHeader?.line2 || '',
          line3: response.data.data.printHeader?.line3 || '',
          line4: response.data.data.printHeader?.line4 || '',
          line5: response.data.data.printHeader?.line5 || '',
          line6: response.data.data.printHeader?.line6 || '',
          line7: response.data.data.printHeader?.line7 || '',
          schoolName: response.data.data.schoolName || '',
        });
      }
    } catch (error: any) {
      console.error('Erro ao carregar cabeçalho:', error);
    }
  };

  const handleSavePrintHeader = async () => {
    setSavingPrintHeader(true);
    try {
      await api.put('/schools/print-header', {
        emblemBase64: printHeaderData.emblemBase64,
        emblemBase64Right: printHeaderData.emblemBase64Right,
        line1: printHeaderData.line1,
        line2: printHeaderData.line2,
        line3: printHeaderData.line3,
        line4: printHeaderData.line4,
        line5: printHeaderData.line5,
        line6: printHeaderData.line6,
        line7: printHeaderData.line7,
      });
      invalidatePrintHeaderCache();
      toast.success('Cabeçalho de impressão salvo com sucesso!');
      setEditingPrintHeader(false);
    } catch (error: any) {
      console.error('Erro ao salvar cabeçalho:', error);
      toast.error(error.response?.data?.message || 'Erro ao salvar cabeçalho');
    } finally {
      setSavingPrintHeader(false);
    }
  };

  const handleEmblemUpload = (e: React.ChangeEvent<HTMLInputElement>, side: 'left' | 'right' = 'left') => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      toast.error('Imagem muito grande (máximo 2MB)');
      return;
    }
    if (!file.type.startsWith('image/')) {
      toast.error('Arquivo deve ser uma imagem (PNG, JPG, etc.)');
      return;
    }
    const reader = new FileReader();
    reader.onload = (ev) => {
      const field = side === 'right' ? 'emblemBase64Right' : 'emblemBase64';
      setPrintHeaderData({ ...printHeaderData, [field]: ev.target?.result as string });
    };
    reader.readAsDataURL(file);
  };

  const handlePreviewPrintHeader = () => {
    const headerHtml = buildPrintHeaderHtml(printHeaderData);
    const win = window.open('', '_blank', 'width=700,height=300');
    if (!win) return;
    win.document.write(`<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Pré-visualização do Cabeçalho</title><style>
      body { font-family: Arial, sans-serif; margin: 30px; background: #f5f5f5; }
      .preview-box { background: #fff; padding: 20px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
      ${printHeaderCss}
      ${printFooterCss}
    </style></head><body><div class="preview-box">${headerHtml || '<p style="text-align:center;color:#999;">Nenhum cabeçalho configurado</p>'}</div>${buildPrintFooterHtml()}</body></html>`);
    win.document.close();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.put('/schools/profile', formData);
      toast.success('Configurações salvas com sucesso!');
      await loadSchoolData();
    } catch (error: any) {
      console.error('Erro ao salvar:', error);
      toast.error(error.response?.data?.message || 'Erro ao salvar configurações');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveResponsible = async () => {
    setLoading(true);
    try {
      await api.put('/schools/responsible', responsibleData);
      toast.success('Dados do responsável salvos com sucesso!');
      setEditingResponsible(false);
      await loadSchoolData();
    } catch (error: any) {
      console.error('Erro ao salvar:', error);
      toast.error(error.response?.data?.message || 'Erro ao salvar dados do responsável');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl">
      <div className="flex items-center gap-3 mb-6">
        <Building className="w-8 h-8 text-primary-600" />
        <h1 className="text-3xl font-bold text-gray-900">Configurações da Escola</h1>
      </div>

      <form onSubmit={handleSubmit} className="card space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Nome da Escola
          </label>
          <input
            type="text"
            className="input"
            value={formData.schoolName}
            onChange={(e) => setFormData({ ...formData, schoolName: e.target.value })}
            required
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Dias de Aula por Semana
            </label>
            <select 
              className="input"
              value={formData.workingDays}
              onChange={(e) => setFormData({ ...formData, workingDays: parseInt(e.target.value) })}
            >
              <option value="5">5 dias (Segunda a Sexta)</option>
              <option value="6">6 dias (Segunda a Sábado)</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Ano Letivo
            </label>
            <input
              type="number"
              className="input"
              value={formData.academicYear}
              onChange={(e) => setFormData({ ...formData, academicYear: parseInt(e.target.value) })}
              min="2020"
              max="2030"
              required
            />
          </div>
        </div>

        <div className="flex justify-end gap-3">
          <button type="submit" className="btn btn-primary flex items-center gap-2">
            <Save className="w-4 h-4" />
            Salvar Configurações
          </button>
        </div>
      </form>

      {/* Dados do Responsável */}
      <div className="mt-8 card">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <User className="w-6 h-6 text-primary-600" />
            <h2 className="text-2xl font-bold text-gray-900">Dados do Responsável</h2>
          </div>
          {!editingResponsible ? (
            <button
              onClick={() => setEditingResponsible(true)}
              className="btn btn-primary"
            >
              Editar
            </button>
          ) : (
            <div className="flex gap-2">
              <button
                onClick={() => {
                  setEditingResponsible(false);
                  loadSchoolData();
                }}
                className="btn bg-gray-300 text-gray-700 hover:bg-gray-400"
              >
                Cancelar
              </button>
              <button
                onClick={handleSaveResponsible}
                disabled={loading}
                className="btn btn-primary flex items-center gap-2"
              >
                <Save className="w-4 h-4" />
                {loading ? 'Salvando...' : 'Salvar'}
              </button>
            </div>
          )}
        </div>

        <p className="text-sm text-gray-600 mb-6">
          ℹ️ Estes dados são utilizados pelo administrador do sistema para contato e gestão da conta da escola.
        </p>

        {!editingResponsible ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="text-sm font-medium text-gray-600">Nome Completo</label>
              <p className="text-gray-900 mt-1">
                {responsibleData.responsibleName || (
                  <span className="text-orange-600 italic">Não cadastrado</span>
                )}
              </p>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-600">CPF</label>
              <p className="text-gray-900 mt-1">
                {responsibleData.responsibleCPF || (
                  <span className="text-orange-600 italic">Não cadastrado</span>
                )}
              </p>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-600">Telefone</label>
              <p className="text-gray-900 mt-1">
                {responsibleData.responsiblePhone || (
                  <span className="text-orange-600 italic">Não cadastrado</span>
                )}
              </p>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-600">E-mail</label>
              <p className="text-gray-900 mt-1">
                {responsibleData.responsibleEmail || (
                  <span className="text-orange-600 italic">Não cadastrado</span>
                )}
              </p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Nome Completo *
              </label>
              <input
                type="text"
                className="input"
                value={responsibleData.responsibleName}
                onChange={(e) => setResponsibleData({...responsibleData, responsibleName: e.target.value})}
                placeholder="Nome do responsável"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                CPF *
              </label>
              <input
                type="text"
                className="input"
                value={responsibleData.responsibleCPF}
                onChange={(e) => setResponsibleData({...responsibleData, responsibleCPF: e.target.value})}
                placeholder="000.000.000-00"
                maxLength={14}
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Telefone *
              </label>
              <input
                type="tel"
                className="input"
                value={responsibleData.responsiblePhone}
                onChange={(e) => setResponsibleData({...responsibleData, responsiblePhone: e.target.value})}
                placeholder="(00) 00000-0000"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                E-mail *
              </label>
              <input
                type="email"
                className="input"
                value={responsibleData.responsibleEmail}
                onChange={(e) => setResponsibleData({...responsibleData, responsibleEmail: e.target.value})}
                placeholder="email@exemplo.com"
                required
              />
            </div>
          </div>
        )}
      </div>

      {/* Cabeçalho de Impressão */}
      <div className="mt-8 card">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Printer className="w-6 h-6 text-indigo-600" />
            <h2 className="text-2xl font-bold text-gray-900">Cabeçalho de Impressão</h2>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handlePreviewPrintHeader}
              className="btn bg-gray-100 text-gray-700 hover:bg-gray-200 flex items-center gap-2"
            >
              <Eye className="w-4 h-4" />
              Pré-visualizar
            </button>
            {!editingPrintHeader ? (
              <button
                onClick={() => setEditingPrintHeader(true)}
                className="btn btn-primary"
              >
                Editar
              </button>
            ) : (
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setEditingPrintHeader(false);
                    loadPrintHeaderData();
                  }}
                  className="btn bg-gray-300 text-gray-700 hover:bg-gray-400"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleSavePrintHeader}
                  disabled={savingPrintHeader}
                  className="btn btn-primary flex items-center gap-2"
                >
                  <Save className="w-4 h-4" />
                  {savingPrintHeader ? 'Salvando...' : 'Salvar'}
                </button>
              </div>
            )}
          </div>
        </div>

        <p className="text-sm text-gray-600 mb-6">
          🖨️ Configure o cabeçalho padrão que aparecerá em todas as impressões do sistema: lista de professores, lotação, horários, calendário letivo, relatórios de frequência e demais relatórios.
        </p>

        {!editingPrintHeader ? (
          <div className="space-y-4">
            {/* Preview estático */}
            <div className="border-2 border-dashed border-gray-200 rounded-lg p-6 bg-gray-50">
              <div className="flex items-center justify-center gap-4">
                {printHeaderData.emblemBase64 ? (
                  <img
                    src={printHeaderData.emblemBase64}
                    alt="Emblema Esquerdo"
                    className="w-16 h-16 object-contain rounded"
                  />
                ) : (
                  <div className="w-16 h-16 rounded bg-gray-200 flex items-center justify-center text-gray-400 text-xs text-center">
                    Sem emblema
                  </div>
                )}
                <div className="text-center flex-1">
                  <p className="text-lg font-bold text-indigo-900">
                    {printHeaderData.line1 || printHeaderData.schoolName || <span className="text-orange-500 italic text-sm">Linha 1 não definida</span>}
                  </p>
                  <p className="text-sm text-gray-600">
                    {printHeaderData.line2 || <span className="text-orange-500 italic text-xs">Linha 2 não definida</span>}
                  </p>
                  <p className="text-xs text-gray-500">
                    {printHeaderData.line3 || <span className="text-orange-500 italic text-xs">Linha 3 não definida</span>}
                  </p>
                  {printHeaderData.line4 && <p className="text-xs text-gray-500">{printHeaderData.line4}</p>}
                  {printHeaderData.line5 && <p className="text-xs text-gray-500">{printHeaderData.line5}</p>}
                  {printHeaderData.line6 && <p className="text-xs text-gray-500">{printHeaderData.line6}</p>}
                  {printHeaderData.line7 && <p className="text-xs text-gray-500">{printHeaderData.line7}</p>}
                </div>
                {printHeaderData.emblemBase64Right ? (
                  <img
                    src={printHeaderData.emblemBase64Right}
                    alt="Emblema Direito"
                    className="w-16 h-16 object-contain rounded"
                  />
                ) : (
                  <div className="w-16 h-16 rounded bg-gray-200 flex items-center justify-center text-gray-400 text-xs text-center">
                    Sem emblema
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Upload Emblemas - Esquerdo e Direito */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Emblema Esquerdo */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  🏆 Emblema Esquerdo (Ex: Brasão do Estado)
                </label>
                <div className="flex items-center gap-4">
                  {printHeaderData.emblemBase64 ? (
                    <div className="relative">
                      <img
                        src={printHeaderData.emblemBase64}
                        alt="Emblema Esquerdo"
                        className="w-20 h-20 object-contain rounded border-2 border-indigo-200"
                      />
                      <button
                        type="button"
                        onClick={() => setPrintHeaderData({ ...printHeaderData, emblemBase64: '' })}
                        className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ) : (
                    <div
                      onClick={() => fileInputRef.current?.click()}
                      className="w-20 h-20 rounded border-2 border-dashed border-gray-300 flex flex-col items-center justify-center cursor-pointer hover:border-indigo-400 hover:bg-indigo-50 transition-colors"
                    >
                      <Upload className="w-6 h-6 text-gray-400" />
                      <span className="text-xs text-gray-400 mt-1">Upload</span>
                    </div>
                  )}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleEmblemUpload(e, 'left')}
                    className="hidden"
                  />
                  <div className="text-sm text-gray-500">
                    <p>PNG, JPG, SVG (máx 2MB)</p>
                    {printHeaderData.emblemBase64 && (
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="text-indigo-600 hover:underline mt-1"
                      >
                        Trocar imagem
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Emblema Direito */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  🏫 Emblema Direito (Ex: Logo da Escola)
                </label>
                <div className="flex items-center gap-4">
                  {printHeaderData.emblemBase64Right ? (
                    <div className="relative">
                      <img
                        src={printHeaderData.emblemBase64Right}
                        alt="Emblema Direito"
                        className="w-20 h-20 object-contain rounded border-2 border-indigo-200"
                      />
                      <button
                        type="button"
                        onClick={() => setPrintHeaderData({ ...printHeaderData, emblemBase64Right: '' })}
                        className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ) : (
                    <div
                      onClick={() => fileInputRightRef.current?.click()}
                      className="w-20 h-20 rounded border-2 border-dashed border-gray-300 flex flex-col items-center justify-center cursor-pointer hover:border-indigo-400 hover:bg-indigo-50 transition-colors"
                    >
                      <Upload className="w-6 h-6 text-gray-400" />
                      <span className="text-xs text-gray-400 mt-1">Upload</span>
                    </div>
                  )}
                  <input
                    ref={fileInputRightRef}
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleEmblemUpload(e, 'right')}
                    className="hidden"
                  />
                  <div className="text-sm text-gray-500">
                    <p>PNG, JPG, SVG (máx 2MB)</p>
                    {printHeaderData.emblemBase64Right && (
                      <button
                        type="button"
                        onClick={() => fileInputRightRef.current?.click()}
                        className="text-indigo-600 hover:underline mt-1"
                      >
                        Trocar imagem
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Linhas do cabeçalho */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Linha 1 — Nome da Instituição / Secretaria
              </label>
              <input
                type="text"
                className="input"
                value={printHeaderData.line1}
                onChange={(e) => setPrintHeaderData({ ...printHeaderData, line1: e.target.value })}
                placeholder="Ex: Secretaria de Estado da Educação do Piauí"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Linha 2 — Subtítulo / Nome da Escola
              </label>
              <input
                type="text"
                className="input"
                value={printHeaderData.line2}
                onChange={(e) => setPrintHeaderData({ ...printHeaderData, line2: e.target.value })}
                placeholder="Ex: Centro Estadual de Tempo Integral - CETI"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Linha 3 — Endereço / Informação Complementar
              </label>
              <input
                type="text"
                className="input"
                value={printHeaderData.line3}
                onChange={(e) => setPrintHeaderData({ ...printHeaderData, line3: e.target.value })}
                placeholder="Ex: Rua das Flores, 123 - Teresina/PI - CEP 64000-000"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Linha 4 (opcional)
              </label>
              <input
                type="text"
                className="input"
                value={printHeaderData.line4}
                onChange={(e) => setPrintHeaderData({ ...printHeaderData, line4: e.target.value })}
                placeholder="Ex: Telefone / CNPJ"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Linha 5 (opcional)
              </label>
              <input
                type="text"
                className="input"
                value={printHeaderData.line5}
                onChange={(e) => setPrintHeaderData({ ...printHeaderData, line5: e.target.value })}
                placeholder="Ex: E-mail institucional"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Linha 6 (opcional)
              </label>
              <input
                type="text"
                className="input"
                value={printHeaderData.line6}
                onChange={(e) => setPrintHeaderData({ ...printHeaderData, line6: e.target.value })}
                placeholder="Ex: Informação complementar"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Linha 7 (opcional)
              </label>
              <input
                type="text"
                className="input"
                value={printHeaderData.line7}
                onChange={(e) => setPrintHeaderData({ ...printHeaderData, line7: e.target.value })}
                placeholder="Ex: Informação complementar"
              />
            </div>
          </div>
        )}
      </div>

      <div className="mt-6 card bg-blue-50 border-blue-200">
        <h3 className="text-lg font-bold mb-2">ℹ️ Informação</h3>
        <p className="text-sm text-gray-600 mb-3">
          As configurações definidas aqui afetam a geração de horários e o funcionamento geral do sistema.
        </p>
        <p className="text-sm text-gray-700 font-medium">
          📋 Configure os períodos e horários específicos na página <span className="text-primary-600">"Horários de Aula"</span>
        </p>
        <ul className="text-sm text-gray-600 mt-2 ml-4 space-y-1">
          <li>• Horário Integral (manhã + tarde)</li>
          <li>• Horário Parcial Manhã</li>
          <li>• Horário Parcial Tarde</li>
          <li>• Horário Parcial Noite</li>
          <li>• Horários para Sábado/Domingo</li>
        </ul>
      </div>
    </div>
  );
}
