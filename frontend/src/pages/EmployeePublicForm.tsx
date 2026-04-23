/**
 * Formulário público para professores/funcionários preencherem seus dados.
 * Acessível via link: /#/employee-form/:token
 * Sem necessidade de autenticação.
 */
import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import {
  User, Phone, MapPin, Briefcase, FileText, BookOpen,
  CheckCircle, AlertCircle, ChevronDown, ChevronUp, Send,
} from 'lucide-react';

const API_URL = (import.meta.env.VITE_API_URL || 'http://localhost:5000/api');

// ─── Tipos ───────────────────────────────────────────────────────────────────
interface InviteInfo {
  token: string;
  schoolName: string;
  employeeId: string | null;
  employeeName: string | null;
  isUpdate: boolean;
  existingData: Record<string, unknown> | null;
  expiresAt: string;
}

type FormTab = 'pessoal' | 'contato' | 'endereco' | 'funcional' | 'documentos';

const TABS: { key: FormTab; label: string; icon: React.ReactNode }[] = [
  { key: 'pessoal', label: 'Dados Pessoais', icon: <User size={16} /> },
  { key: 'contato', label: 'Contato', icon: <Phone size={16} /> },
  { key: 'endereco', label: 'Endereço', icon: <MapPin size={16} /> },
  { key: 'funcional', label: 'Dados Funcionais', icon: <Briefcase size={16} /> },
  { key: 'documentos', label: 'Documentos', icon: <FileText size={16} /> },
];

const EMPTY_FORM = {
  name: '', matricula: '', cpf: '', rg: '', rgOrgao: '', rgDataEmissao: '',
  dataNascimento: '', naturalidade: '', nacionalidade: 'Brasileira', sexo: '',
  estadoCivil: '', nomeMae: '', nomePai: '', tipoSanguineo: '',
  email: '', celular: '', telefoneFixo: '',
  cep: '', logradouro: '', numero: '', complemento: '', bairro: '', cidade: '', estado: '',
  cargo: '', setor: '', tipoContrato: '', dataAdmissao: '', jornadaTrabalho: '',
  cargaHorariaSemanal: '',
  ctpsNumero: '', ctpsSerie: '', pisPasep: '', tituloEleitor: '', zonaEleitoral: '',
  secaoEleitoral: '', certificadoMilitar: '', cnhNumero: '', cnhCategoria: '',
  cnhValidade: '', reservista: '', observacoes: '',
};

