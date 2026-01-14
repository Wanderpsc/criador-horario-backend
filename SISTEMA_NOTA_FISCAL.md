# 📄 Sistema de Emissão de Nota Fiscal / ISS

## © 2025-2026 Wander Pires Silva Coelho

Sistema completo de geração e envio de notas fiscais após confirmação de pagamento de licenças do EduSync-PRO.

---

## ✅ Funcionalidades Implementadas

### 1. **Backend - API de Notas Fiscais**

#### **Modelo de Dados** (`Invoice.ts`)
- ✅ Dados completos do prestador (você) e tomador (escola)
- ✅ Discriminação detalhada do serviço prestado
- ✅ Cálculo automático de ISS (alíquota configurável)
- ✅ Vinculação com transação de pagamento
- ✅ Status: pending, issued, sent, cancelled
- ✅ Auditoria completa (emissão, envio, cancelamento)
- ✅ Numeração automática sequencial

#### **Serviço de Geração** (`invoice.service.ts`)
- ✅ **Geração de PDF profissional** com PDFKit
  - Layout oficial de nota fiscal
  - Dados do prestador e tomador
  - Discriminação de serviços
  - Cálculo detalhado de impostos
  - Informações de pagamento
  - Copyright e proteção legal
  
- ✅ **Envio por Email** com Nodemailer
  - Email HTML formatado profissionalmente
  - PDF anexado automaticamente
  - Template responsivo com gradiente
  - Informações de contato
  
- ✅ **Criação automática** após confirmação de pagamento
  - Calcula valores e impostos
  - Gera número sequencial
  - Registra data e hora
  - Vincula ao pagamento

#### **Rotas da API** (`invoice.routes.ts`)

| Método | Endpoint | Descrição | Permissão |
|--------|----------|-----------|-----------|
| `POST` | `/api/invoices/create` | Criar nota fiscal manualmente | Admin |
| `POST` | `/api/invoices/:id/generate-pdf` | Gerar PDF | Admin |
| `POST` | `/api/invoices/:id/send-email` | Enviar por email | Admin |
| `GET` | `/api/invoices` | Listar todas as notas | Admin |
| `GET` | `/api/invoices/:id` | Buscar nota específica | Admin/Escola |
| `GET` | `/api/invoices/:id/download` | Download do PDF | Admin/Escola |
| `DELETE` | `/api/invoices/:id/cancel` | Cancelar nota fiscal | Admin |
| `GET` | `/api/invoices/school/:schoolId` | Notas de uma escola | Admin/Escola |

---

### 2. **Frontend - Interface Administrativa**

#### **Tela de Gerenciamento** (`InvoiceManagement.tsx`)

**Funcionalidades:**
- ✅ Formulário completo de emissão de nota fiscal
- ✅ Seleção de escola do banco de dados
- ✅ Campos: ID transação, forma pagamento, data, plano, valor
- ✅ Cálculo automático baseado no plano selecionado
- ✅ Botão único: "Emitir e Enviar NF" (faz tudo de uma vez)

**Tabela de Notas Fiscais:**
- ✅ Listagem completa de todas as notas emitidas
- ✅ Filtros: status, data, escola
- ✅ Colunas: número, data, cliente, plano, valor, status
- ✅ Status visual com cores e ícones
- ✅ Ações: Download PDF, Reenviar email, Cancelar

**Indicadores:**
- ✅ Total de notas emitidas
- ✅ Notas enviadas
- ✅ Valor total faturado

---

### 3. **Integração no Sistema**

#### **Menu Administrativo**
- ✅ Novo item: "Notas Fiscais" com ícone FileText
- ✅ Cor roxa (purple) para destaque
- ✅ Descrição: "📄 Emissão e envio de NF/ISS"
- ✅ Acesso: `/invoices` (apenas admin)

#### **Rota Protegida**
- ✅ Route configurada em `App.tsx`
- ✅ Proteção AdminRoute
- ✅ Navegação integrada

---

## 🔧 Configuração Necessária

### **1. Dados do Prestador (VOCÊ)**

Edite o arquivo: `backend/src/services/invoice.service.ts`

```typescript
private static readonly PROVIDER_DATA = {
  name: 'Wander Pires Silva Coelho',
  cpfCnpj: '000.000.000-00', // ⚠️ ATUALIZAR COM SEU CPF/CNPJ
  address: 'Rua Exemplo, 123', // ⚠️ ATUALIZAR
  city: 'São Paulo', // ⚠️ ATUALIZAR
  state: 'SP', // ⚠️ ATUALIZAR
  zipCode: '00000-000', // ⚠️ ATUALIZAR
  email: 'wanderpsc@gmail.com',
  phone: '(00) 00000-0000', // ⚠️ ATUALIZAR
  municipalRegistration: '000.000.000-0' // ⚠️ OPCIONAL
};
```

