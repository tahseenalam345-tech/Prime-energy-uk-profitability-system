import PizZip from 'pizzip';
import fs from 'fs';
import { DOMParser, XMLSerializer } from '@xmldom/xmldom';

export function escapeXml(unsafe: string): string {
  if (unsafe === undefined || unsafe === null) return '';
  return String(unsafe)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

export function formatCurrency(val: any): string {
  if (val === undefined || val === null) return '£0.00';
  const num = Number(val);
  if (isNaN(num)) return '£0.00';
  if (num < 0) return `-£${Math.abs(num).toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  return `£${num.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function setCellText(doc: Document, cell: Element, text: any, options: { align?: string; bold?: boolean; fontSizePt?: number } = {}) {
  const { align, bold, fontSizePt } = options;
  let p = cell.getElementsByTagName('w:p')[0];
  if (!p) {
    p = doc.createElement('w:p');
    cell.appendChild(p);
  }
  let pPr = p.getElementsByTagName('w:pPr')[0];
  if (!pPr) {
    pPr = doc.createElement('w:pPr');
    p.insertBefore(pPr, p.firstChild);
  }
  if (align) {
    let jc = pPr.getElementsByTagName('w:jc')[0];
    if (!jc) {
      jc = doc.createElement('w:jc');
      pPr.appendChild(jc);
    }
    jc.setAttribute('w:val', align);
  }

  const childNodes = Array.from(p.childNodes);
  for (const child of childNodes) {
    if (child.nodeName !== 'w:pPr') {
      p.removeChild(child);
    }
  }

  const textStr = (text === undefined || text === null) ? '' : String(text);
  if (textStr !== '') {
    const run = doc.createElement('w:r');
    const rPr = doc.createElement('w:rPr');

    const rFonts = doc.createElement('w:rFonts');
    rFonts.setAttribute('w:ascii', 'Arial');
    rFonts.setAttribute('w:hAnsi', 'Arial');
    rPr.appendChild(rFonts);

    if (fontSizePt) {
      const szVal = String(Math.round(fontSizePt * 2));
      const sz = doc.createElement('w:sz');
      sz.setAttribute('w:val', szVal);
      rPr.appendChild(sz);
      const szCs = doc.createElement('w:szCs');
      szCs.setAttribute('w:val', szVal);
      rPr.appendChild(szCs);
    }

    if (bold) {
      const b = doc.createElement('w:b');
      rPr.appendChild(b);
      const bCs = doc.createElement('w:bCs');
      rPr.appendChild(bCs);
    }

    run.appendChild(rPr);
    const t = doc.createElement('w:t');
    t.textContent = textStr;
    run.appendChild(t);
    p.appendChild(run);
  }
}

export function fillDocxTemplatePureJs(templatePath: string, outputPath: string, data: any): void {
  const content = fs.readFileSync(templatePath);
  const zip = new PizZip(content);

  const xmlStr = zip.files['word/document.xml'].asText();
  const parser = new DOMParser();
  const doc = parser.parseFromString(xmlStr, 'text/xml');
  const tables = doc.getElementsByTagName('w:tbl');

  // --- Table 0: Customer & Job Info ---
  if (tables.length > 0) {
    const t0 = tables[0];
    const t0Rows = t0.getElementsByTagName('w:tr');

    const customerName = data.customerName || '';
    const quoteRef = data.quoteReference || '';
    const siteAddress = data.siteAddress || '';
    const issuedBy = data.issuedBy || 'Prime Energy UK';
    const dateIssued = data.dateIssued || '';
    const validUntil = data.validUntil || '';

    // Row 0
    if (t0Rows.length > 0) {
      const r0Cells = t0Rows[0].getElementsByTagName('w:tc');
      if (r0Cells.length > 0) setCellText(doc, r0Cells[0], customerName, { bold: true, fontSizePt: 12 });
      if (r0Cells.length > 1) setCellText(doc, r0Cells[1], quoteRef, { align: 'right', bold: true, fontSizePt: 12 });
    }

    // Row 1
    if (t0Rows.length > 1) {
      const r1Cells = t0Rows[1].getElementsByTagName('w:tc');
      if (r1Cells.length > 0) setCellText(doc, r1Cells[0], siteAddress, { fontSizePt: 9.5 });
    }

    // Row 2
    if (t0Rows.length > 2) {
      const r2Cells = t0Rows[2].getElementsByTagName('w:tc');
      if (r2Cells.length > 0) setCellText(doc, r2Cells[0], `Quotation issued by: ${issuedBy}`, { fontSizePt: 9.5 });
      if (r2Cells.length > 1) setCellText(doc, r2Cells[1], `Date issued: ${dateIssued}`, { fontSizePt: 9.5 });
      if (r2Cells.length > 2) setCellText(doc, r2Cells[2], `Valid until: ${validUntil}`, { fontSizePt: 9.5 });
    }
  }

  // --- Table 1: Goods, Services, Commercial Totals ---
  if (tables.length > 1) {
    const t1 = tables[1];
    const t1Rows = t1.getElementsByTagName('w:tr');

    // Goods Items (Rows 1..4)
    const goodsItems = data.goodsItems || [];
    for (let i = 0; i < 4; i++) {
      const rIdx = 1 + i;
      if (rIdx < t1Rows.length) {
        const cells = t1Rows[rIdx].getElementsByTagName('w:tc');
        if (cells.length >= 4) {
          if (i < goodsItems.length) {
            const item = goodsItems[i];
            setCellText(doc, cells[0], item.description || '', { fontSizePt: 9.5 });
            setCellText(doc, cells[1], item.quantity ?? 1, { align: 'center', fontSizePt: 9.5 });
            setCellText(doc, cells[2], formatCurrency(item.unitPriceExVat), { align: 'right', fontSizePt: 9.5 });
            setCellText(doc, cells[3], formatCurrency(item.totalPriceExVat), { align: 'right', fontSizePt: 9.5 });
          } else {
            setCellText(doc, cells[0], '', { fontSizePt: 9.5 });
            setCellText(doc, cells[1], '', { fontSizePt: 9.5 });
            setCellText(doc, cells[2], '', { fontSizePt: 9.5 });
            setCellText(doc, cells[3], '', { fontSizePt: 9.5 });
          }
        }
      }
    }

    // Goods Total (Row 5)
    if (t1Rows.length > 5) {
      const r5Cells = t1Rows[5].getElementsByTagName('w:tc');
      if (r5Cells.length >= 4) {
        setCellText(doc, r5Cells[3], formatCurrency(data.goodsTotal), { align: 'right', bold: true, fontSizePt: 9.5 });
      }
    }

    // Services Items (Rows 7..10)
    const servicesItems = data.servicesItems || [];
    for (let i = 0; i < 4; i++) {
      const rIdx = 7 + i;
      if (rIdx < t1Rows.length) {
        const cells = t1Rows[rIdx].getElementsByTagName('w:tc');
        if (cells.length >= 4) {
          if (i < servicesItems.length) {
            const item = servicesItems[i];
            setCellText(doc, cells[0], item.description || '', { fontSizePt: 9.5 });
            setCellText(doc, cells[1], item.quantity ?? 1, { align: 'center', fontSizePt: 9.5 });
            setCellText(doc, cells[2], formatCurrency(item.unitPriceExVat), { align: 'right', fontSizePt: 9.5 });
            setCellText(doc, cells[3], formatCurrency(item.totalPriceExVat), { align: 'right', fontSizePt: 9.5 });
          } else {
            setCellText(doc, cells[0], '', { fontSizePt: 9.5 });
            setCellText(doc, cells[1], '', { fontSizePt: 9.5 });
            setCellText(doc, cells[2], '', { fontSizePt: 9.5 });
            setCellText(doc, cells[3], '', { fontSizePt: 9.5 });
          }
        }
      }
    }

    // Services Total (Row 11)
    if (t1Rows.length > 11) {
      const r11Cells = t1Rows[11].getElementsByTagName('w:tc');
      if (r11Cells.length >= 4) {
        setCellText(doc, r11Cells[3], formatCurrency(data.servicesTotal), { align: 'right', bold: true, fontSizePt: 9.5 });
      }
    }

    // Commercial Totals
    // Row 12: Total Contract Value (Excl. VAT)
    if (t1Rows.length > 12) {
      const r12Cells = t1Rows[12].getElementsByTagName('w:tc');
      if (r12Cells.length >= 4) {
        setCellText(doc, r12Cells[3], formatCurrency(data.totalContractValueExVat), { align: 'right', bold: true, fontSizePt: 9.5 });
      }
    }

    // Row 13: VAT
    if (t1Rows.length > 13) {
      const r13Cells = t1Rows[13].getElementsByTagName('w:tc');
      if (r13Cells.length >= 4) {
        setCellText(doc, r13Cells[3], formatCurrency(data.vat), { align: 'right', fontSizePt: 9.5 });
      }
    }

    // Row 14: BUS Deduction
    if (t1Rows.length > 14) {
      const r14Cells = t1Rows[14].getElementsByTagName('w:tc');
      if (r14Cells.length >= 4) {
        const busDeduction = Number(data.busDeduction || 0);
        const busStr = busDeduction > 0 ? `-£${busDeduction.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '£0.00';
        setCellText(doc, r14Cells[3], busStr, { align: 'right', bold: true, fontSizePt: 9.5 });
      }
    }

    // Row 15: Customer Contribution
    if (t1Rows.length > 15) {
      const r15Cells = t1Rows[15].getElementsByTagName('w:tc');
      if (r15Cells.length >= 4) {
        setCellText(doc, r15Cells[3], formatCurrency(data.customerContributionIncVat), { align: 'right', bold: true, fontSizePt: 9.5 });
      }
    }
  }

  // --- Table 2: Warranties ---
  if (tables.length > 2) {
    const t2 = tables[2];
    const t2Rows = t2.getElementsByTagName('w:tr');

    const ashpBrand = data.ashpBrand || 'Daikin';
    const cylinderBrand = data.cylinderBrand || 'Joule';

    if (t2Rows.length > 1) {
      const r1Cells = t2Rows[1].getElementsByTagName('w:tc');
      if (r1Cells.length > 1) setCellText(doc, r1Cells[1], ashpBrand, { fontSizePt: 8.5 });
    }
    if (t2Rows.length > 2) {
      const r2Cells = t2Rows[2].getElementsByTagName('w:tc');
      if (r2Cells.length > 1) setCellText(doc, r2Cells[1], cylinderBrand, { fontSizePt: 8.5 });
    }
  }

  const updatedXmlStr = new XMLSerializer().serializeToString(doc);
  zip.file('word/document.xml', updatedXmlStr);
  const buf = zip.generate({ type: 'nodebuffer', compression: 'DEFLATE' });
  fs.writeFileSync(outputPath, buf);
}
