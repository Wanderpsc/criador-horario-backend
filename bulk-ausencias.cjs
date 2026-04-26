/**
 * Script: Marcar professores como ausentes em bloco
 * Uso: node bulk-ausencias.cjs
 *
 * Configure EMAIL e PASSWORD antes de rodar.
 * Professores alvos: Thialla, Maycon, Ronel, Wallas, Keifa, Alet
 * Período: 2026-02-19 até 2026-04-10 (dias letivos)
 */

const BACKEND_URL = 'https://criador-horario-backend-1.onrender.com/api';

// ─── CONFIGURE AQUI ──────────────────────────────────────────────────────────
const EMAIL    = 'wanderpsc@gmail.com';   // ← seu e-mail de login
const PASSWORD = 'SUA_SENHA_AQUI';        // ← sua senha

const TEACHER_NAMES = ['Thialla', 'Maycon', 'Ronel', 'Wallas', 'Keifa', 'Alet'];
const START_DATE    = '2026-02-19';
const END_DATE      = '2026-04-10';
// ─────────────────────────────────────────────────────────────────────────────

// Mapa de número do dia JS → nome português usado no horário
const DAY_NAMES = {
  0: 'Domingo',
  1: 'Segunda',
  2: 'Terça',
  3: 'Quarta',
  4: 'Quinta',
  5: 'Sexta',
  6: 'Sábado',
};

async function apiFetch(path, token, opts = {}) {
  const res = await fetch(`${BACKEND_URL}${path}`, {
    ...opts,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(opts.headers || {}),
    },
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`${opts.method || 'GET'} ${path} → ${res.status}: ${body}`);
  }
  return res.json();
}

