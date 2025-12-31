/**
 * Sistema Criador de Horário de Aula Escolar
 * © 2025 Wander Pires Silva Coelho - wanderpsc@gmail.com
 * Serviço de Backup Automático
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import fs from 'fs/promises';
import Backup from '../models/Backup';
import User from '../models/User';
import mongoose from 'mongoose';

const execAsync = promisify(exec);

export class AutoBackupService {
  private static backupDir = path.join(__dirname, '../../backups');
  private static mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/school-timetable';

  /**
   * Cria backup automático ao login do cliente
   */
  static async createLoginBackup(userId: string): Promise<void> {
    try {
      console.log(`[AutoBackup] Iniciando backup para usuário ${userId}`);

      // Buscar dados do usuário
      const user = await User.findById(userId);
      if (!user || user.role === 'admin') {
        console.log('[AutoBackup] Usuário admin ou não encontrado - backup não criado');
        return;
      }

      // Criar diretório de backups se não existir
      await this.ensureBackupDirectory();

      // Gerar nome único para o backup
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const schoolName = user.schoolName?.replace(/[^a-zA-Z0-9]/g, '_') || 'escola';
      const fileName = `backup_${schoolName}_${timestamp}`;
      const backupPath = path.join(this.backupDir, fileName);

      // Criar registro no banco
      const backup = new Backup({
        userId: user._id,
        schoolId: user._id, // Para usuários school, o schoolId é o próprio _id
        schoolName: user.schoolName || 'Escola',
        fileName,
        filePath: backupPath,
        type: 'automatic',
        status: 'pending',
        size: 0,
        sizeFormatted: '0 KB',
        metadata: {
          loginCount: await this.getLoginCount(userId),
        },
      });

      await backup.save();

      // Executar backup em background
      this.performBackup(backup._id.toString(), backupPath)
        .catch(error => {
          console.error('[AutoBackup] Erro ao executar backup:', error);
        });

    } catch (error) {
      console.error('[AutoBackup] Erro ao criar backup de login:', error);
    }
  }

  /**
   * Executa o backup usando mongodump
   */
  private static async performBackup(backupId: string, backupPath: string): Promise<void> {
    try {
      console.log(`[AutoBackup] Executando mongodump para ${backupPath}`);

      // Criar comando mongodump
      const command = `mongodump --uri="${this.mongoUri}" --out="${backupPath}" --quiet`;

      // Executar backup
      await execAsync(command);

      // Calcular tamanho do backup
      const size = await this.calculateDirectorySize(backupPath);
      const sizeFormatted = this.formatBytes(size);

      // Coletar metadados
      const collections = await this.getCollections(backupPath);

      // Atualizar registro
      await Backup.findByIdAndUpdate(backupId, {
        status: 'completed',
        size,
        sizeFormatted,
        'metadata.collections': collections,
        'metadata.documentsCount': await this.countDocuments(),
      });

      console.log(`[AutoBackup] Backup concluído: ${sizeFormatted}`);

      // Limpar backups antigos (manter últimos 5 por usuário)
      await this.cleanOldBackups(backupId);

    } catch (error: any) {
      console.error('[AutoBackup] Erro ao executar mongodump:', error);

      // Atualizar registro com erro
      await Backup.findByIdAndUpdate(backupId, {
        status: 'failed',
        error: error.message || 'Erro desconhecido ao criar backup',
      });
    }
  }

  /**
   * Restaura um backup específico
   */
  static async restoreBackup(backupId: string, adminUserId: string): Promise<void> {
    try {
      console.log(`[AutoBackup] Iniciando restauração do backup ${backupId}`);

      const backup = await Backup.findById(backupId);
      if (!backup) {
        throw new Error('Backup não encontrado');
      }

      if (backup.status !== 'completed') {
        throw new Error('Backup não está completo para restauração');
      }

      // Verificar se diretório existe
      const exists = await fs.access(backup.filePath).then(() => true).catch(() => false);
      if (!exists) {
        throw new Error('Arquivo de backup não encontrado no sistema');
      }

      // Criar comando mongorestore
      const command = `mongorestore --uri="${this.mongoUri}" --drop "${backup.filePath}" --quiet`;

      // Executar restauração
      await execAsync(command);

      // Atualizar registro
      await Backup.findByIdAndUpdate(backupId, {
        status: 'restored',
        restoredAt: new Date(),
        restoredBy: adminUserId,
      });

      console.log(`[AutoBackup] Restauração concluída com sucesso`);

    } catch (error: any) {
      console.error('[AutoBackup] Erro ao restaurar backup:', error);
      throw new Error(`Falha na restauração: ${error.message}`);
    }
  }

  /**
   * Lista backups com filtros
   */
  static async listBackups(filters: {
    userId?: string;
    status?: string;
    limit?: number;
  } = {}): Promise<any[]> {
    const query: any = {};

    if (filters.userId) {
      query.userId = filters.userId;
    }

    if (filters.status) {
      query.status = filters.status;
    }

    const backups = await Backup.find(query)
      .populate('userId', 'name email schoolName')
      .populate('restoredBy', 'name email')
      .sort({ createdAt: -1 })
      .limit(filters.limit || 50);

    return backups;
  }

  /**
   * Deleta backup físico e registro
   */
  static async deleteBackup(backupId: string): Promise<void> {
    try {
      const backup = await Backup.findById(backupId);
      if (!backup) {
        throw new Error('Backup não encontrado');
      }

      // Deletar arquivos físicos
      try {
        await fs.rm(backup.filePath, { recursive: true, force: true });
        console.log(`[AutoBackup] Arquivos deletados: ${backup.filePath}`);
      } catch (error) {
        console.warn('[AutoBackup] Arquivos já foram deletados ou não existem');
      }

      // Deletar registro
      await Backup.findByIdAndDelete(backupId);

      console.log(`[AutoBackup] Backup ${backupId} deletado com sucesso`);

    } catch (error: any) {
      console.error('[AutoBackup] Erro ao deletar backup:', error);
      throw new Error(`Falha ao deletar backup: ${error.message}`);
    }
  }

  // ========== MÉTODOS AUXILIARES ==========

  private static async ensureBackupDirectory(): Promise<void> {
    try {
      await fs.access(this.backupDir);
    } catch {
      await fs.mkdir(this.backupDir, { recursive: true });
      console.log(`[AutoBackup] Diretório de backups criado: ${this.backupDir}`);
    }
  }

  private static async calculateDirectorySize(dirPath: string): Promise<number> {
    let size = 0;
    try {
      const files = await fs.readdir(dirPath, { withFileTypes: true });
      for (const file of files) {
        const filePath = path.join(dirPath, file.name);
        if (file.isDirectory()) {
          size += await this.calculateDirectorySize(filePath);
        } else {
          const stats = await fs.stat(filePath);
          size += stats.size;
        }
      }
    } catch (error) {
      console.error('[AutoBackup] Erro ao calcular tamanho:', error);
    }
    return size;
  }

  private static formatBytes(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  }

  private static async getCollections(backupPath: string): Promise<string[]> {
    try {
      const dbDir = await fs.readdir(backupPath);
      const dbPath = path.join(backupPath, dbDir[0]); // Primeiro diretório (nome do banco)
      const files = await fs.readdir(dbPath);
      return files
        .filter(f => f.endsWith('.bson'))
        .map(f => f.replace('.bson', ''));
    } catch (error) {
      return [];
    }
  }

  private static async countDocuments(): Promise<number> {
    try {
      const db = mongoose.connection.db;
      if (!db) return 0;
      const collections = await db.listCollections().toArray();
      let total = 0;
      for (const col of collections) {
        const count = await db.collection(col.name).countDocuments();
        total += count;
      }
      return total;
    } catch (error) {
      return 0;
    }
  }

  private static async getLoginCount(userId: string): Promise<number> {
    // Poderia buscar de um log de acessos, por enquanto retorna estimativa
    return 0;
  }

  private static async cleanOldBackups(currentBackupId: string): Promise<void> {
    try {
      const backup = await Backup.findById(currentBackupId);
      if (!backup) return;

      // Buscar backups do mesmo usuário
      const userBackups = await Backup.find({
        userId: backup.userId,
        status: 'completed',
        type: 'automatic',
      })
        .sort({ createdAt: -1 })
        .skip(5); // Manter últimos 5

      // Deletar backups excedentes
      for (const oldBackup of userBackups) {
        await this.deleteBackup(oldBackup._id.toString());
      }

      if (userBackups.length > 0) {
        console.log(`[AutoBackup] ${userBackups.length} backups antigos removidos`);
      }

    } catch (error) {
      console.error('[AutoBackup] Erro ao limpar backups antigos:', error);
    }
  }

  /**
   * Estatísticas gerais de backups
   */
  static async getStatistics(): Promise<any> {
    try {
      const total = await Backup.countDocuments();
      const completed = await Backup.countDocuments({ status: 'completed' });
      const failed = await Backup.countDocuments({ status: 'failed' });
      const pending = await Backup.countDocuments({ status: 'pending' });
      
      const backups = await Backup.find({ status: 'completed' });
      const totalSize = backups.reduce((sum, b) => sum + b.size, 0);

      const recentBackups = await Backup.find()
        .sort({ createdAt: -1 })
        .limit(10)
        .populate('userId', 'name schoolName');

      return {
        total,
        completed,
        failed,
        pending,
        totalSize,
        totalSizeFormatted: this.formatBytes(totalSize),
        recentBackups,
      };
    } catch (error) {
      console.error('[AutoBackup] Erro ao obter estatísticas:', error);
      return null;
    }
  }
}
