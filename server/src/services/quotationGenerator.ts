import path from 'path';
import fs from 'fs';
import os from 'os';
import { execFile } from 'child_process';
import { promisify } from 'util';
import { fileURLToPath } from 'url';
import db from '../db/connection.js';
import { fillDocxTemplatePureJs } from './docxFiller.js';

const execFileAsync = promisify(execFile);

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export interface GenerateQuotationOptions {
  quoteId: string;
  quoteReference: string;
  leadId: string;
  calculationResult: any;
  userId: string;
}

export interface GeneratedQuotationResult {
  quoteId: string;
  quoteReference: string;
  pdfPath: string;
  docxPath: string;
  validUntil: string;
  generatedAt: string;
}

function formatDate(date: Date): string {
  return date.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });
}

export async function generateQuotationDocument(options: GenerateQuotationOptions): Promise<GeneratedQuotationResult> {
  const { quoteId, quoteReference, leadId, calculationResult, userId } = options;

  // 1. Fetch Lead and Property data from DB
  const lead = await db.get(`
    SELECT 
      l.id, l.customer_name, l.email, l.phone,
      p.address_line1, p.address_line2, p.postcode, p.country, p.property_type
    FROM leads l
    LEFT JOIN properties p ON l.id = p.lead_id
    WHERE l.id = ?
  `, [leadId]);

  if (!lead) {
    throw new Error(`Lead not found for ID: ${leadId}`);
  }

  const customerName = lead.customer_name || 'Valued Customer';
  const addressParts = [
    lead.address_line1,
    lead.address_line2,
    lead.postcode
  ].filter(Boolean);
  const siteAddress = addressParts.length > 0 ? addressParts.join(', ') : 'Property Site Address';

  // 2. Fetch Commercial Settings for validity period
  const commSettings = await db.get('SELECT quote_validity_days FROM commercial_settings WHERE active = 1 ORDER BY version DESC LIMIT 1');
  const validityDays = commSettings?.quote_validity_days || 30;

  const issueDate = new Date();
  const validUntilDate = new Date();
  validUntilDate.setDate(issueDate.getDate() + validityDays);

  const formattedDateIssued = formatDate(issueDate);
  const formattedValidUntil = formatDate(validUntilDate);

  // 3. Format Goods Items from calculationResult
  const goodsItems: Array<{ description: string; quantity: number; unitPriceExVat: number; totalPriceExVat: number }> = [];

  // ASHP
  const ashpName = calculationResult.ashp?.selectedProduct?.model 
    ? `${calculationResult.ashp.selectedProduct.brand || ''} ${calculationResult.ashp.selectedProduct.model} ${calculationResult.ashp.selectedProduct.marketingNominalKw || ''}kW Heat Pump`.trim()
    : 'Air Source Heat Pump Unit';
  goodsItems.push({
    description: ashpName,
    quantity: 1,
    unitPriceExVat: calculationResult.costBreakdown?.ashpCost || 0,
    totalPriceExVat: calculationResult.costBreakdown?.ashpCost || 0
  });

  // Cylinder
  const cylName = calculationResult.cylinder?.selectedCylinder?.model
    ? `${calculationResult.cylinder.selectedCylinder.brand || ''} ${calculationResult.cylinder.selectedCylinder.model} ${calculationResult.cylinder.selectedCylinder.capacityLitres || ''}L Cylinder`.trim()
    : 'Unvented Hot Water Cylinder';
  goodsItems.push({
    description: cylName,
    quantity: 1,
    unitPriceExVat: calculationResult.costBreakdown?.cylinderCost || 0,
    totalPriceExVat: calculationResult.costBreakdown?.cylinderCost || 0
  });

  // Radiators
  const radAllowance = calculationResult.costBreakdown?.radiatorsAllowance || 0;
  const radCount = calculationResult.radiators?.totalRadiatorsCount || calculationResult.existingEmitterInformation?.totalCount || 8;
  goodsItems.push({
    description: `Radiators / Emitters Allowance (Estimated ${radCount} emitters)`,
    quantity: 1,
    unitPriceExVat: radAllowance,
    totalPriceExVat: radAllowance
  });

  // Accessories & Pipework
  const pipeAndAcc = (calculationResult.costBreakdown?.accessoriesCost || 0) + (calculationResult.costBreakdown?.pipeworkAllowance || 0);
  goodsItems.push({
    description: 'System Accessories, Controls & Pipework Allowance',
    quantity: 1,
    unitPriceExVat: pipeAndAcc,
    totalPriceExVat: pipeAndAcc
  });

  const goodsTotal = goodsItems.reduce((sum, item) => sum + item.totalPriceExVat, 0);

  // 4. Format Services Items
  const servicesItems: Array<{ description: string; quantity: number; unitPriceExVat: number; totalPriceExVat: number }> = [];

  // Labour
  const labourCost = calculationResult.costBreakdown?.labour || 0;
  servicesItems.push({
    description: 'Full Heat Pump & Cylinder Installation Labour',
    quantity: 1,
    unitPriceExVat: labourCost,
    totalPriceExVat: labourCost
  });

  // Lead Gen & Contingency
  const leadGenContingency = (calculationResult.costBreakdown?.leadGeneration || 0) + (calculationResult.costBreakdown?.extrasContingency || 0);
  if (leadGenContingency > 0) {
    servicesItems.push({
      description: 'Lead Acquisition & Contingency Allowance',
      quantity: 1,
      unitPriceExVat: leadGenContingency,
      totalPriceExVat: leadGenContingency
    });
  }

  // Combi Conversion (ONLY IF > 0)
  const combiCost = calculationResult.costBreakdown?.combiConversionAllowance || 0;
  if (combiCost > 0) {
    servicesItems.push({
      description: 'Combi Conversion & Plumbing Modification',
      quantity: 1,
      unitPriceExVat: combiCost,
      totalPriceExVat: combiCost
    });
  }

  const servicesTotal = servicesItems.reduce((sum, item) => sum + item.totalPriceExVat, 0);

  // 5. Commercial Totals
  const totalContractValueExVat = calculationResult.commercials?.requiredRevenue || calculationResult.costBreakdown?.totalJobCost || (goodsTotal + servicesTotal);
  const vat = 0.00;
  const busDeduction = calculationResult.bus?.grantAmount || calculationResult.commercials?.busGrant || 0;
  const customerContributionIncVat = calculationResult.commercials?.customerContribution || 0;

  // 6. Warranties
  const ashpBrand = calculationResult.ashp?.selectedProduct?.brand || 'Daikin';
  const cylinderBrand = calculationResult.cylinder?.selectedCylinder?.brand || 'Joule';

  // 7. Define Output Paths using os.tmpdir() (solves EROFS error on Vercel)
  const rootDir = path.resolve(__dirname, '../../../');
  const templatePath = path.resolve(rootDir, 'server/templates/Heat Pump Quotation.docx');
  
  if (!fs.existsSync(templatePath)) {
    throw new Error(`Master quotation template missing at ${templatePath}`);
  }

  const storageDir = path.join(os.tmpdir(), 'prime_energy_quotations');
  if (!fs.existsSync(storageDir)) {
    fs.mkdirSync(storageDir, { recursive: true });
  }

  const outputDocxPath = path.join(storageDir, `${quoteReference}.docx`);
  const outputPdfPath = path.join(storageDir, `${quoteReference}.pdf`);
  const pythonScriptPath = path.resolve(rootDir, 'server/src/scripts/generate_quotation.py');

  const payload = {
    templatePath,
    outputDocxPath,
    outputPdfPath,
    customerName,
    quoteReference,
    siteAddress,
    issuedBy: 'Prime Energy UK',
    dateIssued: formattedDateIssued,
    validUntil: formattedValidUntil,
    goodsItems,
    goodsTotal,
    servicesItems,
    servicesTotal,
    totalContractValueExVat,
    vat,
    busDeduction,
    customerContributionIncVat,
    ashpBrand,
    cylinderBrand
  };

  // 8. FIRST: Always populate DOCX in pure JS to guarantee completed DOCX file creation on any OS/Vercel
  fillDocxTemplatePureJs(templatePath, outputDocxPath, payload);

  // 9. NEXT: Safely check if Python is available for DOCX-to-PDF conversion (e.g. Windows local environment)
  let pythonExec: string | null = null;
  const absolutePythonPaths = [
    'C:\\Users\\M Tahseen\\AppData\\Local\\Python\\bin\\python.exe',
    'C:\\Python39\\python.exe',
    'C:\\Python310\\python.exe',
    'C:\\Python311\\python.exe',
    '/usr/bin/python3',
    '/usr/local/bin/python3'
  ];

  for (const p of absolutePythonPaths) {
    if (fs.existsSync(p)) {
      pythonExec = p;
      break;
    }
  }

  if (!pythonExec) {
    for (const cmd of ['python', 'python3']) {
      try {
        await execFileAsync(cmd, ['--version']);
        pythonExec = cmd;
        break;
      } catch {
        // Ignored: binary not found in PATH
      }
    }
  }

  if (pythonExec) {
    const payloadJsonPath = path.join(storageDir, `payload_${quoteReference}.json`);
    fs.writeFileSync(payloadJsonPath, JSON.stringify(payload, null, 2), 'utf8');

    try {
      await execFileAsync(pythonExec, [pythonScriptPath, payloadJsonPath]);
    } catch (err: any) {
      console.warn('[QuotationGenerator Notice]: Python script execution skipped:', err.message || err);
    } finally {
      if (fs.existsSync(payloadJsonPath)) {
        fs.unlinkSync(payloadJsonPath);
      }
    }
  } else {
    console.log('[QuotationGenerator Notice]: Python binary not present in runtime environment. Filled DOCX generated successfully via pure JS.');
  }

  const finalPdfPath = fs.existsSync(outputPdfPath) ? outputPdfPath : outputDocxPath;
  const generatedAt = new Date().toISOString();

  // 10. Update Quote Record in Database
  await db.run(`
    UPDATE quotes
    SET pdf_path = ?,
        docx_path = ?,
        valid_until = ?,
        template_version = 'v1.0',
        generated_at = ?
    WHERE id = ?
  `, [finalPdfPath, outputDocxPath, formattedValidUntil, generatedAt, quoteId]);

  return {
    quoteId,
    quoteReference,
    pdfPath: finalPdfPath,
    docxPath: outputDocxPath,
    validUntil: formattedValidUntil,
    generatedAt
  };
}
