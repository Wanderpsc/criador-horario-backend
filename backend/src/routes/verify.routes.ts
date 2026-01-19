import express from 'express';
import Subject from '../models/Subject';
import Class from '../models/Class';
import Grade from '../models/Grade';

const router = express.Router();

router.get('/verify', async (req, res) => {
  try {
    const classes = await Class.find({ isActive: true })
      .populate('gradeId')
      .sort({ name: 1 });
    
    const report = [];
    
    for (const classItem of classes) {
      const grade = classItem.gradeId as any;
      const gradeName = grade?.title || grade?.name || 'Sem Série';
      const className = `${gradeName}-${classItem.name}`;
      
      const subjects = await Subject.find({
        classIds: classItem._id,
        isActive: true
      }).sort({ name: 1 });
      
      const subjectsList = subjects.map(s => ({
        name: s.name,
        weeklyHours: s.weeklyHours || 0
      }));
      
      const totalHours = subjectsList.reduce((sum, s) => sum + s.weeklyHours, 0);
      
      report.push({
        class: className,
        subjects: subjectsList,
        totalWeeklyHours: totalHours
      });
    }
    
    res.json({ success: true, data: report });
  } catch (error: any) {
    console.error('Erro ao verificar cargas horárias:', error);
    res.status(500).json({ success: false, error: error?.message || 'Erro desconhecido' });
  }
});

export default router;
