# Script para verificar cargas horárias das disciplinas por turma

Write-Host "🔍 VERIFICAÇÃO DE CARGAS HORÁRIAS" -ForegroundColor Cyan
Write-Host "=" * 60

# Conectar ao MongoDB e buscar dados
$mongoUri = "mongodb+srv://wanderpsc:Wander2211@cluster0.n6lso.mongodb.net/school-timetable?retryWrites=true&w=majority"

# Buscar todas as turmas
Write-Host "`n📊 Buscando turmas..." -ForegroundColor Yellow
mongosh "$mongoUri" --quiet --eval "db.classes.find({}, {name: 1, gradeName: 1}).forEach(c => print(JSON.stringify(c)))" > classes-temp.json

# Buscar todos os componentes com suas turmas
Write-Host "📚 Buscando componentes curriculares..." -ForegroundColor Yellow
mongosh "$mongoUri" --quiet --eval "db.subjects.find({}, {name: 1, weeklyHours: 1, classIds: 1, classGrades: 1}).forEach(s => print(JSON.stringify(s)))" > subjects-temp.json

# Buscar associações de professores com componentes e turmas
Write-Host "👨‍🏫 Buscando lotações de professores..." -ForegroundColor Yellow
mongosh "$mongoUri" --quiet --eval "db.teachersubjects.find({}).populate('teacherId').populate('subjectId').populate('classId').forEach(ts => print(JSON.stringify(ts)))" > teacher-subjects-temp.json

Write-Host "`n✅ Dados exportados!" -ForegroundColor Green
Write-Host "`nArquivos gerados:" -ForegroundColor Cyan
Write-Host "  - classes-temp.json"
Write-Host "  - subjects-temp.json"
Write-Host "  - teacher-subjects-temp.json"
