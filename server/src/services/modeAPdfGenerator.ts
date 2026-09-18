import { PDFDocument, rgb, StandardFonts, PDFPage, PDFFont } from 'pdf-lib';
import fs from 'fs';
import path from 'path';

export interface ModeAPdfInput {
  quoteReference?: string;
  leadReference?: string;
  customerName?: string;
  customerEmail?: string;
  customerPhone?: string;
  addressLine1?: string;
  addressLine2?: string;
  postcode?: string;
  preparedBy?: string;
  date?: string;

  // Property Details
  propertyType?: string;
  bedrooms?: number;
  epcFloorArea?: number;
  epcRating?: string;
  epcReference?: string;
  existingHeatingSystem?: string;
  existingFuelType?: string;
  onOffGasGrid?: string;
  wallInsulation?: string;
  roofInsulation?: string;
  annualHeatingKwh?: number;

  // Demand
  estimatedHeatDemandKw?: number;

  // Recommended System
  ashp?: {
    brand?: string;
    model?: string;
    ratedOutputKw?: number;
    designCondition?: string;
  };
  cylinder?: {
    brand?: string;
    model?: string;
    capacityLitres?: number;
  };

  // Emitters
  radiators?: {
    count?: number;
    mainType?: string;
    estimatedCapacityKw?: number;
    plausibility?: string;
  };

  // Line items
  lineItems?: Array<{
    category?: string;
    description: string;
    quantity: number;
    unitPriceExVat: number;
    totalPriceExVat: number;
  }>;

  // Commercial summary
  totalJobCost: number;
  busGrant: number;
  customerContribution: number;
  revenue?: number;
  grossProfit: number;
  grossMarginPercent: number;
}