// ─── Componente ───────────────────────────────────────────────────────────────
export default function EmployeePublicForm() {
  const { token } = useParams<{ token: string }>();

  const [status, setStatus] = useState<'loading' | 'error' | 'expired' | 'ok' | 'success'>('loading');
  const [errorMsg, setErrorMsg] = useState('');
  const [inviteInfo, setInviteInfo] = useState<InviteInfo | null>(null);
  const [form, setForm] = useState<Record<string, string>>(EMPTY_FORM);
  const [activeTab, setActiveTab] = useState<FormTab>('pessoal');
  const [submitting, setSubmitting] = useState(false);
  const [expandedMobile, setExpandedMobile] = useState<FormTab | null>('pessoal');

  // Buscar dados do convite
  useEffect(() => {
    if (!token) { setStatus('error'); setErrorMsg('Token inválido.'); return; }
    axios.get(`${API_URL}/employee-invite-links/public/${token}`)
      .then(res => {
        setInviteInfo(res.data);
        if (res.data.existingData) {
          // Pré-preencher com dados existentes
          const existing: Record<string, string> = {};
          for (const [k, v] of Object.entries(res.data.existingData)) {
            existing[k] = v !== null && v !== undefined ? String(v) : '';
          }
          setForm({ ...EMPTY_FORM, ...existing });
        }
        setStatus('ok');
      })
      .catch(err => {
        const msg = err.response?.data?.message || 'Erro ao carregar formulário.';
        if (err.response?.status === 410) { setStatus('expired'); setErrorMsg(msg); }
        else { setStatus('error'); setErrorMsg(msg); }
      });
  }, [token]);

  function handleChange(field: string, value: string) {
    setForm(prev => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) { alert('Por favor, informe seu nome completo.'); return; }
    setSubmitting(true);
    try {
      await axios.post(`${API_URL}/employee-invite-links/public/${token}/submit`, form);
      setStatus('success');
    } catch (err: any) {
      alert(err.response?.data?.message || 'Erro ao enviar dados. Tente novamente.');
    } finally {
      setSubmitting(false);
    }
  }

  // ── Helpers de input ─────────────────────────────────────────────────────
  const inp = (field: string, label: string, type = 'text', opts?: { placeholder?: string }) => (
    <div className="epf-field">
      <label className="epf-label">{label}</label>
      <input
        type={type}
        className="epf-input"
        value={form[field] || ''}
        onChange={e => handleChange(field, e.target.value)}
        placeholder={opts?.placeholder || ''}
      />
    </div>
  );

  const sel = (field: string, label: string, options: string[]) => (
    <div className="epf-field">
      <label className="epf-label">{label}</label>
      <select
        className="epf-input"
        value={form[field] || ''}
        onChange={e => handleChange(field, e.target.value)}
      >
        <option value="">Selecionar...</option>
        {options.map(o => <option key={o} value={o}>{o}</option>)}
      </select>
    </div>
  );

  // ── Renderizações de estado ──────────────────────────────────────────────
  if (status === 'loading') {
    return (
      <div className="epf-center">
        <div className="epf-spinner" />
        <p style={{ color: '#6b7280', marginTop: 12 }}>Carregando formulário...</p>
      </div>
    );
  }

  if (status === 'expired') {
    return (
      <div className="epf-center">
        <AlertCircle size={48} color="#f59e0b" />
        <h2 style={{ color: '#b45309', marginTop: 12 }}>Link Expirado</h2>
        <p style={{ color: '#6b7280' }}>{errorMsg}</p>
        <p style={{ color: '#6b7280', fontSize: 14 }}>Solicite um novo link ao administrador da escola.</p>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className="epf-center">
        <AlertCircle size={48} color="#ef4444" />
        <h2 style={{ color: '#b91c1c', marginTop: 12 }}>Link Inválido</h2>
        <p style={{ color: '#6b7280' }}>{errorMsg}</p>
      </div>
    );
  }

  if (status === 'success') {
    return (
      <div className="epf-center">
        <CheckCircle size={56} color="#22c55e" />
        <h2 style={{ color: '#15803d', marginTop: 16 }}>Dados enviados com sucesso!</h2>
        <p style={{ color: '#6b7280', textAlign: 'center', maxWidth: 360 }}>
          Suas informações foram registradas. Obrigado por preencher o formulário.
        </p>
        <p style={{ color: '#9ca3af', fontSize: 13, marginTop: 8 }}>
          Você já pode fechar esta página.
        </p>
      </div>
    );
  }

  // ── Formulário principal ─────────────────────────────────────────────────
  const renderTabContent = (tab: FormTab) => {
    switch (tab) {
      case 'pessoal': return (
        <div className="epf-grid">
          {inp('name', 'Nome Completo *')}
          {inp('matricula', 'Matrícula')}
          {inp('dataNascimento', 'Data de Nascimento', 'date')}
          {inp('naturalidade', 'Naturalidade')}
          {inp('nacionalidade', 'Nacionalidade')}
          {sel('sexo', 'Sexo', ['M', 'F', 'Outro'])}
          {sel('estadoCivil', 'Estado Civil', ['Solteiro(a)', 'Casado(a)', 'Divorciado(a)', 'Viúvo(a)', 'União Estável', 'Outro'])}
          {inp('nomeMae', 'Nome da Mãe')}
          {inp('nomePai', 'Nome do Pai')}
          {sel('tipoSanguineo', 'Tipo Sanguíneo', ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'])}
        </div>
      );
      case 'contato': return (
        <div className="epf-grid">
          {inp('email', 'E-mail', 'email')}
          {inp('celular', 'Celular', 'tel')}
          {inp('telefoneFixo', 'Telefone Fixo', 'tel')}
        </div>
      );
      case 'endereco': return (
        <div className="epf-grid">
          {inp('cep', 'CEP')}
          {inp('logradouro', 'Logradouro')}
          {inp('numero', 'Número')}
          {inp('complemento', 'Complemento')}
          {inp('bairro', 'Bairro')}
          {inp('cidade', 'Cidade')}
          {inp('estado', 'Estado')}
        </div>
      );
      case 'funcional': return (
        <div className="epf-grid">
          {inp('cargo', 'Cargo')}
          {inp('setor', 'Setor')}
          {sel('tipoContrato', 'Tipo de Contrato', ['CLT', 'Estatutário', 'Temporário', 'Terceirizado', 'Contrato', 'Outro'])}
          {inp('dataAdmissao', 'Data de Admissão', 'date')}
          {inp('jornadaTrabalho', 'Jornada de Trabalho')}
          {inp('cargaHorariaSemanal', 'Carga Horária Semanal (h)', 'number')}
        </div>
      );
      case 'documentos': return (
        <div className="epf-grid">
          {inp('cpf', 'CPF')}
          {inp('rg', 'RG')}
          {inp('rgOrgao', 'Órgão Expedidor do RG')}
          {inp('rgDataEmissao', 'Data de Emissão do RG', 'date')}
          {inp('ctpsNumero', 'CTPS Número')}
          {inp('ctpsSerie', 'CTPS Série')}
          {inp('pisPasep', 'PIS/PASEP')}
          {inp('tituloEleitor', 'Título de Eleitor')}
          {inp('zonaEleitoral', 'Zona Eleitoral')}
          {inp('secaoEleitoral', 'Seção Eleitoral')}
          {inp('certificadoMilitar', 'Certificado Militar')}
          {inp('reservista', 'Reservista')}
          {inp('cnhNumero', 'CNH Número')}
          {sel('cnhCategoria', 'CNH Categoria', ['A', 'B', 'C', 'D', 'E', 'AB'])}
          {inp('cnhValidade', 'CNH Validade', 'date')}
          <div className="epf-field epf-field-full">
            <label className="epf-label">Observações</label>
            <textarea
              className="epf-input"
              rows={3}
              value={form.observacoes || ''}
              onChange={e => handleChange('observacoes', e.target.value)}
              placeholder="Informações adicionais..."
            />
          </div>
        </div>
      );
    }
  };

  return (
    <div className="epf-wrapper">
      <style>{`
        .epf-wrapper {
          min-height: 100vh;
          background: linear-gradient(135deg, #e0f2fe 0%, #f0fdf4 100%);
          padding: 24px 16px 48px;
          font-family: system-ui, sans-serif;
        }
        .epf-card {
          max-width: 800px;
          margin: 0 auto;
          background: #fff;
          border-radius: 16px;
          box-shadow: 0 4px 24px rgba(0,0,0,0.10);
          overflow: hidden;
        }
        .epf-header {
          background: linear-gradient(135deg, #1e40af 0%, #0369a1 100%);
          padding: 28px 28px 20px;
          color: #fff;
        }
        .epf-header h1 { margin: 0 0 4px; font-size: 1.4rem; }
        .epf-header p { margin: 0; opacity: 0.85; font-size: 0.9rem; }
        .epf-tabs {
          display: flex;
          gap: 2px;
          background: #f1f5f9;
          border-bottom: 1px solid #e2e8f0;
          overflow-x: auto;
        }
        .epf-tab {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 10px 16px;
          border: none;
          background: transparent;
          color: #64748b;
          font-size: 0.82rem;
          cursor: pointer;
          white-space: nowrap;
          border-bottom: 2px solid transparent;
          transition: all 0.15s;
        }
        .epf-tab.active {
          color: #1e40af;
          border-bottom-color: #1e40af;
          background: #fff;
          font-weight: 600;
        }
        .epf-tab:hover:not(.active) { background: #e2e8f0; color: #334155; }
        .epf-body { padding: 24px 28px; }
        .epf-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 14px;
        }
        @media (max-width: 600px) {
          .epf-grid { grid-template-columns: 1fr; }
          .epf-body { padding: 16px; }
          .epf-tabs { flex-wrap: nowrap; }
        }
        .epf-field { display: flex; flex-direction: column; gap: 4px; }
        .epf-field-full { grid-column: 1 / -1; }
        .epf-label { font-size: 0.8rem; font-weight: 600; color: #374151; }
        .epf-input {
          padding: 8px 10px;
          border: 1px solid #d1d5db;
          border-radius: 6px;
          font-size: 0.88rem;
          color: #1f2937;
          background: #f9fafb;
          transition: border 0.15s;
          width: 100%;
          box-sizing: border-box;
        }
        .epf-input:focus { outline: none; border-color: #3b82f6; background: #fff; }
        .epf-footer {
          padding: 16px 28px 24px;
          display: flex;
          justify-content: flex-end;
          border-top: 1px solid #f1f5f9;
        }
        .epf-btn {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 11px 24px;
          background: #1e40af;
          color: #fff;
          border: none;
          border-radius: 8px;
          font-size: 0.95rem;
          font-weight: 600;
          cursor: pointer;
          transition: background 0.15s;
        }
        .epf-btn:hover { background: #1d4ed8; }
        .epf-btn:disabled { background: #94a3b8; cursor: not-allowed; }
        .epf-center {
          min-height: 100vh;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          font-family: system-ui, sans-serif;
          gap: 8px;
          padding: 32px;
        }
        .epf-spinner {
          width: 40px; height: 40px;
          border: 4px solid #e2e8f0;
          border-top-color: #3b82f6;
          border-radius: 50%;
          animation: epf-spin 0.8s linear infinite;
        }
        @keyframes epf-spin { to { transform: rotate(360deg); } }
        /* Mobile accordion */
        .epf-desktop-content { display: block; }
        .epf-accordion { display: none; }
        @media (max-width: 500px) {
          .epf-tabs { display: none; }
          .epf-desktop-content { display: none; }
          .epf-accordion { display: block; }
          .epf-acc-header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 12px 16px;
            background: #f1f5f9;
            border-bottom: 1px solid #e2e8f0;
            cursor: pointer;
            font-weight: 600;
            font-size: 0.85rem;
            color: #1e40af;
          }
          .epf-acc-body { padding: 16px; }
        }
      `}</style>

      <div className="epf-card">
        {/* Cabeçalho */}
        <div className="epf-header">
          <h1>
            {inviteInfo?.isUpdate ? 'Atualização de Cadastro' : 'Cadastro de Funcionário'}
          </h1>
          <p>{inviteInfo?.schoolName}</p>
          {inviteInfo?.employeeName && (
            <p style={{ marginTop: 6, fontWeight: 600 }}>
              Olá, {inviteInfo.employeeName}! Por favor, preencha ou atualize seus dados.
            </p>
          )}
          {!inviteInfo?.employeeName && (
            <p style={{ marginTop: 6, opacity: 0.8 }}>
              Por favor, preencha seus dados pessoais, de contato e profissionais.
            </p>
          )}
        </div>

        <form onSubmit={handleSubmit}>
          {/* Abas — visíveis em telas ≥ 501px via CSS */}
          <div className="epf-tabs">
            {TABS.map(tab => (
              <button
                key={tab.key}
                type="button"
                className={`epf-tab ${activeTab === tab.key ? 'active' : ''}`}
                onClick={() => setActiveTab(tab.key)}
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}
          </div>

          {/* Conteúdo das abas — desktop */}
          <div className="epf-body epf-desktop-content">
            {renderTabContent(activeTab)}
          </div>

          {/* Accordion — mobile (<= 500px via CSS) */}
          <div className="epf-accordion">
            {TABS.map(tab => (
              <div key={tab.key}>
                <div
                  className="epf-acc-header"
                  onClick={() => setExpandedMobile(expandedMobile === tab.key ? null : tab.key)}
                >
                  <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    {tab.icon} {tab.label}
                  </span>
                  {expandedMobile === tab.key ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                </div>
                {expandedMobile === tab.key && (
                  <div className="epf-acc-body">{renderTabContent(tab.key)}</div>
                )}
              </div>
            ))}
          </div>

          <div className="epf-footer">
            <button type="submit" className="epf-btn" disabled={submitting}>
              <Send size={16} />
              {submitting ? 'Enviando...' : 'Enviar Dados'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
