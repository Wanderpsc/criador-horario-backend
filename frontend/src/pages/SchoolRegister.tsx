import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import api from '../lib/axios';
import toast from 'react-hot-toast';
import { Building2, FileText, CheckCircle2, Eye, EyeOff } from 'lucide-react';

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
  const { register, handleSubmit, watch, formState: { errors } } = useForm<RegisterForm>();
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(1);
  const [showTerms, setShowTerms] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const navigate = useNavigate();

  const password = watch('password');

  const onSubmit = async (data: RegisterForm) => {
    setLoading(true);

    try {
      await api.post('/auth/register-school', {
        ...data,
        acceptedTermsDate: new Date().toISOString()
      });
      
      toast.success('Cadastro realizado com sucesso! Aguarde aprovação do administrador.');
      navigate('/login');
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
                
                <div>
                  <label className="label">Selecione o Plano *</label>
                  <select {...register('selectedPlan', { required: 'Selecione um plano' })} className="input">
                    <option value="">Escolha seu plano...</option>
                    <option value="trial">Trial - Gratuito por 30 dias</option>
                    <option value="micro">Micro - Pagamento por Horário (R$ 25-180 por uso)</option>
                    <option value="basico">Básico - R$ 99,00/mês (Até 30 professores, 15 turmas)</option>
                    <option value="profissional">Profissional - R$ 199,00/mês (Até 50 professores, 25 turmas)</option>
                    <option value="personalizado">Personalizado - R$ 450,00 taxa + R$ 150,00/horário (Emissão em 72h)</option>
                    <option value="enterprise">Enterprise - Sob consulta (Ilimitado)</option>
                  </select>
                  {errors.selectedPlan && <p className="text-red-500 text-sm mt-1">{errors.selectedPlan.message}</p>}
                </div>

                {/* Termos de Uso */}
                <div className="bg-gray-50 p-6 rounded-lg border-2 border-gray-200">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center">
                      <FileText className="text-primary-600 mr-2" size={24} />
                      <h3 className="text-lg font-semibold">Termos de Licenciamento</h3>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowTerms(!showTerms)}
                      className="text-primary-600 hover:text-primary-700 text-sm font-medium"
                    >
                      {showTerms ? 'Ocultar' : 'Ler completo'}
                    </button>
                  </div>

                  {showTerms && (
                    <div className="bg-white p-4 rounded border max-h-64 overflow-y-auto text-sm text-gray-700 mb-4">
                      <h4 className="font-bold mb-2">CONTRATO DE LICENCIAMENTO DE SOFTWARE</h4>
                      <p className="mb-2">
                        <strong>1. OBJETO:</strong> O presente contrato tem por objeto o licenciamento de uso do sistema
                        EduSync-PRO para criação automatizada de horários escolares.
                      </p>
                      <p className="mb-2">
                        <strong>2. LICENÇA:</strong> A licença concedida é não-exclusiva, intransferível e limitada ao
                        número de usuários contratado no plano escolhido.
                      </p>
                      <p className="mb-2">
                        <strong>3. PROPRIEDADE INTELECTUAL:</strong> Todos os direitos autorais e de propriedade
                        intelectual pertencem exclusivamente ao desenvolvedor Wander Pires Silva Coelho.
                      </p>
                      <p className="mb-2">
                        <strong>4. PAGAMENTO:</strong> O pagamento deve ser realizado conforme o plano contratado,
                        mensalmente ou anualmente, através dos métodos disponibilizados.
                      </p>
                      <p className="mb-2">
                        <strong>5. DADOS E PRIVACIDADE:</strong> Os dados cadastrados são de propriedade da instituição
                        e serão tratados conforme a LGPD (Lei Geral de Proteção de Dados).
                      </p>
                      <p className="mb-2">
                        <strong>6. SUPORTE:</strong> Suporte técnico será fornecido conforme o plano contratado,
                        via e-mail ou sistema de tickets.
                      </p>
                      <p className="mb-2">
                        <strong>7. RESCISÃO:</strong> O contrato pode ser rescindido por qualquer das partes com
                        aviso prévio de 30 dias. Em caso de inadimplência, o acesso será suspenso automaticamente.
                      </p>
                      <p className="mb-2">
                        <strong>8. GARANTIA:</strong> O software é fornecido "como está", sem garantias além das
                        funcionalidades descritas na documentação.
                      </p>
                      <p className="mb-2">
                        <strong>9. FORO:</strong> Fica eleito o foro da comarca de São Paulo/SP para dirimir
                        quaisquer questões oriundas deste contrato.
                      </p>
                      <p className="text-xs text-gray-600 mt-4">
                        © 2025 Wander Pires Silva Coelho - Todos os direitos reservados<br/>
                        E-mail: wanderpsc@gmail.com
                      </p>
                    </div>
                  )}

                  <label className="flex items-start cursor-pointer">
                    <input
                      type="checkbox"
                      {...register('acceptedTerms', { 
                        required: 'Você deve aceitar os termos para continuar' 
                      })}
                      className="mt-1 mr-3"
                    />
                    <span className="text-sm text-gray-700">
                      Li e aceito os <strong>Termos de Licenciamento</strong> e autorizo o uso dos dados
                      fornecidos conforme a <strong>Política de Privacidade</strong> e <strong>LGPD</strong>.
                    </span>
                  </label>
                  {errors.acceptedTerms && (
                    <p className="text-red-500 text-sm mt-2">{errors.acceptedTerms.message}</p>
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
                    disabled={loading}
                    className="btn btn-primary flex items-center"
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
    </div>
  );
}