// Helper to format currency
function formatCurrency(val?: number): string {
  if (val === undefined || val === null || isNaN(val)) return '£0.00';
  return `£${val.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

// Clean string helper
function cleanString(str?: string | null): string {
  if (!str) return '';
  const trimmed = String(str).trim();
  if (trimmed === 'undefined' || trimmed === 'null' || trimmed === 'NaN') return '';
  return trimmed;
}

export async function generateModeAPdfBuffer(input: ModeAPdfInput): Promise<Buffer> {
  const pdfDoc = await PDFDocument.create();
  
  const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const fontOblique = await pdfDoc.embedFont(StandardFonts.HelveticaOblique);

  // Palette
  const colorNavy = rgb(15 / 255, 23 / 255, 42 / 255);       // #0F172A
  const colorEmerald = rgb(5 / 255, 150 / 255, 105 / 255);   // #059669
  const colorSlate = rgb(100 / 255, 116 / 255, 139 / 255);   // #64748B
  const colorDarkText = rgb(30 / 255, 41 / 255, 59 / 255);   // #1E293B
  const colorBgLight = rgb(248 / 255, 250 / 255, 252 / 255); // #F8FAFC
  const colorBoxMint = rgb(236 / 255, 253 / 255, 245 / 255); // #ECFDF5
  const colorBorder = rgb(226 / 255, 232 / 255, 240 / 255);  // #E2E8F0
  const colorWhite = rgb(1, 1, 1);

  const PAGE_WIDTH = 595.28;
  const PAGE_HEIGHT = 841.89;
  const MARGIN_LEFT = 36;
  const MARGIN_RIGHT = 36;
  const CONTENT_WIDTH = PAGE_WIDTH - MARGIN_LEFT - MARGIN_RIGHT; // 523.28

  let currentPage = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  let currentY = PAGE_HEIGHT - 36;

  function checkPageBreak(requiredHeight: number): void {
    if (currentY - requiredHeight < 50) {
      drawFooter(currentPage, fontRegular, fontOblique, colorSlate);
      currentPage = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
      currentY = PAGE_HEIGHT - 40;
      drawSubHeader(currentPage, fontBold, fontRegular, colorNavy, colorSlate, input.quoteReference || input.leadReference || 'Mode A Assessment');
    }
  }

  function drawFooter(page: PDFPage, fontReg: PDFFont, fontObl: PDFFont, slate: typeof colorSlate) {
    const disclaimerText = 'Mode A is a pre-survey commercial/technical estimate. It is not a final MCS design or BS EN 12831 heat-loss calculation. Final equipment selection and installation design are subject to completed survey and design.';
    page.drawRectangle({
      x: MARGIN_LEFT,
      y: 15,
      width: CONTENT_WIDTH,
      height: 25,
      color: rgb(241 / 255, 245 / 255, 249 / 255),
      borderColor: colorBorder,
      borderWidth: 0.5
    });
    page.drawText(disclaimerText, {
      x: MARGIN_LEFT + 8,
      y: 24,
      size: 7,
      font: fontObl,
      color: slate,
      maxWidth: CONTENT_WIDTH - 16
    });
  }

  function drawSubHeader(page: PDFPage, fontB: PDFFont, fontR: PDFFont, navy: typeof colorNavy, slate: typeof colorSlate, refText: string) {
    page.drawText('PRIME ENERGY UK — Mode A Assessment', {
      x: MARGIN_LEFT,
      y: PAGE_HEIGHT - 25,
      size: 9,
      font: fontB,
      color: navy
    });
    page.drawText(`Ref: ${refText}`, {
      x: PAGE_WIDTH - MARGIN_RIGHT - 140,
      y: PAGE_HEIGHT - 25,
      size: 9,
      font: fontR,
      color: slate
    });
    page.drawLine({
      start: { x: MARGIN_LEFT, y: PAGE_HEIGHT - 30 },
      end: { x: PAGE_WIDTH - MARGIN_RIGHT, y: PAGE_HEIGHT - 30 },
      thickness: 0.75,
      color: colorBorder
    });
  }

  // ==========================================
  // 1. TOP HEADER BANNER
  // ==========================================
  const headerHeight = 72;
  currentPage.drawRectangle({
    x: MARGIN_LEFT,
    y: currentY - headerHeight,
    width: CONTENT_WIDTH,
    height: headerHeight,
    color: colorNavy,
    borderRadius: 4
  });

  // Left side title
  currentPage.drawText('PRIME ENERGY UK', {
    x: MARGIN_LEFT + 14,
    y: currentY - 26,
    size: 15,
    font: fontBold,
    color: colorWhite
  });

  currentPage.drawText('Mode A — New Lead / Pre-Survey Assessment', {
    x: MARGIN_LEFT + 14,
    y: currentY - 44,
    size: 10,
    font: fontRegular,
    color: rgb(203 / 255, 213 / 255, 225 / 255)
  });

  // Right side header metadata
  const customerName = cleanString(input.customerName) || 'Valued Customer';
  const jobRef = cleanString(input.quoteReference) || cleanString(input.leadReference) || 'MODE-A-LEAD';
  const addressParts = [cleanString(input.addressLine1), cleanString(input.addressLine2), cleanString(input.postcode)].filter(Boolean);
  const propertyAddr = addressParts.length > 0 ? addressParts.join(', ') : 'Not specified';
  const preparedDate = input.date || new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  const preparedBy = cleanString(input.preparedBy) || 'Prime Energy Technical Assessment';

  const metaRightX = MARGIN_LEFT + CONTENT_WIDTH - 210;
  currentPage.drawText(`Customer: ${customerName}`, { x: metaRightX, y: currentY - 20, size: 8.5, font: fontBold, color: colorWhite });
  currentPage.drawText(`Ref: ${jobRef}`, { x: metaRightX, y: currentY - 32, size: 8.5, font: fontRegular, color: rgb(226 / 255, 232 / 255, 240 / 255) });
  currentPage.drawText(`Address: ${propertyAddr.length > 32 ? propertyAddr.substring(0, 32) + '...' : propertyAddr}`, { x: metaRightX, y: currentY - 44, size: 8, font: fontRegular, color: rgb(203 / 255, 213 / 255, 225 / 255) });
  currentPage.drawText(`Date: ${preparedDate} | By: ${preparedBy.length > 18 ? preparedBy.substring(0, 18) + '...' : preparedBy}`, { x: metaRightX, y: currentY - 56, size: 7.5, font: fontRegular, color: rgb(148 / 255, 163 / 255, 184 / 255) });

  currentY -= (headerHeight + 14);

  // ==========================================
  // Helper: Section Heading
  // ==========================================
  function drawSectionHeading(title: string) {
    checkPageBreak(30);
    currentPage.drawRectangle({
      x: MARGIN_LEFT,
      y: currentY - 18,
      width: 4,
      height: 16,
      color: colorEmerald
    });
    currentPage.drawText(title.toUpperCase(), {
      x: MARGIN_LEFT + 10,
      y: currentY - 14,
      size: 10,
      font: fontBold,
      color: colorNavy
    });
    currentPage.drawLine({
      start: { x: MARGIN_LEFT + 10 + fontBold.widthOfTextAtSize(title.toUpperCase(), 10) + 10, y: currentY - 10 },
      end: { x: MARGIN_LEFT + CONTENT_WIDTH, y: currentY - 10 },
      thickness: 0.5,
      color: colorBorder
    });
    currentY -= 24;
  }

  // ==========================================
  // 2. PROPERTY DETAILS SECTION
  // ==========================================
  drawSectionHeading('Property Details');

  const propertyFields: Array<{ label: string; value: string }> = [];

  const propType = cleanString(input.propertyType);
  if (propType) propertyFields.push({ label: 'Property Type', value: propType });

  if (input.bedrooms && input.bedrooms > 0) propertyFields.push({ label: 'Bedrooms', value: `${input.bedrooms}` });
  if (input.epcFloorArea && input.epcFloorArea > 0) propertyFields.push({ label: 'Floor Area', value: `${input.epcFloorArea} m²` });

  const epcRating = cleanString(input.epcRating);
  if (epcRating) propertyFields.push({ label: 'EPC Rating', value: epcRating });

  const epcRef = cleanString(input.epcReference);
  if (epcRef) propertyFields.push({ label: 'EPC Reference', value: epcRef });

  const existingHeating = cleanString(input.existingHeatingSystem);
  if (existingHeating) propertyFields.push({ label: 'Existing Heating', value: existingHeating });

  const fuelType = cleanString(input.existingFuelType);
  if (fuelType) propertyFields.push({ label: 'Heating Fuel', value: fuelType });

  const gasGrid = cleanString(input.onOffGasGrid);
  if (gasGrid) propertyFields.push({ label: 'Gas Grid Status', value: gasGrid });

  const wallIns = cleanString(input.wallInsulation);
  const roofIns = cleanString(input.roofInsulation);
  const insSummary = [wallIns ? `Walls: ${wallIns}` : '', roofIns ? `Roof: ${roofIns}` : ''].filter(Boolean).join(' | ');
  if (insSummary) propertyFields.push({ label: 'Insulation', value: insSummary });

  if (propertyFields.length > 0) {
    const colWidth = CONTENT_WIDTH / 3;
    const rowHeight = 22;
    const numRows = Math.ceil(propertyFields.length / 3);
    const boxHeight = numRows * rowHeight + 8;

    checkPageBreak(boxHeight + 10);

    currentPage.drawRectangle({
      x: MARGIN_LEFT,
      y: currentY - boxHeight,
      width: CONTENT_WIDTH,
      height: boxHeight,
      color: colorBgLight,
      borderColor: colorBorder,
      borderWidth: 0.5,
      borderRadius: 3
    });

    propertyFields.forEach((f, idx) => {
      const r = Math.floor(idx / 3);
      const c = idx % 3;
      const x = MARGIN_LEFT + 10 + (c * colWidth);
      const y = currentY - 16 - (r * rowHeight);

      const labelStr = `${f.label}:`;
      const labelW = fontBold.widthOfTextAtSize(labelStr, 8);
      const availValW = colWidth - labelW - 14;

      let valStr = f.value;
      if (fontRegular.widthOfTextAtSize(valStr, 8.5) > availValW) {
        while (valStr.length > 3 && fontRegular.widthOfTextAtSize(valStr + '...', 8) > availValW) {
          valStr = valStr.substring(0, valStr.length - 1);
        }
        valStr += '...';
      }

      currentPage.drawText(labelStr, {
        x,
        y,
        size: 8,
        font: fontBold,
        color: colorSlate
      });
      currentPage.drawText(valStr, {
        x: x + labelW + 4,
        y,
        size: 8.5,
        font: fontRegular,
        color: colorDarkText
      });
    });

    currentY -= (boxHeight + 12);
  } else {
    currentPage.drawText('No property details recorded for this lead.', {
      x: MARGIN_LEFT + 10,
      y: currentY - 10,
      size: 8.5,
      font: fontOblique,
      color: colorSlate
    });
    currentY -= 20;
  }

  // ==========================================
  // 3. PRELIMINARY HEAT DEMAND SECTION
  // ==========================================
  drawSectionHeading('Preliminary Heat Demand');

  const demandKw = input.estimatedHeatDemandKw && input.estimatedHeatDemandKw > 0 ? input.estimatedHeatDemandKw : null;
  const demandBoxHeight = 36;
  checkPageBreak(demandBoxHeight + 10);

  currentPage.drawRectangle({
    x: MARGIN_LEFT,
    y: currentY - demandBoxHeight,
    width: CONTENT_WIDTH,
    height: demandBoxHeight,
    color: colorBgLight,
    borderColor: colorBorder,
    borderWidth: 0.5,
    borderRadius: 3
  });

  currentPage.drawText('Estimated Heat Demand:', {
    x: MARGIN_LEFT + 14,
    y: currentY - 22,
    size: 10,
    font: fontBold,
    color: colorNavy
  });

  const demandValStr = demandKw ? `${demandKw.toFixed(1)} kW` : 'Pending calculation';
  currentPage.drawText(demandValStr, {
    x: MARGIN_LEFT + 145,
    y: currentY - 24,
    size: 14,
    font: fontBold,
    color: demandKw ? colorEmerald : colorSlate
  });

  currentPage.drawText('Preliminary estimate — not an MCS/BS EN 12831 heat-load calculation.', {
    x: MARGIN_LEFT + 245,
    y: currentY - 22,
    size: 7.5,
    font: fontOblique,
    color: colorSlate
  });

  currentY -= (demandBoxHeight + 14);

  // ==========================================
  // 4. RECOMMENDED SYSTEM SECTION
  // ==========================================
  drawSectionHeading('Recommended System');

  const ashpBrand = cleanString(input.ashp?.brand);
  const ashpModel = cleanString(input.ashp?.model);
  const ashpName = (ashpBrand || ashpModel) ? `${ashpBrand} ${ashpModel}`.trim() : 'Unspecified ASHP Model';
  const ashpKw = input.ashp?.ratedOutputKw ? `${input.ashp.ratedOutputKw.toFixed(1)} kW` : (demandKw ? `${demandKw.toFixed(1)} kW` : 'TBD');
  const ashpDesignCond = cleanString(input.ashp?.designCondition) || '-3°C / 55°C Flow Design';

  const cylBrand = cleanString(input.cylinder?.brand);
  const cylModel = cleanString(input.cylinder?.model);
  const cylName = (cylBrand || cylModel) ? `${cylBrand} ${cylModel}`.trim() : 'Unspecified Cylinder Model';
  const cylVol = input.cylinder?.capacityLitres ? `${input.cylinder.capacityLitres} Litres` : 'Standard Volume';

  const sysBoxHeight = 50;
  checkPageBreak(sysBoxHeight + 10);

  currentPage.drawRectangle({
    x: MARGIN_LEFT,
    y: currentY - sysBoxHeight,
    width: CONTENT_WIDTH,
    height: sysBoxHeight,
    color: colorBgLight,
    borderColor: colorBorder,
    borderWidth: 0.5,
    borderRadius: 3
  });

  // ASHP Row
  currentPage.drawText('ASHP Unit:', { x: MARGIN_LEFT + 14, y: currentY - 18, size: 9, font: fontBold, color: colorNavy });
  currentPage.drawText(ashpName, { x: MARGIN_LEFT + 90, y: currentY - 18, size: 9, font: fontBold, color: colorDarkText });
  currentPage.drawText(`Output: ${ashpKw} | Design Condition: ${ashpDesignCond}`, { x: MARGIN_LEFT + 280, y: currentY - 18, size: 8, font: fontRegular, color: colorSlate });

  // Divider
  currentPage.drawLine({
    start: { x: MARGIN_LEFT + 10, y: currentY - 26 },
    end: { x: MARGIN_LEFT + CONTENT_WIDTH - 10, y: currentY - 26 },
    thickness: 0.5,
    color: colorBorder
  });

  // Cylinder Row
  currentPage.drawText('Cylinder:', { x: MARGIN_LEFT + 14, y: currentY - 40, size: 9, font: fontBold, color: colorNavy });
  currentPage.drawText(cylName, { x: MARGIN_LEFT + 90, y: currentY - 40, size: 9, font: fontBold, color: colorDarkText });
  currentPage.drawText(`Capacity: ${cylVol}`, { x: MARGIN_LEFT + 280, y: currentY - 40, size: 8, font: fontRegular, color: colorSlate });

  currentY -= (sysBoxHeight + 14);

  // ==========================================
  // 5. SYSTEM & INSTALLATION COST TABLE
  // ==========================================
  drawSectionHeading('System & Installation Cost');

  // Filter line items, excluding Combi Conversion
  const rawItems = input.lineItems || [];
  const filteredItems = rawItems.filter(item => {
    const desc = (item.description || '').toLowerCase();
    const cat = (item.category || '').toLowerCase();
    return !desc.includes('combi conversion') && !cat.includes('combi_conversion');
  });

  // Table Headers
  const tableHeaderHeight = 18;
  checkPageBreak(tableHeaderHeight + 20);

  currentPage.drawRectangle({
    x: MARGIN_LEFT,
    y: currentY - tableHeaderHeight,
    width: CONTENT_WIDTH,
    height: tableHeaderHeight,
    color: colorNavy
  });

  currentPage.drawText('ITEM DESCRIPTION', { x: MARGIN_LEFT + 10, y: currentY - 13, size: 8, font: fontBold, color: colorWhite });
  currentPage.drawText('QTY', { x: MARGIN_LEFT + 320, y: currentY - 13, size: 8, font: fontBold, color: colorWhite });
  currentPage.drawText('UNIT PRICE (EX VAT)', { x: MARGIN_LEFT + 365, y: currentY - 13, size: 8, font: fontBold, color: colorWhite });
  currentPage.drawText('TOTAL (EX VAT)', { x: MARGIN_LEFT + 465, y: currentY - 13, size: 8, font: fontBold, color: colorWhite });

  currentY -= tableHeaderHeight;

  const itemRowHeight = 18;
  filteredItems.forEach((item, index) => {
    checkPageBreak(itemRowHeight + 15);

    const isEven = index % 2 === 0;
    if (isEven) {
      currentPage.drawRectangle({
        x: MARGIN_LEFT,
        y: currentY - itemRowHeight,
        width: CONTENT_WIDTH,
        height: itemRowHeight,
        color: colorBgLight
      });
    }

    const descText = cleanString(item.description) || 'General Item';
    const truncatedDesc = descText.length > 52 ? descText.substring(0, 52) + '...' : descText;

    currentPage.drawText(truncatedDesc, { x: MARGIN_LEFT + 10, y: currentY - 13, size: 8, font: fontRegular, color: colorDarkText });
    currentPage.drawText(`${item.quantity || 1}`, { x: MARGIN_LEFT + 328, y: currentY - 13, size: 8, font: fontRegular, color: colorDarkText });
    currentPage.drawText(formatCurrency(item.unitPriceExVat), { x: MARGIN_LEFT + 365, y: currentY - 13, size: 8, font: fontRegular, color: colorDarkText });
    currentPage.drawText(formatCurrency(item.totalPriceExVat), { x: MARGIN_LEFT + 465, y: currentY - 13, size: 8, font: fontBold, color: colorDarkText });

    currentPage.drawLine({
      start: { x: MARGIN_LEFT, y: currentY - itemRowHeight },
      end: { x: MARGIN_LEFT + CONTENT_WIDTH, y: currentY - itemRowHeight },
      thickness: 0.5,
      color: colorBorder
    });

    currentY -= itemRowHeight;
  });

  currentY -= 6;

  // ==========================================
  // 6. COST SUMMARY SECTION
  // ==========================================
  const summaryBoxHeight = 58;
  checkPageBreak(summaryBoxHeight + 15);

  currentPage.drawRectangle({
    x: MARGIN_LEFT,
    y: currentY - summaryBoxHeight,
    width: CONTENT_WIDTH,
    height: summaryBoxHeight,
    color: colorBgLight,
    borderColor: colorBorder,
    borderWidth: 0.75,
    borderRadius: 4
  });

  // Grid of 6 financial summary values: Total Job Cost, BUS Grant, Customer Contribution, Revenue, Gross Profit, Gross Margin
  const sumColW = CONTENT_WIDTH / 3;

  // Column 1
  currentPage.drawText('Total Job Cost:', { x: MARGIN_LEFT + 12, y: currentY - 18, size: 8.5, font: fontBold, color: colorSlate });
  currentPage.drawText(formatCurrency(input.totalJobCost), { x: MARGIN_LEFT + 105, y: currentY - 18, size: 9, font: fontBold, color: colorDarkText });

  currentPage.drawText('BUS Grant:', { x: MARGIN_LEFT + 12, y: currentY - 38, size: 8.5, font: fontBold, color: colorSlate });
  currentPage.drawText(`-${formatCurrency(input.busGrant)}`, { x: MARGIN_LEFT + 105, y: currentY - 38, size: 9, font: fontBold, color: colorEmerald });

  // Column 2
  const col2X = MARGIN_LEFT + sumColW + 10;
  currentPage.drawText('Customer Contribution:', { x: col2X, y: currentY - 18, size: 8.5, font: fontBold, color: colorNavy });
  currentPage.drawText(formatCurrency(input.customerContribution), { x: col2X + 115, y: currentY - 18, size: 10, font: fontBold, color: colorNavy });

  const revVal = input.revenue !== undefined ? input.revenue : input.customerContribution + input.busGrant;
  currentPage.drawText('Total Revenue:', { x: col2X, y: currentY - 38, size: 8.5, font: fontBold, color: colorSlate });
  currentPage.drawText(formatCurrency(revVal), { x: col2X + 115, y: currentY - 38, size: 9, font: fontBold, color: colorDarkText });

  // Column 3
  const col3X = MARGIN_LEFT + (sumColW * 2) + 10;
  currentPage.drawText('Gross Profit:', { x: col3X, y: currentY - 18, size: 8.5, font: fontBold, color: colorSlate });
  currentPage.drawText(formatCurrency(input.grossProfit), { x: col3X + 75, y: currentY - 18, size: 9, font: fontBold, color: colorDarkText });

  currentPage.drawText('Gross Margin:', { x: col3X, y: currentY - 38, size: 8.5, font: fontBold, color: colorSlate });
  currentPage.drawText(`${(input.grossMarginPercent || 0).toFixed(1)}%`, { x: col3X + 75, y: currentY - 38, size: 9, font: fontBold, color: colorDarkText });

  currentY -= (summaryBoxHeight + 14);

  // ==========================================
  // 7. RADIATOR / EMITTER INFO (Optional)
  // ==========================================
  if (input.radiators && (input.radiators.count || input.radiators.mainType || input.radiators.estimatedCapacityKw)) {
    drawSectionHeading('Radiator & Emitter Assessment');

    const radBoxHeight = 36;
    checkPageBreak(radBoxHeight + 10);

    currentPage.drawRectangle({
      x: MARGIN_LEFT,
      y: currentY - radBoxHeight,
      width: CONTENT_WIDTH,
      height: radBoxHeight,
      color: colorBgLight,
      borderColor: colorBorder,
      borderWidth: 0.5,
      borderRadius: 3
    });

    const radCountStr = input.radiators.count ? `${input.radiators.count}` : 'Uncounted';
    const radTypeStr = cleanString(input.radiators.mainType) || 'Mixed / Standard';
    const radCapStr = input.radiators.estimatedCapacityKw ? `${input.radiators.estimatedCapacityKw.toFixed(1)} kW @ dt30 (55/45/20°C)` : 'Not calculated';
    const radPlausStr = cleanString(input.radiators.plausibility) || 'Plausible';

    currentPage.drawText(`Existing Radiators: ${radCountStr} | Main Type: ${radTypeStr}`, {
      x: MARGIN_LEFT + 12,
      y: currentY - 16,
      size: 8.5,
      font: fontBold,
      color: colorDarkText
    });

    currentPage.drawText(`Estimated Capacity: ${radCapStr} | Emitter Plausibility: ${radPlausStr}`, {
      x: MARGIN_LEFT + 12,
      y: currentY - 28,
      size: 8,
      font: fontRegular,
      color: colorSlate
    });

    currentPage.drawText('Pre-survey emitter indicator only; not a building heat-loss calculation.', {
      x: MARGIN_LEFT + 250,
      y: currentY - 22,
      size: 7,
      font: fontOblique,
      color: colorSlate
    });

    currentY -= (radBoxHeight + 12);
  }

  // ==========================================
  // 8. KEY RESULT SUMMARY CALLOUT BOX
  // ==========================================
  const keyBoxHeight = 44;
  checkPageBreak(keyBoxHeight + 10);

  currentPage.drawRectangle({
    x: MARGIN_LEFT,
    y: currentY - keyBoxHeight,
    width: CONTENT_WIDTH,
    height: keyBoxHeight,
    color: colorBoxMint,
    borderColor: colorEmerald,
    borderWidth: 1,
    borderRadius: 4
  });

  currentPage.drawText('KEY ASSESSMENT SUMMARY', {
    x: MARGIN_LEFT + 14,
    y: currentY - 16,
    size: 8.5,
    font: fontBold,
    color: colorEmerald
  });

  const recSummaryStr = `Recommended: ${ashpName} (${ashpKw}) + ${cylName} (${cylVol})`;
  currentPage.drawText(recSummaryStr.length > 70 ? recSummaryStr.substring(0, 70) + '...' : recSummaryStr, {
    x: MARGIN_LEFT + 14,
    y: currentY - 32,
    size: 8.5,
    font: fontBold,
    color: colorNavy
  });

  currentPage.drawText(`Heat Demand: ${demandValStr}`, {
    x: MARGIN_LEFT + 340,
    y: currentY - 16,
    size: 8.5,
    font: fontBold,
    color: colorDarkText
  });

  currentPage.drawText(`Customer Net Contribution: ${formatCurrency(input.customerContribution)}`, {
    x: MARGIN_LEFT + 340,
    y: currentY - 32,
    size: 9.5,
    font: fontBold,
    color: colorEmerald
  });

  currentY -= (keyBoxHeight + 12);

  // ==========================================
  // 9. SHORT NOTE SUMMARY (1 - 1.5 lines)
  // ==========================================
  checkPageBreak(24);
  const pTypeNote = propType || 'Property';
  const fuelNote = fuelType ? `${fuelType} boiler` : 'existing heating';
  const epcKwhNote = input.annualHeatingKwh ? `EPC ${input.annualHeatingKwh.toLocaleString()} kWh/yr` : (epcRating ? `EPC Rating ${epcRating}` : 'pre-survey assessment');
  const shortNoteText = `Summary: ${pTypeNote}, ${fuelNote}, ${epcKwhNote}; estimated heat demand ${demandValStr}, recommended ${ashpName} + ${cylVol}.`;

  currentPage.drawText(shortNoteText.length > 120 ? shortNoteText.substring(0, 120) + '...' : shortNoteText, {
    x: MARGIN_LEFT,
    y: currentY - 10,
    size: 8,
    font: fontOblique,
    color: colorSlate,
    maxWidth: CONTENT_WIDTH
  });

  currentY -= 20;

  // Draw footer on final page
  drawFooter(currentPage, fontRegular, fontOblique, colorSlate);

  const pdfBytes = await pdfDoc.save();
  return Buffer.from(pdfBytes);
}
