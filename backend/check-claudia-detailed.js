const mongoose = require('mongoose');

const schemas = {
  Teacher: new mongoose.Schema({ name: String, isActive: Boolean }),
  TeacherSubject: new mongoose.Schema({
    teacherId: mongoose.Schema.Types.ObjectId,
    subjectId: mongoose.Schema.Types.ObjectId,
    classId: mongoose.Schema.Types.ObjectId
  }),
  Subject: new mongoose.Schema({ name: String, weeklyHours: Number }),
  Class: new mongoose.Schema({ name: String }),
  Grade: new mongoose.Schema({ title: String, name: String })
};

const Teacher = mongoose.model('Teacher', schemas.Teacher);
const TeacherSubject = mongoose.model('TeacherSubject', schemas.TeacherSubject);
const Subject = mongoose.model('Subject', schemas.Subject);
const Class = mongoose.model('Class', schemas.Class);
const Grade = mongoose.model('Grade', schemas.Grade);

async function checkClaudia() {
  try {
    await mongoose.connect('mongodb+srv://wanderpsc:Wander2211@cluster0.n6lso.mongodb.net/school-timetable');
    console.log('✅ Conectado\n');
    
    const claudia = await Teacher.findOne({ name: /Claudia/i, isActive: true });
    if (!claudia) {
      console.log('❌ Claudia não encontrada');
      return;
    }

    console.log('👩‍🏫 Professora:', claudia.name);
    console.log('=' . repeat(100));
    
    const teacherSubjects = await TeacherSubject.find({ teacherId: claudia._id });
    
    console.log(`\n📋 Total de registros TeacherSubject: ${teacherSubjects.length}\n`);
    console.log('=' . repeat(100));
    
    let total = 0;
    const registros = [];
    
    for (let i = 0; i < teacherSubjects.length; i++) {
      const ts = teacherSubjects[i];
      const subject = await Subject.findById(ts.subjectId);
      const classInfo = ts.classId ? await Class.findById(ts.classId).populate('gradeId') : null;
      
      if (subject) {
        const weeklyHours = subject.weeklyHours || 0;
        let className = 'SEM TURMA';
        
        if (classInfo) {
          const grade = await Grade.findById(classInfo.gradeId);
          const gradeName = grade?.title || grade?.name || 'Sem Série';
          className = `${gradeName}-${classInfo.name}`;
        }
        
        total += weeklyHours;
        
        const registro = {
          num: i + 1,
          componente: subject.name,
          turma: className,
          weeklyHours: weeklyHours,
          acumulado: total,
          tsId: ts._id.toString(),
          subjectId: ts.subjectId.toString(),
          classId: ts.classId ? ts.classId.toString() : null
        };
        
        registros.push(registro);
        
        console.log(`${String(i + 1).padStart(2)}. ${subject.name.substring(0, 60).padEnd(60)} | ${className.substring(0, 35).padEnd(35)} | ${weeklyHours}h | Acum: ${total}`);
      }
    }
    
    console.log('\n' + '='.repeat(100));
    console.log(`\n🎯 TOTAL CALCULADO: ${total} aulas/semana`);
    console.log('🎯 TOTAL ESPERADO:  26 aulas/semana');
    console.log(`🎯 DIFERENÇA:       ${total - 26 > 0 ? '+' : ''}${total - 26} aulas ${total > 26 ? '❌ A MAIS' : total < 26 ? '⚠️ A MENOS' : '✅ CORRETO'}`);
    
    console.log('\n' + '='.repeat(100));
    console.log('\n🔍 VERIFICANDO DUPLICAÇÕES...\n');
    
    const duplicados = {};
    registros.forEach(r => {
      const key = `${r.componente}|||${r.turma}`;
      if (!duplicados[key]) {
        duplicados[key] = [];
      }
      duplicados[key].push(r);
    });
    
    let temDuplicacao = false;
    for (const [key, lista] of Object.entries(duplicados)) {
      if (lista.length > 1) {
        temDuplicacao = true;
        const [comp, turma] = key.split('|||');
        console.log(`❌ DUPLICAÇÃO ENCONTRADA (${lista.length}x):`);
        console.log(`   Componente: ${comp}`);
        console.log(`   Turma: ${turma}`);
        console.log(`   IDs TeacherSubject:`);
        lista.forEach(l => {
          console.log(`      - ${l.tsId} (${l.weeklyHours}h)`);
        });
        console.log('');
      }
    }
    
    if (!temDuplicacao) {
      console.log('✅ Nenhuma duplicação encontrada no TeacherSubject\n');
      console.log('🔍 O erro deve estar nas CARGAS HORÁRIAS dos componentes\n');
      console.log('=' . repeat(100));
      console.log('\n📊 DISTRIBUIÇÃO DE CARGAS:\n');
      
      const distribuicao = { 1: [], 2: [], 3: [], outros: [] };
      registros.forEach(r => {
        if (r.weeklyHours === 1) distribuicao[1].push(r);
        else if (r.weeklyHours === 2) distribuicao[2].push(r);
        else if (r.weeklyHours === 3) distribuicao[3].push(r);
        else distribuicao.outros.push(r);
      });
      
      console.log(`Componentes com 1h/semana: ${distribuicao[1].length} (esperado: 4)`);
      distribuicao[1].forEach(r => console.log(`   - ${r.componente} → ${r.turma}`));
      
      console.log(`\nComponentes com 2h/semana: ${distribuicao[2].length} (esperado: 6)`);
      distribuicao[2].forEach(r => console.log(`   - ${r.componente} → ${r.turma}`));
      
      console.log(`\nComponentes com 3h/semana: ${distribuicao[3].length} (esperado: 4)`);
      distribuicao[3].forEach(r => console.log(`   - ${r.componente} → ${r.turma}`));
      
      if (distribuicao.outros.length > 0) {
        console.log(`\n⚠️ Componentes com carga diferente: ${distribuicao.outros.length}`);
        distribuicao.outros.forEach(r => console.log(`   - ${r.componente} → ${r.turma} | ${r.weeklyHours}h`));
      }
      
      const somaEsperada = (4 * 1) + (6 * 2) + (4 * 3);
      console.log(`\n📊 Soma esperada: (4×1) + (6×2) + (4×3) = ${somaEsperada}`);
      console.log(`📊 Soma calculada: ${total}`);
      console.log(`📊 Diferença: ${total - somaEsperada} ${total > somaEsperada ? 'a mais' : 'a menos'}`);
    }
    
  } catch (error) {
    console.error('❌ Erro:', error.message);
  } finally {
    await mongoose.disconnect();
  }
}

checkClaudia();
