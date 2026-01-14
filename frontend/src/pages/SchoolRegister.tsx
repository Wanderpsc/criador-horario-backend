import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import api from '../lib/axios';
import toast from 'react-hot-toast';
import { Building2, FileText, CheckCircle2, Eye, EyeOff } from 'lucide-react';
import { TermsModal } from '../components/TermsModal';

interface RegisterForm {
  // Dados básicos
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
  
  // Dados da instituição
  schoolName: string;
  cnpj: string;
  phone: string;
  website?: string;
  
  // Endereço
  address: string;
  city: string;
  state: string;
  zipCode: string;
  
  // Dados do responsável
  responsibleName: string;
  responsibleCPF: string;
  responsiblePhone: string;
  responsibleEmail: string;
  
  // Dados institucionais
  schoolType: 'public' | 'private' | 'cooperative';
  numberOfStudents?: number;
  numberOfTeachers?: number;
  educationLevels: string[];
  
  // Plano selecionado
  selectedPlan: string;
  
  // Termos
  acceptedTerms: boolean;
}

export default function SchoolRegister() {
  const { register, handleSubmit, watch, formState: { errors }, setValue } = useForm<RegisterForm>();
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(1);
  const [showTermsModal, setShowTermsModal] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [recommendedPlan, setRecommendedPlan] = useState<string>('');
  const navigate = useNavigate();

  const password = watch('password');
  const numberOfTeachers = watch('numberOfTeachers');
  const numberOfStudents = watch('numberOfStudents');
  const selectedPlan = watch('selectedPlan');

  // Calcular plano recomendado baseado nos números
  const calculateRecommendedPlan = () => {
    const teachers = numberOfTeachers || 0;
    const students = numberOfStudents || 0;
    
    if (teachers <= 30 && students <= 500) {
      return 'basico';
    } else if (teachers <= 50 && students <= 1000) {
      return 'profissional';
    } else {
      return 'enterprise'; // Para casos maiores
    }
  };

  // Validar se o plano selecionado é adequado
  const validatePlanSelection = () => {
    const teachers = numberOfTeachers || 0;
    const recommended = calculateRecommendedPlan();
    
    if (selectedPlan === 'basico' && teachers > 30) {
      return false;
    }
    if (selectedPlan === 'profissional' && teachers > 50) {
      return false;
    }
    return true;
  };

  // Atualizar plano recomendado quando números mudarem
  useState(() => {
    const recommended = calculateRecommendedPlan();
    setRecommendedPlan(recommended);
  });

  const onSubmit = async (data: RegisterForm) => {
    if (!termsAccepted) {
      toast.error('Você precisa aceitar os termos de uso para continuar');
      return;
    }

    // Validar plano antes de submeter
    if (!validatePlanSelection()) {
      toast.error('O plano selecionado não suporta o número de professores informado. Escolha um plano adequado.');
      return;
    }

    setLoading(true);

    try {
      await api.post('/auth/register-school', {
        ...data,
        acceptedTerms: true,
        termsVersion: '1.0',
        privacyVersion: '1.0',
        copyrightAcknowledged: true,
        acceptedTermsDate: new Date().toISOString()
      });
      
      toast.success(
        'Cadastro realizado! Complete o pagamento para solicitar aprovação.', 
        { duration: 4000 }
      );
      
      // Redirecionar para página de pagamento com plano selecionado
      const selectedPlan = data.selectedPlan || 'basico';
      
      // Pequeno delay para o usuário ver a mensagem
      setTimeout(() => {
        navigate(`/payment-checkout?plan=${selectedPlan}&email=${encodeURIComponent(data.email)}&schoolName=${encodeURIComponent(data.schoolName)}`);
      }, 1000);
      
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Erro ao fazer cadastro');
    } finally {
      setLoading(false);
    }
  };

  const nextStep = () => setStep(prev => prev + 1);
  const prevStep = () => setStep(prev => prev - 1);

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-500 to-primary-700 p-4">
      <div className="max-w-4xl mx-auto py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-white rounded-full mb-4 shadow-lg">
            <Building2 className="text-primary-600" size={40} />
          </div>
          <h1 className="text-4xl font-bold text-white mb-2">
            Cadastro Institucional
          </h1>
          <p className="text-primary-100 text-lg">
            Sistema EduSync-PRO - Criador de Horário de Aula Escolar
          </p>
        </div>

        {/* Progress Steps */}
        <div className="mb-8">
          <div className="flex justify-between items-center max-w-2xl mx-auto">
            {[
              { num: 1, label: 'Dados Básicos' },
              { num: 2, label: 'Endereço' },
              { num: 3, label: 'Responsável' },
              { num: 4, label: 'Instituição' },
              { num: 5, label: 'Plano & Termos' }
            ].map((s) => (
              <div key={s.num} className="flex flex-col items-center">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${
                  step >= s.num ? 'bg-white text-primary-600' : 'bg-primary-300 text-primary-700'
                }`}>
                  {s.num}
                </div>
                <span className="text-white text-xs mt-2 text-center">{s.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Form */}
        <div className="bg-white rounded-2xl shadow-2xl p-8">
          <form onSubmit={handleSubmit(onSubmit)}>
            {/* Step 1: Dados Básicos */}
            {step === 1 && (
              <div className="space-y-4">
                <h2 className="text-2xl font-bold text-gray-900 mb-6">Dados Básicos da Conta</h2>
                
                <div>
                  <label className="label">Nome Completo do Responsável pela Conta *</label>
                  <input
                    {...register('name', { required: 'Nome é obrigatório' })}
                    className="input"
                  />
                  {errors.name && <p className="text-red-500 text-sm mt-1">{errors.name.message}</p>}
                </div>

                <div>
                  <label className="label">E-mail Institucional *</label>
                  <input
                    type="email"
                    {...register('email', { required: 'E-mail é obrigatório' })}
                    className="input"
                  />
                  {errors.email && <p className="text-red-500 text-sm mt-1">{errors.email.message}</p>}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="label">Senha *</label>
                    <div className="relative">
                      <input
                        type={showPassword ? "text" : "password"}
                        {...register('password', { 
                          required: 'Senha é obrigatória',
                          minLength: { value: 6, message: 'Mínimo 6 caracteres' }
                        })}
                        className="input pr-10"
                        autoComplete="new-password"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                      >
                        {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                      </button>
                    </div>
                    {errors.password && <p className="text-red-500 text-sm mt-1">{errors.password.message}</p>}
                  </div>

                  <div>
                    <label className="label">Confirmar Senha *</label>
                    <div className="relative">
                      <input
                        type={showConfirmPassword ? "text" : "password"}
                        {...register('confirmPassword', {
                          required: 'Confirme a senha',
                          validate: value => value === password || 'Senhas não conferem'
                        })}
                        className="input pr-10"
                        autoComplete="new-password"
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                      >
                        {showConfirmPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                      </button>
                    </div>
                    {errors.confirmPassword && <p className="text-red-500 text-sm mt-1">{errors.confirmPassword.message}</p>}
                  </div>
                </div>

                <div>
                  <label className="label">Nome da Instituição de Ensino *</label>
                  <input
                    {...register('schoolName', { required: 'Nome da escola é obrigatório' })}
                    className="input"
                    placeholder="Ex: Colégio Estadual Dom Pedro II"
                  />
                  {errors.schoolName && <p className="text-red-500 text-sm mt-1">{errors.schoolName.message}</p>}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="label">CNPJ *</label>
                    <input
                      {...register('cnpj', { required: 'CNPJ é obrigatório' })}
                      className="input"
                      placeholder="00.000.000/0000-00"
                    />
                    {errors.cnpj && <p className="text-red-500 text-sm mt-1">{errors.cnpj.message}</p>}
                  </div>

                  <div>
                    <label className="label">Telefone Institucional *</label>
                    <input
                      {...register('phone', { required: 'Telefone é obrigatório' })}
                      className="input"
                      placeholder="(00) 00000-0000"
                    />
                    {errors.phone && <p className="text-red-500 text-sm mt-1">{errors.phone.message}</p>}
                  </div>
                </div>

                <div>
                  <label className="label">Website (opcional)</label>
                  <input
                    {...register('website')}
                    className="input"
                    placeholder="https://www.suaescola.com.br"
                  />
                </div>

                <div className="flex justify-end pt-4">
                  <button type="button" onClick={nextStep} className="btn btn-primary">
                    Próximo →
                  </button>
                </div>
              </div>
            )}

            {/* Step 2: Endereço */}
            {step === 2 && (
              <div className="space-y-4">
                <h2 className="text-2xl font-bold text-gray-900 mb-6">Endereço da Instituição</h2>
                
                <div>
                  <label className="label">Endereço Completo *</label>
                  <input
                    {...register('address', { required: 'Endereço é obrigatório' })}
                    className="input"
                    placeholder="Rua, número, complemento"
                  />
                  {errors.address && <p className="text-red-500 text-sm mt-1">{errors.address.message}</p>}
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="label">CEP *</label>
                    <input
                      {...register('zipCode', { required: 'CEP é obrigatório' })}
                      className="input"
                      placeholder="00000-000"
                    />
                    {errors.zipCode && <p className="text-red-500 text-sm mt-1">{errors.zipCode.message}</p>}
                  </div>

                  <div>
                    <label className="label">Cidade *</label>
                    <input
                      {...register('city', { required: 'Cidade é obrigatória' })}
                      className="input"
                    />
                    {errors.city && <p className="text-red-500 text-sm mt-1">{errors.city.message}</p>}
                  </div>

                  <div>
                    <label className="label">Estado (UF) *</label>
                    <input
                      {...register('state', { required: 'Estado é obrigatório' })}
                      className="input"
                      placeholder="SP"
                      maxLength={2}
                    />
                    {errors.state && <p className="text-red-500 text-sm mt-1">{errors.state.message}</p>}
                  </div>
                </div>

                <div className="flex justify-between pt-4">
                  <button type="button" onClick={prevStep} className="btn btn-secondary">
                    ← Voltar
                  </button>
                  <button type="button" onClick={nextStep} className="btn btn-primary">
                    Próximo →
                  </button>
                </div>
              </div>
            )}

            {/* Step 3: Responsável */}
            {step === 3 && (
              <div className="space-y-4">
                <h2 className="text-2xl font-bold text-gray-900 mb-6">Dados do Responsável Legal</h2>
                
                <div>
                  <label className="label">Nome Completo do Responsável *</label>
                  <input
                    {...register('responsibleName', { required: 'Nome do responsável é obrigatório' })}
                    className="input"
                  />
                  {errors.responsibleName && <p className="text-red-500 text-sm mt-1">{errors.responsibleName.message}</p>}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="label">CPF do Responsável *</label>
                    <input
                      {...register('responsibleCPF', { required: 'CPF é obrigatório' })}
                      className="input"
                      placeholder="000.000.000-00"
                    />
                    {errors.responsibleCPF && <p className="text-red-500 text-sm mt-1">{errors.responsibleCPF.message}</p>}
                  </div>

                  <div>
                    <label className="label">Telefone do Responsável *</label>
                    <input
                      {...register('responsiblePhone', { required: 'Telefone é obrigatório' })}
                      className="input"
                      placeholder="(00) 00000-0000"
                    />
                    {errors.responsiblePhone && <p className="text-red-500 text-sm mt-1">{errors.responsiblePhone.message}</p>}
                  </div>
                </div>

                <div>
                  <label className="label">E-mail do Responsável *</label>
                  <input
                    type="email"
                    {...register('responsibleEmail', { required: 'E-mail é obrigatório' })}
                    className="input"
                  />
                  {errors.responsibleEmail && <p className="text-red-500 text-sm mt-1">{errors.responsibleEmail.message}</p>}
                </div>

                <div className="flex justify-between pt-4">
                  <button type="button" onClick={prevStep} className="btn btn-secondary">
                    ← Voltar
                  </button>
                  <button type="button" onClick={nextStep} className="btn btn-primary">
                    Próximo →
                  </button>
                </div>
              </div>
            )}

            {/* Step 4: Dados Institucionais */}
            {step === 4 && (
              <div className="space-y-4">
                <h2 className="text-2xl font-bold text-gray-900 mb-6">Informações Institucionais</h2>
                
                <div>
                  <label className="label">Tipo de Instituição *</label>
                  <select {...register('schoolType', { required: 'Tipo é obrigatório' })} className="input">
                    <option value="">Selecione...</option>
                    <option value="public">Pública</option>
                    <option value="private">Privada</option>
                    <option value="cooperative">Cooperativa</option>
                  </select>
                  {errors.schoolType && <p className="text-red-500 text-sm mt-1">{errors.schoolType.message}</p>}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="label">Número de Alunos (aproximado)</label>
                    <input
                      type="number"
                      {...register('numberOfStudents')}
                      className="input"
                      placeholder="Ex: 500"
                    />
                  </div>

                  <div>
                    <label className="label">Número de Professores</label>
                    <input
                      type="number"
                      {...register('numberOfTeachers')}
                      className="input"
                      placeholder="Ex: 30"
                    />
                  </div>
                </div>

                <div>
                  <label className="label">Níveis de Ensino Oferecidos (selecione todos)</label>
                  <div className="space-y-2 mt-2">
                    {[
                      'Educação Infantil',
                      'Ensino Fundamental I (1º ao 5º ano)',
                      'Ensino Fundamental II (6º ao 9º ano)',
                      'Ensino Médio',
                      'EJA (Educação de Jovens e Adultos)',
                      'Ensino Técnico/Profissionalizante'
                    ].map((level) => (
                      <label key={level} className="flex items-center">
                        <input
                          type="checkbox"
                          {...register('educationLevels')}
                          value={level}
                          className="mr-2"
                        />
                        <span className="text-sm">{level}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div className="flex justify-between pt-4">
                  <button type="button" onClick={prevStep} className="btn btn-secondary">
                    ← Voltar
                  </button>
                  <button type="button" onClick={nextStep} className="btn btn-primary">
                    Próximo →
                  </button>
                </div>
              </div>
            )}

            {/* Step 5: Plano e Termos */}
            {step === 5 && (
              <div className="space-y-4">
                <h2 className="text-2xl font-bold text-gray-900 mb-6">Plano e Termos de Uso</h2>
                
                {/* Resumo dos dados informados */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                  <h3 className="font-bold text-gray-900 mb-2">📊 Resumo da Instituição:</h3>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <span className="font-medium">Professores:</span> {numberOfTeachers || 0}
                    </div>
                    <div>
                      <span className="font-medium">Alunos:</span> {numberOfStudents || 0}
                    </div>
                  </div>
                </div>

                {/* Alerta de plano recomendado */}
                {(numberOfTeachers || 0) > 0 && (
                  <div className={`border rounded-lg p-4 ${
                    calculateRecommendedPlan() === 'basico' 
                      ? 'bg-green-50 border-green-300' 
                      : 'bg-yellow-50 border-yellow-300'
                  }`}>
                    <div className="flex items-start">
                      <span className="text-2xl mr-2">
                        {calculateRecommendedPlan() === 'basico' ? '✅' : '⚠️'}
                      </span>
                      <div>
                        <p className="font-bold text-gray-900 mb-1">
                          Plano Recomendado: {calculateRecommendedPlan() === 'basico' ? 'Básico' : 'Profissional'}
                        </p>
                        <p className="text-sm text-gray-700">
                          {calculateRecommendedPlan() === 'basico' 
                            ? 'O plano Básico atende sua necessidade atual.'
                            : 'Recomendamos o plano Profissional para o número de professores informado.'
                          }
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                <div>
                  <label className="label">Selecione o Plano *</label>
                  <select 
                    {...register('selectedPlan', { 
                      required: 'Selecione um plano',
                      validate: () => validatePlanSelection() || 'Este plano não suporta o número de professores informado'
                    })} 
                    className="input"
                  >
                    <option value="">Escolha seu plano...</option>
                    <option 
                      value="basico"
                      disabled={(numberOfTeachers || 0) > 30}
                    >
                      Básico - R$ 119,90/mês (Até 30 professores, 15 turmas)
                      {(numberOfTeachers || 0) > 30 ? ' ❌ INSUFICIENTE' : ''}
                    </option>
                    <option 
                      value="profissional"
                      disabled={(numberOfTeachers || 0) > 50}
                    >
                      Profissional - R$ 249,90/mês (Até 50 professores, 25 turmas)
                      {(numberOfTeachers || 0) > 50 ? ' ❌ INSUFICIENTE' : ''}
                    </option>
                  </select>
                  {errors.selectedPlan && <p className="text-red-500 text-sm mt-1">{errors.selectedPlan.message}</p>}
                  
                  {/* Aviso se plano selecionado é inadequado */}
                  {selectedPlan && !validatePlanSelection() && (
                    <div className="mt-2 bg-red-50 border border-red-300 rounded p-3">
                      <p className="text-red-800 text-sm font-medium">
                        ⚠️ ATENÇÃO: Este plano não suporta {numberOfTeachers} professores. 
                        Escolha o plano Profissional ou reduza o número de professores.
                      </p>
                    </div>
                  )}
                  
                  {/* Mensagem explicativa */}
                  <p className="text-xs text-gray-600 mt-2">
                    * O plano é validado com base no número de professores informado anteriormente.
                    Se precisar de mais capacidade, entre em contato: wanderpsc@gmail.com
                  </p>
                </div>

                {/* Termos de Uso */}
                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-6 rounded-lg border-2 border-blue-200">
                  <div className="flex items-center mb-4">
                    <FileText className="text-blue-600 mr-3" size={32} />
                    <div>
                      <h3 className="text-lg font-bold text-gray-900">Termos de Uso e Proteção Legal *</h3>
                      <p className="text-sm text-gray-600">
                        {termsAccepted 
                          ? 'Termos aceitos e validados' 
                          : '⚠️ Leitura e aceitação obrigatória para continuar'
                        }
                      </p>
                    </div>
                  </div>

                  {termsAccepted ? (
                    <div className="bg-green-50 border-2 border-green-300 rounded-lg p-4">
                      <div className="flex items-center text-green-800">
                        <CheckCircle2 className="mr-2" size={24} />
                        <div>
                          <p className="font-bold">✅ Termos Aceitos com Sucesso!</p>
                          <p className="text-sm">Você leu e concordou com todos os termos e políticas</p>
                          <p className="text-xs mt-2 text-green-600">Agora você pode finalizar o cadastro</p>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="bg-yellow-50 border-2 border-yellow-300 rounded-lg p-4">
                        <div className="flex items-start">
                          <span className="text-2xl mr-2">⚠️</span>
                          <div>
                            <p className="font-bold text-yellow-800 mb-2">OBRIGATÓRIO</p>
                            <p className="text-sm text-yellow-700">
                              O cadastro <strong>não pode ser concluído</strong> sem a leitura e aceitação dos termos abaixo:
                            </p>
                          </div>
                        </div>
                      </div>
                      
                      <div className="bg-white border border-gray-300 rounded-lg p-4">
                        <ul className="space-y-3 text-sm text-gray-700">
                          <li className="flex items-start">
                            <span className="mr-2 text-lg">📜</span>
                            <span><strong>Termos de Uso e Licença</strong> - Direitos, obrigações e restrições de uso</span>
                          </li>
                          <li className="flex items-start">
                            <span className="mr-2 text-lg">🔒</span>
                            <span><strong>Política de Privacidade</strong> - Tratamento de dados conforme LGPD</span>
                          </li>
                          <li className="flex items-start">
                            <span className="mr-2 text-lg">©</span>
                            <span><strong>Declaração de Direitos Autorais</strong> - Propriedade intelectual protegida</span>
                          </li>
                        </ul>
                      </div>
                      
                      <button
                        type="button"
                        onClick={() => setShowTermsModal(true)}
                        className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 px-6 rounded-lg transition-colors flex items-center justify-center shadow-lg hover:shadow-xl"
                      >
                        <FileText className="mr-2" size={20} />
                        📖 Ler e Aceitar Todos os Termos
                      </button>
                      
                      <p className="text-sm text-red-600 text-center font-medium bg-red-50 p-3 rounded border border-red-200">
                        ❌ Botão "Finalizar Cadastro" bloqueado até aceitar os termos
                      </p>
                    </div>
                  )}
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-start">
                    <CheckCircle2 className="text-blue-600 mr-3 mt-0.5 flex-shrink-0" size={20} />
                    <div className="text-sm text-blue-800">
                      <p className="font-semibold mb-1">Próximos Passos:</p>
                      <ul className="list-disc list-inside space-y-1">
                        <li>Seu cadastro será enviado para análise administrativa</li>
                        <li>Você receberá um e-mail de confirmação</li>
                        <li>Após aprovação, você poderá fazer login e começar a usar o sistema</li>
                        <li>O prazo de análise é de até 48 horas úteis</li>
                      </ul>
                    </div>
                  </div>
                </div>

                <div className="flex justify-between pt-4">
                  <button type="button" onClick={prevStep} className="btn btn-secondary">
                    ← Voltar
                  </button>
                  <button 
                    type="submit" 
                    disabled={loading || !termsAccepted}
                    className={`btn flex items-center ${
                      !termsAccepted 
                        ? 'bg-gray-300 text-gray-500 cursor-not-allowed' 
                        : 'btn-primary'
                    }`}
                    title={!termsAccepted ? 'Você precisa aceitar os termos primeiro' : ''}
                  >
                    {loading ? (
                      <>Processando...</>
                    ) : (
                      <>
                        <CheckCircle2 className="mr-2" size={20} />
                        Finalizar Cadastro
                      </>
                    )}
                  </button>
                </div>
                
                {!termsAccepted && (
                  <p className="text-center text-red-600 text-sm mt-2 font-medium">
                    ⚠️ Você precisa ler e aceitar os termos de uso para finalizar o cadastro
                  </p>
                )}
              </div>
            )}
          </form>

          <div className="mt-6 text-center">
            <Link to="/login" className="text-primary-600 hover:text-primary-700 text-sm">
              Já possui cadastro? Faça login aqui
            </Link>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center mt-8 text-white text-sm">
          <p>© 2025 Wander Pires Silva Coelho - Todos os direitos reservados</p>
          <p className="mt-1">E-mail: wanderpsc@gmail.com</p>
        </div>
      </div>

      {/* Modal de Termos */}
      {showTermsModal && (
        <TermsModal
          isRegistration={true}
          onAccept={() => {
            setTermsAccepted(true);
            setShowTermsModal(false);
            setValue('acceptedTerms', true);
            toast.success('Termos aceitos com sucesso!');
          }}
          onReject={() => {
            setShowTermsModal(false);
            toast.error('Você precisa aceitar os termos para continuar o cadastro');
          }}
        />
      )}
    </div>
  );
}
