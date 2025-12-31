import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { teacherAPI } from '../services/api';
import { useAuthStore } from '../store/authStore';
import { Plus, Edit2, Trash2, X, Printer, Download, FileSpreadsheet } from 'lucide-react';

interface Teacher {
  id: string;
  cpf: string;
  registration?: string;
  name: string;
  email?: string;
  phone?: string;
  academicBackground: string;
  specialization?: string;
  availabilityNotes?: string;
  contractType?: '20h' | '40h';
  weeklyWorkload?: number;
  isActive: boolean;
}

interface TeacherForm extends Omit<Teacher, 'id'> {
  schoolId: string;
}

export default function Teachers() {
  const { user } = useAuthStore();
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const { register, handleSubmit, reset, setValue, watch, formState: { errors } } = useForm<TeacherForm>({
    defaultValues: {
      contractType: '40h',
      weeklyWorkload: 26
    }
  });

  useEffect(() => {
    if (user) {
      loadTeachers();
    }
  }, [user]);

  const loadTeachers = async () => {
    try {
      // Usar userId ao invés de schoolId
      const response = await teacherAPI.getAll(user!.id);
      setTeachers(response.data.data);
    } catch (error: any) {
      toast.error('Erro ao carregar professores');
    } finally {
      setLoading(false);
    }
  };

  const onSubmit = async (data: TeacherForm) => {
    try {
      // Usar userId como schoolId temporariamente
      data.schoolId = user!.id;
      
      // Garantir que weeklyWorkload seja número
      if (data.weeklyWorkload) {
        data.weeklyWorkload = Number(data.weeklyWorkload);
      }
      
      // Garantir que contractType tenha um valor padrão
      if (!data.contractType) {
        data.contractType = '40h';
      }
      
      console.log('Salvando professor:', { contractType: data.contractType, weeklyWorkload: data.weeklyWorkload });
      
      if (editingId) {
        await teacherAPI.update(editingId, data);
        toast.success('Professor atualizado com sucesso');
      } else {
        await teacherAPI.create(data);
        toast.success('Professor criado com sucesso');
      }
      
      setShowModal(false);
      setEditingId(null);
      reset();
      loadTeachers();
    } catch (error: any) {
      console.error('Erro ao salvar:', error);
      toast.error(error.response?.data?.message || 'Erro ao salvar professor');
    }
  };

  const handleEdit = (teacher: Teacher) => {
    console.log('Carregando professor:', { contractType: teacher.contractType, weeklyWorkload: teacher.weeklyWorkload });
    setEditingId(teacher.id);
    reset({
      ...teacher,
      contractType: teacher.contractType || '40h',
      weeklyWorkload: teacher.weeklyWorkload ? Number(teacher.weeklyWorkload) : 26
    });
    setShowModal(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Deseja realmente excluir este professor?')) return;
    
    try {
      await teacherAPI.delete(id);
      toast.success('Professor excluído com sucesso');
      loadTeachers();
    } catch (error: any) {
      toast.error('Erro ao excluir professor');
    }
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingId(null);
    reset({});
  };

  // Função para imprimir em formato de planilha
  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const currentDate = new Date().toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: 'long',
      year: 'numeric'
    });

    const printContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>Lista de Professores</title>
        <style>
          @page { size: A4 landscape; margin: 1cm; }
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { 
            font-family: Arial, sans-serif; 
            font-size: 10pt;
            line-height: 1.3;
            color: #000;
          }
          .header {
            text-align: center;
            margin-bottom: 20px;
            padding-bottom: 10px;
            border-bottom: 2px solid #333;
          }
          .header h1 {
            font-size: 18pt;
            margin-bottom: 5px;
            color: #1e40af;
          }
          .header .date {
            font-size: 9pt;
            color: #666;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 10px;
          }
          th, td {
            border: 1px solid #333;
            padding: 6px 8px;
            text-align: left;
            vertical-align: top;
          }
          th {
            background-color: #1e40af;
            color: white;
            font-weight: bold;
            font-size: 9pt;
          }
          td {
            font-size: 9pt;
          }
          .status-ativo {
            color: #059669;
            font-weight: bold;
          }
          .status-inativo {
            color: #dc2626;
            font-weight: bold;
          }
          .footer {
            margin-top: 20px;
            padding-top: 10px;
            border-top: 1px solid #ccc;
            text-align: center;
            font-size: 8pt;
            color: #666;
          }
          .summary {
            margin: 10px 0;
            padding: 8px;
            background-color: #f3f4f6;
            border-radius: 5px;
            font-size: 9pt;
            font-weight: bold;
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>${user?.schoolName || 'Escola'}</h1>
          <h2>Lista de Professores Cadastrados</h2>
          <div class="date">Emitido em: ${currentDate}</div>
        </div>

        <div class="summary">
          Total de professores: ${teachers.length} | 
          Ativos: ${teachers.filter(t => t.isActive !== false).length} | 
          Inativos: ${teachers.filter(t => t.isActive === false).length}
        </div>

        <table>
          <thead>
            <tr>
              <th style="width: 3%">#</th>
              <th style="width: 20%">Nome</th>
              <th style="width: 10%">CPF</th>
              <th style="width: 10%">Matrícula</th>
              <th style="width: 12%">E-mail</th>
              <th style="width: 10%">Telefone</th>
              <th style="width: 15%">Formação</th>
              <th style="width: 8%">Contrato</th>
              <th style="width: 7%">CH Semanal</th>
              <th style="width: 5%">Status</th>
            </tr>
          </thead>
          <tbody>
            ${teachers.map((teacher, index) => `
              <tr>
                <td>${index + 1}</td>
                <td><strong>${teacher.name}</strong></td>
                <td>${teacher.cpf}</td>
                <td>${teacher.registration || '-'}</td>
                <td>${teacher.email || '-'}</td>
                <td>${teacher.phone || '-'}</td>
                <td>${teacher.academicBackground || '-'}</td>
                <td>${teacher.contractType || '-'}</td>
                <td>${teacher.weeklyWorkload || '-'}</td>
                <td class="${teacher.isActive !== false ? 'status-ativo' : 'status-inativo'}">
                  ${teacher.isActive !== false ? '✓ Ativo' : '✗ Inativo'}
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>

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

  // Função para exportar para Excel
  const handleExportExcel = async () => {
    try {
      // Importar bibliotecas dinamicamente
      const XLSX = await import('xlsx');
      
      // Preparar dados
      const data = teachers.map((teacher, index) => ({
        '#': index + 1,
        'Nome': teacher.name,
        'CPF': teacher.cpf,
        'Matrícula': teacher.registration || '',
        'E-mail': teacher.email || '',
        'Telefone': teacher.phone || '',
        'Formação': teacher.academicBackground || '',
        'Especialização': teacher.specialization || '',
        'Tipo de Contrato': teacher.contractType || '',
        'CH Semanal': teacher.weeklyWorkload || '',
        'Disponibilidade': teacher.availabilityNotes || '',
        'Status': teacher.isActive !== false ? 'Ativo' : 'Inativo'
      }));

      // Criar workbook e worksheet
      const ws = XLSX.utils.json_to_sheet(data);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Professores');

      // Ajustar largura das colunas
      const colWidths = [
        { wch: 5 },  // #
        { wch: 30 }, // Nome
        { wch: 15 }, // CPF
        { wch: 15 }, // Matrícula
        { wch: 25 }, // E-mail
        { wch: 15 }, // Telefone
        { wch: 30 }, // Formação
        { wch: 25 }, // Especialização
        { wch: 15 }, // Tipo Contrato
        { wch: 12 }, // CH Semanal
        { wch: 40 }, // Disponibilidade
        { wch: 10 }  // Status
      ];
      ws['!cols'] = colWidths;

      // Nome do arquivo com data
      const fileName = `professores_${new Date().toISOString().split('T')[0]}.xlsx`;

      // Download
      XLSX.writeFile(wb, fileName);
      toast.success('✅ Arquivo Excel gerado com sucesso!');
    } catch (error) {
      console.error('Erro ao exportar para Excel:', error);
      toast.error('❌ Erro ao gerar arquivo Excel');
    }
  };

  // Função para exportar PDF
  const handleExportPDF = async () => {
    try {
      toast.loading('Gerando PDF...');
      
      // Criar conteúdo HTML temporário
      const tempDiv = document.createElement('div');
      tempDiv.style.position = 'absolute';
      tempDiv.style.left = '-9999px';
      tempDiv.style.width = '1200px';
      
      const currentDate = new Date().toLocaleDateString('pt-BR');
      
      tempDiv.innerHTML = `
        <div style="font-family: Arial, sans-serif; padding: 20px;">
          <div style="text-align: center; margin-bottom: 20px; border-bottom: 2px solid #333; padding-bottom: 10px;">
            <h1 style="color: #1e40af; font-size: 24px; margin-bottom: 5px;">${user?.schoolName || 'Escola'}</h1>
            <h2 style="font-size: 18px; margin-bottom: 5px;">Lista de Professores Cadastrados</h2>
            <p style="color: #666; font-size: 12px;">Emitido em: ${currentDate}</p>
          </div>
          
          <div style="margin: 15px 0; padding: 10px; background-color: #f3f4f6; border-radius: 5px; font-weight: bold;">
            Total: ${teachers.length} | Ativos: ${teachers.filter(t => t.isActive !== false).length} | Inativos: ${teachers.filter(t => t.isActive === false).length}
          </div>

          <table style="width: 100%; border-collapse: collapse; font-size: 10px;">
            <thead>
              <tr style="background-color: #1e40af; color: white;">
                <th style="border: 1px solid #333; padding: 8px;">#</th>
                <th style="border: 1px solid #333; padding: 8px;">Nome</th>
                <th style="border: 1px solid #333; padding: 8px;">CPF</th>
                <th style="border: 1px solid #333; padding: 8px;">Matrícula</th>
                <th style="border: 1px solid #333; padding: 8px;">E-mail</th>
                <th style="border: 1px solid #333; padding: 8px;">Telefone</th>
                <th style="border: 1px solid #333; padding: 8px;">Formação</th>
                <th style="border: 1px solid #333; padding: 8px;">Contrato</th>
                <th style="border: 1px solid #333; padding: 8px;">CH</th>
                <th style="border: 1px solid #333; padding: 8px;">Status</th>
              </tr>
            </thead>
            <tbody>
              ${teachers.map((teacher, index) => `
                <tr>
                  <td style="border: 1px solid #333; padding: 6px;">${index + 1}</td>
                  <td style="border: 1px solid #333; padding: 6px;"><strong>${teacher.name}</strong></td>
                  <td style="border: 1px solid #333; padding: 6px;">${teacher.cpf}</td>
                  <td style="border: 1px solid #333; padding: 6px;">${teacher.registration || '-'}</td>
                  <td style="border: 1px solid #333; padding: 6px;">${teacher.email || '-'}</td>
                  <td style="border: 1px solid #333; padding: 6px;">${teacher.phone || '-'}</td>
                  <td style="border: 1px solid #333; padding: 6px;">${teacher.academicBackground || '-'}</td>
                  <td style="border: 1px solid #333; padding: 6px;">${teacher.contractType || '-'}</td>
                  <td style="border: 1px solid #333; padding: 6px;">${teacher.weeklyWorkload || '-'}</td>
                  <td style="border: 1px solid #333; padding: 6px; color: ${teacher.isActive !== false ? '#059669' : '#dc2626'}; font-weight: bold;">
                    ${teacher.isActive !== false ? '✓' : '✗'}
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      `;
      
      document.body.appendChild(tempDiv);

      // Importar bibliotecas
      const { jsPDF } = await import('jspdf');
      const html2canvas = (await import('html2canvas')).default;

      // Gerar canvas
      const canvas = await html2canvas(tempDiv, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff'
      });

      // Remover elemento temporário
      document.body.removeChild(tempDiv);

      // Criar PDF
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('l', 'mm', 'a4'); // landscape
      const imgWidth = 277; // largura A4 landscape
      const pageHeight = 190;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      let heightLeft = imgHeight;
      let position = 10;

      pdf.addImage(imgData, 'PNG', 10, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;

      while (heightLeft >= 0) {
        position = heightLeft - imgHeight + 10;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 10, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }

      // Download
      const fileName = `professores_${new Date().toISOString().split('T')[0]}.pdf`;
      pdf.save(fileName);
      
      toast.dismiss();
      toast.success('✅ PDF gerado com sucesso!');
    } catch (error) {
      console.error('Erro ao gerar PDF:', error);
      toast.dismiss();
      toast.error('❌ Erro ao gerar PDF');
    }
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Professores</h1>
        <div className="flex gap-2">
          <button
            onClick={handlePrint}
            className="btn bg-purple-600 hover:bg-purple-700 text-white flex items-center"
            title="Imprimir lista"
          >
            <Printer className="w-4 h-4 mr-2" />
            Imprimir
          </button>
          <button
            onClick={handleExportPDF}
            className="btn bg-red-600 hover:bg-red-700 text-white flex items-center"
            title="Baixar PDF"
          >
            <Download className="w-4 h-4 mr-2" />
            PDF
          </button>
          <button
            onClick={handleExportExcel}
            className="btn bg-green-600 hover:bg-green-700 text-white flex items-center"
            title="Baixar Excel"
          >
            <FileSpreadsheet className="w-4 h-4 mr-2" />
            Excel
          </button>
          <button
            onClick={() => setShowModal(true)}
            className="btn btn-primary flex items-center"
          >
            <Plus className="w-4 h-4 mr-2" />
            Novo Professor
          </button>
        </div>
      </div>

      {loading ? (
        <div className="card">
          <p>Carregando...</p>
        </div>
      ) : teachers.length === 0 ? (
        <div className="card text-center py-12">
          <p className="text-gray-500">Nenhum professor cadastrado</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {teachers.map((teacher) => (
            <div key={teacher.id} className="card">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">
                    {teacher.name}
                  </h3>
                  <span className={`inline-block mt-1 px-2 py-1 text-xs rounded ${
                    teacher.isActive !== false 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-gray-100 text-gray-600'
                  }`}>
                    {teacher.isActive !== false ? '✓ Ativo' : '✗ Inativo'}
                  </span>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleEdit(teacher)}
                    className="text-blue-600 hover:text-blue-700"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(teacher.id)}
                    className="text-red-600 hover:text-red-700"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
              
              <div className="space-y-2 text-sm">
                <p className="text-gray-600">
                  <span className="font-medium">CPF:</span> {teacher.cpf}
                </p>
                {teacher.email && (
                  <p className="text-gray-600">
                    <span className="font-medium">E-mail:</span> {teacher.email}
                  </p>
                )}
                {teacher.phone && (
                  <p className="text-gray-600">
                    <span className="font-medium">Telefone:</span> {teacher.phone}
                  </p>
                )}
                <p className="text-gray-600">
                  <span className="font-medium">Formação:</span>{' '}
                  {teacher.academicBackground}
                </p>
                {teacher.specialization && (
                  <p className="text-gray-600">
                    <span className="font-medium">Especialização:</span>{' '}
                    {teacher.specialization}
                  </p>
                )}
                {teacher.availabilityNotes && (
                  <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded">
                    <p className="text-sm font-medium text-blue-900 flex items-center gap-1">
                      🕐 Disponibilidade:
                    </p>
                    <p className="text-xs text-blue-700 mt-1 whitespace-pre-wrap">
                      {teacher.availabilityNotes}
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
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-gray-900">
                {editingId ? 'Editar Professor' : 'Novo Professor'}
              </h2>
              <button onClick={handleCloseModal}>
                <X className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="label">Nome *</label>
                  <input
                    {...register('name', { required: 'Nome é obrigatório' })}
                    className="input"
                    placeholder="Nome completo"
                  />
                  {errors.name && (
                    <p className="text-red-500 text-sm mt-1">{errors.name.message}</p>
                  )}
                </div>

                <div>
                  <label className="label">CPF *</label>
                  <input
                    {...register('cpf', { required: 'CPF é obrigatório' })}
                    className="input"
                    placeholder="000.000.000-00"
                  />
                  {errors.cpf && (
                    <p className="text-red-500 text-sm mt-1">{errors.cpf.message}</p>
                  )}
                </div>

                <div>
                  <label className="label">Matrícula</label>
                  <input
                    {...register('registration')}
                    className="input"
                    placeholder="Ex: 123456"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    📌 Usado na geração do horário junto com CPF
                  </p>
                </div>

                <div>
                  <label className="label">E-mail</label>
                  <input
                    {...register('email')}
                    type="email"
                    className="input"
                    placeholder="email@exemplo.com"
                  />
                </div>

                <div>
                  <label className="label">Telefone</label>
                  <input
                    {...register('phone')}
                    className="input"
                    placeholder="(00) 00000-0000"
                  />
                </div>
              </div>

              <div>
                <label className="label">Formação Acadêmica *</label>
                <input
                  {...register('academicBackground', {
                    required: 'Formação acadêmica é obrigatória'
                  })}
                  className="input"
                  placeholder="Ex: Licenciatura em Matemática"
                />
                {errors.academicBackground && (
                  <p className="text-red-500 text-sm mt-1">
                    {errors.academicBackground.message}
                  </p>
                )}
              </div>

              <div>
                <label className="label">Especialização</label>
                <input
                  {...register('specialization')}
                  className="input"
                  placeholder="Ex: Mestrado em Educação"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Tipo de Contrato *</label>
                  <select
                    {...register('contractType', { required: 'Tipo de contrato é obrigatório' })}
                    className="input"
                  >
                    <option value="40h">40 horas/semana</option>
                    <option value="20h">20 horas/semana</option>
                  </select>
                  {errors.contractType && (
                    <p className="text-red-500 text-sm mt-1">{errors.contractType.message}</p>
                  )}
                </div>

                <div>
                  <label className="label">Carga Horária Semanal (aulas) *</label>
                  <input
                    type="number"
                    {...register('weeklyWorkload', { 
                      required: 'Carga horária é obrigatória',
                      valueAsNumber: true,
                      min: { value: 1, message: 'Mínimo 1 aula' },
                      max: { value: 40, message: 'Máximo 40 aulas' }
                    })}
                    className="input"
                    placeholder="Ex: 26"
                  />
                  {errors.weeklyWorkload && (
                    <p className="text-red-500 text-sm mt-1">{errors.weeklyWorkload.message}</p>
                  )}
                  <p className="text-xs text-gray-500 mt-1">
                    📌 Padrão: 26 aulas (40h) ou 13 aulas (20h)
                  </p>
                </div>
              </div>

              <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-4">
                <label className="label flex items-center gap-2">
                  <span className="text-blue-900 font-semibold">🕐 Observações de Disponibilidade de Horário</span>
                </label>
                <p className="text-xs text-blue-700 mb-2">
                  O sistema usa <strong>inteligência para analisar</strong> estas observações ao gerar horários automaticamente.
                </p>
                <textarea
                  {...register('availabilityNotes')}
                  className="input w-full"
                  rows={4}
                  placeholder="Exemplos:&#10;• Não pode às terças-feiras à tarde&#10;• Prefere trabalhar pela manhã&#10;• Disponível segunda a quinta&#10;• Evitar sexta-feira&#10;• Indisponível às quartas&#10;• Melhor horário: manhã"
                />
                <p className="text-xs text-blue-600 mt-2">
                  💡 <strong>Dicas:</strong> Use palavras como "não pode", "prefere", "disponível", "indisponível", "evitar" + dias da semana e períodos (manhã/tarde/noite)
                </p>
              </div>

              <div className="bg-green-50 border-2 border-green-200 rounded-lg p-4">
                <label className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    {...register('isActive')}
                    defaultChecked={true}
                    className="w-5 h-5 text-green-600 rounded focus:ring-green-500"
                  />
                  <div>
                    <span className="font-semibold text-green-900">Professor Ativo</span>
                    <p className="text-xs text-green-700 mt-1">
                      Apenas professores ativos serão considerados na geração automática de horários
                    </p>
                  </div>
                </label>
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