### **2. Código do Serviço Municipal**

Consulte a tabela de serviços do seu município. Código padrão:
```typescript
private static readonly SERVICE_CODE = '01.07'; 
// 01.07 = Desenvolvimento de software sob encomenda
```

### **3. Alíquota de ISS**

Varia por município (geralmente 2% a 5%):
```typescript
const issRate = 2.0; // 2% - Ajustar conforme sua cidade
```

### **4. Configuração de Email (SMTP)**

Adicione ao arquivo `.env`:
```env
# Email para envio de notas fiscais
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=wanderpsc@gmail.com
SMTP_PASS=sua_senha_de_aplicativo
```

**Para Gmail:**
1. Acesse: https://myaccount.google.com/apppasswords
2. Crie uma senha de aplicativo
3. Use essa senha no `SMTP_PASS`

---

## 📋 Como Usar

### **Cenário 1: Emissão Manual pelo Admin**

1. **Acesse:** Menu Admin → Notas Fiscais
2. **Clique:** "Nova Nota Fiscal"
3. **Preencha:**
   - Selecione a escola
   - ID da transação (do Mercado Pago)
   - Forma de pagamento (PIX, Cartão, etc.)
   - Data do pagamento
   - Plano contratado (Mensal/Anual/Perpétua)
   - Valor (auto-preenchido)
4. **Clique:** "Emitir e Enviar NF"

**O que acontece:**
- ✅ Nota fiscal criada no banco de dados
- ✅ PDF gerado automaticamente
- ✅ Email enviado para a escola com PDF anexado
- ✅ Status atualizado para "sent"

### **Cenário 2: Integração com Pagamentos** (Futuro)

Você pode chamar a criação de nota fiscal automaticamente no webhook do Mercado Pago:

```typescript
// Dentro do webhook após confirmação de pagamento
import { InvoiceService } from '../services/invoice.service';

// Após pagamento aprovado
const invoice = await InvoiceService.createInvoiceFromPayment({
  schoolId: payment.schoolId,
  schoolData: school,
  paymentId: payment.mercadoPagoId,
  paymentMethod: payment.paymentMethod,
  paymentDate: payment.paidAt,
  plan: payment.plan,
  amount: payment.amount
});

// Gerar e enviar automaticamente
await InvoiceService.generateInvoicePDF(invoice._id);
await InvoiceService.sendInvoiceByEmail(invoice._id);
```

---

## 📄 Exemplo de Nota Fiscal Gerada

### **Layout do PDF:**

```
═══════════════════════════════════════════════════════════
          NOTA FISCAL DE SERVIÇOS ELETRÔNICA
              Nº 00000001 - Série 001
═══════════════════════════════════════════════════════════

PRESTADOR DE SERVIÇOS
Wander Pires Silva Coelho
CPF/CNPJ: 000.000.000-00
Rua Exemplo, 123
São Paulo - SP - CEP: 00000-000
Email: wanderpsc@gmail.com
Telefone: (00) 00000-0000

TOMADOR DE SERVIÇOS
Escola Exemplo LTDA
CNPJ: 00.000.000/0000-00
Rua da Escola, 456
São Paulo - SP - CEP: 00000-000
Email: escola@exemplo.com
Telefone: (11) 91234-5678

DISCRIMINAÇÃO DOS SERVIÇOS
Código do Serviço: 01.07
Descrição: Licença de uso do software EduSync-PRO - Plano 
Mensal - Sistema de criação automatizada de horários escolares
Quantidade: 1
Valor Unitário: R$ 49,90
Valor Total: R$ 49,90

VALORES E TRIBUTOS
Valor dos Serviços:           R$ 49,90
(-) Deduções:                 R$ 0,00
Base de Cálculo ISS:          R$ 49,90
Alíquota ISS (2%):            R$ 1,00
───────────────────────────────────────
Valor Líquido:                R$ 48,90

INFORMAÇÕES DE PAGAMENTO
Plano Contratado: Mensal
Forma de Pagamento: PIX
Data do Pagamento: 13/01/2026
ID Transação: MP-123456789

═══════════════════════════════════════════════════════════
ISS - Imposto Sobre Serviços de Qualquer Natureza
Este documento serve como comprovante de prestação de 
serviços e pagamento de ISS

Emitida em: 13/01/2026 às 10:30:00
© 2025-2026 Wander Pires Silva Coelho - Todos os direitos reservados
EduSync-PRO - Sistema Criador de Horário de Aula Escolar
═══════════════════════════════════════════════════════════
```

