import express from 'express';
import { auth, AuthRequest } from '../middleware/auth';
import Teacher from '../models/Teacher';
import Subject from '../models/Subject';
import Schedule from '../models/Schedule';
import Timetable from '../models/Timetable';
import GeneratedTimetable from '../models/GeneratedTimetable';
import EmergencySchedule from '../models/EmergencySchedule';
import TeacherSubject from '../models/TeacherSubject';
import Class from '../models/Class';

const router = express.Router();

// Endpoint para buscar estatísticas completas do dashboard
router.get('/dashboard', auth, async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.id;
    
    console.log('📊 Buscando estatísticas para userId:', userId);

    // Buscar dados básicos
    const [
      teachers,
      subjects,
      schedules,
      timetables,
      generatedTimetables,
      emergencySchedules,
      teacherSubjects,
      classes
    ] = await Promise.all([
      Teacher.find({ 
        $or: [
          { userId: userId },
          { userId: userId.toString() }
        ]
      }),
      Subject.find({ 
        $or: [
          { userId: userId },
          { userId: userId.toString() }
        ]
      }),
      Schedule.find({ 
        $or: [
          { userId: userId },
          { userId: userId.toString() }
        ]
      }),
      Timetable.find({ 
        $or: [
          { userId: userId },
          { userId: userId.toString() }
        ]
      }),
      GeneratedTimetable.find({ 
        $or: [
          { userId: userId },
          { userId: userId.toString() },
          { userId: { $exists: false } },
          { userId: null }
        ]
      }),
      EmergencySchedule.find({ 
        $or: [
          { userId: userId },
          { userId: userId.toString() }
        ]
      }),
      TeacherSubject.find({ 
        $or: [
          { userId: userId },
          { userId: userId.toString() }
        ]
      }),
      Class.find({ 
        $or: [
          { userId: userId },
          { userId: userId.toString() }
        ],
        isActive: true // Apenas turmas ativas
      })
    ]);

    // Filtrar apenas professores ativos
    const activeTeachers = teachers.filter(t => t.isActive !== false);

    console.log('📊 Dados brutos encontrados:', {
      teachers: teachers.length,
      activeTeachers: activeTeachers.length,
      subjects: subjects.length,
      schedules: schedules.length,
      timetables: timetables.length,
      generatedTimetables: generatedTimetables.length,
      classes: classes.length
    });

    // Para GeneratedTimetables, agrupar por título para contar apenas horários únicos
    const uniqueTimetablesByTitle = generatedTimetables.reduce((acc: any, t: any) => {
      if (t.title && t.title.trim() !== '') {
        acc[t.title] = t;
      }
      return acc;
    }, {});
    const uniqueGeneratedCount = Object.keys(uniqueTimetablesByTitle).length;

    console.log('📊 Grades geradas únicas por título:', uniqueGeneratedCount);

    // Calcular aulas por professor
    const teacherWorkload: Record<string, {
      name: string;
      totalLessons: number;
      subjects: Set<string>;
      classes: Set<string>;
    }> = {};

    // Inicializar todos os professores
    activeTeachers.forEach(teacher => {
      teacherWorkload[teacher._id.toString()] = {
        name: teacher.name,
        totalLessons: 0,
        subjects: new Set(),
        classes: new Set()
      };
    });

    // Contar aulas por professor baseado em TeacherSubject e Subject.weeklyHours
    for (const ts of teacherSubjects) {
      const teacherId = ts.teacherId.toString();
      
      if (!teacherWorkload[teacherId]) continue;

      // Buscar o subject para pegar weeklyHours
      const subject = subjects.find(s => s._id.toString() === ts.subjectId.toString());
      
      if (subject) {
        const weeklyHours = subject.weeklyHours || 2; // Padrão: 2 aulas/semana
        teacherWorkload[teacherId].totalLessons += weeklyHours;
        teacherWorkload[teacherId].subjects.add(ts.subjectId.toString());
        
        if (ts.classId) {
          teacherWorkload[teacherId].classes.add(ts.classId.toString());
        }

        // Log detalhado para Claudia
        const teacher = activeTeachers.find(t => t._id.toString() === teacherId);
        if (teacher && teacher.name.includes('Claudia')) {
          console.log(`\n📚 Lotação Claudia:`, {
            componente: subject.name,
            weeklyHours: weeklyHours,
            turmaId: ts.classId,
            totalAcumulado: teacherWorkload[teacherId].totalLessons
          });
        }
      }
    }

    // Converter para array e ordenar
    const teacherWorkloadArray = Object.entries(teacherWorkload).map(([id, data]) => ({
      teacherId: id,
      teacherName: data.name,
      totalLessons: data.totalLessons,
      subjectsCount: data.subjects.size,
      classesCount: data.classes.size
    })).sort((a, b) => b.totalLessons - a.totalLessons);

    const stats = {
      teachers: activeTeachers.length,
      subjects: subjects.length,
      schedules: schedules.length,
      timetables: timetables.length + uniqueGeneratedCount, // Usar contagem única de grades geradas
      emergencySchedules: emergencySchedules.length,
      classes: classes.length,
      teacherWorkload: teacherWorkloadArray,
      totalLessons: teacherWorkloadArray.reduce((sum, t) => sum + t.totalLessons, 0)
    };

    console.log('✅ Estatísticas calculadas:', {
      teachers: stats.teachers,
      subjects: stats.subjects,
      schedules: stats.schedules,
      timetables: stats.timetables,
      timetablesDetail: {
        timetables: timetables.length,
        generatedTimetables: generatedTimetables.length,
        uniqueGeneratedTimetables: uniqueGeneratedCount
      },
      classes: stats.classes,
      teachersWithLessons: teacherWorkloadArray.filter(t => t.totalLessons > 0).length,
      totalLessons: stats.totalLessons
    });

    res.json(stats);
  } catch (error: any) {
    console.error('❌ Erro ao buscar estatísticas:', error);
    res.status(500).json({ message: error.message });
  }
});

export default router;
