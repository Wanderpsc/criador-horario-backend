import { useNavigate } from 'react-router-dom';
import { ArrowLeft, BookOpenCheck, ExternalLink, Printer, ShieldAlert, Terminal } from 'lucide-react';

type ManualSection = {
  id: string;
  title: string;
  summary: string;
  items?: { title: string; text: string }[];
  commands?: { label: string; code: string; note: string }[];
};

const sections: ManualSection[] = [
  {
    id: 'architecture',
    title: '1. Arquitetura e fluxo do sistema',
    summary: 'O sistema usa uma arquitetura web cliente-servidor. O navegador executa o frontend, o backend aplica regras e segurança, e o MongoDB persiste os dados de cada escola.',
    items: [
      { title: 'Frontend', text: 'React 18 + TypeScript, compilado pelo Vite. As telas ficam em frontend/src/pages, os componentes reutilizáveis em frontend/src/components, o estado de login em frontend/src/store/authStore.ts e as chamadas HTTP em frontend/src/services/api.ts.' },
      { title: 'Backend', text: 'Node.js + Express + TypeScript. backend/src/server.ts inicia a API, registra segurança e rotas. backend/src/routes recebe requisições, backend/src/models define documentos MongoDB e backend/src/services concentra regras e integrações.' },
      { title: 'Fluxo de uma ação', text: 'A tela React chama o Axios; o interceptor acrescenta Authorization: Bearer TOKEN; o Express recebe /api/...; o middleware valida o JWT; a rota limita os dados pelo schoolId; o Mongoose lê ou grava no MongoDB; a resposta JSON atualiza a interface.' },
      { title: 'Multi-escola', text: 'Dados pedagógicos e administrativos devem sempre ser filtrados pelo identificador da escola. Para usuário secundário, use req.user.schoolId; para o dono da escola, o próprio id. Nunca faça consulta global em uma rota de cliente.' },
    ],
  },
  {
    id: 'languages',
    title: '2. Linguagens, bibliotecas e suas funções',
    summary: 'A mesma linguagem base, TypeScript, é usada nos dois lados. Isso reduz erros de tipos e facilita seguir um dado da tela até o banco.',
    items: [
      { title: 'TypeScript', text: 'JavaScript com tipos. Interfaces descrevem objetos; funções declaram parâmetros e retornos. Execute tsc para encontrar propriedades erradas, imports não usados e contratos incompatíveis antes do deploy.' },
      { title: 'React e JSX/TSX', text: 'Cada tela é uma função que retorna interface. useState guarda estado local; useEffect executa efeitos; useMemo deriva dados; React Query busca, armazena em cache e invalida dados do servidor.' },
      { title: 'Express', text: 'Organiza endpoints HTTP. GET lê, POST cria, PUT/PATCH altera e DELETE remove. Middlewares executam antes da rota para autenticar, validar, auditar e proteger.' },
      { title: 'MongoDB e Mongoose', text: 'MongoDB armazena documentos JSON/BSON em collections. Mongoose define schemas, valida campos, cria índices e oferece find, findOne, create, save, updateOne e deleteOne.' },
      { title: 'Tailwind CSS', text: 'Classes utilitárias controlam layout, cor, espaçamento e responsividade. Regras globais e de impressão ficam em CSS ou em blocos @media print.' },
      { title: 'Zustand', text: 'Mantém token, usuário e ano letivo. O persist grava o estado no localStorage sob auth-storage; logout deve apagar o estado autenticado.' },
      { title: 'Axios', text: 'Cliente HTTP. O interceptor injeta o JWT e trata respostas. A URL base vem de VITE_API_URL e deve terminar em /api.' },
      { title: 'JWT e bcrypt', text: 'JWT identifica a sessão assinada pelo backend; bcrypt cria hash irreversível da senha. Senhas nunca devem ser gravadas ou exibidas em texto puro.' },
    ],
  },
  {
    id: 'folders',
    title: '3. Onde alterar cada parte',
    summary: 'Comece pelo arquivo proprietário do comportamento. Faça uma alteração pequena, valide e só então publique.',
    items: [
      { title: 'Rotas de telas', text: 'frontend/src/App.tsx. Registra páginas públicas, privadas, de clientes, administradores e do criador.' },
      { title: 'Menu e estrutura visual', text: 'frontend/src/components/Layout.tsx. Controla navegação lateral, cabeçalho e itens permitidos por perfil.' },
      { title: 'Telas', text: 'frontend/src/pages/*.tsx. Procure pelo nome do módulo, como Teachers, EPIControl, TimetableGenerator ou AdminDashboard.' },
      { title: 'Comunicação com a API', text: 'frontend/src/services/api.ts e frontend/src/lib/axios.ts. Verifique URL base, interceptor do token e transformação de _id para id.' },
      { title: 'Servidor e endpoints', text: 'backend/src/server.ts mostra todos os prefixos /api. A implementação de cada recurso fica no arquivo correspondente em backend/src/routes.' },
      { title: 'Banco e campos', text: 'backend/src/models/*.ts. Altere o schema antes de usar novos campos e mantenha campos opcionais compatíveis com registros antigos.' },
      { title: 'Regras complexas', text: 'backend/src/services e rotas de geração. Horários, notificações, e-mail, pagamento, WhatsApp e backups têm serviços próprios.' },
      { title: 'Configuração', text: 'frontend/vite.config.ts, frontend/.env, backend/.env, backend/src/config/database.ts e render.yaml.' },
    ],
  },
  {
    id: 'commands',
    title: '4. Comandos essenciais de desenvolvimento',
    summary: 'Execute os comandos no PowerShell aberto na pasta raiz do projeto. Em PowerShell, use ponto e vírgula para encadear comandos.',
    commands: [
      { label: 'Instalar dependências', code: 'Set-Location backend\nnpm install\nSet-Location ..\\frontend\nnpm install', note: 'Execute após baixar o projeto ou alterar package.json/package-lock.json.' },
      { label: 'Iniciar backend local', code: 'Set-Location backend\nnpm run dev', note: 'Usa nodemon e normalmente atende em http://localhost:5000.' },
      { label: 'Iniciar frontend local', code: 'Set-Location frontend\nnpm run dev', note: 'Usa Vite e normalmente atende em http://localhost:3001.' },
      { label: 'Validar frontend', code: 'Set-Location frontend\nnpm run build:check', note: 'Executa TypeScript e depois o build. Corrija erros antes de publicar.' },
      { label: 'Validar backend', code: 'Set-Location backend\nnpm run build', note: 'Compila backend/src para backend/dist.' },
      { label: 'Testar backend', code: 'Set-Location backend\nnpm test', note: 'Executa a suíte Jest disponível no projeto.' },
      { label: 'Testar API ativa', code: 'Invoke-RestMethod https://criador-horario-backend-1.onrender.com/api/health', note: 'Deve retornar status OK. Uma primeira resposta lenta pode ser o serviço gratuito despertando.' },
      { label: 'Ver alterações locais', code: 'git status --short\ngit diff -- frontend/src/pages/NomeDaPagina.tsx', note: 'Revise apenas os arquivos envolvidos. Não descarte alterações que não reconhece.' },
      { label: 'Registrar versão no Git', code: 'git add caminho/do/arquivo\ngit commit -m "Descrição objetiva"\ngit push origin master', note: 'Faça commit apenas depois dos testes. O push pode disparar o deploy do backend no Render.' },
    ],
  },
  {
    id: 'deploy',
    title: '5. Build, publicação e plataformas',
    summary: 'O frontend é estático e fica no Surge. O backend é um serviço Node no Render. O MongoDB Atlas fica separado dos dois.',
    commands: [
      { label: 'Publicar frontend no Surge', code: 'Set-Location frontend\nnpm run build\nsurge dist --domain criador-horario-aula.surge.sh', note: 'Publica o conteúdo de dist. Confirme a mensagem Success e teste em janela anônima.' },
      { label: 'Atalho configurado', code: 'Set-Location frontend\nnpm run deploy', note: 'Executa build:surge e Surge conforme frontend/package.json.' },
      { label: 'Executar backend compilado', code: 'Set-Location backend\nnpm run build\nnpm start', note: 'Equivale ao fluxo de produção: TypeScript gera dist e Node inicia dist/server.js.' },
      { label: 'Render', code: 'Build: cd backend && npm install && npm run build\nStart: cd backend && node dist/server.js', note: 'Esses comandos estão em render.yaml. Variáveis secretas são configuradas no painel Environment do Render.' },
    ],
    items: [
      { title: 'Surge', text: 'Acesse surge.sh com a conta proprietária. O domínio de produção é criador-horario-aula.surge.sh. O HashRouter permite rotas após # sem configuração de servidor.' },
      { title: 'Render', text: 'Acesse dashboard.render.com, abra o serviço criador-horario-backend e use Events para deploy, Logs para erros e Environment para variáveis. Nunca cole segredos em arquivos versionados.' },
      { title: 'MongoDB Atlas', text: 'Acesse cloud.mongodb.com, abra o cluster, Database Access para usuários, Network Access para IPs e Browse Collections para consultar dados. Prefira usuário com privilégio mínimo.' },
      { title: 'GitHub', text: 'É a fonte versionada do projeto e a origem do deploy do Render. Use histórico e diff para entender quando e por que um comportamento mudou.' },
    ],
  },
  {
    id: 'environment',
    title: '6. Variáveis de ambiente e segredos',
    summary: 'Variáveis separam configuração do código. Valores reais não aparecem neste manual porque o frontend é público e pode ser inspecionado.',
    items: [
      { title: 'MONGODB_URI', text: 'Endereço autenticado do MongoDB. Configure no backend/.env local e no Environment do Render. Troque imediatamente se for exposto.' },
      { title: 'JWT_SECRET', text: 'Chave que assina sessões. Deve ser longa e aleatória. Alterá-la encerra sessões existentes.' },
      { title: 'FRONTEND_URL', text: 'Origem permitida pelo CORS. Em produção aponta para https://criador-horario-aula.surge.sh.' },
      { title: 'VITE_API_URL', text: 'URL pública da API usada no build do frontend. Produção: https://criador-horario-backend-1.onrender.com/api. Variáveis VITE são públicas no bundle.' },
      { title: 'MERCADO_PAGO_ACCESS_TOKEN', text: 'Token privado de pagamentos. Configure somente no Render/backend. O frontend recebe apenas resultados necessários.' },
      { title: 'EMAIL_USER e EMAIL_PASSWORD', text: 'Conta e senha de aplicativo para envio. Use senha de aplicativo, nunca a senha principal da conta.' },
      { title: 'WhatsApp', text: 'Tokens e identificadores da Meta Cloud API devem ficar no backend ou na configuração protegida da escola, nunca em código público.' },
    ],
  },
  {
    id: 'database',
    title: '7. Banco de dados e manutenção',
    summary: 'MongoDB organiza dados em collections. Cada model Mongoose documenta os campos aceitos e geralmente inclui schoolId para isolamento.',
    commands: [
      { label: 'Backup pelo script oficial', code: 'Set-Location backend\nnpm run backup', note: 'Executa backend/scripts/backup-database.ps1. Confirme o arquivo gerado antes de qualquer operação destrutiva.' },
      { label: 'Backup lógico de escolas', code: 'Set-Location backend\nnpm run backup:escolas', note: 'Executa o script TypeScript de backup de todas as escolas.' },
      { label: 'Restauração', code: 'Set-Location backend\nnpm run restore', note: 'Use somente após validar arquivo, destino e backup atual. Restauração pode substituir dados.' },
      { label: 'Auditar alocação docente', code: 'Set-Location backend\nnpm run audit:teacher-allocation', note: 'Verifica inconsistências entre professores, disciplinas, turmas e carga.' },
    ],
    items: [
      { title: 'Collections pedagógicas', text: 'teachers, subjects, grades, classes, schedules, teachersubjects, timetables e generatedtimetables.' },
      { title: 'RH e frequência', text: 'employees, employeedocuments, employeeattendances, teacherattendances, ferias e epicontrols.' },
      { title: 'Administração', text: 'users, schoolusers, licenses, plans, payments, invoices, messages, notifications e auditlogs.' },
      { title: 'Regra de ouro', text: 'Antes de alterar em massa: faça backup, conte registros, filtre por schoolId, teste com poucos documentos, valide o resultado e só então amplie.' },
    ],
  },
  {
    id: 'modules',
    title: '8. Função dos módulos do programa',
    summary: 'As rotas visíveis estão registradas em frontend/src/App.tsx e os prefixos da API em backend/src/server.ts.',
    items: [
      { title: 'Cadastros pedagógicos', text: 'Professores, componentes, séries, turmas, horários e vínculos professor-disciplina fornecem os dados usados pelo algoritmo.' },
      { title: 'Gerador de Horário', text: 'Distribui aulas por dia e período, evita conflito de professor e turma, considera disponibilidade e carga horária, permite revisão, salvamento e impressão.' },
      { title: 'Horário emergencial e reposição', text: 'Reorganizam aulas em ausências e sábados, com seleção de substitutos, registro e visualização pública no painel.' },
      { title: 'Calendário e ano letivo', text: 'Controlam dias letivos, feriados, reposições, vigência dos dados e relatórios anuais.' },
      { title: 'Funcionários e ponto', text: 'Mantêm cadastro funcional, documentos, jornadas, links públicos e marcações de entrada e saída.' },
      { title: 'EPI e férias', text: 'Registram entrega, validade e termos de EPI; programam férias e geram documentos com cabeçalho institucional.' },
      { title: 'Painel de TV', text: 'Apresenta horários e avisos em rota pública, sem disponibilizar operações administrativas.' },
      { title: 'Administração geral', text: 'Gerencia escolas, planos, pagamentos, vendas, mensagens, notificações, auditoria e backups.' },
    ],
  },
  {
    id: 'security',
    title: '9. Autenticação, perfis e segurança',
    summary: 'Segurança deve existir no frontend e no backend. Ocultar um botão não substitui validar a permissão na API.',
    items: [
      { title: 'Perfis principais', text: 'super-admin é o criador e administrador geral; admin administrativo acessa o painel geral; school é o proprietário da escola; SchoolUser admin/user pertence a uma escola e pode ter permissões granulares.' },
      { title: 'Login', text: 'O backend compara a senha com bcrypt e emite JWT. O frontend persiste token e usuário. Requisições privadas enviam Bearer token.' },
      { title: 'Proteções', text: 'Helmet configura cabeçalhos; CORS limita origens; rate-limit reduz abuso; mongo-sanitize e HPP tratam entradas; auditoria registra ações.' },
      { title: 'Segredos', text: 'Não envie .env, tokens, senhas ou backups por mensagem. Não registre segredos em Git. Revogue e substitua qualquer credencial exposta.' },
      { title: 'Manual do criador', text: 'Esta tela exige role super-admin na navegação. Como o frontend é distribuído ao navegador, ela contém conhecimento técnico, mas deliberadamente não contém valores secretos.' },
    ],
  },
  {
    id: 'troubleshooting',
    title: '10. Diagnóstico e solução de problemas',
    summary: 'Investigue de fora para dentro: navegador, rede, API, logs, banco e dados. Registre o erro exato antes de editar.',
    commands: [
      { label: 'Verificar ferramentas', code: 'node --version\nnpm --version\ngit --version\nGet-Command surge', note: 'Confirma que Node, npm, Git e Surge estão disponíveis.' },
      { label: 'Testar backend local', code: 'Invoke-RestMethod http://localhost:5000/api/health', note: 'Se falhar, veja o terminal do backend e confira PORT e MONGODB_URI.' },
      { label: 'Procurar texto no PowerShell', code: 'Get-ChildItem -Recurse -File frontend\\src | Select-String "texto procurado"', note: 'Útil quando rg não está instalado. No VS Code, Ctrl+Shift+F é mais direto.' },
      { label: 'Atualização limpa de dependências', code: 'Remove-Item -Recurse -Force node_modules\nnpm install', note: 'Use dentro de frontend ou backend somente quando a instalação estiver inconsistente; preserve package-lock.json.' },
    ],
    items: [
      { title: 'Tela em branco', text: 'Abra F12 > Console. Procure erro JavaScript, import ausente ou resposta 401. Confirme se o asset novo foi publicado e limpe cache/service worker.' },
      { title: 'Erro de rede/CORS', text: 'F12 > Network mostra URL e status. Teste /api/health, confira VITE_API_URL, FRONTEND_URL e lista allowedOrigins em server.ts.' },
      { title: '401/403', text: '401 significa sessão ausente/inválida; refaça login. 403 significa perfil sem permissão; confira role e schoolId no banco e validação da rota.' },
      { title: 'Dados vazios para usuário secundário', text: 'Confira se a consulta usa req.user.schoolId || req.user.id. Filtrar apenas pelo id do SchoolUser aponta para a escola errada.' },
      { title: 'Build falhou', text: 'Leia o primeiro erro do TypeScript, abra arquivo e linha, corrija a causa e repita o mesmo comando. Avisos de chunk grande não impedem o deploy.' },
      { title: 'Render lento ou offline', text: 'Abra Logs e Events. Em plano gratuito, aguarde o despertar. Se /health falhar, confira build, start command e variáveis.' },
      { title: 'Mudança não apareceu', text: 'Confirme build novo, mensagem Success do Surge, nome hash do asset em dist/index.html e teste em janela anônima ou com cache limpo.' },
    ],
  },
  {
    id: 'workflow',
    title: '11. Procedimento seguro para corrigir ou implementar',
    summary: 'Este roteiro reduz regressões quando a manutenção for feita manualmente.',
    items: [
      { title: '1. Reproduza', text: 'Anote usuário, rota, ação, resultado esperado, resultado atual e mensagem do Console/Network.' },
      { title: '2. Localize', text: 'Comece pela página da rota em App.tsx. Siga a chamada Axios até o prefixo em server.ts, a rota backend e o model.' },
      { title: '3. Forme uma hipótese', text: 'Exemplo: “a consulta usa userId, mas deveria usar schoolId”. Defina um teste barato capaz de provar que a hipótese está errada.' },
      { title: '4. Faça a menor alteração', text: 'Evite reformatação ampla e mudanças não relacionadas. Preserve contratos de API e dados antigos.' },
      { title: '5. Valide', text: 'Execute build/typecheck do lado alterado, teste o fluxo real e confira isolamento entre pelo menos duas escolas quando houver dados multi-tenant.' },
      { title: '6. Revise e faça backup', text: 'Leia git diff, confirme ausência de tokens e faça backup antes de migrações ou exclusões.' },
      { title: '7. Publique e monitore', text: 'Frontend: build + Surge. Backend: commit/push + Render. Depois teste health, login e o comportamento alterado.' },
    ],
  },
];

