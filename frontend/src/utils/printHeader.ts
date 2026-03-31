import api from '../services/api';

export interface PrintHeaderData {
  emblemBase64?: string;
  line1?: string;
  line2?: string;
  line3?: string;
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
  const hasEmblem = !!header.emblemBase64;
  const line1 = header.line1 || header.schoolName || '';
  const line2 = header.line2 || '';
  const line3 = header.line3 || '';

  if (!line1 && !line2 && !line3 && !hasEmblem) return '';

  return `
    <div class="print-header-institutional">
      ${hasEmblem ? `<img src="${header.emblemBase64}" alt="Emblema" class="print-header-emblem" />` : ''}
      <div class="print-header-text-block">
        ${line1 ? `<div class="print-header-line1">${line1}</div>` : ''}
        ${line2 ? `<div class="print-header-line2">${line2}</div>` : ''}
        ${line3 ? `<div class="print-header-line3">${line3}</div>` : ''}
      </div>
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
    max-height: 80px;
    max-width: 80px;
    object-fit: contain;
    border-radius: 4px;
  }
  .print-header-text-block {
    text-align: center;
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
