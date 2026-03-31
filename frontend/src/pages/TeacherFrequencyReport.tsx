import React, { useState, useEffect } from 'react';
import { 
  BarChart3, 
  Users, 
  BookOpen, 
  GraduationCap, 
  Printer, 
  TrendingDown, 
  TrendingUp,
  AlertCircle,
  CheckCircle,
  Calendar,
  FileText
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../lib/axios';
import { useAuthStore } from '../store/authStore';

interface SubjectClassDetail {
  subjectId: string;
  subjectName: string;
  classId: string;
  className: string;
  predictedClasses: number;
  givenClasses: number;
  deficit: number;
  surplus: number;
}

interface TeacherReport {
  teacherId: string;
  teacherName: string;
  weeklyWorkload: number;
  totalPredictedClasses: number;
  totalGivenClasses: number;
  totalDeficit: number;
  totalSurplus: number;
  subjectClassDetails: SubjectClassDetail[];
}

interface ReportData {
  month: number;
  year: number;
  totalTeachers: number;
  reports: TeacherReport[];
}

const TeacherFrequencyReport: React.FC = () => {
  const { user } = useAuthStore();
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [year, setYear] = useState(new Date().getFullYear());
  const [filterTeacher, setFilterTeacher] = useState('');
  const [filterSubject, setFilterSubject] = useState('');
  const [filterClass, setFilterClass] = useState('');
  const [reportData, setReportData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(false);
  const [viewMode, setViewMode] = useState<'teacher' | 'subject' | 'class'>('teacher');

  useEffect(() => {
    loadReport();
  }, [month, year]);

  const loadReport = async () => {
    try {
      setLoading(true);
      const response = await api.get('/teacher-frequency-report/deficit-surplus', {
        params: { month, year }
      });
      setReportData(response.data);
    } catch (error: any) {
      console.error('Erro ao carregar relatório:', error);
      toast.error('Erro ao carregar relatório: ' + (error.response?.data?.message || error.message));
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  // Filtrar dados
  const filteredReports = reportData?.reports.filter(report => {
    const teacherMatch = !filterTeacher || report.teacherName.toLowerCase().includes(filterTeacher.toLowerCase());
    const subjectMatch = !filterSubject || report.subjectClassDetails.some(
      detail => detail.subjectName.toLowerCase().includes(filterSubject.toLowerCase())
    );
    const classMatch = !filterClass || report.subjectClassDetails.some(
      detail => detail.className.toLowerCase().includes(filterClass.toLowerCase())
    );
    return teacherMatch && subjectMatch && classMatch;
  }).sort((a, b) => a.teacherName.localeCompare(b.teacherName, 'pt-BR')) || [];

  // Calcular estatísticas gerais
  const totalDeficit = filteredReports.reduce((sum, r) => sum + r.totalDeficit, 0);
  const totalSurplus = filteredReports.reduce((sum, r) => sum + r.totalSurplus, 0);
  const totalPredicted = filteredReports.reduce((sum, r) => sum + r.totalPredictedClasses, 0);
  const totalGiven = filteredReports.reduce((sum, r) => sum + r.totalGivenClasses, 0);

  // Agrupar por disciplina
  const groupBySubject = () => {
    const subjectMap = new Map<string, {
      subjectName: string;
      predicted: number;
      given: number;
      deficit: number;
      surplus: number;
      teachers: Set<string>;
    }>();

    filteredReports.forEach(report => {
      report.subjectClassDetails.forEach(detail => {
        const existing = subjectMap.get(detail.subjectId) || {
          subjectName: detail.subjectName,
          predicted: 0,
          given: 0,
          deficit: 0,
          surplus: 0,
          teachers: new Set()
        };

        existing.predicted += detail.predictedClasses;
        existing.given += detail.givenClasses;
        existing.deficit += detail.deficit;
        existing.surplus += detail.surplus;
        existing.teachers.add(report.teacherName);

        subjectMap.set(detail.subjectId, existing);
      });
    });

    return Array.from(subjectMap.values());
  };

  // Agrupar por turma
  const groupByClass = () => {
    const classMap = new Map<string, {
      className: string;
      predicted: number;
      given: number;
      deficit: number;
      surplus: number;
      subjects: Set<string>;
    }>();

    filteredReports.forEach(report => {
      report.subjectClassDetails.forEach(detail => {
        const existing = classMap.get(detail.classId) || {
          className: detail.className,
          predicted: 0,
          given: 0,
          deficit: 0,
          surplus: 0,
          subjects: new Set()
        };

        existing.predicted += detail.predictedClasses;
        existing.given += detail.givenClasses;
        existing.deficit += detail.deficit;
        existing.surplus += detail.surplus;
        existing.subjects.add(detail.subjectName);

        classMap.set(detail.classId, existing);
      });
    });

    return Array.from(classMap.values());
  };

  const monthNames = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ];

  return (
    <div className="p-6 no-print">
      {/* Cabeçalho */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
            <BarChart3 className="w-8 h-8" />
            Relatório de Frequência
          </h1>
          <p className="text-gray-600 mt-1">Déficits e Saldos de Aulas por Professor</p>
        </div>
        <button
          onClick={handlePrint}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2 no-print"
        >
          <Printer className="w-5 h-5" />
          Imprimir Relatório
        </button>
      </div>

      {/* Filtros */}
      <div className="bg-white p-4 rounded-lg shadow mb-6">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Mês</label>
            <select
              value={month}
              onChange={e => setMonth(Number(e.target.value))}
              className="w-full border rounded-lg px-3 py-2"
            >
              {monthNames.map((name, idx) => (
                <option key={idx} value={idx + 1}>{name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Ano</label>
            <select
              value={year}
              onChange={e => setYear(Number(e.target.value))}
              className="w-full border rounded-lg px-3 py-2"
            >
              {[2024, 2025, 2026, 2027].map(y => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Professor</label>
            <input
              type="text"
              value={filterTeacher}
              onChange={e => setFilterTeacher(e.target.value)}
              placeholder="Buscar professor..."
              className="w-full border rounded-lg px-3 py-2"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Disciplina</label>
            <input
              type="text"
              value={filterSubject}
              onChange={e => setFilterSubject(e.target.value)}
              placeholder="Buscar disciplina..."
              className="w-full border rounded-lg px-3 py-2"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Turma</label>
            <input
              type="text"
              value={filterClass}
              onChange={e => setFilterClass(e.target.value)}
              placeholder="Buscar turma..."
              className="w-full border rounded-lg px-3 py-2"
            />
          </div>
        </div>

        {/* Modo de visualização */}
        <div className="mt-4 flex gap-2">
          <button
            onClick={() => setViewMode('teacher')}
            className={`px-4 py-2 rounded-lg font-medium transition ${
              viewMode === 'teacher'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            <Users className="w-4 h-4 inline mr-2" />
            Por Professor
          </button>
          <button
            onClick={() => setViewMode('subject')}
            className={`px-4 py-2 rounded-lg font-medium transition ${
              viewMode === 'subject'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            <BookOpen className="w-4 h-4 inline mr-2" />
            Por Disciplina
          </button>
          <button
            onClick={() => setViewMode('class')}
            className={`px-4 py-2 rounded-lg font-medium transition ${
              viewMode === 'class'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            <GraduationCap className="w-4 h-4 inline mr-2" />
            Por Turma
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      ) : (
        <>
          {/* Cards de Estatísticas */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-white p-4 rounded-lg shadow border-l-4 border-blue-500">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Aulas Previstas</p>
                  <p className="text-2xl font-bold text-gray-900">{totalPredicted}</p>
                </div>
                <Calendar className="w-8 h-8 text-blue-500" />
              </div>
            </div>

            <div className="bg-white p-4 rounded-lg shadow border-l-4 border-green-500">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Aulas Dadas</p>
                  <p className="text-2xl font-bold text-green-700">{totalGiven}</p>
                </div>
                <CheckCircle className="w-8 h-8 text-green-500" />
              </div>
            </div>

            <div className="bg-white p-4 rounded-lg shadow border-l-4 border-red-500">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Déficit Total</p>
                  <p className="text-2xl font-bold text-red-700">{totalDeficit}</p>
                </div>
                <TrendingDown className="w-8 h-8 text-red-500" />
              </div>
            </div>

            <div className="bg-white p-4 rounded-lg shadow border-l-4 border-purple-500">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Saldo Total</p>
                  <p className="text-2xl font-bold text-purple-700">{totalSurplus}</p>
                </div>
                <TrendingUp className="w-8 h-8 text-purple-500" />
              </div>
            </div>
          </div>

          {/* Visualização por Professor */}
          {viewMode === 'teacher' && (
            <div className="space-y-4">
              {filteredReports.map(report => (
                <div key={report.teacherId} className="bg-white rounded-lg shadow p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="text-xl font-bold text-gray-900">{report.teacherName}</h3>
                      <p className="text-sm text-gray-600">
                        Carga Horária Semanal: {report.weeklyWorkload}h
                      </p>
                    </div>
                    <div className="flex gap-4">
                      <div className="text-center">
                        <p className="text-sm text-gray-600">Previsto</p>
                        <p className="text-xl font-bold text-blue-600">{report.totalPredictedClasses}</p>
                      </div>
                      <div className="text-center">
                        <p className="text-sm text-gray-600">Dado</p>
                        <p className="text-xl font-bold text-green-600">{report.totalGivenClasses}</p>
                      </div>
                      {report.totalDeficit > 0 && (
                        <div className="text-center">
                          <p className="text-sm text-gray-600">Déficit</p>
                          <p className="text-xl font-bold text-red-600">-{report.totalDeficit}</p>
                        </div>
                      )}
                      {report.totalSurplus > 0 && (
                        <div className="text-center">
                          <p className="text-sm text-gray-600">Saldo</p>
                          <p className="text-xl font-bold text-purple-600">+{report.totalSurplus}</p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Detalhes por Disciplina/Turma */}
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-2 text-left font-semibold text-gray-700">Disciplina</th>
                          <th className="px-4 py-2 text-left font-semibold text-gray-700">Turma</th>
                          <th className="px-4 py-2 text-center font-semibold text-gray-700">Previsto</th>
                          <th className="px-4 py-2 text-center font-semibold text-gray-700">Dado</th>
                          <th className="px-4 py-2 text-center font-semibold text-gray-700">Situação</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {report.subjectClassDetails.map((detail, idx) => (
                          <tr key={idx} className="hover:bg-gray-50">
                            <td className="px-4 py-2">{detail.subjectName}</td>
                            <td className="px-4 py-2">{detail.className}</td>
                            <td className="px-4 py-2 text-center">{detail.predictedClasses}</td>
                            <td className="px-4 py-2 text-center">{detail.givenClasses}</td>
                            <td className="px-4 py-2 text-center">
                              {detail.predictedClasses > 0 ? (
                                <>
                                  {detail.deficit > 0 && (
                                    <span className="px-2 py-1 bg-red-100 text-red-800 rounded-full text-xs font-medium">
                                      ❌ -{detail.deficit} aulas ({Math.round((detail.givenClasses / detail.predictedClasses) * 100)}%)
                                    </span>
                                  )}
                                  {detail.surplus > 0 && (
                                    <span className="px-2 py-1 bg-purple-100 text-purple-800 rounded-full text-xs font-medium">
                                      ✅ +{detail.surplus} aulas ({Math.round((detail.givenClasses / detail.predictedClasses) * 100)}%)
                                    </span>
                                  )}
                                  {detail.deficit === 0 && detail.surplus === 0 && (
                                    <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs font-medium">
                                      ✓ 100% Em dia
                                    </span>
                                  )}
                                </>
                              ) : detail.givenClasses > 0 ? (
                                <span className="px-2 py-1 bg-purple-100 text-purple-800 rounded-full text-xs font-medium">
                                  ✅ +{detail.givenClasses} aulas extras
                                </span>
                              ) : (
                                <span className="text-gray-400 text-xs">Sem aulas previstas</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Visualização por Disciplina */}
          {viewMode === 'subject' && (
            <div className="bg-white rounded-lg shadow overflow-hidden">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left font-semibold text-gray-700">Disciplina</th>
                    <th className="px-6 py-3 text-center font-semibold text-gray-700">Professores</th>
                    <th className="px-6 py-3 text-center font-semibold text-gray-700">Previsto</th>
                    <th className="px-6 py-3 text-center font-semibold text-gray-700">Dado</th>
                    <th className="px-6 py-3 text-center font-semibold text-gray-700">Déficit</th>
                    <th className="px-6 py-3 text-center font-semibold text-gray-700">Saldo</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {groupBySubject().map((subject, idx) => (
                    <tr key={idx} className="hover:bg-gray-50">
                      <td className="px-6 py-4 font-medium">{subject.subjectName}</td>
                      <td className="px-6 py-4 text-center text-sm text-gray-600">
                        {subject.teachers.size}
                      </td>
                      <td className="px-6 py-4 text-center">{subject.predicted}</td>
                      <td className="px-6 py-4 text-center">{subject.given}</td>
                      <td className="px-6 py-4 text-center">
                        <span className={`font-bold ${subject.deficit > 0 ? 'text-red-600' : 'text-gray-400'}`}>
                          {subject.deficit > 0 ? `-${subject.deficit}` : '0'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className={`font-bold ${subject.surplus > 0 ? 'text-purple-600' : 'text-gray-400'}`}>
                          {subject.surplus > 0 ? `+${subject.surplus}` : '0'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Visualização por Turma */}
          {viewMode === 'class' && (
            <div className="bg-white rounded-lg shadow overflow-hidden">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left font-semibold text-gray-700">Turma</th>
                    <th className="px-6 py-3 text-center font-semibold text-gray-700">Disciplinas</th>
                    <th className="px-6 py-3 text-center font-semibold text-gray-700">Previsto</th>
                    <th className="px-6 py-3 text-center font-semibold text-gray-700">Dado</th>
                    <th className="px-6 py-3 text-center font-semibold text-gray-700">Déficit</th>
                    <th className="px-6 py-3 text-center font-semibold text-gray-700">Saldo</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {groupByClass().map((classData, idx) => (
                    <tr key={idx} className="hover:bg-gray-50">
                      <td className="px-6 py-4 font-medium">{classData.className}</td>
                      <td className="px-6 py-4 text-center text-sm text-gray-600">
                        {classData.subjects.size}
                      </td>
                      <td className="px-6 py-4 text-center">{classData.predicted}</td>
                      <td className="px-6 py-4 text-center">{classData.given}</td>
                      <td className="px-6 py-4 text-center">
                        <span className={`font-bold ${classData.deficit > 0 ? 'text-red-600' : 'text-gray-400'}`}>
                          {classData.deficit > 0 ? `-${classData.deficit}` : '0'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className={`font-bold ${classData.surplus > 0 ? 'text-purple-600' : 'text-gray-400'}`}>
                          {classData.surplus > 0 ? `+${classData.surplus}` : '0'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {filteredReports.length === 0 && !loading && (
            <div className="bg-gray-50 rounded-lg p-12 text-center">
              <AlertCircle className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600 text-lg">Nenhum registro encontrado para este período</p>
              <p className="text-gray-500 text-sm mt-2">
                Tente selecionar outro mês ou ajustar os filtros
              </p>
            </div>
          )}
        </>
      )}

      {/* Estilos de Impressão */}
      <style jsx>{`
        @media print {
          .no-print {
            display: none !important;
          }
          
          @page {
            size: A4;
            margin: 15mm;
          }
          
          body {
            print-color-adjust: exact;
            -webkit-print-color-adjust: exact;
          }
          
          .break-inside-avoid {
            break-inside: avoid;
            page-break-inside: avoid;
          }
          
          h1 {
            color: #1f2937 !important;
            font-size: 24pt;
            margin-bottom: 10pt;
          }
          
          h3 {
            color: #374151 !important;
            font-size: 14pt;
            margin-top: 10pt;
          }
          
          table {
            border-collapse: collapse;
            width: 100%;
            font-size: 10pt;
          }
          
          th, td {
            border: 1px solid #d1d5db;
            padding: 6pt;
          }
          
          th {
            background-color: #f3f4f6 !important;
            font-weight: bold;
          }
          
          .shadow {
            box-shadow: none !important;
            border: 1px solid #e5e7eb;
          }
        }
      `}</style>
    </div>
  );
};

export default TeacherFrequencyReport;