function CodeBlock({ code }: { code: string }) {
  return <pre className="overflow-x-auto bg-slate-950 text-emerald-200 p-4 text-xs leading-5 border-l-4 border-emerald-500"><code>{code}</code></pre>;
}

export default function TechnicalManual() {
  const navigate = useNavigate();

  return (
    <div className="manual-page min-h-screen bg-[#eef2f0] text-slate-900">
      <style>{`
        .manual-sheet { font-family: Georgia, 'Times New Roman', serif; }
        .manual-sheet h1, .manual-sheet h2, .manual-sheet h3, .manual-ui { font-family: 'Trebuchet MS', sans-serif; letter-spacing: 0; }
        @page { size: A4 portrait; margin: 14mm; }
        @media print {
          body { background: #fff !important; }
          .no-print, header, aside, nav { display: none !important; }
          .manual-page { background: #fff !important; }
          .manual-sheet { max-width: none !important; margin: 0 !important; box-shadow: none !important; padding: 0 !important; }
          .manual-cover { min-height: 245mm; display: flex; flex-direction: column; justify-content: center; page-break-after: always; }
          .manual-section { break-before: page; page-break-before: always; }
          .manual-item, pre { break-inside: avoid; page-break-inside: avoid; }
          a { color: inherit !important; text-decoration: none !important; }
        }
      `}</style>

      <div className="no-print sticky top-0 z-20 border-b border-slate-300 bg-white/95 backdrop-blur px-4 py-3">
        <div className="max-w-5xl mx-auto flex items-center justify-between gap-3">
          <button onClick={() => navigate('/admin-dashboard')} className="manual-ui inline-flex items-center gap-2 px-3 py-2 text-sm font-bold text-slate-700 hover:bg-slate-100 rounded-md">
            <ArrowLeft size={18} /> Voltar
          </button>
          <button onClick={() => window.print()} className="manual-ui inline-flex items-center gap-2 px-4 py-2 text-sm font-bold text-white bg-emerald-700 hover:bg-emerald-800 rounded-md shadow">
            <Printer size={18} /> Imprimir manual completo
          </button>
        </div>
      </div>

      <main className="manual-sheet max-w-5xl mx-auto bg-white shadow-xl px-6 py-10 md:px-14 md:py-16">
        <section className="manual-cover border-y-8 border-emerald-800 py-16 text-center">
          <BookOpenCheck size={64} className="mx-auto text-emerald-800 mb-8" />
          <p className="manual-ui text-sm font-bold uppercase text-emerald-800">Documentação reservada ao criador</p>
          <h1 className="text-4xl md:text-6xl font-black mt-4 mb-6">Manual Técnico do Sistema</h1>
          <p className="text-xl text-slate-600">Criador de Horário de Aula Escolar</p>
          <div className="mt-12 text-sm leading-7 text-slate-600">
            <p><strong>Finalidade:</strong> desenvolvimento, manutenção, diagnóstico, recuperação e publicação.</p>
            <p><strong>Atualização:</strong> setembro de 2026</p>
            <p><strong>Responsável:</strong> Wander Pires Silva Coelho</p>
          </div>
          <div className="mt-12 mx-auto max-w-2xl border border-amber-300 bg-amber-50 p-4 text-left text-sm">
            <div className="manual-ui flex items-center gap-2 font-bold text-amber-900"><ShieldAlert size={18} /> Segurança</div>
            <p className="mt-2 text-amber-900">Este documento ensina onde configurar acessos, mas não imprime senhas, tokens nem conexões privadas. Consulte os cofres das plataformas e arquivos .env locais autorizados.</p>
          </div>
        </section>

        <section className="manual-section py-10">
          <h2 className="text-2xl font-black border-b-4 border-emerald-700 pb-3">Sumário</h2>
          <ol className="mt-6 grid md:grid-cols-2 gap-x-10 gap-y-3 text-sm">
            {sections.map(section => <li key={section.id}><a className="text-emerald-800 hover:underline" href={`#${section.id}`}>{section.title}</a></li>)}
          </ol>
          <div className="manual-item mt-10 border-l-4 border-sky-700 bg-sky-50 p-5">
            <h3 className="font-bold text-sky-950">Leitura de caminhos</h3>
            <p className="mt-2 text-sm">Todos os caminhos são relativos à raiz “CRIADOR DE HORÁRIO DE AULA”. Exemplo: frontend/src/App.tsx significa abrir a pasta frontend, depois src, e então App.tsx.</p>
          </div>
        </section>

        {sections.map(section => (
          <section id={section.id} key={section.id} className="manual-section py-8">
            <h2 className="text-2xl font-black text-slate-950 border-b-4 border-emerald-700 pb-3">{section.title}</h2>
            <p className="mt-5 text-sm leading-7 text-slate-700">{section.summary}</p>
            {section.items && <div className="mt-6 space-y-4">
              {section.items.map(item => (
                <article key={item.title} className="manual-item border-l-4 border-slate-300 pl-4 py-1">
                  <h3 className="font-bold text-base">{item.title}</h3>
                  <p className="mt-1 text-sm leading-6 text-slate-700">{item.text}</p>
                </article>
              ))}
            </div>}
            {section.commands && <div className="mt-7 space-y-6">
              {section.commands.map(command => (
                <article key={command.label} className="manual-item border border-slate-200">
                  <div className="manual-ui flex items-center gap-2 bg-slate-100 px-4 py-2 font-bold text-sm"><Terminal size={16} /> {command.label}</div>
                  <CodeBlock code={command.code} />
                  <p className="px-4 py-3 text-xs leading-5 text-slate-600">{command.note}</p>
                </article>
              ))}
            </div>}
          </section>
        ))}

        <section className="manual-section py-8">
          <h2 className="text-2xl font-black border-b-4 border-emerald-700 pb-3">12. Referências oficiais</h2>
          <div className="mt-6 grid md:grid-cols-2 gap-4">
            {[
              ['React', 'https://react.dev'], ['TypeScript', 'https://www.typescriptlang.org/docs'],
              ['Vite', 'https://vite.dev/guide'], ['Express', 'https://expressjs.com'],
              ['MongoDB', 'https://www.mongodb.com/docs'], ['Mongoose', 'https://mongoosejs.com/docs'],
              ['Render', 'https://render.com/docs'], ['Surge', 'https://surge.sh/help'],
              ['Git', 'https://git-scm.com/doc'], ['Node.js', 'https://nodejs.org/docs/latest/api'],
            ].map(([name, url]) => (
              <a key={name} href={url} target="_blank" rel="noreferrer" className="manual-item flex items-center justify-between border border-slate-200 p-4 text-sm font-bold text-emerald-800 hover:bg-emerald-50">
                {name}<ExternalLink size={15} />
              </a>
            ))}
          </div>
        </section>

        <footer className="mt-12 border-t border-slate-300 pt-5 text-center text-xs text-slate-500">
          Sistema Criador de Horário de Aula Escolar - Manual técnico do proprietário - © {new Date().getFullYear()} Wander Pires Silva Coelho
        </footer>
      </main>
    </div>
  );
}