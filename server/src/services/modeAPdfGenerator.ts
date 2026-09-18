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

// Clean product title to eliminate duplicate brand names (e.g. "Telford Telford Tornado...")
function cleanProductTitle(brand?: string, model?: string, defaultFallback: string = 'Unspecified'): string {
  let b = cleanString(brand);
  let m = cleanString(model);

  if (!b && !m) return defaultFallback;
  if (!b) return m.replace(/^(\b[A-Za-z0-9-]+\b)\s+\1\b/gi, '$1');
  if (!m) return b.replace(/^(\b[A-Za-z0-9-]+\b)\s+\1\b/gi, '$1');

  // Remove leading duplicate words from model/brand strings
  m = m.replace(/^(\b[A-Za-z0-9-]+\b)\s+\1\b/gi, '$1');
  b = b.replace(/^(\b[A-Za-z0-9-]+\b)\s+\1\b/gi, '$1');

  // If model already starts with the brand name (case-insensitive), use model alone
  if (m.toLowerCase().startsWith(b.toLowerCase())) {
    return m;
  }
  return `${b} ${m}`;
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
  const MARGIN_LEFT = 32;
  const MARGIN_RIGHT = 32;
  const CONTENT_WIDTH = PAGE_WIDTH - MARGIN_LEFT - MARGIN_RIGHT; // 531.28

  let currentPage = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  let currentY = PAGE_HEIGHT - 28;

  function drawFooter(page: PDFPage) {
    const disclaimerText = 'Mode A is a pre-survey commercial/technical estimate. It is not a final MCS design or BS EN 12831 heat-loss calculation. Final equipment selection and installation design are subject to completed survey and design.';
    page.drawRectangle({
      x: MARGIN_LEFT,
      y: 14,
      width: CONTENT_WIDTH,
      height: 22,
      color: rgb(241 / 255, 245 / 255, 249 / 255),
      borderColor: colorBorder,
      borderWidth: 0.5
    });
    page.drawText(disclaimerText, {
      x: MARGIN_LEFT + 8,
      y: 22,
      size: 6.8,
      font: fontOblique,
      color: colorSlate,
      maxWidth: CONTENT_WIDTH - 16
    });
  }

  // ==========================================
  // 1. TOP HEADER BANNER
  // ==========================================
  const headerHeight = 66;
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
    x: MARGIN_LEFT + 12,
    y: currentY - 22,
    size: 14,
    font: fontBold,
    color: colorWhite
  });

  currentPage.drawText('Mode A — New Lead / Pre-Survey Assessment', {
    x: MARGIN_LEFT + 12,
    y: currentY - 39,
    size: 9.5,
    font: fontRegular,
    color: rgb(203 / 255, 213 / 255, 225 / 255)
  });

  // Right side header metadata
  const customerName = cleanString(input.customerName) || 'Valued Customer';
  const jobRef = cleanString(input.quoteReference) || cleanString(input.leadReference) || 'MODE-A-LEAD';
  const addressParts = [cleanString(input.addressLine1), cleanString(input.addressLine2), cleanString(input.postcode)].filter(Boolean);
  const propertyAddr = addressParts.length > 0 ? addressParts.join(', ') : 'Not specified';
  const preparedDate = input.date || new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  const preparedBy = cleanString(input.preparedBy) || 'Prime Energy Assessor';

  const metaRightX = MARGIN_LEFT + CONTENT_WIDTH - 220;
  currentPage.drawText(`Customer: ${customerName}`, { x: metaRightX, y: currentY - 18, size: 8, font: fontBold, color: colorWhite });
  currentPage.drawText(`Ref: ${jobRef}`, { x: metaRightX, y: currentY - 30, size: 8, font: fontRegular, color: rgb(226 / 255, 232 / 255, 240 / 255) });
  currentPage.drawText(`Address: ${propertyAddr}`, { x: metaRightX, y: currentY - 42, size: 7.5, font: fontRegular, color: rgb(203 / 255, 213 / 255, 225 / 255), maxWidth: 210 });
  currentPage.drawText(`Date: ${preparedDate} | By: ${preparedBy}`, { x: metaRightX, y: currentY - 54, size: 7, font: fontRegular, color: rgb(148 / 255, 163 / 255, 184 / 255) });

  currentY -= (headerHeight + 14);

  // ==========================================
  // Helper: Section Heading
  // ==========================================
  function drawSectionHeading(title: string) {
    currentPage.drawRectangle({
      x: MARGIN_LEFT,
      y: currentY - 14,
      width: 3.5,
      height: 13,
      color: colorEmerald
    });
    currentPage.drawText(title.toUpperCase(), {
      x: MARGIN_LEFT + 8,
      y: currentY - 11,
      size: 9,
      font: fontBold,
      color: colorNavy
    });
    currentPage.drawLine({
      start: { x: MARGIN_LEFT + 8 + fontBold.widthOfTextAtSize(title.toUpperCase(), 9) + 8, y: currentY - 8 },
      end: { x: MARGIN_LEFT + CONTENT_WIDTH, y: currentY - 8 },
      thickness: 0.5,
      color: colorBorder
    });
    currentY -= 20;
  }

  // ==========================================
  // 2. PROPERTY DETAILS SECTION
  // ==========================================
  drawSectionHeading('Property Details');

  const propType = cleanString(input.propertyType) || 'Not specified';
  const bedroomsStr = (input.bedrooms && input.bedrooms > 0) ? `${input.bedrooms}` : 'Not specified';
  const floorAreaStr = (input.epcFloorArea && input.epcFloorArea > 0) ? `${input.epcFloorArea} m²` : 'Not specified';
  const epcRatingStr = cleanString(input.epcRating) || 'Not assessed';
  const epcRefStr = cleanString(input.epcReference) || 'Not available';
  const existingHeatingStr = cleanString(input.existingHeatingSystem) || 'Not specified';
  const fuelTypeStr = cleanString(input.existingFuelType) || 'Not specified';
  const gasGridStr = cleanString(input.onOffGasGrid) || 'Not specified';

  const wallIns = cleanString(input.wallInsulation);
  const roofIns = cleanString(input.roofInsulation);
  const insSummaryStr = [wallIns ? `Walls: ${wallIns}` : '', roofIns ? `Roof: ${roofIns}` : ''].filter(Boolean).join('  |  ') || 'Not recorded';

  const propBoxHeight = 68;

  currentPage.drawRectangle({
    x: MARGIN_LEFT,
    y: currentY - propBoxHeight,
    width: CONTENT_WIDTH,
    height: propBoxHeight,
    color: colorBgLight,
    borderColor: colorBorder,
    borderWidth: 0.5,
    borderRadius: 3
  });

  // Row 1
  let rY = currentY - 14;
  currentPage.drawText('Property Type:', { x: MARGIN_LEFT + 8, y: rY, size: 7.5, font: fontBold, color: colorSlate });
  currentPage.drawText(propType, { x: MARGIN_LEFT + 72, y: rY, size: 8, font: fontRegular, color: colorDarkText });

  currentPage.drawText('Bedrooms:', { x: MARGIN_LEFT + 180, y: rY, size: 7.5, font: fontBold, color: colorSlate });
  currentPage.drawText(bedroomsStr, { x: MARGIN_LEFT + 230, y: rY, size: 8, font: fontRegular, color: colorDarkText });

  currentPage.drawText('Floor Area:', { x: MARGIN_LEFT + 340, y: rY, size: 7.5, font: fontBold, color: colorSlate });
  currentPage.drawText(floorAreaStr, { x: MARGIN_LEFT + 395, y: rY, size: 8, font: fontRegular, color: colorDarkText });

  // Row 2
  rY -= 15;
  currentPage.drawText('EPC Rating:', { x: MARGIN_LEFT + 8, y: rY, size: 7.5, font: fontBold, color: colorSlate });
  currentPage.drawText(epcRatingStr, { x: MARGIN_LEFT + 62, y: rY, size: 8, font: fontRegular, color: colorDarkText });

  currentPage.drawText('Existing Heating:', { x: MARGIN_LEFT + 180, y: rY, size: 7.5, font: fontBold, color: colorSlate });
  currentPage.drawText(existingHeatingStr, { x: MARGIN_LEFT + 258, y: rY, size: 8, font: fontRegular, color: colorDarkText });

  currentPage.drawText('Heating Fuel:', { x: MARGIN_LEFT + 340, y: rY, size: 7.5, font: fontBold, color: colorSlate });
  currentPage.drawText(fuelTypeStr, { x: MARGIN_LEFT + 405, y: rY, size: 8, font: fontRegular, color: colorDarkText });

  // Row 3
  rY -= 15;
  currentPage.drawText('Gas Grid Status:', { x: MARGIN_LEFT + 8, y: rY, size: 7.5, font: fontBold, color: colorSlate });
  currentPage.drawText(gasGridStr, { x: MARGIN_LEFT + 80, y: rY, size: 8, font: fontRegular, color: colorDarkText });

  currentPage.drawText('EPC Reference:', { x: MARGIN_LEFT + 180, y: rY, size: 7.5, font: fontBold, color: colorSlate });
  currentPage.drawText(epcRefStr, { x: MARGIN_LEFT + 250, y: rY, size: 8, font: fontRegular, color: colorDarkText });

  // Row 4
  rY -= 15;
  currentPage.drawText('Insulation:', { x: MARGIN_LEFT + 8, y: rY, size: 7.5, font: fontBold, color: colorSlate });
  currentPage.drawText(insSummaryStr, { x: MARGIN_LEFT + 60, y: rY, size: 7.8, font: fontRegular, color: colorDarkText });

  currentY -= (propBoxHeight + 12);

  // ==========================================
  // 3. PRELIMINARY HEAT DEMAND SECTION
  // ==========================================
  drawSectionHeading('Preliminary Heat Demand');

  const demandKw = input.estimatedHeatDemandKw && input.estimatedHeatDemandKw > 0 ? input.estimatedHeatDemandKw : null;
  const demandBoxHeight = 30;

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
    x: MARGIN_LEFT + 12,
    y: currentY - 19,
    size: 9.5,
    font: fontBold,
    color: colorNavy
  });

  const demandValStr = demandKw ? `${demandKw.toFixed(1)} kW` : 'Pending calculation';
  currentPage.drawText(demandValStr, {
    x: MARGIN_LEFT + 140,
    y: currentY - 20,
    size: 13,
    font: fontBold,
    color: demandKw ? colorEmerald : colorSlate
  });

  currentPage.drawText('Preliminary estimate — not an MCS/BS EN 12831 heat-load calculation.', {
    x: MARGIN_LEFT + 235,
    y: currentY - 18,
    size: 7.2,
    font: fontOblique,
    color: colorSlate
  });

  currentY -= (demandBoxHeight + 12);

  // ==========================================
  // 4. RECOMMENDED SYSTEM SECTION
  // ==========================================
  drawSectionHeading('Recommended System');

  const ashpName = cleanProductTitle(input.ashp?.brand, input.ashp?.model, 'Unspecified ASHP Model');
  const ashpKw = input.ashp?.ratedOutputKw ? `${input.ashp.ratedOutputKw.toFixed(1)} kW` : (demandKw ? `${demandKw.toFixed(1)} kW` : 'TBD');
  const ashpDesignCond = cleanString(input.ashp?.designCondition) || '-3°C / 55°C Flow Design';

  const cylName = cleanProductTitle(input.cylinder?.brand, input.cylinder?.model, 'Unspecified Cylinder Model');
  const cylVol = input.cylinder?.capacityLitres ? `${input.cylinder.capacityLitres} Litres` : 'Standard Volume';

  const sysBoxHeight = 50;

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
  currentPage.drawText('ASHP Unit:', { x: MARGIN_LEFT + 10, y: currentY - 17, size: 8.5, font: fontBold, color: colorNavy });

  let drawAshpName = ashpName;
  if (fontBold.widthOfTextAtSize(drawAshpName, 8) > 245) {
    let fontSize = 8;
    while (fontSize > 7 && fontBold.widthOfTextAtSize(drawAshpName, fontSize) > 245) {
      fontSize -= 0.2;
    }
    if (fontBold.widthOfTextAtSize(drawAshpName, fontSize) > 245) {
      while (drawAshpName.length > 3 && fontBold.widthOfTextAtSize(drawAshpName + '...', fontSize) > 245) {
        drawAshpName = drawAshpName.substring(0, drawAshpName.length - 1);
      }
      drawAshpName += '...';
    }
  }
  currentPage.drawText(drawAshpName, { x: MARGIN_LEFT + 72, y: currentY - 17, size: 8, font: fontBold, color: colorDarkText });
  currentPage.drawText(`Output: ${ashpKw} | Design: ${ashpDesignCond}`, { x: MARGIN_LEFT + 325, y: currentY - 17, size: 7.5, font: fontRegular, color: colorSlate });

  // Divider
  currentPage.drawLine({
    start: { x: MARGIN_LEFT + 8, y: currentY - 26 },
    end: { x: MARGIN_LEFT + CONTENT_WIDTH - 8, y: currentY - 26 },
    thickness: 0.5,
    color: colorBorder
  });

  // Cylinder Row (320pt available space so full name renders cleanly!)
  currentPage.drawText('Cylinder:', { x: MARGIN_LEFT + 10, y: currentY - 39, size: 8.5, font: fontBold, color: colorNavy });

  let drawCylName = cylName;
  if (fontBold.widthOfTextAtSize(drawCylName, 8) > 320) {
    let fontSize = 8;
    while (fontSize > 7 && fontBold.widthOfTextAtSize(drawCylName, fontSize) > 320) {
      fontSize -= 0.2;
    }
    if (fontBold.widthOfTextAtSize(drawCylName, fontSize) > 320) {
      while (drawCylName.length > 3 && fontBold.widthOfTextAtSize(drawCylName + '...', fontSize) > 320) {
        drawCylName = drawCylName.substring(0, drawCylName.length - 1);
      }
      drawCylName += '...';
    }
  }
  currentPage.drawText(drawCylName, { x: MARGIN_LEFT + 72, y: currentY - 39, size: 8, font: fontBold, color: colorDarkText });
  currentPage.drawText(`Capacity: ${cylVol}`, { x: MARGIN_LEFT + 410, y: currentY - 39, size: 7.5, font: fontRegular, color: colorSlate });

  currentY -= (sysBoxHeight + 12);

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
  const tableHeaderHeight = 17;

  currentPage.drawRectangle({
    x: MARGIN_LEFT,
    y: currentY - tableHeaderHeight,
    width: CONTENT_WIDTH,
    height: tableHeaderHeight,
    color: colorNavy
  });

  currentPage.drawText('ITEM DESCRIPTION', { x: MARGIN_LEFT + 10, y: currentY - 12, size: 7.5, font: fontBold, color: colorWhite });
  currentPage.drawText('QTY', { x: MARGIN_LEFT + 340, y: currentY - 12, size: 7.5, font: fontBold, color: colorWhite });
  currentPage.drawText('UNIT PRICE (EX VAT)', { x: MARGIN_LEFT + 380, y: currentY - 12, size: 7.5, font: fontBold, color: colorWhite });
  currentPage.drawText('TOTAL (EX VAT)', { x: MARGIN_LEFT + 465, y: currentY - 12, size: 7.5, font: fontBold, color: colorWhite });

  currentY -= tableHeaderHeight;

  // Render rows
  filteredItems.forEach((item, index) => {
    let descText = cleanString(item.description) || 'General Item';
    // Deduplicate repeated leading word if any, e.g. "Telford Telford Tornado..." -> "Telford Tornado..."
    descText = descText.replace(/^(\b[A-Za-z0-9-]+\b)\s+\1\b/gi, '$1');

    const isEven = index % 2 === 0;

    // Measure text width to check if 2 lines needed
    const descWidth = fontRegular.widthOfTextAtSize(descText, 7.8);
    const maxDescWidth = 325;

    let lines: string[] = [];
    if (descWidth > maxDescWidth) {
      const words = descText.split(' ');
      let line1 = '';
      let line2 = '';
      for (const w of words) {
        if (fontRegular.widthOfTextAtSize((line1 + ' ' + w).trim(), 7.8) <= maxDescWidth) {
          line1 = (line1 + ' ' + w).trim();
        } else {
          line2 = (line2 + ' ' + w).trim();
        }
      }
      lines = [line1, line2];
    } else {
      lines = [descText];
    }

    const rowH = lines.length > 1 ? 25 : 17;

    if (isEven) {
      currentPage.drawRectangle({
        x: MARGIN_LEFT,
        y: currentY - rowH,
        width: CONTENT_WIDTH,
        height: rowH,
        color: colorBgLight
      });
    }

    if (lines.length === 1) {
      currentPage.drawText(lines[0], { x: MARGIN_LEFT + 10, y: currentY - 11.5, size: 7.8, font: fontRegular, color: colorDarkText });
    } else {
      currentPage.drawText(lines[0], { x: MARGIN_LEFT + 10, y: currentY - 10, size: 7.5, font: fontRegular, color: colorDarkText });
      currentPage.drawText(lines[1], { x: MARGIN_LEFT + 10, y: currentY - 20, size: 7.5, font: fontRegular, color: colorDarkText });
    }

    const textY = lines.length > 1 ? currentY - 15 : currentY - 11.5;
    currentPage.drawText(`${item.quantity || 1}`, { x: MARGIN_LEFT + 348, y: textY, size: 7.8, font: fontRegular, color: colorDarkText });
    currentPage.drawText(formatCurrency(item.unitPriceExVat), { x: MARGIN_LEFT + 380, y: textY, size: 7.8, font: fontRegular, color: colorDarkText });
    currentPage.drawText(formatCurrency(item.totalPriceExVat), { x: MARGIN_LEFT + 465, y: textY, size: 8, font: fontBold, color: colorDarkText });

    currentPage.drawLine({
      start: { x: MARGIN_LEFT, y: currentY - rowH },
      end: { x: MARGIN_LEFT + CONTENT_WIDTH, y: currentY - rowH },
      thickness: 0.5,
      color: colorBorder
    });

    currentY -= rowH;
  });

  currentY -= 6;

  // ==========================================
  // 6. COST SUMMARY SECTION
  // ==========================================
  const summaryBoxHeight = 46;

  currentPage.drawRectangle({
    x: MARGIN_LEFT,
    y: currentY - summaryBoxHeight,
    width: CONTENT_WIDTH,
    height: summaryBoxHeight,
    color: colorBgLight,
    borderColor: colorBorder,
    borderWidth: 0.75,
    borderRadius: 3
  });

  const sumColW = CONTENT_WIDTH / 3;

  // Column 1
  currentPage.drawText('Total Job Cost:', { x: MARGIN_LEFT + 10, y: currentY - 16, size: 8, font: fontBold, color: colorSlate });
  currentPage.drawText(formatCurrency(input.totalJobCost), { x: MARGIN_LEFT + 95, y: currentY - 16, size: 8.5, font: fontBold, color: colorDarkText });

  currentPage.drawText('BUS Grant:', { x: MARGIN_LEFT + 10, y: currentY - 33, size: 8, font: fontBold, color: colorSlate });
  currentPage.drawText(`-${formatCurrency(input.busGrant)}`, { x: MARGIN_LEFT + 95, y: currentY - 33, size: 8.5, font: fontBold, color: colorEmerald });

  // Column 2
  const col2X = MARGIN_LEFT + sumColW + 10;
  currentPage.drawText('Customer Contribution:', { x: col2X, y: currentY - 16, size: 8, font: fontBold, color: colorNavy });
  currentPage.drawText(formatCurrency(input.customerContribution), { x: col2X + 110, y: currentY - 16, size: 9.5, font: fontBold, color: colorNavy });

  const revVal = input.revenue !== undefined ? input.revenue : input.customerContribution + input.busGrant;
  currentPage.drawText('Total Revenue:', { x: col2X, y: currentY - 33, size: 8, font: fontBold, color: colorSlate });
  currentPage.drawText(formatCurrency(revVal), { x: col2X + 110, y: currentY - 33, size: 8.5, font: fontBold, color: colorDarkText });

  // Column 3
  const col3X = MARGIN_LEFT + (sumColW * 2) + 10;
  currentPage.drawText('Gross Profit:', { x: col3X, y: currentY - 16, size: 8, font: fontBold, color: colorSlate });
  currentPage.drawText(formatCurrency(input.grossProfit), { x: col3X + 70, y: currentY - 16, size: 8.5, font: fontBold, color: colorDarkText });

  currentPage.drawText('Gross Margin:', { x: col3X, y: currentY - 33, size: 8, font: fontBold, color: colorSlate });
  currentPage.drawText(`${(input.grossMarginPercent || 0).toFixed(1)}%`, { x: col3X + 70, y: currentY - 33, size: 8.5, font: fontBold, color: colorDarkText });

  currentY -= (summaryBoxHeight + 12);

  // ==========================================
  // 7. RADIATOR / EMITTER INFO (Optional)
  // ==========================================
  if (input.radiators && (input.radiators.count || input.radiators.mainType || input.radiators.estimatedCapacityKw)) {
    drawSectionHeading('Radiator & Emitter Assessment');

    const radBoxHeight = 30;

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
      x: MARGIN_LEFT + 10,
      y: currentY - 13,
      size: 8,
      font: fontBold,
      color: colorDarkText
    });

    currentPage.drawText(`Estimated Capacity: ${radCapStr} | Emitter Plausibility: ${radPlausStr}`, {
      x: MARGIN_LEFT + 10,
      y: currentY - 24,
      size: 7.5,
      font: fontRegular,
      color: colorSlate
    });

    currentPage.drawText('Pre-survey emitter indicator only; not a building heat-loss calculation.', {
      x: MARGIN_LEFT + 250,
      y: currentY - 18,
      size: 6.8,
      font: fontOblique,
      color: colorSlate
    });

    currentY -= (radBoxHeight + 12);
  }

  // ==========================================
  // 8. KEY RESULT SUMMARY CALLOUT BOX (Strict 100% In-Box Layout!)
  // ==========================================
  const keyBoxHeight = 68;

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

  // Line 1: Header + Heat Demand
  currentPage.drawText('KEY ASSESSMENT SUMMARY', {
    x: MARGIN_LEFT + 12,
    y: currentY - 16,
    size: 8.5,
    font: fontBold,
    color: colorEmerald
  });

  currentPage.drawText(`Estimated Heat Demand: ${demandValStr}`, {
    x: MARGIN_LEFT + 320,
    y: currentY - 16,
    size: 8.5,
    font: fontBold,
    color: colorDarkText
  });

  // Line 2: Recommended System string (ASHP + Cylinder) with auto-scaling font to ensure NO overflow
  const fullRecStr = `Recommended: ${ashpName} + ${cylName}`;
  let recFontSize = 8;
  while (recFontSize > 6.8 && fontBold.widthOfTextAtSize(fullRecStr, recFontSize) > (CONTENT_WIDTH - 24)) {
    recFontSize -= 0.2;
  }

  currentPage.drawText(fullRecStr, {
    x: MARGIN_LEFT + 12,
    y: currentY - 34,
    size: recFontSize,
    font: fontBold,
    color: colorNavy,
    maxWidth: CONTENT_WIDTH - 24
  });

  // Line 3: Net Customer Contribution
  currentPage.drawText(`Customer Net Contribution: ${formatCurrency(input.customerContribution)}`, {
    x: MARGIN_LEFT + 12,
    y: currentY - 52,
    size: 9.5,
    font: fontBold,
    color: colorEmerald
  });

  currentY -= (keyBoxHeight + 12);

  // ==========================================
  // 9. SHORT NOTE SUMMARY
  // ==========================================
  const pTypeNote = propType || 'Property';
  const fuelNote = fuelTypeStr !== 'Not specified' ? `${fuelTypeStr} boiler` : 'existing heating';
  const epcKwhNote = input.annualHeatingKwh ? `EPC ${input.annualHeatingKwh.toLocaleString()} kWh/yr` : (epcRatingStr !== 'Not assessed' ? `EPC Rating ${epcRatingStr}` : 'pre-survey assessment');
  const shortNoteText = `Summary: ${pTypeNote}, ${fuelNote}, ${epcKwhNote}; estimated heat demand ${demandValStr}, recommended ${ashpName} + ${cylVol}.`;

  currentPage.drawText(shortNoteText, {
    x: MARGIN_LEFT,
    y: currentY - 8,
    size: 7.5,
    font: fontOblique,
    color: colorSlate,
    maxWidth: CONTENT_WIDTH
  });

  // Draw bottom footer on single page
  drawFooter(currentPage);

  const pdfBytes = await pdfDoc.save();
  return Buffer.from(pdfBytes);
}