---

## 📧 Exemplo de Email Enviado

**Assunto:** Nota Fiscal 00000001 - EduSync-PRO

**Corpo (HTML):**

```
┌──────────────────────────────────────┐
│   NOTA FISCAL DE SERVIÇOS            │
│   (Banner azul gradiente)            │
└──────────────────────────────────────┘

Prezado(a) Escola Exemplo LTDA,

Segue em anexo a Nota Fiscal de Serviços nº 00000001 
referente à contratação do plano Mensal do sistema 
EduSync-PRO.

┌─────────────────────────────────────┐
│ Dados da Nota Fiscal:               │
│ • Número: 00000001 - Série 001      │
│ • Data: 13/01/2026                  │
│ • Valor dos Serviços: R$ 49,90      │
│ • ISS (2%): R$ 1,00                 │
│ • Valor Líquido: R$ 48,90           │
└─────────────────────────────────────┘

Esta nota fiscal serve como comprovante oficial da 
prestação de serviços e do recolhimento do ISS.

Em caso de dúvidas, entre em contato:
• Email: wanderpsc@gmail.com
• Telefone: (00) 00000-0000

Atenciosamente,
Wander Pires Silva Coelho
EduSync-PRO

© 2025-2026 Wander Pires Silva Coelho
EduSync-PRO® - Sistema Criador de Horário de Aula Escolar
```

**Anexo:** NF-00000001.pdf

---

## ⚖️ Conformidade Legal

### **Legislação Aplicável:**
- ✅ Lei Complementar 116/2003 (ISS)
- ✅ Código Tributário Nacional
- ✅ Lei 12.965/14 (Marco Civil da Internet)
- ✅ LGPD (Lei 13.709/18)

### **Requisitos Atendidos:**
- ✅ Discriminação completa do serviço
- ✅ Identificação de prestador e tomador
- ✅ Cálculo e destaque do ISS
- ✅ Data e hora de emissão
- ✅ Numeração sequencial única
- ✅ Assinatura digital (timestamp)
- ✅ Armazenamento de 5 anos (auditoria)

---

## 🔐 Segurança

- ✅ Apenas administradores podem emitir notas
- ✅ Escolas só visualizam suas próprias notas
- ✅ PDFs armazenados em diretório protegido
- ✅ Auditoria completa de ações
- ✅ Números sequenciais imutáveis
- ✅ Cancelamento apenas com justificativa
- ✅ Copyright em todos os documentos

---

## 📊 Relatórios Disponíveis

### **Filtros:**
- Status (pendente, emitida, enviada, cancelada)
- Período (data inicial e final)
- Escola específica

### **Exportação:**
- Download individual (PDF)
- Lista completa (tabela)
- Histórico de envios

---

## 🚀 Deploy

### **1. Backend:**
```bash
cd backend
npm install pdfkit @types/pdfkit nodemailer @types/nodemailer
git add .
git commit -m "feat: Sistema de emissão de nota fiscal/ISS"
git push origin master
```

### **2. Frontend:**
```bash
cd frontend
npm run build
npm run deploy:github
```

### **3. Verificar:**
- Backend: Render.com (auto-deploy)
- Frontend: GitHub Pages
- Diretório de PDFs: `backend/invoices/`

---

## 📞 Suporte

**Desenvolvedor:** Wander Pires Silva Coelho  
**Email:** wanderpsc@gmail.com  
**Sistema:** EduSync-PRO  
**Versão:** 1.0.0  

---

## 📝 Checklist Pós-Implementação

- [ ] Atualizar dados do prestador em `invoice.service.ts`
- [ ] Configurar código de serviço municipal
- [ ] Ajustar alíquota de ISS conforme cidade
- [ ] Configurar SMTP no `.env`
- [ ] Testar emissão de nota fiscal
- [ ] Verificar recebimento de email
- [ ] Validar cálculo de impostos
- [ ] Confirmar armazenamento de PDFs
- [ ] Testar download de nota fiscal
- [ ] Verificar cancelamento de notas

---

**© 2025-2026 Wander Pires Silva Coelho - Todos os direitos reservados**
