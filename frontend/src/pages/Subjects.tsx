import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { subjectAPI } from '../services/api';
import { useAuthStore } from '../store/authStore';
import { Plus, Edit2, Trash2, X, Search } from 'lucide-react';
import api from '../lib/axios';

interface Subject {
  id: string;
  name: string;
  code?: string;
  workloadHours: number;
  weeklyHours?: number;
  description?: string;
  scheduleNotes?: string;
  color?: string;
  classNames?: string[];
  classIds?: string[];
  classGrades?: { className: string; gradeName: string }[];
  isActive?: boolean;
}

interface SubjectForm extends Omit<Subject, 'id' | 'classNames'> {
  schoolId: string;
}

export default function Subjects() {
  const { user } = useAuthStore();
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [originalClassIds, setOriginalClassIds] = useState<string[]>([]);
  const { register, handleSubmit, reset, formState: { errors } } = useForm<SubjectForm>({
    defaultValues: {
      workloadHours: 40,
      weeklyHours: 2
    }
  });

  useEffect(() => {
    if (user) {
      loadSubjects();
    }
  }, [user]);

  const loadSubjects = async () => {
    try {
      const response = await subjectAPI.getAll();
      console.log('📥 Subjects recebidos do backend:', response.data);
      // Mapear _id para id
      const mappedSubjects = response.data.map((subject: any) => ({
        ...subject,
        id: subject._id || subject.id
      }));
      console.log('📊 Subjects após mapeamento:', mappedSubjects);
      setSubjects(mappedSubjects);
    } catch (error: any) {
      toast.error('Erro ao carregar componentes curriculares');
    } finally {
      setLoading(false);
    }
  };

  const onSubmit = async (data: SubjectForm) => {
    try {
      console.log('🔍 Dados recebidos do formulário:', data);
      console.log('🔍 weeklyHours raw:', data.weeklyHours, 'tipo:', typeof data.weeklyHours);
      
      // Garantir que os números sejam convertidos
      const payload = {
        ...data,
        workloadHours: Number(data.workloadHours),
        weeklyHours: data.weeklyHours ? Number(data.weeklyHours) : 2
      };
      
      console.log('📤 Salvando disciplina:', payload);
      console.log('📤 weeklyHours no payload:', payload.weeklyHours, 'tipo:', typeof payload.weeklyHours);
      
      if (editingId) {
        // Detectar turmas removidas ao editar
        const newClassIds = (data as any).classIds || [];
        const removedClassIds = originalClassIds.filter(oldId => !newClassIds.includes(oldId));
        
        console.log('📋 Turmas originais:', originalClassIds);
        console.log('📋 Novas turmas:', newClassIds);
        console.log('📋 Turmas removidas:', removedClassIds);
        
        await subjectAPI.update(editingId, payload);
        
        // Se houver turmas removidas, excluir as lotações correspondentes
        if (removedClassIds.length > 0) {
          try {
            // Buscar todas as associações deste componente
            const assocResponse = await api.get(`/teacher-subjects/${user?.id}`);
            const allAssociations = assocResponse.data.data || [];
            
            // Filtrar associações que usam este componente E as turmas removidas
            const associationsToDelete = allAssociations.filter((assoc: any) => 
              assoc.subjectId === editingId && removedClassIds.includes(assoc.classId)
            );
            
            console.log('🗑️ Lotações a serem removidas:', associationsToDelete.length);
            
            // Excluir cada associação
            for (const assoc of associationsToDelete) {
              const id = assoc._id || assoc.id;
              await api.delete(`/teacher-subjects/${id}`);
            }
            
            if (associationsToDelete.length > 0) {
              toast.success(`Componente atualizado e ${associationsToDelete.length} lotação(ões) removida(s) das turmas desmarcadas`);
            } else {
              toast.success('Componente curricular atualizado com sucesso');
            }
          } catch (error) {
            console.error('❌ Erro ao remover lotações:', error);
            toast.error('Componente atualizado, mas houve erro ao remover algumas lotações');
          }
        } else {
          toast.success('Componente curricular atualizado com sucesso');
        }
      } else {
        await subjectAPI.create(payload);
        toast.success('Componente curricular criado com sucesso');
      }
      
      setShowModal(false);
      setEditingId(null);
      setOriginalClassIds([]);
      reset();
      loadSubjects();
    } catch (error: any) {
      console.error('❌ Erro ao salvar:', error);
      toast.error(error.response?.data?.message || 'Erro ao salvar componente curricular');
    }
  };

  const handleEdit = (subject: Subject) => {
    console.log('✏️ Editando subject:', subject);
    console.log('✏️ weeklyHours do subject:', subject.weeklyHours, 'tipo:', typeof subject.weeklyHours);
    setEditingId(subject.id);
    // Guardar as turmas originais para comparar depois
    setOriginalClassIds(subject.classIds || []);
    reset(subject);
    setShowModal(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Deseja realmente excluir este componente curricular?')) return;
    
    try {
      await subjectAPI.delete(id);
      toast.success('Componente curricular excluído com sucesso');
      loadSubjects();
    } catch (error) {
      toast.error('Erro ao excluir componente curricular');
    }
  };

  const handleToggleActive = async (id: string, currentStatus: boolean) => {
    try {
      const newStatus = !currentStatus;
      await subjectAPI.update(id, { isActive: newStatus });
      toast.success(
        newStatus 
          ? '✅ Componente ATIVADO - Será incluído no gerador de horário' 
          : '⛔ Componente DESATIVADO - NÃO será incluído no gerador de horário'
      );
      loadSubjects();
    } catch (error) {
      toast.error('Erro ao atualizar status do componente');
    }
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingId(null);
    setOriginalClassIds([]);
    reset({
      workloadHours: 40,
      weeklyHours: 2
    });
  };

  // Filtrar componentes curriculares com base no termo de busca e ordenar alfabeticamente
  const filteredSubjects = subjects
    .filter(subject => {
      const searchLower = searchTerm.toLowerCase();
      return (
        subject.name.toLowerCase().includes(searchLower) ||
        subject.code?.toLowerCase().includes(searchLower) ||
        subject.description?.toLowerCase().includes(searchLower)
      );
    })
    .sort((a, b) => a.name.localeCompare(b.name));

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Componentes Curriculares</h1>
        <button
          onClick={() => setShowModal(true)}
          className="btn btn-primary flex items-center"
        >
          <Plus className="w-4 h-4 mr-2" />
            Novo Componente
          </button>
      </div>

      {/* Campo de Busca */}
      <div className="mb-6">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
          <input
            type="text"
            placeholder="Buscar por nome, código ou descrição..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="input pl-10 w-full"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <X size={20} />
            </button>
          )}
        </div>
        {searchTerm && (
          <p className="text-sm text-gray-600 mt-2">
            {filteredSubjects.length} componente(s) encontrado(s)
          </p>
        )}
      </div>

      {loading ? (
        <div className="card">
          <p>Carregando...</p>
        </div>
      ) : filteredSubjects.length === 0 ? (
        <div className="card text-center py-12">
          <p className="text-gray-500">
            {searchTerm ? 'Nenhum componente curricular encontrado com esse critério' : 'Nenhum componente curricular cadastrado'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredSubjects.map((subject) => (
            <div 
              key={subject.id} 
              className={`card border-l-4 ${subject.isActive === false ? 'opacity-60 bg-gray-50' : ''}`}
              style={{ borderLeftColor: subject.color || '#4A90E2' }}
            >
              <div className="flex justify-between items-start mb-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-semibold text-gray-900">
                      {subject.name}
                    </h3>
                    <span className={`px-2 py-0.5 text-xs font-medium rounded ${
                      subject.isActive === false 
                        ? 'bg-red-100 text-red-700' 
                        : 'bg-green-100 text-green-700'
                    }`}>
                      {subject.isActive === false ? '⛔ INATIVO' : '✅ ATIVO'}
                    </span>
                  </div>
                  {subject.code && (
                    <p className="text-sm text-gray-500">{subject.code}</p>
                  )}
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleToggleActive(subject.id, subject.isActive !== false)}
                    className={`p-1 rounded transition-colors ${subject.isActive === false ? 'bg-green-100 text-green-700 hover:bg-green-200' : 'bg-orange-100 text-orange-700 hover:bg-orange-200'}`}
                    title={subject.isActive === false ? '🔴 STATUS ATUAL: INATIVO\n✅ Clique para ATIVAR (incluir no gerador)' : '🟢 STATUS ATUAL: ATIVO\n⛔ Clique para DESATIVAR (excluir do gerador)'}
                  >
                    {subject.isActive === false ? (
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                    ) : (
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                      </svg>
                    )}
                  </button>
                  <button
                    onClick={() => handleEdit(subject)}
                    className="text-blue-600 hover:text-blue-700"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(subject.id)}
                    className="text-red-600 hover:text-red-700"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
              
              <div className="space-y-2 text-sm">
                {subject.description && (
                  <p className="text-gray-600">
                    {subject.description}
                  </p>
                )}
                {subject.scheduleNotes && (
                  <div className="mt-3 p-3 bg-purple-50 border border-purple-200 rounded">
                    <p className="text-sm font-medium text-purple-900 flex items-center gap-1">
                      🕐 Preferências de Horário:
                    </p>
                    <p className="text-xs text-purple-700 mt-1 whitespace-pre-wrap">
                      {subject.scheduleNotes}
                    </p>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 max-w-lg w-full">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-gray-900">
                {editingId ? 'Editar Componente Curricular' : 'Novo Componente Curricular'}
              </h2>
              <button onClick={handleCloseModal}>
                <X className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div>
                <label className="label">Nome *</label>
                <input
                  {...register('name', { required: 'Nome é obrigatório' })}
                  className="input"
                  placeholder="Nome do componente curricular"
                />
                {errors.name && (
                  <p className="text-red-500 text-sm mt-1">{errors.name.message}</p>
                )}
              </div>

              <div>
                <label className="label">Cor</label>
                <input
                  {...register('color')}
                  type="color"
                  className="input h-12"
                  defaultValue="#4A90E2"
                />
              </div>

              <div>
                <label className="label">Descrição</label>
                <textarea
                  {...register('description')}
                  className="input"
                  rows={3}
                  placeholder="Descrição do componente curricular"
                />
              </div>

              <div className="bg-purple-50 border-2 border-purple-200 rounded-lg p-4">
                <label className="label flex items-center gap-2">
                  <span className="text-purple-900 font-semibold">🕐 Observações de Disponibilidade de Horário</span>
                </label>
                <p className="text-xs text-purple-700 mb-2">
                  O sistema usa <strong>inteligência para analisar</strong> estas observações ao gerar horários automaticamente.
                </p>
                <textarea
                  {...register('scheduleNotes')}
                  className="input w-full"
                  rows={4}
                  placeholder="Exemplos:&#10;• Melhor pela manhã&#10;• Evitar últimas aulas do dia&#10;• Não agendar na sexta-feira&#10;• Preferência: segundas e quartas&#10;• Evitar dois horários seguidos&#10;• Máximo 2 aulas por dia"
                />
                <p className="text-xs text-purple-600 mt-2">
                  💡 <strong>Dicas:</strong> Use palavras como "melhor", "preferência", "evitar", "não agendar", "máximo" + dias da semana e períodos
                </p>
              </div>

              <div className="flex gap-3 pt-4">
                <button type="submit" className="btn btn-primary flex-1">
                  {editingId ? 'Atualizar' : 'Criar'}
                </button>
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="btn btn-secondary flex-1"
                >
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
