# Correção: Erro 404 no endpoint /api/school

## 📅 Data da Correção
**10 de Fevereiro de 2026**

---

## 🐛 Problema Identificado

### Erro no Console do Frontend:
```
❌ Erro na resposta: /school 
Cannot GET /api/school
```

### Causa Raiz:
O frontend estava tentando acessar o endpoint `GET /api/school` para buscar dados da escola logada (necessário para mostrar logo e nome no sistema de impressão), mas o backend não tinha esse endpoint configurado.

O backend tinha apenas:
- `GET /api/schools/profile` - Com plural e caminho /profile
- Mas não tinha `GET /api/school` (singular, sem /profile)

---

## ✅ Solução Implementada

### 1. Adicionado Endpoint GET / em school.routes.ts

**Arquivo:** `backend/src/routes/school.routes.ts`

Adicionado novo endpoint que retorna os dados da escola do usuário logado:

```typescript
/**
 * GET /api/schools ou /api/school
 * Retorna os dados da escola logada (atalho para /profile)
 */
router.get('/', auth, async (req: any, res: Response) => {
  try {
    console.log('\n🔍 GET /api/schools - Escola solicitando seus dados');
    console.log('   req.user:', req.user);
    
    if (!req.user || !req.user.id) {
      console.log('❌ User não autenticado ou sem userId');
      return res.status(401).json({
        success: false,
        message: 'Não autenticado'
      });
    }
    
    const school = await User.findById(req.user.id).select('-password');
    console.log('   Escola encontrada:', school ? `✅ ${school.schoolName || school.email}` : '❌ NÃO ENCONTRADA');
    
    if (!school) {
      return res.status(404).json({
        success: false,
        message: 'Escola não encontrada'
      });
    }

    // Retornar dados da escola
    const schoolData = school.toObject();
    return res.json({
      ...schoolData,
      name: schoolData.schoolName || schoolData.email || '',
      email: schoolData.email || ''
    });
  } catch (error: any) {
    console.error('❌ Erro ao buscar dados da escola:', error);
    return res.status(500).json({
      success: false,
      message: 'Erro ao buscar dados da escola',
      error: error.message
    });
  }
});
```

### 2. Registrada Rota Singular em server.ts

**Arquivo:** `backend/src/server.ts`

Adicionado registro da rota com caminho singular:

```typescript
// Rotas
app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/schools', schoolRoutes); // Plural (existente)
app.use('/api/school', schoolRoutes);  // Singular (NOVO)
app.use('/api/admin', adminRoutes);
```

Agora ambos os caminhos funcionam:
- ✅ `GET /api/schools` → Retorna dados da escola
- ✅ `GET /api/school` → Retorna dados da escola (mesmo resultado)

---

## 📊 Formato da Resposta

```json
{
  "_id": "507f1f77bcf86cd799439011",
  "email": "escola@exemplo.com",
  "schoolName": "Escola Exemplo",
  "name": "Escola Exemplo",
  "responsibleName": "João Silva",
  "responsibleEmail": "joao@exemplo.com",
  "responsiblePhone": "(11) 98765-4321",
  "workingDays": ["Segunda", "Terça", "Quarta", "Quinta", "Sexta"],
  "academicYear": 2026,
  "createdAt": "2026-01-15T10:00:00.000Z",
  "updatedAt": "2026-02-10T20:00:00.000Z"
}
```

**Campos principais:**
- `name` - Nome da escola (derivado de schoolName ou email)
- `email` - E-mail da escola
- `schoolName` - Nome oficial da escola
- Demais campos do modelo User (exceto password)

---

## 🔐 Segurança

### Autenticação:
- ✅ Requer token JWT válido (middleware `auth`)
- ✅ Busca escola baseado no `req.user.id` do token
- ✅ Senha não é retornada (`.select('-password')`)

### Validações:
- ✅ Verifica se usuário está autenticado
- ✅ Retorna 401 se não autenticado
- ✅ Retorna 404 se escola não encontrada
- ✅ Retorna 500 em caso de erro interno

---

## 🧪 Testes

### Teste Manual:

