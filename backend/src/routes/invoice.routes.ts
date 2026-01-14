/**
 * Rotas de Nota Fiscal / ISS
 * © 2025-2026 Wander Pires Silva Coelho
 */

import { Router, Request, Response } from 'express';
import { auth, AuthRequest } from '../middleware/auth';
import { InvoiceService } from '../services/invoice.service';
import Invoice from '../models/Invoice';
import User from '../models/User';

const router = Router();

/**
 * @route POST /api/invoices/create
 * @desc Criar nota fiscal manualmente (Admin)
 */
router.post('/create', auth, async (req: AuthRequest, res: Response) => {
  try {
    const user = await User.findById(req.user?.id);
    
    if (!user || user.role !== 'super-admin') {
      return res.status(403).json({ 
        success: false, 
        message: 'Acesso negado. Apenas administradores podem emitir notas fiscais.' 
      });
    }
    
    const { schoolId, paymentData } = req.body;
    
    const school = await User.findById(schoolId);
    if (!school) {
      return res.status(404).json({ 
        success: false, 
        message: 'Escola não encontrada' 
      });
    }
    
    const invoice = await InvoiceService.createInvoiceFromPayment({
      schoolId: school._id.toString(),
      schoolData: {
        schoolName: school.schoolName,
        name: school.name,
        email: school.email,
        cnpj: school.cnpj,
        address: school.address,
        city: school.city,
        state: school.state,
        zipCode: school.zipCode,
        phone: school.phone
      },
      paymentId: paymentData.paymentId,
      paymentMethod: paymentData.method,
      paymentDate: new Date(paymentData.date),
      plan: paymentData.plan,
      amount: paymentData.amount
    });
    
    res.json({
      success: true,
      message: 'Nota fiscal criada com sucesso',
      invoice: {
        id: invoice._id,
        invoiceNumber: invoice.invoiceNumber,
        serie: invoice.serie,
        customer: invoice.customer.name,
        value: invoice.values.netValue,
        status: invoice.status
      }
    });
    
  } catch (error: any) {
    console.error('Erro ao criar nota fiscal:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Erro ao criar nota fiscal', 
      error: error.message 
    });
  }
});

/**
 * @route POST /api/invoices/:invoiceId/generate-pdf
 * @desc Gerar PDF da nota fiscal
 */
router.post('/:invoiceId/generate-pdf', auth, async (req: AuthRequest, res: Response) => {
  try {
    const user = await User.findById(req.user?.id);
    
    if (!user || user.role !== 'super-admin') {
      return res.status(403).json({ 
        success: false, 
        message: 'Acesso negado' 
      });
    }
    
    const pdfPath = await InvoiceService.generateInvoicePDF(req.params.invoiceId);
    
    res.json({
      success: true,
      message: 'PDF gerado com sucesso',
      pdfPath
    });
    
  } catch (error: any) {
    console.error('Erro ao gerar PDF:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Erro ao gerar PDF', 
      error: error.message 
    });
  }
});

/**
 * @route POST /api/invoices/:invoiceId/send-email
 * @desc Enviar nota fiscal por email
 */
router.post('/:invoiceId/send-email', auth, async (req: AuthRequest, res: Response) => {
  try {
    const user = await User.findById(req.user?.id);
    
    if (!user || user.role !== 'super-admin') {
      return res.status(403).json({ 
        success: false, 
        message: 'Acesso negado' 
      });
    }
    
    await InvoiceService.sendInvoiceByEmail(req.params.invoiceId);
    
    res.json({
      success: true,
      message: 'Nota fiscal enviada por email com sucesso'
    });
    
  } catch (error: any) {
    console.error('Erro ao enviar email:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Erro ao enviar email', 
      error: error.message 
    });
  }
});

/**
 * @route GET /api/invoices
 * @desc Listar todas as notas fiscais (Admin)
 */
router.get('/', auth, async (req: AuthRequest, res: Response) => {
  try {
    const user = await User.findById(req.user?.id);
    
    if (!user || user.role !== 'super-admin') {
      return res.status(403).json({ 
        success: false, 
        message: 'Acesso negado' 
      });
    }
    
    const { status, startDate, endDate, schoolId } = req.query;
    
    const filter: any = {};
    
    if (status) {
      filter.status = status;
    }
    
    if (startDate || endDate) {
      filter.issueDate = {};
      if (startDate) {
        filter.issueDate.$gte = new Date(startDate as string);
      }
      if (endDate) {
        filter.issueDate.$lte = new Date(endDate as string);
      }
    }
    
    if (schoolId) {
      filter['customer.schoolId'] = schoolId;
    }
    
    const invoices = await Invoice.find(filter)
      .sort({ issueDate: -1 })
      .limit(100);
    
    res.json({
      success: true,
      count: invoices.length,
      invoices
    });
    
  } catch (error: any) {
    console.error('Erro ao listar notas fiscais:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Erro ao listar notas fiscais', 
      error: error.message 
    });
  }
});

