import api from '../services/api';

export interface PrintHeaderData {
  emblemBase64?: string;
  emblemBase64Right?: string;
  line1?: string;
  line2?: string;
  line3?: string;
  line4?: string;
  line5?: string;
  line6?: string;
  line7?: string;
  schoolName?: string;
}

let cachedHeader: PrintHeaderData | null = null;

export async function loadPrintHeader(): Promise<PrintHeaderData> {
  if (cachedHeader) return cachedHeader;
  try {
    const response = await api.get('/schools/print-header');
    if (response.data.success) {
      cachedHeader = {
        ...response.data.data.printHeader,
        schoolName: response.data.data.schoolName,
      };
      return cachedHeader!;
    }
  } catch (e) {
    console.error('Erro ao carregar cabeçalho de impressão:', e);
  }
  return {};
}

export function invalidatePrintHeaderCache() {
  cachedHeader = null;
}

export function buildPrintHeaderHtml(header: PrintHeaderData): string {
  const hasEmblemLeft = !!header.emblemBase64;
  const hasEmblemRight = !!header.emblemBase64Right;
  const line1 = header.line1 || header.schoolName || '';
  const line2 = header.line2 || '';
  const line3 = header.line3 || '';
  const line4 = header.line4 || '';
  const line5 = header.line5 || '';
  const line6 = header.line6 || '';
  const line7 = header.line7 || '';

  if (!line1 && !line2 && !line3 && !line4 && !line5 && !line6 && !line7 && !hasEmblemLeft && !hasEmblemRight) return '';

  return `
    <div class="print-header-institutional">
      ${hasEmblemLeft ? `<img src="${header.emblemBase64}" alt="Emblema Esquerdo" class="print-header-emblem print-header-emblem-left" />` : ''}
      <div class="print-header-text-block">
        ${line1 ? `<div class="print-header-line1">${line1}</div>` : ''}
        ${line2 ? `<div class="print-header-line2">${line2}</div>` : ''}
        ${line3 ? `<div class="print-header-line3">${line3}</div>` : ''}
        ${line4 ? `<div class="print-header-line3">${line4}</div>` : ''}
        ${line5 ? `<div class="print-header-line3">${line5}</div>` : ''}
        ${line6 ? `<div class="print-header-line3">${line6}</div>` : ''}
        ${line7 ? `<div class="print-header-line3">${line7}</div>` : ''}
      </div>
      ${hasEmblemRight ? `<img src="${header.emblemBase64Right}" alt="Emblema Direito" class="print-header-emblem print-header-emblem-right" />` : ''}
    </div>
  `;
}

export const printHeaderCss = `
  .print-header-institutional {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 16px;
    padding: 16px 20px;
    margin-bottom: 18px;
    border-bottom: 3px solid #1e3a5f;
    background: linear-gradient(135deg, #f8fafc 0%, #e8f0fe 100%);
  }
  .print-header-emblem {
    height: 80px;
    width: 80px;
    object-fit: contain;
    border-radius: 4px;
    flex-shrink: 0;
  }
  .print-header-emblem-right {
    height: 100px;
    width: 100px;
  }
  .print-header-text-block {
    text-align: center;
    flex: 1;
  }
  .print-header-line1 {
    font-size: 16pt;
    font-weight: bold;
    color: #1e3a5f;
    margin-bottom: 2px;
    text-transform: uppercase;
    letter-spacing: 1px;
  }
  .print-header-line2 {
    font-size: 10pt;
    color: #374151;
    margin-bottom: 1px;
  }
  .print-header-line3 {
    font-size: 9pt;
    color: #6b7280;
  }
`;

export const printFooterCss = `
  .print-dev-footer {
    margin-top: 30px;
    padding-top: 10px;
    border-top: 1px solid #d1d5db;
    text-align: center;
    font-size: 8pt;
    color: #9ca3af;
    font-family: Arial, sans-serif;
  }
  .print-dev-footer strong {
    color: #6b7280;
  }
`;

export function buildPrintFooterHtml(): string {
  return `
    <div class="print-dev-footer">
      <strong>Sistema Criador de Horário de Aula</strong> — Desenvolvido por Wander Pires Silva Coelho
      &bull; wanderpsc@gmail.com &bull; &copy; ${new Date().getFullYear()}
    </div>
  `;
}