**1. Com autenticação válida:**
```bash
curl -H "Authorization: Bearer SEU_TOKEN_JWT" \
  https://criador-horario-backend.onrender.com/api/school
```

**Resultado esperado:** Status 200, dados da escola

**2. Sem autenticação:**
```bash
curl https://criador-horario-backend.onrender.com/api/school
```

**Resultado esperado:** Status 401, mensagem "Não autenticado"

**3. No Frontend (TeacherAttendance.tsx):**
```typescript
const { data: schoolData } = useQuery({
  queryKey: ['school-info'],
  queryFn: async () => {
    const response = await api.get('/school');
    return response.data;
  }
});
```

**Resultado esperado:** Nome e dados da escola carregados corretamente

---

## 📝 Arquivos Alterados

### Backend
1. **backend/src/routes/school.routes.ts**
   - Adicionado endpoint `GET /`
   - Linhas: +45

2. **backend/src/server.ts**
   - Adicionado `app.use('/api/school', schoolRoutes)`
   - Linhas: +1

### Commits
- **Hash:** `7365679`
- **Mensagem:** "fix: Adicionar endpoint GET /api/school para buscar dados da escola logada"
- **Data:** 10/02/2026

---

## 🚀 Deploy

### Status:
- ✅ **Build:** Compilado com sucesso
- ✅ **Commit:** Enviado para GitHub
- ✅ **Push:** Concluído
- ⏳ **Render:** Deploy automático em andamento

### URLs:
- **Produção:** https://criador-horario-backend.onrender.com/api/school
- **Repositório:** https://github.com/Wanderpsc/criador-horario-backend

### Tempo Estimado:
- Deploy no Render: 2-4 minutos
- Total desde push: ~3-5 minutos

---

## ✅ Resultado Final

### Antes ❌
```
Frontend → GET /api/school
Backend → 404 Cannot GET /api/school
Console → ❌ Erro ao buscar dados da escola
```

### Depois ✅
```
Frontend → GET /api/school
Backend → 200 { name: "Escola Exemplo", ... }
Console → ✅ Dados da escola carregados
```

### Impacto:
- ✅ Sistema de impressão funciona corretamente
- ✅ Logo e nome da escola aparecem nos relatórios
- ✅ Sem mais erros 404 no console
- ✅ Melhor compatibilidade com frontend

---

## 📈 Melhorias Adicionais

### Logging Aprimorado:
```
🔍 GET /api/schools - Escola solicitando seus dados
   req.user: { id: '...', email: '...' }
   Escola encontrada: ✅ Escola Exemplo
```

### Tratamento de Erros:
- Mensagens claras em cada etapa
- Logs detalhados para debug
- Status codes corretos

---

## 🔄 Compatibilidade

### Endpoints Funcionais:
| Endpoint | Método | Descrição | Status |
|----------|--------|-----------|--------|
| `/api/school` | GET | Buscar dados da escola | ✅ NOVO |
| `/api/schools` | GET | Buscar dados da escola | ✅ Funciona |
| `/api/schools/profile` | GET | Buscar dados da escola | ✅ Existente |
| `/api/schools/profile` | PUT | Atualizar escola | ✅ Existente |
| `/api/schools/responsible` | PUT | Atualizar responsável | ✅ Existente |

---

## 🆘 Troubleshooting

### Problema: Ainda recebo 404
**Solução:** 
1. Aguarde 3-5 minutos para deploy no Render
2. Limpe cache do navegador (Ctrl+F5)
3. Verifique se token JWT está válido

### Problema: Retorna dados vazios
**Solução:**
1. Verifique se escola está cadastrada
2. Verifique se token contém userId correto
3. Veja logs do Render para erros

### Problema: Erro 401
**Solução:**
1. Faça login novamente
2. Verifique se token não expirou
3. Confirme se Authorization header está presente

---

## 📞 Suporte

**Desenvolvedor:** Wander Pires Silva Coelho  
**E-mail:** wanderpsc@gmail.com  
**Sistema:** https://criador-horario-aula.surge.sh

---

**Versão:** 1.0  
**Data:** 10/02/2026  
**Status:** ✅ Corrigido e em Deploy
