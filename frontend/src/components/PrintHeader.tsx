import { useEffect, useState } from 'react';
import { loadPrintHeader, buildPrintHeaderHtml, printHeaderCss, type PrintHeaderData } from '../utils/printHeader';

export default function PrintHeader() {
  const [headerData, setHeaderData] = useState<PrintHeaderData | null>(null);

  useEffect(() => {
    loadPrintHeader().then(setHeaderData);
  }, []);

  if (!headerData) return null;

  const headerHtml = buildPrintHeaderHtml(headerData);
  if (!headerHtml) return null;

  return (
    <>
      <style>{`
        .global-print-header { display: none; }
        @media print {
          .global-print-header {
            display: block !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          ${printHeaderCss}
        }
      `}</style>
      <div className="global-print-header" dangerouslySetInnerHTML={{ __html: headerHtml }} />
    </>
  );
}
