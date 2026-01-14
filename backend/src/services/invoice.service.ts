/**
 * Serviço de Geração de Nota Fiscal / ISS
 * © 2025-2026 Wander Pires Silva Coelho
 */

import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';
import nodemailer from 'nodemailer';
import Invoice from '../models/Invoice';

export class InvoiceService {
  
  // Dados do Prestador (Wander Pires Silva Coelho)
  private static readonly PROVIDER_DATA = {
    name: 'Wander Pires Silva Coelho',
    cpfCnpj: '000.000.000-00', // ATUALIZAR COM SEU CPF/CNPJ
    address: 'Rua Exemplo, 123',
    city: 'São Paulo',
    state: 'SP',
    zipCode: '00000-000',
    email: 'wanderpsc@gmail.com',
    phone: '(00) 00000-0000',
    municipalRegistration: '000.000.000-0' // Se tiver
  };
  
  // Código do serviço conforme tabela municipal
  private static readonly SERVICE_CODE = '01.07'; // Desenvolvimento de software sob encomenda
  
  /**
   * Gera nota fiscal em PDF
   */
  static async generateInvoicePDF(invoiceId: string): Promise<string> {
    const invoice = await Invoice.findById(invoiceId);
    if (!invoice) {
      throw new Error('Nota fiscal não encontrada');
    }
    
    // Criar diretório se não existir
    const invoicesDir = path.join(__dirname, '../../invoices');
    if (!fs.existsSync(invoicesDir)) {
      fs.mkdirSync(invoicesDir, { recursive: true });
    }
    
    const filename = `NF-${invoice.invoiceNumber}-${invoice.serie}.pdf`;
    const filepath = path.join(invoicesDir, filename);
    
    // Criar PDF
    const doc = new PDFDocument({ size: 'A4', margin: 50 });
    const stream = fs.createWriteStream(filepath);
    doc.pipe(stream);
    
    // Header
    doc.fontSize(20)
      .fillColor('#1e40af')
      .text('NOTA FISCAL DE SERVIÇOS ELETRÔNICA', { align: 'center' })
      .fontSize(10)
      .fillColor('#000')
      .text(`Nº ${invoice.invoiceNumber} - Série ${invoice.serie}`, { align: 'center' })
      .moveDown();
    
    // Linha divisória
    doc.moveTo(50, doc.y)
      .lineTo(550, doc.y)
      .stroke();
    doc.moveDown();
    
    // Dados do Prestador
    doc.fontSize(12)
      .fillColor('#1e40af')
      .text('PRESTADOR DE SERVIÇOS', 50, doc.y);
    doc.fontSize(10)
      .fillColor('#000')
      .text(`${invoice.provider.name}`)
      .text(`CPF/CNPJ: ${invoice.provider.cpfCnpj}`)
      .text(`${invoice.provider.address}`)
      .text(`${invoice.provider.city} - ${invoice.provider.state} - CEP: ${invoice.provider.zipCode}`)
      .text(`Email: ${invoice.provider.email}`)
      .text(`Telefone: ${invoice.provider.phone}`);
    if (invoice.provider.municipalRegistration) {
      doc.text(`Inscrição Municipal: ${invoice.provider.municipalRegistration}`);
    }
    doc.moveDown();
    
    // Dados do Tomador
    doc.fontSize(12)
      .fillColor('#1e40af')
      .text('TOMADOR DE SERVIÇOS', 50, doc.y);
    doc.fontSize(10)
      .fillColor('#000')
      .text(`${invoice.customer.name}`)
      .text(`CPF/CNPJ: ${invoice.customer.cpfCnpj}`)
      .text(`${invoice.customer.address}`)
      .text(`${invoice.customer.city} - ${invoice.customer.state} - CEP: ${invoice.customer.zipCode}`)
      .text(`Email: ${invoice.customer.email}`)
      .text(`Telefone: ${invoice.customer.phone}`)
      .moveDown();
    
    // Discriminação do Serviço
    doc.fontSize(12)
      .fillColor('#1e40af')
      .text('DISCRIMINAÇÃO DOS SERVIÇOS', 50, doc.y);
    doc.fontSize(10)
      .fillColor('#000')
      .text(`Código do Serviço: ${invoice.service.code}`)
      .text(`Descrição: ${invoice.service.description}`)
      .text(`Quantidade: ${invoice.service.quantity}`)
      .text(`Valor Unitário: R$ ${invoice.service.unitPrice.toFixed(2)}`);
    
    doc.font('Helvetica-Bold')
      .text(`Valor Total: R$ ${invoice.service.totalPrice.toFixed(2)}`)
      .font('Helvetica')
      .moveDown();
    
    // Valores e Impostos
    doc.fontSize(12)
      .fillColor('#1e40af')
      .text('VALORES E TRIBUTOS', 50, doc.y);
    
    const valuesY = doc.y;
    doc.fontSize(10)
      .fillColor('#000')
      .text(`Valor dos Serviços:`, 50, valuesY)
      .text(`R$ ${invoice.values.serviceValue.toFixed(2)}`, 450, valuesY, { align: 'right' });
    
    doc.text(`(-) Deduções:`, 50, doc.y)
      .text(`R$ ${invoice.values.deductions.toFixed(2)}`, 450, doc.y, { align: 'right' });
    
    doc.text(`Base de Cálculo ISS:`, 50, doc.y)
      .text(`R$ ${(invoice.values.serviceValue - invoice.values.deductions).toFixed(2)}`, 450, doc.y, { align: 'right' });
    
    doc.text(`Alíquota ISS (${invoice.values.issRate}%):`, 50, doc.y)
      .text(`R$ ${invoice.values.issValue.toFixed(2)}`, 450, doc.y, { align: 'right' });
    
    doc.fontSize(11)
      .font('Helvetica-Bold')
      .text(`Valor Líquido:`, 50, doc.y + 10)
      .text(`R$ ${invoice.values.netValue.toFixed(2)}`, 450, doc.y, { align: 'right' })
      .font('Helvetica');
    
    doc.moveDown(2);
    
    // Informações de Pagamento
    doc.fontSize(12)
      .fillColor('#1e40af')
      .text('INFORMAÇÕES DE PAGAMENTO', 50, doc.y);
    doc.fontSize(10)
      .fillColor('#000')
      .text(`Plano Contratado: ${invoice.payment.plan}`)
      .text(`Forma de Pagamento: ${invoice.payment.method}`)
      .text(`Data do Pagamento: ${new Date(invoice.payment.date).toLocaleDateString('pt-BR')}`)
      .text(`ID Transação: ${invoice.payment.paymentId}`)
      .moveDown();
    
    // Observações
    if (invoice.observations) {
      doc.fontSize(12)
        .fillColor('#1e40af')
        .text('OBSERVAÇÕES', 50, doc.y);
      doc.fontSize(9)
        .fillColor('#000')
        .text(invoice.observations)
        .moveDown();
    }
    
    // Informações Legais
    doc.fontSize(8)
      .fillColor('#666')
      .text('ISS - Imposto Sobre Serviços de Qualquer Natureza', 50, doc.y, { align: 'center' })
      .text('Este documento serve como comprovante de prestação de serviços e pagamento de ISS', { align: 'center' })
      .moveDown();
    
    // Footer
    doc.moveTo(50, doc.y)
      .lineTo(550, doc.y)
      .stroke();
    
    doc.fontSize(8)
      .fillColor('#000')
      .text(`Emitida em: ${new Date(invoice.issueDate).toLocaleDateString('pt-BR')} às ${new Date(invoice.issueDate).toLocaleTimeString('pt-BR')}`, { align: 'center' })
      .text('© 2025-2026 Wander Pires Silva Coelho - Todos os direitos reservados', { align: 'center' })
      .text('EduSync-PRO - Sistema Criador de Horário de Aula Escolar', { align: 'center' });
    
    doc.end();
    
    return new Promise((resolve, reject) => {
      stream.on('finish', () => {
        invoice.pdfPath = filepath;
        invoice.save();
        resolve(filepath);
      });
      stream.on('error', reject);
    });
  }
  
