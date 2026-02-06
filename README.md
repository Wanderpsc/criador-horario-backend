# Sistema Criador de Horário de Aula Escolar

© 2025 **Wander Pires Silva Coelho**  
E-mail: wanderpsc@gmail.com  
Todos os direitos reservados.

---

## 📋 Sobre o Sistema

Sistema web completo para criação automática de horários escolares com prevenção de conflitos. O sistema gera grades de horário considerando:

- ✅ Evita mesmo professor no mesmo horário
- ✅ Evita mesma matéria no mesmo horário  
- ✅ Evita aulas seguidas da mesma matéria
- ✅ **Respeita observações e disponibilidade dos professores** (NOVO!)
- ✅ Considera carga horária dos componentes curriculares
- ✅ **Múltiplos formatos de impressão: Normal e Transposto** (NOVO!)

---

## 🎉 Novidades - Fevereiro 2026

### 🔥 Respeito Automático às Observações dos Professores
O sistema agora analisa automaticamente as observações cadastradas no campo "Observações de Disponibilidade" e **evita alocar professores** em horários onde eles não estão disponíveis.

**Exemplos reconhecidos:**
- "Não pode dar aula às quartas-feiras" → Professor não será alocado às quartas
- "Evitar último período" → Professor não será alocado no último horário
- Combinações de múltiplas restrições

### 🖨️ Novo Formato de Impressão Transposto
Além do formato tradicional, agora você pode imprimir com:
- **Períodos no topo** e **turmas na lateral**
- Ideal para visualizar todas as turmas de um dia específico
- Perfeito para coordenação e gestão de espaços

📖 **Veja o guia completo:** [GUIA_USUARIO_NOVAS_FUNCIONALIDADES.md](GUIA_USUARIO_NOVAS_FUNCIONALIDADES.md)

---

## 🚀 Tecnologias

### Backend
- Node.js + Express
- TypeScript
- MongoDB + Mongoose
- JWT Authentication
- Sistema de Licenças

### Frontend
- React 18
- TypeScript
- Vite
- Tailwind CSS
- React Router
- Zustand (State Management)

---

## 📦 Instalação

### Pré-requisitos

1. **Node.js** (v18 ou superior)
2. **MongoDB** (v6 ou superior)

### Instalação do MongoDB

**Windows:**
1. Baixe: https://www.mongodb.com/try/download/community
2. Instale e inicie o serviço MongoDB
3. Ou use MongoDB Atlas (cloud): https://www.mongodb.com/cloud/atlas

**Alternativa - Usar MongoDB em Docker:**
```bash
docker run -d -p 27017:27017 --name mongodb mongo:latest
```

### Configuração

1. **Clone/baixe o projeto**

2. **Backend:**
```bash
cd backend
npm install
cp .env.example .env
# Edite o arquivo .env com suas configurações
npm run dev
```

3. **Frontend:**
```bash
cd frontend
npm install
cp .env.example .env
# Edite o arquivo .env se necessário
npm run dev
```

---

## 🎯 Como Usar

### 1. Acesse o Sistema
- Frontend: http://localhost:3000
- Backend API: http://localhost:5000

### 2. Cadastre-se
- Crie uma conta com seus dados
- Informe o nome da escola
- Licença é opcional (sistema permite trial)

### 3. Cadastre os Dados

#### Professores
- Nome completo
- CPF/Matrícula
- Formação acadêmica
- Disponibilidade
- Observações específicas

#### Componentes Curriculares
- Nome da matéria
- Código
- Carga horária (aulas/períodos)

#### Horários
- Nome do horário (ex: "Turno Matutino")
- 8 períodos configuráveis
- Horário de início e fim de cada período

### 4. Crie uma Grade de Horário
- Selecione o ano/série
- Defina número de dias (5 ou 6)
- Configure sábado equivalente (se aplicável)
- Associe professores às matérias
- Clique em "Gerar Horário Automaticamente"

### 5. Exporte/Imprima
- Visualize a grade gerada
- Adicione cabeçalho e logo da escola
- Imprima ou baixe em PDF

---

## 📊 Dados Pré-Cadastrados

O sistema inclui dados de exemplo:

- **23 Professores** com formações completas
- **71 Componentes Curriculares** com cargas horárias
- **12 Anos/Séries** (1º ao 3º Ano, 1ª à 9ª Série)
- **1 Horário Padrão** (8 períodos de 45min)

---

## 🔐 Sistema de Licenças

### Para Administradores
- Gere licenças com data de expiração
- Defina número máximo de escolas por licença
- Gerencie licenças ativas

### Para Escolas
- Ative sua licença na área de perfil
- Licenças com validade controlada
- Sistema permite trial sem licença

---

## 🚀 Deploy

### Frontend (Surge)
```bash
cd frontend
npm run build
npm run deploy
```

O sistema será publicado em: `criador-horario-aula.surge.sh`

### Backend
Recomendado: Heroku, Railway, Render ou VPS própria

```bash
cd backend
npm run build
npm start
```

Não esqueça de configurar as variáveis de ambiente no servidor de produção.

---

## 📁 Estrutura do Projeto

```
CRIADOR DE HORÁRIO DE AULA/
├── backend/
│   ├── src/
│   │   ├── config/         # Configurações (DB)
│   │   ├── models/         # Modelos Mongoose
│   │   ├── routes/         # Rotas da API
│   │   ├── middleware/     # Middlewares (auth, errors)
│   │   ├── services/       # Lógica de negócio (gerador)
│   │   ├── data/           # Dados seed
│   │   └── server.ts       # Servidor principal
│   ├── package.json
│   └── tsconfig.json
│
├── frontend/
│   ├── src/
│   │   ├── components/     # Componentes React
│   │   ├── pages/          # Páginas
│   │   ├── store/          # State management
│   │   ├── lib/            # Utilitários (axios)
│   │   ├── App.tsx
│   │   └── main.tsx
│   ├── package.json
│   └── vite.config.ts
│
└── README.md
```

---

## 🔧 Scripts Disponíveis

### Backend
- `npm run dev` - Inicia em modo desenvolvimento
- `npm run build` - Compila TypeScript
- `npm start` - Inicia em produção

### Frontend
- `npm run dev` - Inicia em modo desenvolvimento
- `npm run build` - Build para produção
- `npm run preview` - Preview do build
- `npm run deploy` - Deploy no Surge

---

## 🐛 Solução de Problemas

### MongoDB não conecta
- Verifique se o MongoDB está rodando
- Confirme a string de conexão no `.env`
- Use MongoDB Compass para testar conexão

### Erro de CORS
- Verifique `CORS_ORIGIN` no backend `.env`
- Deve apontar para URL do frontend

### Porta já em uso
- Mude `PORT` no `.env` do backend
- Mude `port` no `vite.config.ts` do frontend

---

## 📄 Licença e Copyright

**© 2025 Wander Pires Silva Coelho**

Todos os direitos reservados. Este software é proprietário.

**Contato:**  
E-mail: wanderpsc@gmail.com

**Uso Comercial:**  
Para adquirir licenças de uso, entre em contato através do e-mail acima.

---

## 🎓 Funcionalidades Futuras

- [ ] Exportação para Excel
- [ ] Relatórios personalizados
- [ ] Integração com sistemas acadêmicos
- [ ] App mobile
- [ ] Notificações por e-mail
- [ ] Backup automático
- [ ] Multi-idiomas

---

**Desenvolvido com ❤️ para facilitar a gestão escolar**