/**
 * @route GET /api/invoices/:invoiceId
 * @desc Buscar nota fiscal por ID
 */
router.get('/:invoiceId', auth, async (req: AuthRequest, res: Response) => {
  try {
    const user = await User.findById(req.user?.id);
    
    const invoice = await Invoice.findById(req.params.invoiceId);
    
    if (!invoice) {
      return res.status(404).json({ 
        success: false, 
        message: 'Nota fiscal não encontrada' 
      });
    }
    
    // Escola só pode ver suas próprias notas
    if (user?.role !== 'super-admin' && invoice.customer.schoolId.toString() !== req.user?.id) {
      return res.status(403).json({ 
        success: false, 
        message: 'Acesso negado' 
      });
    }
    
    res.json({
      success: true,
      invoice
    });
    
  } catch (error: any) {
    console.error('Erro ao buscar nota fiscal:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Erro ao buscar nota fiscal', 
      error: error.message 
    });
  }
});

/**
 * @route GET /api/invoices/:invoiceId/download
 * @desc Download do PDF da nota fiscal
 */
router.get('/:invoiceId/download', auth, async (req: AuthRequest, res: Response) => {
  try {
    const user = await User.findById(req.user?.id);
    
    const invoice = await Invoice.findById(req.params.invoiceId);
    
    if (!invoice) {
      return res.status(404).json({ 
        success: false, 
        message: 'Nota fiscal não encontrada' 
      });
    }
    
    // Escola só pode baixar suas próprias notas
    if (user?.role !== 'super-admin' && invoice.customer.schoolId.toString() !== req.user?.id) {
      return res.status(403).json({ 
        success: false, 
        message: 'Acesso negado' 
      });
    }
    
    if (!invoice.pdfPath) {
      // Gerar PDF se não existir
      await InvoiceService.generateInvoicePDF(req.params.invoiceId);
      const updatedInvoice = await Invoice.findById(req.params.invoiceId);
      if (!updatedInvoice?.pdfPath) {
        throw new Error('Erro ao gerar PDF');
      }
      res.download(updatedInvoice.pdfPath);
    } else {
      res.download(invoice.pdfPath);
    }
    
  } catch (error: any) {
    console.error('Erro ao fazer download:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Erro ao fazer download', 
      error: error.message 
    });
  }
});

/**
 * @route DELETE /api/invoices/:invoiceId/cancel
 * @desc Cancelar nota fiscal
 */
router.post('/:invoiceId/cancel', auth, async (req: AuthRequest, res: Response) => {
  try {
    const user = await User.findById(req.user?.id);
    
    if (!user || user.role !== 'super-admin') {
      return res.status(403).json({ 
        success: false, 
        message: 'Acesso negado' 
      });
    }
    
    const { reason } = req.body;
    
    const invoice = await Invoice.findById(req.params.invoiceId);
    
    if (!invoice) {
      return res.status(404).json({ 
        success: false, 
        message: 'Nota fiscal não encontrada' 
      });
    }
    
    if (invoice.status === 'cancelled') {
      return res.status(400).json({ 
        success: false, 
        message: 'Nota fiscal já está cancelada' 
      });
    }
    
    invoice.status = 'cancelled';
    invoice.cancelledAt = new Date();
    invoice.cancelReason = reason || 'Cancelamento solicitado pelo administrador';
    await invoice.save();
    
    res.json({
      success: true,
      message: 'Nota fiscal cancelada com sucesso',
      invoice
    });
    
  } catch (error: any) {
    console.error('Erro ao cancelar nota fiscal:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Erro ao cancelar nota fiscal', 
      error: error.message 
    });
  }
});

/**
 * @route GET /api/invoices/school/:schoolId
 * @desc Buscar notas fiscais de uma escola específica
 */
router.get('/school/:schoolId', auth, async (req: AuthRequest, res: Response) => {
  try {
    const user = await User.findById(req.user?.id);
    
    // Escola só pode ver suas próprias notas
    if (user?.role !== 'super-admin' && req.params.schoolId !== req.user?.id) {
      return res.status(403).json({ 
        success: false, 
        message: 'Acesso negado' 
      });
    }
    
    const invoices = await Invoice.find({ 
      'customer.schoolId': req.params.schoolId 
    }).sort({ issueDate: -1 });
    
    res.json({
      success: true,
      count: invoices.length,
      invoices
    });
    
  } catch (error: any) {
    console.error('Erro ao buscar notas fiscais:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Erro ao buscar notas fiscais', 
      error: error.message 
    });
  }
});

export default router;