  /**
   * Envia nota fiscal por email
   */
  static async sendInvoiceByEmail(invoiceId: string): Promise<void> {
    const invoice = await Invoice.findById(invoiceId);
    if (!invoice) {
      throw new Error('Nota fiscal não encontrada');
    }
    
    if (!invoice.pdfPath) {
      await this.generateInvoicePDF(invoiceId);
    }
    
    // Configurar transporter (usar suas credenciais SMTP)
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: false,
      auth: {
        user: process.env.SMTP_USER || 'wanderpsc@gmail.com',
        pass: process.env.SMTP_PASS || ''
      }
    });
    
    const mailOptions = {
      from: `"EduSync-PRO" <${this.PROVIDER_DATA.email}>`,
      to: invoice.customer.email,
      subject: `Nota Fiscal ${invoice.invoiceNumber} - EduSync-PRO`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #1e40af 0%, #3b82f6 100%); padding: 30px; text-align: center;">
            <h1 style="color: white; margin: 0;">Nota Fiscal de Serviços</h1>
          </div>
          
          <div style="padding: 30px; background: #f9fafb;">
            <p>Prezado(a) <strong>${invoice.customer.name}</strong>,</p>
            
            <p>Segue em anexo a <strong>Nota Fiscal de Serviços nº ${invoice.invoiceNumber}</strong> referente à contratação do plano <strong>${invoice.payment.plan}</strong> do sistema EduSync-PRO.</p>
            
            <div style="background: white; border-left: 4px solid #1e40af; padding: 15px; margin: 20px 0;">
              <h3 style="margin-top: 0; color: #1e40af;">Dados da Nota Fiscal:</h3>
              <p style="margin: 5px 0;"><strong>Número:</strong> ${invoice.invoiceNumber} - Série ${invoice.serie}</p>
              <p style="margin: 5px 0;"><strong>Data de Emissão:</strong> ${new Date(invoice.issueDate).toLocaleDateString('pt-BR')}</p>
              <p style="margin: 5px 0;"><strong>Valor dos Serviços:</strong> R$ ${invoice.values.serviceValue.toFixed(2)}</p>
              <p style="margin: 5px 0;"><strong>ISS (${invoice.values.issRate}%):</strong> R$ ${invoice.values.issValue.toFixed(2)}</p>
              <p style="margin: 5px 0;"><strong>Valor Líquido:</strong> R$ ${invoice.values.netValue.toFixed(2)}</p>
            </div>
            
            <p>Esta nota fiscal serve como comprovante oficial da prestação de serviços e do recolhimento do ISS.</p>
            
            <p>Em caso de dúvidas, entre em contato:</p>
            <ul>
              <li><strong>Email:</strong> ${this.PROVIDER_DATA.email}</li>
              <li><strong>Telefone:</strong> ${this.PROVIDER_DATA.phone}</li>
            </ul>
            
            <p style="margin-top: 30px;">Atenciosamente,<br/><strong>Wander Pires Silva Coelho</strong><br/>EduSync-PRO</p>
          </div>
          
          <div style="background: #1f2937; color: #9ca3af; padding: 20px; text-align: center; font-size: 12px;">
            <p style="margin: 5px 0;">© 2025-2026 Wander Pires Silva Coelho - Todos os direitos reservados</p>
            <p style="margin: 5px 0;">EduSync-PRO® - Sistema Criador de Horário de Aula Escolar</p>
          </div>
        </div>
      `,
      attachments: [
        {
          filename: `NF-${invoice.invoiceNumber}.pdf`,
          path: invoice.pdfPath!
        }
      ]
    };
    
    await transporter.sendMail(mailOptions);
    
    invoice.status = 'sent';
    invoice.sentAt = new Date();
    await invoice.save();
  }
  
  /**
   * Cria nota fiscal após confirmação de pagamento
   */
  static async createInvoiceFromPayment(data: {
    schoolId: string;
    schoolData: any;
    paymentId: string;
    paymentMethod: string;
    paymentDate: Date;
    plan: string;
    amount: number;
  }): Promise<any> {
    
    const serviceDescription = `Licença de uso do software EduSync-PRO - Plano ${data.plan} - Sistema de criação automatizada de horários escolares`;
    
    // Calcular valores
    const serviceValue = data.amount;
    const issRate = 2.0; // 2% - Ajustar conforme sua cidade
    const issValue = (serviceValue * issRate) / 100;
    const netValue = serviceValue - issValue;
    
    const invoice = new Invoice({
      serie: '001',
      issueDate: new Date(),
      
      provider: this.PROVIDER_DATA,
      
      customer: {
        schoolId: data.schoolId,
        name: data.schoolData.schoolName || data.schoolData.name,
        cpfCnpj: data.schoolData.cnpj || '000.000.000-00',
        address: data.schoolData.address || 'Não informado',
        city: data.schoolData.city || 'Não informado',
        state: data.schoolData.state || 'SP',
        zipCode: data.schoolData.zipCode || '00000-000',
        email: data.schoolData.email,
        phone: data.schoolData.phone || 'Não informado'
      },
      
      service: {
        description: serviceDescription,
        code: this.SERVICE_CODE,
        quantity: 1,
        unitPrice: serviceValue,
        totalPrice: serviceValue
      },
      
      values: {
        serviceValue,
        issRate,
        issValue,
        deductions: 0,
        netValue,
        taxWithholding: false
      },
      
      taxes: {
        iss: issValue,
        cofins: 0,
        pis: 0,
        csll: 0,
        ir: 0
      },
      
      payment: {
        paymentId: data.paymentId,
        method: data.paymentMethod,
        date: data.paymentDate,
        plan: data.plan
      },
      
      observations: 'Nota fiscal emitida automaticamente após confirmação de pagamento.',
      
      status: 'issued',
      issuedBy: data.schoolId,
      issuedAt: new Date()
    });
    
    await invoice.save();
    return invoice;
  }
}
