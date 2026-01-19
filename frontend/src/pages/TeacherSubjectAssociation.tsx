import React, { useState, useEffect } from 'react';
import api from '../lib/axios';
import { useAuthStore } from '../store/authStore';
import { Search, X } from 'lucide-react';

interface Teacher {
  id: string;
  name: string;
  isActive: boolean;
}

interface Subject {
  id: string;
  name: string;
  gradeId?: string;
  gradeName?: string;
}

interface Class {
  id: string;
  name: string;
  shift: string;
  grade?: {
    id: string;
    name: string;
    level: number;
  };
  gradeName?: string;
}

interface TeacherSubject {
  id?: string;
  _id?: string;
  teacherId: string;
  subjectId: string;
  classId?: string;
  className?: string;
}

const TeacherSubjectAssociation: React.FC = () => {
  const { user } = useAuthStore();
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [classes, setClasses] = useState<Class[]>([]);
  const [associations, setAssociations] = useState<TeacherSubject[]>([]);
  const [selectedTeacher, setSelectedTeacher] = useState('');
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>([]);
  const [selectedClasses, setSelectedClasses] = useState<string[]>([]);
  const [pendingAssociations, setPendingAssociations] = useState<Array<{teacher: string; subject: string; class: string}>>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  
  // Novos estados para busca e modais
  const [searchSubject, setSearchSubject] = useState('');
  const [searchTeacher, setSearchTeacher] = useState('');
  const [searchSubjectInList, setSearchSubjectInList] = useState('');
  const [showNewTeacherModal, setShowNewTeacherModal] = useState(false);
  const [showNewSubjectModal, setShowNewSubjectModal] = useState(false);
  const [showPdfUploadModal, setShowPdfUploadModal] = useState(false);
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState('');
  const [newTeacherName, setNewTeacherName] = useState('');
  const [newTeacherEmail, setNewTeacherEmail] = useState('');
  const [newTeacherPhone, setNewTeacherPhone] = useState('');
  const [newSubjectName, setNewSubjectName] = useState('');
  const [newSubjectGrade, setNewSubjectGrade] = useState('');
  const [grades, setGrades] = useState<any[]>([]);

  useEffect(() => {
    loadData();
  }, [user]);

  const loadData = async () => {
    try {
      setLoading(true);

      // Buscar professores ativos
      const teachersRes = await api.get(`/teachers/user/${user?.id}`);
      const loadedTeachers = teachersRes.data.data.filter((t: Teacher) => t.isActive);
      setTeachers(loadedTeachers);

      // Buscar disciplinas
      const subjectsRes = await api.get(`/subjects/user/${user?.id}`);
      const sortedSubjects = (subjectsRes.data.data || []).sort((a: Subject, b: Subject) => 
        a.name.localeCompare(b.name)
      );
      setSubjects(sortedSubjects);

      // Buscar turmas (opcional - não bloquear se falhar)
      try {
        const classesRes = await api.get('/classes');
        const sortedClasses = (classesRes.data.data || []).sort((a: Class, b: Class) => {
          // Primeiro ordena por série (level)
          const levelA = a.grade?.level || 0;
          const levelB = b.grade?.level || 0;
          if (levelA !== levelB) {
            return levelA - levelB;
          }
          // Depois ordena por nome da turma
          return a.name.localeCompare(b.name);
        });
        setClasses(sortedClasses);
      } catch (error) {
        console.error('Erro ao carregar turmas:', error);
        setClasses([]);
      }

      // Buscar anos/séries (opcional - não bloquear se falhar)
      try {
        const gradesRes = await api.get(`/grades/user/${user?.id}`);
        setGrades(gradesRes.data.data);
      } catch (error) {
        setGrades([]);
      }

      // Buscar associações
      console.log('🔍 Buscando associações para userId:', user?.id);
      const assocRes = await api.get(`/teacher-subjects/${user?.id}`);
      const loadedAssociations = assocRes.data.data;
      console.log('📊 Total de associações carregadas:', loadedAssociations.length);
      setAssociations(loadedAssociations);
    } catch (error) {
      console.error('❌ Erro ao carregar dados:', error);
    } finally {
      setLoading(false);
    }
  };

  const getTeacherName = (teacherId: string) => {
    const teacher = teachers.find(t => t.id === teacherId);
    return teacher ? teacher.name : 'Não encontrado';
  };

  const handleClassToggle = (classId: string) => {
    setSelectedClasses(prev =>
      prev.includes(classId)
        ? prev.filter(id => id !== classId)
        : [...prev, classId]
    );
  };

  const handleSubjectToggle = (subjectId: string) => {
    setSelectedSubjects(prev =>
      prev.includes(subjectId)
        ? prev.filter(id => id !== subjectId)
        : [...prev, subjectId]
    );
  };

  const handleAddAssociation = () => {
    if (!selectedTeacher || selectedSubjects.length === 0 || selectedClasses.length === 0) {
      setMessage('⚠️ Selecione um professor, pelo menos um componente curricular e pelo menos uma turma');
      setTimeout(() => setMessage(''), 3000);
      return;
    }

    // Criar combinações de componente × turma
    const newAssociations: Array<{teacher: string; subject: string; class: string}> = [];
    for (const subjectId of selectedSubjects) {
      for (const classId of selectedClasses) {
        // Verificar se já existe
        const exists = pendingAssociations.some(
          a => a.teacher === selectedTeacher && a.subject === subjectId && a.class === classId
        );

        if (!exists) {
          newAssociations.push({ teacher: selectedTeacher, subject: subjectId, class: classId });
        }
      }
    }

    if (newAssociations.length === 0) {
      setMessage('⚠️ Todas as lotações selecionadas já foram adicionadas');
      setTimeout(() => setMessage(''), 3000);
      return;
    }

    setPendingAssociations(prev => [...prev, ...newAssociations]);

    // Limpar seleções
    setSelectedSubjects([]);
    setSelectedClasses([]);
    setMessage(`✅ ${newAssociations.length} lotação(ões) adicionada(s)! Adicione mais ou clique em Salvar`);
    setTimeout(() => setMessage(''), 3000);
  };

  const handleRemovePending = (index: number) => {
    setPendingAssociations(prev => prev.filter((_, i) => i !== index));
  };

  const handleEdit = (association: TeacherSubject) => {
    setSelectedTeacher(association.teacherId);
    setSelectedSubjects(association.subjectId ? [association.subjectId] : []);
    setSelectedClasses(association.classId ? [association.classId] : []);
    setMessage('✏️ Lotação carregada para edição. Ajuste os dados e adicione novamente.');
    setTimeout(() => setMessage(''), 4000);
    
    // Rolar para o topo
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleClearAllAssociations = async () => {
    if (!window.confirm('⚠️ ATENÇÃO: Esta ação irá excluir TODAS as lotações (associações professor-disciplina-turma).\n\nOs professores, disciplinas e turmas NÃO serão excluídos, apenas as lotações.\n\nDeseja continuar?')) {
      return;
    }

    // Confirmação dupla
    if (!window.confirm('Esta ação é IRREVERSÍVEL!\n\nTem certeza que deseja limpar TODAS as lotações?')) {
      return;
    }

    try {
      setLoading(true);
      setMessage('🔄 Excluindo todas as lotações...');

      // 🔥 BULK DELETE - Uma única requisição para deletar tudo
      const response = await api.delete(`/teacher-subjects/bulk/${user?.id}`);
      
      const deleted = response.data.deletedCount || 0;

      // Recarregar dados
      await loadData();

      setMessage(`✅ Todas as ${deleted} lotações foram excluídas com sucesso!`);
      
      setTimeout(() => setMessage(''), 5000);
    } catch (error: any) {
      console.error('Erro ao limpar lotações:', error);
      setMessage(`❌ Erro ao limpar lotações: ${error.response?.data?.message || error.message}`);
      setTimeout(() => setMessage(''), 5000);
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const currentDate = new Date().toLocaleDateString('pt-BR', { 
      day: '2-digit', 
      month: 'long', 
      year: 'numeric' 
    });

    // Agrupar lotações por professor
    const groupedByTeacher: { [key: string]: TeacherSubject[] } = {};
    teachers.forEach(teacher => {
      const teacherAssocs = getTeacherSubjects(teacher.id);
      if (teacherAssocs.length > 0) {
        groupedByTeacher[teacher.id] = teacherAssocs;
      }
    });

    const printContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>Lotação de Professores</title>
        <style>
          @page { size: A4; margin: 2cm; }
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { 
            font-family: Arial, sans-serif; 
            font-size: 11pt;
            line-height: 1.4;
            color: #000;
          }
          .header {
            text-align: center;
            margin-bottom: 30px;
            padding-bottom: 15px;
            border-bottom: 2px solid #333;
          }
          .header h1 {
            font-size: 20pt;
            margin-bottom: 5px;
            color: #1e40af;
          }
          .header h2 {
            font-size: 14pt;
            font-weight: normal;
            color: #666;
            margin-bottom: 10px;
          }
          .header .date {
            font-size: 10pt;
            color: #888;
          }
          .teacher-section {
            margin-bottom: 25px;
            page-break-inside: avoid;
          }
          .teacher-name {
            font-size: 13pt;
            font-weight: bold;
            color: #1e40af;
            margin-bottom: 10px;
            padding: 8px;
            background-color: #e0e7ff;
            border-left: 4px solid #1e40af;
          }
          .assignments {
            padding-left: 15px;
          }
          .assignment-item {
            padding: 6px 0;
            border-bottom: 1px solid #e5e7eb;
          }
          .assignment-item:last-child {
            border-bottom: none;
          }
          .subject {
            font-weight: bold;
            color: #059669;
          }
          .class {
            color: #7c3aed;
            margin-left: 5px;
          }
          .grade {
            color: #666;
            font-size: 9pt;
            margin-left: 3px;
          }
          .footer {
            margin-top: 40px;
            padding-top: 15px;
            border-top: 1px solid #ccc;
            text-align: center;
            font-size: 9pt;
            color: #888;
          }
          .summary {
            margin: 20px 0;
            padding: 10px;
            background-color: #f3f4f6;
            border-radius: 5px;
            font-size: 10pt;
          }
          @media print {
            .no-print { display: none; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>${user?.schoolName || 'Escola'}</h1>
          <h2>Lotação de Professores</h2>
          <div class="date">Emitido em: ${currentDate}</div>
        </div>

        <div class="summary">
          <strong>Total de professores lotados:</strong> ${Object.keys(groupedByTeacher).length} |
          <strong>Total de lotações:</strong> ${associations.length}
        </div>

        ${Object.entries(groupedByTeacher)
          .sort(([, a], [, b]) => {
            const teacherA = teachers.find(t => t.id === a[0]?.teacherId);
            const teacherB = teachers.find(t => t.id === b[0]?.teacherId);
            return (teacherA?.name || '').localeCompare(teacherB?.name || '');
          })
          .map(([teacherId, assocs]) => {
            const teacher = teachers.find(t => t.id === teacherId);
            return `
              <div class="teacher-section">
                <div class="teacher-name">${teacher?.name || 'Professor não encontrado'}</div>
                <div class="assignments">
                  ${assocs.map(assoc => {
                    const className = getClassName(assoc.classId);
                    return `
                      <div class="assignment-item">
                        <span class="subject">${getSubjectName(assoc.subjectId)}</span>
                        ${className ? `<span class="class">→ ${className}</span>` : ''}
                      </div>
                    `;
                  }).join('')}
                </div>
              </div>
            `;
          }).join('')}

        <div class="footer">
          <p>© ${new Date().getFullYear()} ${user?.schoolName || 'Sistema de Horários'} - Todos os direitos reservados</p>
          <p>Documento gerado pelo Sistema Criador de Horário de Aula Escolar</p>
        </div>

        <script>
          window.onload = function() {
            window.print();
          };
        </script>
      </body>
      </html>
    `;

    printWindow.document.write(printContent);
    printWindow.document.close();
  };

  const handlePrintBySubject = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const currentDate = new Date().toLocaleDateString('pt-BR', { 
      day: '2-digit', 
      month: 'long', 
      year: 'numeric' 
    });

    // Agrupar lotações por componente curricular
    const groupedBySubject: { [key: string]: TeacherSubject[] } = {};
    subjects.forEach(subject => {
      const subjectAssocs = associations.filter(a => a.subjectId === subject.id);
      if (subjectAssocs.length > 0) {
        groupedBySubject[subject.id] = subjectAssocs;
      }
    });

    const printContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>Componentes Curriculares e Professores Lotados</title>
        <style>
          @page { size: A4; margin: 2cm; }
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { 
            font-family: Arial, sans-serif; 
            font-size: 11pt;
            line-height: 1.4;
            color: #000;
          }
          .header {
            text-align: center;
            margin-bottom: 30px;
            padding-bottom: 15px;
            border-bottom: 2px solid #333;
          }
          .header h1 {
            font-size: 20pt;
            margin-bottom: 5px;
            color: #1e40af;
          }
          .header h2 {
            font-size: 14pt;
            font-weight: normal;
            color: #666;
            margin-bottom: 10px;
          }
          .header .date {
            font-size: 10pt;
            color: #888;
          }
          .subject-section {
            margin-bottom: 25px;
            page-break-inside: avoid;
          }
          .subject-name {
            font-size: 13pt;
            font-weight: bold;
            color: #1e40af;
            margin-bottom: 10px;
            padding: 8px;
            background-color: #dbeafe;
            border-left: 4px solid #1e40af;
          }
          .teachers {
            padding-left: 15px;
          }
          .teacher-item {
            padding: 6px 0;
            border-bottom: 1px solid #e5e7eb;
          }
          .teacher-item:last-child {
            border-bottom: none;
          }
          .teacher {
            font-weight: bold;
            color: #059669;
          }
          .class {
            color: #7c3aed;
            margin-left: 5px;
          }
          .footer {
            margin-top: 40px;
            padding-top: 15px;
            border-top: 1px solid #ccc;
            text-align: center;
            font-size: 9pt;
            color: #888;
          }
          .summary {
            margin: 20px 0;
            padding: 10px;
            background-color: #f3f4f6;
            border-radius: 5px;
            font-size: 10pt;
          }
          @media print {
            .no-print { display: none; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>${user?.schoolName || 'Escola'}</h1>
          <h2>Componentes Curriculares e Professores Lotados</h2>
          <div class="date">Emitido em: ${currentDate}</div>
        </div>

        <div class="summary">
          <strong>Total de componentes com lotação:</strong> ${Object.keys(groupedBySubject).length} |
          <strong>Total de lotações:</strong> ${associations.length}
        </div>

        ${Object.entries(groupedBySubject)
          .sort(([, a], [, b]) => {
            const subjectA = subjects.find(s => s.id === a[0]?.subjectId);
            const subjectB = subjects.find(s => s.id === b[0]?.subjectId);
            return (subjectA?.name || '').localeCompare(subjectB?.name || '');
          })
          .map(([subjectId, assocs]) => {
            const subject = subjects.find(s => s.id === subjectId);
            return `
              <div class="subject-section">
                <div class="subject-name">📚 ${subject?.name || 'Componente não encontrado'}</div>
                <div class="teachers">
                  ${assocs.map(assoc => {
                    const teacher = teachers.find(t => t.id === assoc.teacherId);
                    const className = getClassName(assoc.classId);
                    return `
                      <div class="teacher-item">
                        <span class="teacher">👨‍🏫 ${teacher?.name || 'Professor não encontrado'}</span>
                        ${className ? `<span class="class">→ ${className}</span>` : ''}
                      </div>
                    `;
                  }).join('')}
                </div>
              </div>
            `;
          }).join('')}

        <div class="footer">
          <p>© ${new Date().getFullYear()} ${user?.schoolName || 'Sistema de Horários'} - Todos os direitos reservados</p>
          <p>Documento gerado pelo Sistema Criador de Horário de Aula Escolar</p>
        </div>

        <script>
          window.onload = function() {
            window.print();
          };
        </script>
      </body>
      </html>
    `;

    printWindow.document.write(printContent);
    printWindow.document.close();
  };

  const handleSave = async () => {
    if (pendingAssociations.length === 0) {
      setMessage('⚠️ Adicione pelo menos uma lotação antes de salvar');
      return;
    }

    try {
      setLoading(true);
      console.log('💾 Salvando', pendingAssociations.length, 'associações');
      console.log('👤 UserId:', user?.id);

      let successCount = 0;
      let duplicateCount = 0;
      let errorCount = 0;

      // Enviar associações uma por uma para capturar erros individuais
      for (const assoc of pendingAssociations) {
        try {
          const payload = {
            teacherId: assoc.teacher,
            subjectId: assoc.subject,
            classId: assoc.class,
            schoolId: user?.schoolName || 'default',
            userId: user?.id
          };
          console.log('📤 Enviando associação:', payload);
          await api.post('/teacher-subjects', payload);
          successCount++;
        } catch (error: any) {
          if (error.response?.status === 400 && error.response?.data?.message?.includes('já existe')) {
            duplicateCount++;
            console.log('⚠️ Associação duplicada, ignorando...');
          } else {
            errorCount++;
            console.error('❌ Erro ao salvar associação:', error.response?.data || error.message);
          }
        }
      }
      
      console.log(`✅ Resultado: ${successCount} salvas, ${duplicateCount} duplicadas, ${errorCount} erros`);

      // Montar mensagem de resultado
      let resultMessage = '';
      if (successCount > 0) {
        resultMessage += `✅ ${successCount} lotação(ões) salva(s) com sucesso!`;
      }
      if (duplicateCount > 0) {
        resultMessage += ` ⚠️ ${duplicateCount} já existia(m).`;
      }
      if (errorCount > 0) {
        resultMessage += ` ❌ ${errorCount} com erro.`;
      }

      setMessage(resultMessage || '✅ Lotações processadas!');
      setSelectedTeacher('');
      setSelectedSubjects([]);
      setSelectedClasses([]);
      setPendingAssociations([]);
      loadData();

      setTimeout(() => setMessage(''), 5000);
    } catch (error) {
      console.error('❌ Erro ao salvar:', error);
      setMessage('❌ Erro ao salvar lotações');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (association: TeacherSubject) => {
    if (!window.confirm('Deseja remover esta lotação?')) return;

    try {
      const id = association._id || association.id;
      await api.delete(`/teacher-subjects/${id}`);
      setMessage('✅ Lotação removida de todas as visualizações');
      loadData(); // Recarrega dados - sincroniza ambas as seções automaticamente

      setTimeout(() => setMessage(''), 3000);
    } catch (error) {
      console.error('Erro ao deletar:', error);
      setMessage('❌ Erro ao remover lotação');
    }
  };

  const getSubjectName = (subjectId: string, showGrade: boolean = false) => {
    const subject = subjects.find(s => s.id === subjectId);
    if (!subject) return 'Componente não encontrado';
    // Não mostrar gradeName na lotação, pois a turma já indica a série
    return showGrade && subject.gradeName ? `${subject.name} (${subject.gradeName})` : subject.name;
  };

  const getClassName = (classId?: string) => {
    if (!classId) return null;
    const classItem = classes.find(c => c.id === classId);
    if (!classItem) return 'Não encontrada';
    const gradeName = classItem.grade?.name || classItem.gradeName || '';
    return gradeName ? `${classItem.name} (${gradeName})` : classItem.name;
  };

  const getTeacherSubjects = (teacherId: string) => {
    return associations.filter(a => a.teacherId === teacherId);
  };

  // Funções para gerenciar componentes curriculares
  const handleEditSubject = (subjectId: string) => {
    // Rolar para o topo da página (formulário de lotação)
    window.scrollTo({ top: 0, behavior: 'smooth' });
    
    // Pré-selecionar a disciplina no formulário
    setSelectedSubjects([subjectId]);
    
    // Mostrar mensagem
    setMessage(`✏️ Componente selecionado no formulário. Agora escolha o professor e a turma para criar a lotação.`);
    setTimeout(() => setMessage(''), 5000);
  };

  const handleDeleteSubject = async (subjectId: string, subjectName: string) => {
    const subjectAssocs = associations.filter(a => a.subjectId === subjectId);
    
    if (subjectAssocs.length > 0) {
      if (!window.confirm(`⚠️ Este componente possui ${subjectAssocs.length} lotação(ões). Deseja excluir o componente e TODAS as suas lotações?`)) {
        return;
      }
    } else {
      if (!window.confirm(`Deseja excluir o componente "${subjectName}"?`)) {
        return;
      }
    }

    try {
      // Primeiro, excluir todas as lotações do componente
      for (const assoc of subjectAssocs) {
        const id = assoc._id || assoc.id;
        await api.delete(`/teacher-subjects/${id}`);
      }

      // Depois, excluir o componente
      await api.delete(`/subjects/${subjectId}`);
      
      setMessage(`✅ Componente "${subjectName}" e suas lotações foram removidos`);
      loadData();
      setTimeout(() => setMessage(''), 3000);
    } catch (error) {
      console.error('Erro ao deletar componente:', error);
      setMessage('❌ Erro ao remover componente curricular');
    }
  };

  // Novas funções para criar professor
  const handleCreateTeacher = async () => {
    if (!newTeacherName.trim()) {
      setMessage('⚠️ Digite o nome do professor');
      return;
    }

    try {
      setLoading(true);
      const response = await api.post('/teachers', {
        name: newTeacherName,
        email: newTeacherEmail,
        phone: newTeacherPhone,
        cpf: '',
        academicBackground: '',
        specialization: '',
        availabilityNotes: '',
        isActive: true,
        schoolId: user?.schoolName || 'default',
        userId: user?.id
      });

      setMessage('✅ Professor criado e adicionado à lista!');
      setNewTeacherName('');
      setNewTeacherEmail('');
      setNewTeacherPhone('');
      setShowNewTeacherModal(false);
      
      await loadData();
      
      // Seleciona automaticamente o novo professor
      if (response.data.data?.id) {
        setSelectedTeacher(response.data.data.id);
      }

      setTimeout(() => setMessage(''), 3000);
    } catch (error) {
      console.error('Erro ao criar professor:', error);
      setMessage('❌ Erro ao criar professor');
    } finally {
      setLoading(false);
    }
  };

  // Novas funções para criar componente curricular
  const handleCreateSubject = async () => {
    if (!newSubjectName.trim()) {
      setMessage('⚠️ Digite o nome do componente curricular');
      return;
    }

    try {
      setLoading(true);
      const response = await api.post('/subjects', {
        name: newSubjectName,
        gradeId: newSubjectGrade || undefined,
        schoolId: user?.schoolName || 'default',
        userId: user?.id
      });

      setMessage('✅ Componente curricular criado e adicionado à lista!');
      setNewSubjectName('');
      setNewSubjectGrade('');
      setShowNewSubjectModal(false);
      
      await loadData();
      
      // Seleciona automaticamente o novo componente
      if (response.data.data?.id) {
        setSelectedSubjects(prev => [...prev, response.data.data.id]);
      }

      setTimeout(() => setMessage(''), 3000);
    } catch (error) {
      console.error('Erro ao criar componente curricular:', error);
      setMessage('❌ Erro ao criar componente curricular');
    } finally {
      setLoading(false);
    }
  };

  // Filtrar componentes curriculares pela busca
  const filteredSubjects = subjects.filter(subject =>
    subject.name.toLowerCase().includes(searchSubject.toLowerCase()) ||
    (subject.gradeName && subject.gradeName.toLowerCase().includes(searchSubject.toLowerCase()))
  );

  // Função para processar upload de PDF
  const handlePdfUpload = async () => {
    if (!pdfFile) {
      setMessage('⚠️ Selecione um arquivo PDF');
      return;
    }

    try {
      setLoading(true);
      setUploadProgress('📤 Enviando PDF...');

      const formData = new FormData();
      formData.append('pdf', pdfFile);

      const response = await api.post('/pdf-import/parse-pdf', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });

      console.log('📥 Resposta do servidor:', response.data);
      
      const { associations: extractedAssociations, stats, textSample, debugLogs } = response.data.data;

      console.log('📄 Resultado:', textSample);
      
      // Mostrar logs de debug do backend
      if (debugLogs && debugLogs.length > 0) {
        console.log('🔍 LOGS DETALHADOS DO BACKEND:');
        console.log('═'.repeat(80));
        debugLogs.forEach((log: string) => console.log(log));
        console.log('═'.repeat(80));
      }
      
      console.log('📊 Lotações extraídas:', extractedAssociations);
      console.log('📈 Estatísticas:', stats);

      setUploadProgress(`✅ Arquivo processado! Encontradas ${extractedAssociations.length} lotações`);
      
      // Adicionar as lotações extraídas às pendentes
      const newPending = extractedAssociations.map((assoc: any) => ({
        teacher: assoc.teacher,
        subject: assoc.subject,
        class: assoc.class
      }));

      setPendingAssociations(prev => [...prev, ...newPending]);
      
      setMessage(`🎉 ${extractedAssociations.length} lotações extraídas e adicionadas! Revise e clique em Salvar.`);
      setShowPdfUploadModal(false);
      setPdfFile(null);
      setUploadProgress('');

      setTimeout(() => setMessage(''), 5000);
    } catch (error: any) {
      console.error('Erro ao processar arquivo:', error);
      setUploadProgress('');
      setMessage(`❌ Erro ao processar arquivo: ${error.response?.data?.message || error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto p-6">
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <h1 className="text-2xl font-bold mb-2">Lotação (Associação de Professores a Componentes Curriculares e Turmas)</h1>
        <p className="text-gray-600 mb-4">
          Defina quais componentes curriculares e turmas cada professor pode lecionar. O gerador de horários 
          considerará apenas essas lotações.
        </p>

        {/* Navegação Rápida */}
        <div className="flex gap-3 mb-6">
          <a
            href="#todas-lotacoes"
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded font-medium text-sm flex items-center gap-2 transition-colors"
          >
            📋 Ir para Todas as Lotações
          </a>
          <a
            href="#componentes-professores"
            className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded font-medium text-sm flex items-center gap-2 transition-colors"
          >
            📚 Ir para Componentes e Professores
          </a>
        </div>

        {message && (
          <div className={`p-4 mb-4 rounded ${message.includes('✅') ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
            {message}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          {/* Seleção de Professor */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium text-gray-700">
                Professor *
              </label>
              <button
                onClick={() => setShowNewTeacherModal(true)}
                className="text-sm text-blue-600 hover:text-blue-800 font-medium"
                title="Adicionar novo professor"
              >
                + Novo Professor
              </button>
            </div>
            <select
              value={selectedTeacher}
              onChange={(e) => setSelectedTeacher(e.target.value)}
              className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Selecione um professor</option>
              {[...teachers].sort((a, b) => a.name.localeCompare(b.name)).map(teacher => (
                <option key={teacher.id} value={teacher.id}>
                  {teacher.name}
                </option>
              ))}
            </select>
          </div>

          {/* Preview de componentes curriculares já associados */}
          <div className="bg-gray-50 p-4 rounded">
            <p className="text-sm font-medium text-gray-700 mb-2">
              Componentes Curriculares já associados: 
              {selectedTeacher && <span className="text-blue-600 ml-2">({getTeacherSubjects(selectedTeacher).length})</span>}
            </p>
            {selectedTeacher ? (
              <div className="text-sm text-gray-600">
                {(() => {
                  const teacherAssocs = getTeacherSubjects(selectedTeacher);
                  
                  if (teacherAssocs.length === 0) {
                    return <span className="text-gray-400">Nenhum componente curricular associado</span>;
                  }
                  
                  return (
                    <ul className="list-disc list-inside space-y-1">
                      {teacherAssocs.map((a, index) => (
                        <li key={a._id || a.id || `assoc-${index}`} className="text-gray-700">
                          {getSubjectName(a.subjectId)}
                        </li>
                      ))}
                    </ul>
                  );
                })()}
              </div>
            ) : (
              <span className="text-gray-400 text-sm">Selecione um professor</span>
            )}
          </div>
        </div>

        {/* Seleção de Componente Curricular (Múltipla Escolha) */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <label className="block text-sm font-medium text-gray-700">
              Componentes Curriculares * (selecione um ou mais)
            </label>
            <button
              onClick={() => setShowNewSubjectModal(true)}
              className="text-sm text-blue-600 hover:text-blue-800 font-medium"
              title="Adicionar novo componente curricular"
            >
              + Novo Componente Curricular
            </button>
          </div>
          
          {/* Campo de busca */}
          <div className="mb-2">
            <input
              type="text"
              placeholder="🔍 Buscar componente curricular..."
              value={searchSubject}
              onChange={(e) => setSearchSubject(e.target.value)}
              className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="flex flex-col gap-2 p-4 bg-gray-50 rounded max-h-96 overflow-y-auto">
            {filteredSubjects.length > 0 ? (
              [...filteredSubjects].sort((a, b) => a.name.localeCompare(b.name)).map(subject => (
                <label
                  key={subject.id}
                  className="flex items-start space-x-2 p-3 bg-white rounded border hover:bg-blue-50 cursor-pointer transition-colors"
                >
                  <input
                    type="checkbox"
                    checked={selectedSubjects.includes(subject.id)}
                    onChange={() => handleSubjectToggle(subject.id)}
                    className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500 mt-1"
                  />
                  <div className="flex flex-col flex-1">
                    <span className="text-sm font-medium">{subject.name}</span>
                  </div>
                </label>
              ))
            ) : (
              <div className="text-center text-gray-500 py-4">
                {searchSubject ? 'Nenhum componente encontrado' : 'Nenhum componente cadastrado'}
              </div>
            )}
          </div>
          {selectedSubjects.length > 0 && (
            <p className="text-sm text-gray-500 mt-2">
              {selectedSubjects.length} componente(s) selecionado(s)
            </p>
          )}
        </div>

        {/* Seleção de Turmas (Múltipla Escolha) */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Turmas * (selecione uma ou mais)
          </label>
          
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 p-4 bg-gray-50 rounded max-h-96 overflow-y-auto">
            {classes.length > 0 ? (
              [...classes].sort((a, b) => {
                const gradeA = a.grade?.name || '';
                const gradeB = b.grade?.name || '';
                return gradeA.localeCompare(gradeB) || a.name.localeCompare(b.name);
              }).map(classItem => {
                const shiftLabel = {
                  morning: 'Matutino',
                  afternoon: 'Vespertino',
                  evening: 'Noturno',
                  full: 'Integral'
                }[classItem.shift] || classItem.shift;
                
                return (
                  <label
                    key={classItem.id}
                    className="flex items-start space-x-2 p-2 bg-white rounded border hover:bg-blue-50 cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={selectedClasses.includes(classItem.id)}
                      onChange={() => handleClassToggle(classItem.id)}
                      className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500 mt-1"
                    />
                    <div className="flex flex-col">
                      <span className="text-sm font-medium">{classItem.name}</span>
                      {classItem.grade && (
                        <span className="text-xs text-blue-600">📚 {classItem.grade.name}</span>
                      )}
                      <span className="text-xs text-gray-500">⏰ {shiftLabel}</span>
                    </div>
                  </label>
                );
              })
            ) : (
              <div className="col-span-full text-center text-gray-500 py-4">
                Nenhuma turma cadastrada
              </div>
            )}
          </div>
          {selectedClasses.length > 0 && (
            <p className="text-sm text-gray-500 mt-2">
              {selectedClasses.length} turma(s) selecionada(s)
            </p>
          )}
        </div>

        <button
          onClick={handleAddAssociation}
          disabled={loading || !selectedTeacher || selectedSubjects.length === 0 || selectedClasses.length === 0}
          className="w-full bg-green-600 text-white py-2 px-4 rounded hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed font-medium mb-6"
        >
          ➕ Adicionar Lotação
        </button>

        {/* Lista de Lotações Pendentes */}
        {pendingAssociations.length > 0 && (
          <div className="mb-6 p-4 bg-yellow-50 rounded border border-yellow-200">
            <h3 className="font-semibold text-gray-800 mb-3">Lotações a Salvar ({pendingAssociations.length})</h3>
            <div className="space-y-2">
              {pendingAssociations.map((assoc, index) => (
                <div key={index} className="flex items-center justify-between bg-white p-3 rounded border">
                  <div className="flex-1">
                    <span className="font-medium text-blue-900">{getTeacherName(assoc.teacher)}</span>
                    <span className="text-gray-600 mx-2">→</span>
                    <span className="text-green-700">{getSubjectName(assoc.subject)}</span>
                    <span className="text-gray-600 mx-2">→</span>
                    <span className="text-purple-700">{getClassName(assoc.class)}</span>
                  </div>
                  <button
                    onClick={() => handleRemovePending(index)}
                    className="text-red-600 hover:text-red-800 font-bold text-xl ml-2"
                    title="Remover"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
            <button
              onClick={handleSave}
              disabled={loading}
              className="w-full bg-blue-600 text-white py-2 px-4 rounded hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed font-medium mt-4"
            >
              {loading ? 'Salvando...' : '💾 Salvar Todas as Lotações'}
            </button>
          </div>
        )}
      </div>

      {/* Lista de Lotações por Professor */}
      <div id="todas-lotacoes" className="bg-white rounded-lg shadow-md p-6 scroll-mt-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold">Todas as Lotações</h2>
          <div className="flex space-x-3">
            <button
              onClick={handlePrint}
              disabled={teachers.length === 0 || associations.length === 0}
              className="flex items-center space-x-2 bg-blue-600 text-white py-2 px-4 rounded hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed font-medium"
              title="Imprimir lotação dos professores"
            >
              <span>🖨️</span>
              <span>Imprimir Lotação</span>
            </button>
          </div>
        </div>

        {/* Campo de Busca de Professores */}
        <div className="mb-4">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              placeholder="Buscar professor por nome..."
              value={searchTeacher}
              onChange={(e) => setSearchTeacher(e.target.value)}
              className="w-full pl-10 pr-10 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            {searchTeacher && (
              <button
                onClick={() => setSearchTeacher('')}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <X size={20} />
              </button>
            )}
          </div>
        </div>
        
        {loading ? (
          <p className="text-gray-500 text-center py-8">Carregando...</p>
        ) : teachers.length === 0 ? (
          <p className="text-gray-500 text-center py-8">
            Nenhum professor ativo cadastrado. Cadastre professores primeiro.
          </p>
        ) : (
          <div className="space-y-4">
            {[...teachers]
              .filter(teacher => 
                searchTeacher === '' || 
                teacher.name.toLowerCase().includes(searchTeacher.toLowerCase())
              )
              .sort((a, b) => a.name.localeCompare(b.name))
              .map(teacher => {
              const teacherAssociations = getTeacherSubjects(teacher.id);
              // Ordenar associações alfabeticamente pelo nome da disciplina
              const sortedAssociations = [...teacherAssociations].sort((a, b) => {
                const subjectA = getSubjectName(a.subjectId);
                const subjectB = getSubjectName(b.subjectId);
                return subjectA.localeCompare(subjectB);
              });
              return (
                <div key={teacher.id} className="border rounded p-4">
                  <h3 className="font-semibold text-lg mb-2 text-blue-900">
                    {teacher.name}
                  </h3>
                  {sortedAssociations.length > 0 ? (
                    <div className="flex flex-col gap-2">
                      {sortedAssociations.map(assoc => {
                        const className = getClassName(assoc.classId);
                        return (
                          <div
                            key={assoc._id || assoc.id}
                            className="flex items-center space-x-2 bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm"
                          >
                            <span>
                              {getSubjectName(assoc.subjectId)}
                              {className && <span className="text-purple-700 ml-1">→ {className}</span>}
                            </span>
                            <button
                              onClick={() => handleEdit(assoc)}
                              className="text-blue-600 hover:text-blue-800 font-bold"
                              title="✏️ Editar esta lotação (carrega dados no formulário acima)"
                            >
                              ✏️
                            </button>
                            <button
                              onClick={() => handleDelete(assoc)}
                              className="text-red-600 hover:text-red-800 font-bold"
                              title="Remover lotação"
                            >
                              ×
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="text-gray-400 text-sm">
                      Nenhuma lotação cadastrada
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Lista de Lotações por Componente Curricular */}
      <div id="componentes-professores" className="bg-white rounded-lg shadow-md p-6 scroll-mt-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold">Componentes Curriculares e Professores Lotados</h2>
          <div className="flex gap-3">
            <button
              onClick={handleClearAllAssociations}
              disabled={loading || associations.length === 0}
              className="bg-red-600 text-white py-2 px-4 rounded hover:bg-red-700 font-medium flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              title="Limpar todas as lotações (não exclui professores, disciplinas ou turmas)"
            >
              🗑️ Limpar Lotações
            </button>
            <button
              onClick={handlePrintBySubject}
              className="bg-blue-600 text-white py-2 px-4 rounded hover:bg-blue-700 font-medium flex items-center"
              title="Imprimir listagem por componentes"
            >
              🖨️ Imprimir
            </button>
          </div>
        </div>

        {/* Campo de Busca de Disciplinas */}
        <div className="mb-4">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              placeholder="Buscar componente curricular por nome..."
              value={searchSubjectInList}
              onChange={(e) => setSearchSubjectInList(e.target.value)}
              className="w-full pl-10 pr-10 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            {searchSubjectInList && (
              <button
                onClick={() => setSearchSubjectInList('')}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <X size={20} />
              </button>
            )}
          </div>
        </div>
        
        {loading ? (
          <p className="text-gray-500 text-center py-8">Carregando...</p>
        ) : subjects.length === 0 ? (
          <p className="text-gray-500 text-center py-8">
            Nenhum componente curricular cadastrado.
          </p>
        ) : (
          <div className="space-y-4">
            {[...subjects]
              .filter(subject => 
                searchSubjectInList === '' || 
                subject.name.toLowerCase().includes(searchSubjectInList.toLowerCase())
              )
              .sort((a, b) => a.name.localeCompare(b.name))
              .map(subject => {
              const subjectAssociations = associations.filter(
                assoc => assoc.subjectId === subject.id
              );
              
              return (
                <div key={subject.id} className="border rounded p-4 bg-blue-50">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-semibold text-lg text-blue-900">
                      📚 {subject.name}
                    </h3>
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => handleEditSubject(subject.id)}
                        className="text-blue-600 hover:text-blue-800 text-xl font-bold"
                        title="📝 Editar dados do componente curricular (abre página de componentes)"
                      >
                        ⚙️
                      </button>
                      <button
                        onClick={() => handleDeleteSubject(subject.id, subject.name)}
                        className="text-red-600 hover:text-red-800 text-2xl font-bold"
                        title="Excluir componente e todas as suas lotações"
                      >
                        🗑️
                      </button>
                    </div>
                  </div>
                  {subjectAssociations.length > 0 ? (
                    <div className="flex flex-col gap-2">
                      {[...subjectAssociations]
                        .sort((a, b) => {
                          const teacherA = teachers.find(t => t.id === a.teacherId);
                          const teacherB = teachers.find(t => t.id === b.teacherId);
                          const nameA = teacherA?.name || '';
                          const nameB = teacherB?.name || '';
                          return nameA.localeCompare(nameB);
                        })
                        .map(assoc => {
                        const teacher = teachers.find(t => t.id === assoc.teacherId);
                        const className = getClassName(assoc.classId);
                        return (
                          <div
                            key={assoc._id || assoc.id}
                            className="flex items-center justify-between bg-green-100 text-green-800 px-3 py-2 rounded text-sm"
                          >
                            <span className="flex-1">
                              👨‍🏫 {teacher?.name || 'Professor não encontrado'}
                              {className && <span className="text-purple-700 ml-1">→ {className}</span>}
                            </span>
                            <div className="flex items-center space-x-2 ml-4">
                              <button
                                onClick={() => handleEdit(assoc)}
                                className="text-blue-600 hover:text-blue-800 font-bold"
                                title="✏️ Editar esta lotação (carrega dados no formulário acima)"
                              >
                                ✏️
                              </button>
                              <button
                                onClick={() => handleDelete(assoc)}
                                className="text-red-600 hover:text-red-800 font-bold"
                                title="Remover lotação"
                              >
                                ×
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="flex items-center justify-between bg-yellow-50 border border-yellow-200 rounded p-3">
                      <p className="text-gray-600 text-sm italic">
                        ℹ️ Nenhum professor lotado neste componente.
                      </p>
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => handleEditSubject(subject.id)}
                          className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-sm font-medium flex items-center gap-1"
                          title="Editar componente curricular"
                        >
                          ✏️ Editar
                        </button>
                        <button
                          onClick={() => handleDeleteSubject(subject.id, subject.name)}
                          className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded text-sm font-medium flex items-center gap-1"
                          title="Excluir componente"
                        >
                          🗑️ Excluir
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modal Novo Professor */}
      {showNewTeacherModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <h2 className="text-xl font-bold mb-4">Adicionar Novo Professor</h2>
            
            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nome do Professor *
                </label>
                <input
                  type="text"
                  value={newTeacherName}
                  onChange={(e) => setNewTeacherName(e.target.value)}
                  className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500"
                  placeholder="Digite o nome completo"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email (opcional)
                </label>
                <input
                  type="email"
                  value={newTeacherEmail}
                  onChange={(e) => setNewTeacherEmail(e.target.value)}
                  className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500"
                  placeholder="email@exemplo.com"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Telefone (opcional)
                </label>
                <input
                  type="tel"
                  value={newTeacherPhone}
                  onChange={(e) => setNewTeacherPhone(e.target.value)}
                  className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500"
                  placeholder="(00) 00000-0000"
                />
              </div>
            </div>

            <div className="flex space-x-3">
              <button
                onClick={() => {
                  setShowNewTeacherModal(false);
                  setNewTeacherName('');
                  setNewTeacherEmail('');
                  setNewTeacherPhone('');
                }}
                className="flex-1 px-4 py-2 border border-gray-300 rounded hover:bg-gray-50"
                disabled={loading}
              >
                Cancelar
              </button>
              <button
                onClick={handleCreateTeacher}
                disabled={loading || !newTeacherName.trim()}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-300"
              >
                {loading ? 'Criando...' : 'Criar Professor'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Novo Componente Curricular */}
      {showNewSubjectModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <h2 className="text-xl font-bold mb-4">Adicionar Novo Componente Curricular</h2>
            
            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nome do Componente Curricular *
                </label>
                <input
                  type="text"
                  value={newSubjectName}
                  onChange={(e) => setNewSubjectName(e.target.value)}
                  className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500"
                  placeholder="Ex: Matemática, Língua Portuguesa, etc."
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Ano/Série (opcional)
                </label>
                <select
                  value={newSubjectGrade}
                  onChange={(e) => setNewSubjectGrade(e.target.value)}
                  className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Selecione um ano/série (opcional)</option>
                  {[...grades].sort((a, b) => a.name.localeCompare(b.name)).map(grade => (
                    <option key={grade.id} value={grade.id}>
                      {grade.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex space-x-3">
              <button
                onClick={() => {
                  setShowNewSubjectModal(false);
                  setNewSubjectName('');
                  setNewSubjectGrade('');
                }}
                className="flex-1 px-4 py-2 border border-gray-300 rounded hover:bg-gray-50"
                disabled={loading}
              >
                Cancelar
              </button>
              <button
                onClick={handleCreateSubject}
                disabled={loading || !newSubjectName.trim()}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-300"
              >
                {loading ? 'Criando...' : 'Criar Componente'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Upload de PDF/Excel */}
      {showPdfUploadModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl">
            <h2 className="text-xl font-bold mb-4">📄 Importar Lotação de PDF ou Excel</h2>
            
            <div className="space-y-4">
              <div className="bg-blue-50 border border-blue-200 rounded p-4 text-sm">
                <p className="font-medium text-blue-900 mb-2">💡 Como funciona:</p>
                <ul className="list-disc list-inside text-blue-800 space-y-1">
                  <li>Selecione um PDF ou Excel (.xlsx) contendo a lotação</li>
                  <li>O arquivo deve ter 3 colunas: Professor | Disciplina | Turma</li>
                  <li>O sistema vai extrair automaticamente os dados</li>
                  <li>Fará o matching com professores, disciplinas e turmas já cadastrados</li>
                  <li>As lotações serão adicionadas para você revisar</li>
                  <li>Depois, basta clicar em "Salvar" para confirmar</li>
                </ul>
              </div>

              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                <input
                  type="file"
                  accept=".pdf,.xlsx,.xls"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      setPdfFile(file);
                      setUploadProgress('');
                    }
                  }}
                  className="hidden"
                  id="pdf-upload"
                />
                <label
                  htmlFor="pdf-upload"
                  className="cursor-pointer flex flex-col items-center"
                >
                  <svg className="w-16 h-16 text-gray-400 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                  <span className="text-gray-600 mb-1">
                    {pdfFile ? pdfFile.name : 'Clique para selecionar PDF ou Excel'}
                  </span>
                  <span className="text-sm text-gray-500">
                    Formatos aceitos: .pdf, .xlsx, .xls | Máximo: 10MB
                  </span>
                </label>
              </div>

              {uploadProgress && (
                <div className="p-3 bg-blue-50 text-blue-700 rounded">
                  {uploadProgress}
                </div>
              )}

              <div className="flex space-x-3">
                <button
                  onClick={() => {
                    setShowPdfUploadModal(false);
                    setPdfFile(null);
                    setUploadProgress('');
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded hover:bg-gray-50"
                  disabled={loading}
                >
                  Cancelar
                </button>
                <button
                  onClick={handlePdfUpload}
                  disabled={loading || !pdfFile}
                  className="flex-1 px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 disabled:bg-gray-300"
                >
                  {loading ? 'Processando...' : 'Processar Arquivo'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Botão Voltar ao Topo */}
      <div className="flex justify-center mt-8 mb-4">
        <button
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          className="flex items-center space-x-2 bg-blue-600 text-white py-3 px-6 rounded-lg hover:bg-blue-700 shadow-lg transition-all duration-300 hover:shadow-xl font-medium"
          title="Voltar ao topo da página"
        >
          <svg 
            className="w-5 h-5" 
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              strokeWidth={2} 
              d="M5 10l7-7m0 0l7 7m-7-7v18" 
            />
          </svg>
          <span>Voltar ao Topo</span>
        </button>
      </div>
    </div>
  );
};

export default TeacherSubjectAssociation;
