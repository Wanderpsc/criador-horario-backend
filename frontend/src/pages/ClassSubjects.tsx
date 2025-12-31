import { useEffect, useState } from 'react';
import { Plus, Edit2, Trash2, X, Power, PowerOff, BookOpen, School, Search, Copy, ChevronDown, ChevronUp, AlertCircle, CheckCircle } from 'lucide-react';
import { classAPI, Class } from '../services/classAPI';
import { subjectAPI } from '../services/api';
import toast from 'react-hot-toast';

interface Subject {
  id: string;
  name: string;
  weeklyHours?: number;
  workloadHours?: number;
  color?: string;
  isActive?: boolean;
}

interface ClassSubjectAssociation {
  classId: string;
  className: string;
  gradeName: string;
  subjectIds: string[];
  subjects: Subject[];
  isActive: boolean;
}

export default function ClassSubjects() {
  const [classes, setClasses] = useState<Class[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [associations, setAssociations] = useState<ClassSubjectAssociation[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingClassId, setEditingClassId] = useState<string | null>(null);
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>([]);
  const [searchSubject, setSearchSubject] = useState('');
  const [filterActive, setFilterActive] = useState<boolean | null>(null);
  const [editingWeeklyHours, setEditingWeeklyHours] = useState<{ classId: string; subjectId: string } | null>(null);
  const [weeklyHoursInput, setWeeklyHoursInput] = useState<string>('');
  const [searchByClass, setSearchByClass] = useState<{ [classId: string]: string }>({});
  const [showCopyModal, setShowCopyModal] = useState(false);
  const [copyTargetClassId, setCopyTargetClassId] = useState<string | null>(null);
  const [copySourceClassId, setCopySourceClassId] = useState<string>('');
  const [expandedClasses, setExpandedClasses] = useState<{ [classId: string]: boolean }>({});
  const [pendingChanges, setPendingChanges] = useState<{ [classId: string]: { subjectIds: string[]; weeklyHours: { [subjectId: string]: number } } }>({});

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [classesRes, subjectsRes] = await Promise.all([
        classAPI.getAll(),
        subjectAPI.getAll()
      ]);

      const classesData = classesRes.data.data || [];
      const subjectsData = Array.isArray(subjectsRes.data) ? subjectsRes.data : [];

      // Mapear subjects
      const mappedSubjects = subjectsData.map((s: any) => ({
        id: s._id || s.id,
        name: s.name,
        weeklyHours: s.weeklyHours,
        workloadHours: s.workloadHours,
        color: s.color,
        isActive: s.isActive !== false
      }));

      setClasses(classesData);
      setSubjects(mappedSubjects);

      // Criar associações
      const assocs: ClassSubjectAssociation[] = classesData.map((c: Class) => {
        const subjectIds = c.subjectIds || [];
        const classSubjects = mappedSubjects.filter((s: Subject) => 
          subjectIds.includes(s.id)
        );

        return {
          classId: c.id,
          className: c.name,
          gradeName: c.grade?.name || 'Sem série',
          subjectIds: subjectIds,
          subjects: classSubjects,
          isActive: c.isActive !== false
        };
      });

      setAssociations(assocs);
    } catch (error) {
      console.error('❌ Erro ao carregar dados:', error);
      toast.error('Erro ao carregar dados');
    } finally {
      setLoading(false);
    }
  };

  const openModal = (classId: string) => {
    const classItem = classes.find(c => c.id === classId);
    if (!classItem) return;

    setEditingClassId(classId);
    setSelectedSubjects(classItem.subjectIds || []);
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingClassId(null);
    setSelectedSubjects([]);
    setSearchSubject('');
  };

  const handleSubjectToggle = (subjectId: string) => {
    setSelectedSubjects(prev =>
      prev.includes(subjectId)
        ? prev.filter(id => id !== subjectId)
        : [...prev, subjectId]
    );
  };

  const handleSave = async () => {
    if (!editingClassId) return;

    try {
      const classItem = classes.find(c => c.id === editingClassId);
      if (!classItem) return;

      await classAPI.update(editingClassId, {
        gradeId: classItem.gradeId,
        name: classItem.name,
        shift: classItem.shift,
        capacity: classItem.capacity,
        subjectIds: selectedSubjects
      });

      toast.success('Componentes curriculares atualizados!');
      closeModal();
      loadData();
    } catch (error) {
      console.error('❌ Erro ao salvar:', error);
      toast.error('Erro ao salvar associações');
    }
  };

  const handleToggleActive = async (classId: string) => {
    try {
      const classItem = classes.find(c => c.id === classId);
      if (!classItem) return;

      await classAPI.update(classId, {
        ...classItem,
        isActive: !classItem.isActive
      });

      toast.success(classItem.isActive ? 'Turma desativada' : 'Turma ativada');
      loadData();
    } catch (error) {
      console.error('❌ Erro ao alterar status:', error);
      toast.error('Erro ao alterar status da turma');
    }
  };

  const handleDelete = async (classId: string) => {
    const classItem = classes.find(c => c.id === classId);
    if (!classItem) return;

    if (!confirm(`Deseja realmente remover todas as associações da turma ${classItem.name}?`)) {
      return;
    }

    try {
      await classAPI.update(classId, {
        gradeId: classItem.gradeId,
        name: classItem.name,
        shift: classItem.shift,
        capacity: classItem.capacity,
        subjectIds: []
      });

      toast.success('Associações removidas!');
      loadData();
    } catch (error) {
      console.error('❌ Erro ao remover associações:', error);
      toast.error('Erro ao remover associações');
    }
  };

  const handleQuickToggleSubject = (classId: string, subjectId: string) => {
    const classItem = classes.find(c => c.id === classId);
    if (!classItem) return;

    // Verificar se há mudanças pendentes ou usar os dados originais
    const currentData = pendingChanges[classId] || {
      subjectIds: classItem.subjectIds || [],
      weeklyHours: classItem.subjectWeeklyHours || {}
    };

    const isCurrentlyAssociated = currentData.subjectIds.includes(subjectId);

    if (isCurrentlyAssociated) {
      // Remover disciplina (pendente)
      const newSubjectIds = currentData.subjectIds.filter(id => id !== subjectId);
      const newWeeklyHours = { ...currentData.weeklyHours };
      delete newWeeklyHours[subjectId];

      setPendingChanges({
        ...pendingChanges,
        [classId]: { subjectIds: newSubjectIds, weeklyHours: newWeeklyHours }
      });
      setEditingClassId(classId);

      const subject = subjects.find(s => s.id === subjectId);
      toast.success(`${subject?.name} será removido ao salvar`, { icon: '⏳' });
    } else {
      // Adicionar disciplina - perguntar quantidade de aulas
      const subject = subjects.find(s => s.id === subjectId);
      const defaultHours = subject?.weeklyHours || 2;
      const hours = prompt(
        `Quantas aulas de "${subject?.name}" por semana nesta turma?`,
        defaultHours.toString()
      );

      if (hours === null) return; // Cancelou

      const hoursNum = parseInt(hours);
      if (isNaN(hoursNum) || hoursNum < 1) {
        toast.error('Quantidade de aulas inválida');
        return;
      }

      const newSubjectIds = [...currentData.subjectIds, subjectId];
      const newWeeklyHours = {
        ...currentData.weeklyHours,
        [subjectId]: hoursNum
      };

      setPendingChanges({
        ...pendingChanges,
        [classId]: { subjectIds: newSubjectIds, weeklyHours: newWeeklyHours }
      });
      setEditingClassId(classId);

      toast.success(`${subject?.name} será adicionado ao salvar (${hoursNum}h/semana)`, { icon: '⏳' });
    }
  };

  const handleUpdateWeeklyHours = async (classId: string, subjectId: string, hours: number) => {
    try {
      console.log('📝 Atualizando aulas:', { classId, subjectId, hours });
      
      const classItem = classes.find(c => c.id === classId);
      if (!classItem) {
        console.error('❌ Turma não encontrada:', classId);
        return;
      }

      console.log('📋 Classe atual:', classItem);

      const newWeeklyHours = {
        ...(classItem.subjectWeeklyHours || {}),
        [subjectId]: hours
      };

      console.log('📊 Novo subjectWeeklyHours:', JSON.stringify(newWeeklyHours, null, 2));

      const updateData = {
        gradeId: classItem.gradeId,
        name: classItem.name,
        shift: classItem.shift,
        capacity: classItem.capacity,
        subjectIds: classItem.subjectIds,
        subjectWeeklyHours: newWeeklyHours
      };

      console.log('📤 Enviando para backend:', JSON.stringify(updateData, null, 2));

      const response = await classAPI.update(classId, updateData);
      console.log('✅ Resposta do backend:', JSON.stringify(response.data, null, 2));

      toast.success('Quantidade de aulas atualizada!');
      setEditingWeeklyHours(null);
      
      console.log('🔄 Recarregando dados...');
      await loadData();
      console.log('✅ Dados recarregados');
    } catch (error) {
      console.error('❌ Erro ao atualizar:', error);
      toast.error('Erro ao atualizar quantidade de aulas');
    }
  };

  const handleActivateAll = async (classId: string) => {
    try {
      const classItem = classes.find(c => c.id === classId);
      if (!classItem) return;

      // Pegar todos os IDs de disciplinas
      const allSubjectIds = subjects.map(s => s.id);
      
      // Criar objeto com horas semanais para cada disciplina
      const newWeeklyHours: { [key: string]: number } = {};
      subjects.forEach(subject => {
        newWeeklyHours[subject.id] = subject.weeklyHours || 2;
      });

      await classAPI.update(classId, {
        gradeId: classItem.gradeId,
        name: classItem.name,
        shift: classItem.shift,
        capacity: classItem.capacity,
        subjectIds: allSubjectIds,
        subjectWeeklyHours: newWeeklyHours
      });

      toast.success(`${subjects.length} componentes ativados!`);
      loadData();
    } catch (error) {
      console.error('❌ Erro ao ativar todos:', error);
      toast.error('Erro ao ativar todos os componentes');
    }
  };

  const handleDeactivateAll = async (classId: string) => {
    try {
      const classItem = classes.find(c => c.id === classId);
      if (!classItem) return;

      if (!confirm('Deseja realmente desativar todos os componentes desta turma?')) {
        return;
      }

      await classAPI.update(classId, {
        gradeId: classItem.gradeId,
        name: classItem.name,
        shift: classItem.shift,
        capacity: classItem.capacity,
        subjectIds: [],
        subjectWeeklyHours: {}
      });

      toast.success('Todos os componentes foram desativados!');
      loadData();
    } catch (error) {
      console.error('❌ Erro ao desativar todos:', error);
      toast.error('Erro ao desativar todos os componentes');
    }
  };

  const openCopyModal = (targetClassId: string) => {
    setCopyTargetClassId(targetClassId);
    setCopySourceClassId('');
    setShowCopyModal(true);
  };

  const closeCopyModal = () => {
    setShowCopyModal(false);
    setCopyTargetClassId(null);
    setCopySourceClassId('');
  };

  const handleCopyFromClass = async () => {
    if (!copyTargetClassId || !copySourceClassId) {
      toast.error('Selecione uma turma de origem');
      return;
    }

    if (copyTargetClassId === copySourceClassId) {
      toast.error('A turma de origem deve ser diferente da turma de destino');
      return;
    }

    try {
      const sourceClass = classes.find(c => c.id === copySourceClassId);
      const targetClass = classes.find(c => c.id === copyTargetClassId);
      
      if (!sourceClass || !targetClass) {
        toast.error('Turma não encontrada');
        return;
      }

      // Copiar subjectIds e subjectWeeklyHours
      const copiedSubjectIds = sourceClass.subjectIds || [];
      const copiedWeeklyHours = sourceClass.subjectWeeklyHours || {};

      await classAPI.update(copyTargetClassId, {
        gradeId: targetClass.gradeId,
        name: targetClass.name,
        shift: targetClass.shift,
        capacity: targetClass.capacity,
        subjectIds: copiedSubjectIds,
        subjectWeeklyHours: copiedWeeklyHours
      });

      const sourceClassName = `${sourceClass.grade?.name || ''} - ${sourceClass.name}`;
      const targetClassName = `${targetClass.grade?.name || ''} - ${targetClass.name}`;
      
      toast.success(`✅ Associações copiadas de "${sourceClassName}" para "${targetClassName}"!`);
      closeCopyModal();
      loadData();
    } catch (error) {
      console.error('❌ Erro ao copiar associações:', error);
      toast.error('Erro ao copiar associações');
    }
  };

  const filteredAssociations = associations
    .filter(assoc => {
      if (filterActive !== null && assoc.isActive !== filterActive) {
        return false;
      }
      return true;
    })
    .sort((a, b) => {
      // Ordenar por grau primeiro
      const gradeA = a.gradeName || '';
      const gradeB = b.gradeName || '';
      
      // Extrair números dos nomes das séries (ex: "6º Ano" -> 6, "1ª Série" -> 1)
      const extractNumber = (str: string): number => {
        const match = str.match(/\d+/);
        return match ? parseInt(match[0]) : 999;
      };
      
      const numA = extractNumber(gradeA);
      const numB = extractNumber(gradeB);
      
      if (numA !== numB) {
        return numA - numB;
      }
      
      // Se o número for igual, ordenar alfabeticamente pelo nome completo da série
      if (gradeA !== gradeB) {
        return gradeA.localeCompare(gradeB);
      }
      
      // Se a série for igual, ordenar pelo nome da turma (A, B, C...)
      return a.className.localeCompare(b.className);
    });

  const toggleExpanded = (classId: string) => {
    setExpandedClasses(prev => ({
      ...prev,
      [classId]: !prev[classId]
    }));
  };

  const handleSaveChanges = async (classId: string) => {
    if (!pendingChanges[classId]) return;

    try {
      const classItem = classes.find(c => c.id === classId);
      if (!classItem) return;

      const changes = pendingChanges[classId];

      await classAPI.update(classId, {
        gradeId: classItem.gradeId,
        name: classItem.name,
        shift: classItem.shift,
        capacity: classItem.capacity,
        subjectIds: changes.subjectIds,
        subjectWeeklyHours: changes.weeklyHours
      });

      // Limpar alterações pendentes
      const newPendingChanges = { ...pendingChanges };
      delete newPendingChanges[classId];
      setPendingChanges(newPendingChanges);
      setEditingClassId(null);

      toast.success('✅ Associações salvas com sucesso!');
      await loadData();
    } catch (error) {
      console.error('❌ Erro ao salvar associações:', error);
      toast.error('Erro ao salvar associações');
    }
  };

  const handleCancelChanges = (classId: string) => {
    const newPendingChanges = { ...pendingChanges };
    delete newPendingChanges[classId];
    setPendingChanges(newPendingChanges);
    setEditingClassId(null);
    toast.success('Alterações descartadas');
  };

  const handleSaveAll = async () => {
    const classesWithChanges = Object.keys(pendingChanges);
    if (classesWithChanges.length === 0) {
      toast.error('Nenhuma alteração pendente');
      return;
    }

    try {
      for (const classId of classesWithChanges) {
        const classItem = classes.find(c => c.id === classId);
        if (!classItem) continue;

        const changes = pendingChanges[classId];

        await classAPI.update(classId, {
          gradeId: classItem.gradeId,
          name: classItem.name,
          shift: classItem.shift,
          capacity: classItem.capacity,
          subjectIds: changes.subjectIds,
          subjectWeeklyHours: changes.weeklyHours
        });
      }

      setPendingChanges({});
      setEditingClassId(null);
      toast.success(`✅ ${classesWithChanges.length} turma(s) salva(s) com sucesso!`);
      await loadData();
    } catch (error) {
      console.error('❌ Erro ao salvar todas as alterações:', error);
      toast.error('Erro ao salvar alterações');
    }
  };

  const handleCancelAll = () => {
    setPendingChanges({});
    setEditingClassId(null);
    toast.success('Todas as alterações foram descartadas');
  };

  const filteredSubjects = subjects.filter(s =>
    s.name.toLowerCase().includes(searchSubject.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Carregando...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Turmas & Componentes Curriculares</h1>
          <p className="mt-1 text-sm text-gray-600">
            Associe componentes curriculares às turmas
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setFilterActive(null)}
            className={`px-4 py-2 rounded-lg ${
              filterActive === null ? 'bg-blue-600 text-white' : 'bg-gray-200'
            }`}
          >
            Todas
          </button>
          <button
            onClick={() => setFilterActive(true)}
            className={`px-4 py-2 rounded-lg ${
              filterActive === true ? 'bg-green-600 text-white' : 'bg-gray-200'
            }`}
          >
            Ativas
          </button>
          <button
            onClick={() => setFilterActive(false)}
            className={`px-4 py-2 rounded-lg ${
              filterActive === false ? 'bg-red-600 text-white' : 'bg-gray-200'
            }`}
          >
            Inativas
          </button>
        </div>
      </div>

      {/* Painel de Controle de Salvamento */}
      {Object.keys(pendingChanges).length > 0 && (
        <div className="bg-gradient-to-r from-yellow-50 to-orange-50 border-2 border-yellow-400 rounded-lg p-4 shadow-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="bg-yellow-400 text-white rounded-full p-2">
                <AlertCircle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900">
                  ⚠️ Alterações Pendentes
                </h3>
                <p className="text-sm text-gray-700">
                  <strong>{Object.keys(pendingChanges).length}</strong> turma(s) com alterações não salvas
                </p>
              </div>
            </div>
            <div className="flex gap-3">
              <button
                onClick={handleCancelAll}
                className="px-5 py-2.5 bg-gray-500 hover:bg-gray-600 text-white rounded-lg font-semibold transition-colors flex items-center gap-2"
              >
                <X className="w-5 h-5" />
                Cancelar Tudo
              </button>
              <button
                onClick={handleSaveAll}
                className="px-5 py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-lg font-semibold transition-colors flex items-center gap-2 shadow-md"
              >
                💾 Salvar Tudo
              </button>
            </div>
          </div>
          
          {/* Lista de turmas com alterações */}
          <div className="mt-3 pt-3 border-t border-yellow-300">
            <p className="text-xs font-semibold text-gray-700 mb-2">Turmas com alterações:</p>
            <div className="flex flex-wrap gap-2">
              {Object.keys(pendingChanges).map((classId) => {
                const classItem = classes.find(c => c.id === classId);
                return (
                  <span
                    key={classId}
                    className="inline-flex items-center gap-1 px-3 py-1 bg-yellow-200 text-yellow-900 rounded-full text-xs font-medium"
                  >
                    {classItem?.grade?.name} - {classItem?.name}
                  </span>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Status de Salvamento */}
      {Object.keys(pendingChanges).length === 0 && associations.some(a => a.subjects.length > 0) && (
        <div className="bg-green-50 border-l-4 border-green-500 rounded-lg p-4">
          <div className="flex items-center gap-3">
            <CheckCircle className="w-6 h-6 text-green-600" />
            <div>
              <h3 className="font-semibold text-green-900">✅ Todas as alterações salvas!</h3>
              <p className="text-sm text-green-700">
                {associations.filter(a => a.subjects.length > 0).length} turma(s) com componentes configurados
              </p>
            </div>
          </div>
        </div>
      )}

      {classes.length === 0 ? (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <p className="text-yellow-800">
            ⚠️ Nenhuma turma cadastrada. Cadastre turmas primeiro.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {filteredAssociations.map((assoc) => (
            <div
              key={assoc.classId}
              className={`bg-white rounded-lg shadow p-6 ${
                !assoc.isActive ? 'opacity-60' : ''
              }`}
            >
              <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-3">
                  <School className="w-8 h-8 text-blue-600" />
                  <div>
                    <h3 className="text-xl font-bold text-gray-900">
                      {assoc.className}
                    </h3>
                    <p className="text-sm text-gray-600">{assoc.gradeName}</p>
                  </div>
                  {!assoc.isActive && (
                    <span className="px-2 py-1 bg-red-100 text-red-800 text-xs rounded">
                      Inativa
                    </span>
                  )}
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => openModal(assoc.classId)}
                    className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"
                    title="Editar associações"
                  >
                    <Edit2 className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => openCopyModal(assoc.classId)}
                    className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"
                    title="Copiar de outra turma"
                  >
                    <Copy className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => handleToggleActive(assoc.classId)}
                    className={`p-2 rounded-lg ${
                      assoc.isActive
                        ? 'text-yellow-600 hover:bg-yellow-50'
                        : 'text-green-600 hover:bg-green-50'
                    }`}
                    title={assoc.isActive ? 'Desativar' : 'Ativar'}
                  >
                    {assoc.isActive ? (
                      <PowerOff className="w-5 h-5" />
                    ) : (
                      <Power className="w-5 h-5" />
                    )}
                  </button>
                  <button
                    onClick={() => handleDelete(assoc.classId)}
                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                    title="Remover todas as associações"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Resumo Visual dos Componentes Associados */}
              {(() => {
                const currentData = pendingChanges[assoc.classId] || {
                  subjectIds: assoc.subjectIds,
                  weeklyHours: classes.find(c => c.id === assoc.classId)?.subjectWeeklyHours || {}
                };
                const displaySubjects = subjects.filter(s => currentData.subjectIds.includes(s.id));
                
                return displaySubjects.length > 0 && (
                  <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
                    <p className="text-xs font-semibold text-blue-900 mb-2">
                      📚 Componentes Associados ({displaySubjects.length}):
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      {displaySubjects
                        .sort((a, b) => a.name.localeCompare(b.name))
                        .map((subject) => {
                          const weeklyHours = currentData.weeklyHours[subject.id] || subject.weeklyHours || 0;
                          
                          return (
                            <div
                              key={subject.id}
                              className="flex items-center gap-1.5 px-2.5 py-1 bg-white rounded-md border border-blue-300 text-xs"
                            >
                              <div
                                className="w-2 h-2 rounded-full flex-shrink-0"
                                style={{ backgroundColor: subject.color || '#4A90E2' }}
                              />
                              <span className="font-medium text-gray-900 truncate">{subject.name}</span>
                              <span className="text-blue-700 font-semibold whitespace-nowrap ml-auto">({weeklyHours}h)</span>
                            </div>
                          );
                        })}
                    </div>
                    <p className="text-xs text-blue-800 font-medium mt-2 pt-2 border-t border-blue-200">
                      💡 Total: <strong>{displaySubjects.reduce((sum, s) => {
                        return sum + (currentData.weeklyHours[s.id] || s.weeklyHours || 0);
                      }, 0)} aulas/semana</strong>
                    </p>
                  </div>
                );
              })()}

              <div className="border-t pt-4 mt-4">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                    <BookOpen className="w-4 h-4" />
                    Componentes Curriculares ({assoc.subjects.length} de {subjects.length})
                  </h4>
                  <button
                    onClick={() => toggleExpanded(assoc.classId)}
                    className="flex items-center gap-1 px-3 py-1 text-xs text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                  >
                    {expandedClasses[assoc.classId] ? (
                      <>
                        <ChevronUp className="w-4 h-4" />
                        Ocultar Lista
                      </>
                    ) : (
                      <>
                        <ChevronDown className="w-4 h-4" />
                        Mostrar Lista
                      </>
                    )}
                  </button>
                </div>

                {expandedClasses[assoc.classId] && (
                  <>
                    <div className="flex gap-2 mb-3">
                      <button
                        onClick={() => handleActivateAll(assoc.classId)}
                        className="text-xs px-3 py-1 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-1"
                        title="Ativar todos os componentes"
                      >
                        <Plus className="w-3 h-3" />
                        Ativar Todas
                      </button>
                      <button
                        onClick={() => handleDeactivateAll(assoc.classId)}
                        className="text-xs px-3 py-1 bg-red-600 text-white rounded-lg hover:bg-red-700 flex items-center gap-1"
                        title="Desativar todos os componentes"
                      >
                        <X className="w-3 h-3" />
                        Desativar Todas
                      </button>
                    </div>

                    {/* Campo de Busca por Turma */}
                    <div className="mb-3 relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                      <input
                        type="text"
                        placeholder="Buscar componente nesta turma..."
                        value={searchByClass[assoc.classId] || ''}
                        onChange={(e) => setSearchByClass({ ...searchByClass, [assoc.classId]: e.target.value })}
                        className="w-full pl-10 pr-10 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                      />
                      {searchByClass[assoc.classId] && (
                        <button
                          onClick={() => setSearchByClass({ ...searchByClass, [assoc.classId]: '' })}
                          className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      )}
                    </div>

                    {/* Lista de TODOS os Componentes com Checkboxes */}
                    <div className="grid grid-cols-1 gap-3 max-h-96 overflow-y-auto">
                  {subjects
                    .filter(subject => {
                      const searchTerm = (searchByClass[assoc.classId] || '').toLowerCase();
                      return subject.name.toLowerCase().includes(searchTerm);
                    })
                    .sort((a, b) => a.name.localeCompare(b.name))
                    .map((subject) => {
                      // Verificar associação considerando mudanças pendentes
                      const currentData = pendingChanges[assoc.classId] || {
                        subjectIds: assoc.subjectIds,
                        weeklyHours: classes.find(c => c.id === assoc.classId)?.subjectWeeklyHours || {}
                      };
                      const isAssociated = currentData.subjectIds.includes(subject.id);
                      const weeklyHours = currentData.weeklyHours[subject.id] || subject.weeklyHours || 0;
                      const annualHours = weeklyHours * 40;
                      const isEditing = editingWeeklyHours?.classId === assoc.classId && editingWeeklyHours?.subjectId === subject.id;

                      return (
                        <label
                          key={subject.id}
                          className={`flex items-center gap-3 p-4 rounded-lg border-2 cursor-pointer transition-all ${
                            isAssociated
                              ? 'bg-green-50 border-green-400 hover:bg-green-100'
                              : 'bg-gray-50 border-gray-300 hover:bg-gray-100 opacity-60'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={isAssociated}
                            onChange={() => handleQuickToggleSubject(assoc.classId, subject.id)}
                            className="w-5 h-5 text-green-600 border-gray-300 rounded focus:ring-green-500"
                          />
                          <div
                            className="w-4 h-4 rounded-full flex-shrink-0"
                            style={{ backgroundColor: subject.color || '#4A90E2' }}
                          />
                          <div className="flex-1 min-w-0">
                            <p className={`text-base font-medium ${isAssociated ? 'text-gray-900' : 'text-gray-500'}`}>
                              {subject.name}
                            </p>
                            {isAssociated && (
                              <div className="mt-1">
                                {isEditing ? (
                                  <div className="flex items-center gap-2">
                                    <input
                                      type="number"
                                      min="1"
                                      value={weeklyHoursInput}
                                      onChange={(e) => setWeeklyHoursInput(e.target.value)}
                                      className="w-20 px-2 py-1 text-sm border rounded"
                                      autoFocus
                                      onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                          const hours = parseInt(weeklyHoursInput);
                                          if (!isNaN(hours) && hours > 0) {
                                            handleUpdateWeeklyHours(assoc.classId, subject.id, hours);
                                          }
                                        } else if (e.key === 'Escape') {
                                          setEditingWeeklyHours(null);
                                        }
                                      }}
                                      onClick={(e) => e.stopPropagation()}
                                    />
                                    <button
                                      onClick={(e) => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        const hours = parseInt(weeklyHoursInput);
                                        if (!isNaN(hours) && hours > 0) {
                                          handleUpdateWeeklyHours(assoc.classId, subject.id, hours);
                                        }
                                      }}
                                      className="text-sm text-green-600 hover:text-green-700 px-2"
                                    >
                                      ✓
                                    </button>
                                    <button
                                      onClick={(e) => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        setEditingWeeklyHours(null);
                                      }}
                                      className="text-sm text-red-600 hover:text-red-700 px-2"
                                    >
                                      ✕
                                    </button>
                                  </div>
                                ) : (
                                  <div className="flex items-center gap-4">
                                    <button
                                      onClick={(e) => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        setEditingWeeklyHours({ classId: assoc.classId, subjectId: subject.id });
                                        setWeeklyHoursInput(weeklyHours.toString());
                                      }}
                                      className="text-sm text-blue-600 hover:text-blue-700 hover:underline"
                                    >
                                      {weeklyHours} aulas por semana
                                    </button>
                                    <span className="text-sm text-gray-600">
                                      {annualHours} aulas por ano
                                    </span>
                                  </div>
                                )}
                              </div>
                            )}
                            {!isAssociated && subject.weeklyHours && (
                              <p className="text-sm text-gray-400 mt-1">
                                Sugestão: {subject.weeklyHours} aulas por semana
                              </p>
                            )}
                          </div>
                        </label>
                      );
                    })}
                </div>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal de Edição */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg p-6 max-w-2xl w-full max-h-[80vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-gray-900">
                  Editar Componentes Curriculares
                </h2>
                <button onClick={closeModal}>
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="mb-4">
                <input
                  type="text"
                  placeholder="Buscar componente curricular..."
                  value={searchSubject}
                  onChange={(e) => setSearchSubject(e.target.value)}
                  className="w-full px-4 py-2 border rounded-lg"
                />
              </div>

              <div className="space-y-2 mb-6 max-h-96 overflow-y-auto">
                {filteredSubjects.map((subject) => (
                  <label
                    key={subject.id}
                    className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={selectedSubjects.includes(subject.id)}
                      onChange={() => handleSubjectToggle(subject.id)}
                      className="w-5 h-5"
                    />
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: subject.color || '#4A90E2' }}
                        />
                        <span className="font-medium">{subject.name}</span>
                      </div>
                      {subject.weeklyHours && (
                        <p className="text-xs text-gray-500">
                          {subject.weeklyHours} aulas/semana • {subject.workloadHours}h total
                        </p>
                      )}
                    </div>
                  </label>
                ))}
              </div>

              <div className="flex justify-end gap-3">
                <button
                  onClick={closeModal}
                  className="px-4 py-2 border rounded-lg hover:bg-gray-50"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleSave}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Salvar
                </button>
              </div>
            </div>
          </div>
      )}

      {/* Modal de Copiar Associações */}
      {showCopyModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden">
            <div className="bg-gradient-to-r from-blue-600 to-blue-700 p-6">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center">
                    <Copy className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-white">Copiar Associações</h2>
                    <p className="text-blue-100 text-sm mt-1">
                      Copie componentes e cargas horárias de outra turma
                    </p>
                  </div>
                </div>
                <button
                  onClick={closeCopyModal}
                  className="p-2 hover:bg-white/20 rounded-lg transition-colors"
                >
                  <X className="w-6 h-6 text-white" />
                </button>
              </div>
            </div>

            <div className="p-6">
              {/* Turma de Destino */}
              <div className="mb-6 p-4 bg-blue-50 border-2 border-blue-200 rounded-lg">
                <p className="text-sm font-semibold text-blue-700 mb-1">📍 TURMA DE DESTINO:</p>
                <p className="text-lg font-bold text-blue-900">
                  {classes.find(c => c.id === copyTargetClassId)?.grade?.name} - {classes.find(c => c.id === copyTargetClassId)?.name}
                </p>
                <p className="text-xs text-blue-600 mt-1">
                  As associações desta turma serão substituídas
                </p>
              </div>

              {/* Seleção de Turma de Origem */}
              <div className="mb-6">
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  🔄 Selecione a turma de origem:
                </label>
                <select
                  value={copySourceClassId}
                  onChange={(e) => setCopySourceClassId(e.target.value)}
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-base"
                >
                  <option value="">-- Selecione uma turma --</option>
                  {classes
                    .filter(c => c.id !== copyTargetClassId && c.isActive)
                    .sort((a, b) => {
                      const gradeCompare = (a.grade?.name || '').localeCompare(b.grade?.name || '');
                      if (gradeCompare !== 0) return gradeCompare;
                      return a.name.localeCompare(b.name);
                    })
                    .map((classItem) => {
                      const componentCount = classItem.subjectIds?.length || 0;
                      return (
                        <option key={classItem.id} value={classItem.id}>
                          {classItem.grade?.name} - {classItem.name} ({componentCount} componentes)
                        </option>
                      );
                    })}
                </select>
              </div>

              {/* Preview da Turma de Origem */}
              {copySourceClassId && (
                <div className="mb-6 p-4 bg-green-50 border-2 border-green-200 rounded-lg">
                  <p className="text-sm font-semibold text-green-700 mb-2">✅ COMPONENTES QUE SERÃO COPIADOS:</p>
                  <div className="max-h-48 overflow-y-auto space-y-1">
                    {classes.find(c => c.id === copySourceClassId)?.subjectIds?.map((subjectId) => {
                      const subject = subjects.find(s => s.id === subjectId);
                      const sourceClass = classes.find(c => c.id === copySourceClassId);
                      const weeklyHours = sourceClass?.subjectWeeklyHours?.[subjectId] || subject?.weeklyHours || 0;
                      return (
                        <div key={subjectId} className="flex items-center justify-between py-2 px-3 bg-white rounded border border-green-200">
                          <div className="flex items-center gap-2">
                            <div
                              className="w-3 h-3 rounded-full"
                              style={{ backgroundColor: subject?.color || '#4A90E2' }}
                            />
                            <span className="text-sm font-medium text-gray-800">{subject?.name}</span>
                          </div>
                          <span className="text-sm font-bold text-green-700">
                            {weeklyHours} aulas por semana • {weeklyHours * 40}h por ano
                          </span>
                        </div>
                      );
                    }) || <p className="text-sm text-gray-500 italic">Nenhum componente associado</p>}
                  </div>
                </div>
              )}

              {/* Aviso */}
              <div className="mb-6 p-3 bg-yellow-50 border-l-4 border-yellow-400 rounded">
                <p className="text-sm text-yellow-800">
                  ⚠️ <strong>Atenção:</strong> Esta ação substituirá completamente todas as associações da turma de destino.
                </p>
              </div>

              {/* Botões */}
              <div className="flex justify-end gap-3">
                <button
                  onClick={closeCopyModal}
                  className="px-6 py-2.5 border-2 border-gray-300 rounded-lg hover:bg-gray-50 font-medium transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleCopyFromClass}
                  disabled={!copySourceClassId}
                  className={`px-6 py-2.5 rounded-lg font-medium transition-colors ${
                    copySourceClassId
                      ? 'bg-blue-600 text-white hover:bg-blue-700'
                      : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  }`}
                >
                  Copiar Associações
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