async function main() {
  // ── 1. Login ──────────────────────────────────────────────────────────────
  console.log('🔐 Fazendo login...');
  const loginData = await apiFetch('/auth/login', null, {
    method: 'POST',
    body: JSON.stringify({ email: EMAIL, password: PASSWORD }),
  });
  const token = loginData.token;
  if (!token) throw new Error('Login falhou: token não retornado. Verifique EMAIL/PASSWORD.');
  console.log('✅ Login OK');

  // ── 2. Buscar professores ─────────────────────────────────────────────────
  console.log('\n👩‍🏫 Buscando professores...');
  const allTeachers = await apiFetch('/teachers', token);
  const teachers = allTeachers.filter(t =>
    TEACHER_NAMES.some(n => t.name.toLowerCase().includes(n.toLowerCase()))
  );
  if (teachers.length === 0) throw new Error('Nenhum professor encontrado com os nomes informados.');
  console.log(`✅ Encontrados ${teachers.length} professor(es):`);
  teachers.forEach(t => console.log(`   - ${t.name} (${t._id})`));

  // ── 3. Buscar dias letivos no período ─────────────────────────────────────
  console.log('\n📅 Buscando dias letivos...');
  const schoolDays = await apiFetch(
    `/schooldays?startDate=${START_DATE}&endDate=${END_DATE}`,
    token
  );
  // Filtrar apenas dias letivos (regular + saturday, excluir feriados, férias, etc.)
  const letiveDays = (Array.isArray(schoolDays) ? schoolDays : (schoolDays.days || schoolDays.data || []))
    .filter(d => {
      const t = d.dayType || d.type || 'regular';
      return t === 'regular' || t === 'saturday';
    });
  console.log(`✅ ${letiveDays.length} dia(s) letivo(s) de ${START_DATE} a ${END_DATE}`);
  if (letiveDays.length === 0) {
    console.warn('⚠️  Nenhum dia letivo encontrado. Verifique o calendário cadastrado.');
    return;
  }

  // ── 4. Buscar horários gerados (todos os timetables) ─────────────────────
  console.log('\n📋 Buscando horários gerados (timetables)...');
  const timetables = await apiFetch('/generated-timetables/all', token);
  const timetableList = Array.isArray(timetables) ? timetables : (timetables.timetables || timetables.data || []);
  console.log(`✅ ${timetableList.length} registro(s) de timetable carregados`);

  // ── 5. Buscar registros de frequência existentes no período ───────────────
  console.log('\n🔍 Verificando registros de frequência já existentes...');
  const existingRecords = await apiFetch(
    `/teacher-attendance?startDate=${START_DATE}&endDate=${END_DATE}`,
    token
  );
  // Montar Set de "teacherId|date" já registrados para evitar sobreescrever entradas manuais
  const existingKeys = new Set(
    (Array.isArray(existingRecords) ? existingRecords : []).map(r => `${r.teacherId}|${r.date}`)
  );
  console.log(`✅ ${existingKeys.size} registro(s) existente(s) — serão ignorados`);

  // ── 6. Montar registros de ausência ───────────────────────────────────────
  console.log('\n⚙️  Montando registros de ausência...');
  const records = [];

  for (const teacher of teachers) {
    const teacherId = teacher._id.toString();

    for (const schoolDay of letiveDays) {
      // Normalizar a data
      const rawDate = schoolDay.date;
      const dayStr = typeof rawDate === 'string'
        ? rawDate.split('T')[0]
        : new Date(rawDate).toISOString().split('T')[0];

      // Checar se já existe registro
      const key = `${teacherId}|${dayStr}`;
      if (existingKeys.has(key)) continue; // Pular — já existe

      // Determinar o nome do dia da semana (usar followWeekday se disponível)
      const dateObj = new Date(dayStr + 'T12:00:00');
      const dayOfWeek = schoolDay.followWeekday || DAY_NAMES[dateObj.getDay()] || 'Segunda';

      // Coletar aulas do professor neste dia em todos os timetables
      const classes = [];
      for (const tt of timetableList) {
        const classId = tt.classId?.toString() || '';
        const className = tt.className || '';
        const gradeName = tt.gradeName || '';
        const slots = Array.isArray(tt.slots) ? tt.slots : [];

        for (const slot of slots) {
          if (
            slot.day === dayOfWeek &&
            (slot.teacherId?.toString() === teacherId || slot.teacher?.toString() === teacherId)
          ) {
            classes.push({
              period:      slot.period || 1,
              startTime:   slot.startTime || '07:30',
              endTime:     slot.endTime   || '08:20',
              subjectId:   slot.subjectId?.toString() || '',
              subjectName: slot.subjectName || slot.subject || '',
              classId,
              className:   slot.className || className || '',
              grade:       slot.grade || gradeName || '',
              status:      'absent',
              markedAt:    new Date().toISOString(),
            });
          }
        }
      }

      if (classes.length === 0) continue; // Professor sem aulas neste dia

      records.push({
        teacherId,
        teacherName:          teacher.name,
        date:                 dayStr,
        dayOfWeek,
        classes,
        totalScheduledClasses: classes.length,
        totalPresentClasses:   0,
        totalAbsentClasses:    classes.length,
      });
    }
  }

  console.log(`✅ ${records.length} novo(s) registro(s) de ausência montado(s)`);

  if (records.length === 0) {
    console.log('\nℹ️  Nenhum registro para inserir (todos já existem ou professores sem aulas no período).');
    return;
  }

  // Mostrar resumo por professor
  const byTeacher = {};
  records.forEach(r => {
    byTeacher[r.teacherName] = (byTeacher[r.teacherName] || 0) + 1;
  });
  console.log('\n📊 Resumo por professor:');
  Object.entries(byTeacher).forEach(([name, count]) => {
    console.log(`   ${name}: ${count} dia(s) de ausência`);
  });

  // ── 7. Enviar em lotes de 25 ──────────────────────────────────────────────
  console.log('\n📤 Enviando registros...');
  const BATCH = 25;
  let totalInserted = 0;
  let totalUpdated  = 0;

  for (let i = 0; i < records.length; i += BATCH) {
    const batch = records.slice(i, i + BATCH);
    const loteNum = Math.floor(i / BATCH) + 1;

    try {
      const result = await apiFetch('/teacher-attendance/bulk', token, {
        method: 'POST',
        body: JSON.stringify({ records: batch }),
      });
      totalInserted += result.inserted || 0;
      totalUpdated  += result.updated  || 0;
      process.stdout.write(`   Lote ${loteNum}: ${result.inserted||0} inseridos, ${result.updated||0} atualizados\n`);
    } catch (err) {
      console.error(`   ❌ Lote ${loteNum} falhou:`, err.message);
    }
  }

  console.log(`\n✅ Concluído! Total: ${totalInserted} inseridos, ${totalUpdated} atualizados`);
  console.log('ℹ️  Acesse /#/teacher-frequency-report para ver os déficits registrados.');
}

main().catch(err => {
  console.error('\n❌ ERRO:', err.message);
  process.exit(1);
});
