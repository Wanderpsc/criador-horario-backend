/**
 * Sistema Criador de Horário de Aula Escolar
 * © 2025 Wander Pires Silva Coelho - wanderpsc@gmail.com
 * Serviço de Backup Automático
 */

import path from 'path';
import fs from 'fs/promises';
import Backup from '../models/Backup';
import User from '../models/User';
import mongoose from 'mongoose';

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
   * Executa o backup usando MongoDB driver (JSON export)
   * Compatível com ambientes cloud sem mongodump instalado
   */
  private static async performBackup(backupId: string, backupPath: string): Promise<void> {
    try {
      console.log(`[AutoBackup] Executando backup JSON para ${backupPath}`);

      // Criar diretório do backup
      await fs.mkdir(backupPath, { recursive: true });

      const db = mongoose.connection.db;
      if (!db) {
        throw new Error('Conexão com MongoDB não disponível');
      }

      // Buscar usuário dono do backup
      const backup = await Backup.findById(backupId);
      if (!backup) {
        throw new Error('Backup não encontrado');
      }

      const userId = backup.userId.toString();

      // Lista de coleções a serem backupeadas
      const collectionsToBackup = [
        'users', 'classes', 'grades', 'subjects', 'teachers', 
        'schedules', 'timetables', 'generatedtimetables', 
        'makeupsaturdays', 'teachersubjects', 'schooldays',
        'saturdaymakeups', 'emergencyschedules', 'teacherdebtrecords'
      ];

      let totalDocs = 0;
      const collections: string[] = [];

      // Exportar cada coleção para JSON
      for (const collectionName of collectionsToBackup) {
        try {
          const collection = db.collection(collectionName);
          const exists = await db.listCollections({ name: collectionName }).hasNext();
          
          if (!exists) continue;

          // Filtrar dados apenas do usuário (exceto users)
          const query = collectionName === 'users' 
            ? { _id: new mongoose.Types.ObjectId(userId) }
            : { userId: userId };

          const documents = await collection.find(query).toArray();
          
          if (documents.length > 0) {
            const filePath = path.join(backupPath, `${collectionName}.json`);
            await fs.writeFile(filePath, JSON.stringify(documents, null, 2), 'utf-8');
            
            totalDocs += documents.length;
            collections.push(collectionName);
            console.log(`[AutoBackup] ✅ ${collectionName}: ${documents.length} documento(s)`);
          }
        } catch (colError) {
          console.warn(`[AutoBackup] Erro ao exportar ${collectionName}:`, colError);
        }
      }

      // Calcular tamanho do backup
      const size = await this.calculateDirectorySize(backupPath);
      const sizeFormatted = this.formatBytes(size);

      // Atualizar registro
      await Backup.findByIdAndUpdate(backupId, {
        status: 'completed',
        size,
        sizeFormatted,
        'metadata.collections': collections,
        'metadata.documentsCount': totalDocs,
      });

      console.log(`[AutoBackup] ✅ Backup concluído: ${sizeFormatted} (${totalDocs} documentos)`);

      // Limpar backups antigos (manter últimos 5 por usuário)
      await this.cleanOldBackups(backupId);

    } catch (error: any) {
      console.error('[AutoBackup] ❌ Erro ao executar backup:', error);

      // Atualizar registro com erro
      await Backup.findByIdAndUpdate(backupId, {
        status: 'failed',
        error: error.message || 'Erro desconhecido ao criar backup',
      });
    }
  }

  /**
   * Restaura um backup específico (JSON format)
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

      const db = mongoose.connection.db;
      if (!db) {
        throw new Error('Conexão com MongoDB não disponível');
      }

      // Ler arquivos JSON do backup
      const files = await fs.readdir(backup.filePath);
      const jsonFiles = files.filter(f => f.endsWith('.json'));

      console.log(`[AutoBackup] Restaurando ${jsonFiles.length} coleções...`);

      for (const file of jsonFiles) {
        try {
          const collectionName = file.replace('.json', '');
          const filePath = path.join(backup.filePath, file);
          const content = await fs.readFile(filePath, 'utf-8');
          const documents = JSON.parse(content);

          if (documents.length === 0) continue;

          // Limpar coleção atual do usuário
          const collection = db.collection(collectionName);
          
          if (collectionName === 'users') {
            // Para users, deletar apenas o documento do usuário
            await collection.deleteOne({ _id: new mongoose.Types.ObjectId(backup.userId.toString()) });
          } else {
            // Para outras coleções, deletar todos os documentos do usuário
            await collection.deleteMany({ userId: backup.userId.toString() });
          }

          // Inserir documentos do backup
          await collection.insertMany(documents);
          console.log(`[AutoBackup] ✅ ${collectionName}: ${documents.length} documento(s) restaurado(s)`);

        } catch (colError) {
          console.warn(`[AutoBackup] Erro ao restaurar ${file}:`, colError);
        }
      }

      // Atualizar registro
      await Backup.findByIdAndUpdate(backupId, {
        status: 'restored',
        restoredAt: new Date(),
        restoredBy: adminUserId,
      });

      console.log(`[AutoBackup] ✅ Restauração concluída com sucesso`);

    } catch (error: any) {
      console.error('[AutoBackup] ❌ Erro ao restaurar backup:', error);
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
      console.log(`[AutoBackup] Iniciando deleção do backup: ${backupId}`);
      
      const backup = await Backup.findById(backupId);
      console.log(`[AutoBackup] Backup encontrado:`, backup ? 'Sim' : 'Não');
      
      if (!backup) {
        throw new Error('Backup não encontrado');
      }

      console.log(`[AutoBackup] Caminho do arquivo: ${backup.filePath}`);

      // Deletar arquivos físicos
      try {
        await fs.rm(backup.filePath, { recursive: true, force: true });
        console.log(`[AutoBackup] Arquivos deletados: ${backup.filePath}`);
      } catch (error: any) {
        console.warn(`[AutoBackup] Aviso ao deletar arquivos: ${error.message}`);
        console.warn('[AutoBackup] Continuando com a deleção do registro...');
      }

      // Deletar registro
      console.log('[AutoBackup] Deletando registro do banco...');
      await Backup.findByIdAndDelete(backupId);
      console.log('[AutoBackup] Registro deletado do banco');

      console.log(`[AutoBackup] Backup ${backupId} deletado com sucesso`);

    } catch (error: any) {
      console.error('[AutoBackup] Erro ao deletar backup:', error);
      console.error('[AutoBackup] Stack trace:', error.stack);
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
