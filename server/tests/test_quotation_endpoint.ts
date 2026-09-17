import { calculateNewLeadEstimate } from '../src/engine/newLeadCalculator.js';
import { generateQuotationDocument } from '../src/services/quotationGenerator.js';
import db, { initDatabase } from '../src/db/connection.js';
import fs from 'fs';

async function main() {
  console.log("=== STARTING END-TO-END MODE A QUOTATION GENERATION TEST ===");
  
  await initDatabase();

  // 1. Create a test lead
  const leadId = `lead_test_quotation_${Date.now()}`;
  const refNo = `PEL-${Date.now().toString().slice(-6)}`;
  await db.run(`
    INSERT INTO leads (id, reference_no, customer_name, email, phone, status, lead_source)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `, [leadId, refNo, 'Arthur Pendelton', 'arthur.p@example.com', '07700900123', 'NEW', 'Website']);

  await db.run(`
    INSERT INTO properties (id, lead_id, address_line1, address_line2, postcode, country, property_type, property_status, epc_rating, epc_floor_area)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `, [`prop_${Date.now()}`, leadId, '14 Oakridge Avenue', 'Cheshire', 'WA15 8XL', 'England', 'Detached', 'Existing property', 'D', 140]);

  // 2. Perform Mode A Calculation
  const calcResult = await calculateNewLeadEstimate({
    addressLine1: '14 Oakridge Avenue',
    postcode: 'WA15 8XL',
    country: 'England',
    epcRating: 'D',
    epcFloorArea: 140,
    propertyType: 'Detached',
    propertyStatus: 'Existing property',
    bedrooms: 4,
    bathrooms: 2,
    wallInsulation: 'Cavity filled',
    roofInsulation: '200mm loft',
    existingHeatingSystem: 'System boiler',
    onOffGasGrid: 'On-gas grid'
  });

  console.log("Mode A Calculation Completed:");
  console.log(`- Recommended ASHP: ${calcResult.ashp.selectedProduct?.model}`);
  console.log(`- Recommended Cylinder: ${calcResult.cylinder.selectedCylinder?.model}`);
  console.log(`- Goods Total: £${calcResult.costBreakdown.equipmentMaterials}`);
  console.log(`- Services Total: £${calcResult.costBreakdown.labour}`);
  console.log(`- Total Contract Value: £${calcResult.commercials.requiredRevenue}`);
  console.log(`- BUS Grant: £${calcResult.bus.grantAmount}`);
  console.log(`- Customer Contribution: £${calcResult.commercials.customerContribution}`);

  // 3. Save Quote
  const quoteId = `quote_test_${Date.now()}`;
  const quoteRef = `PEQ-2026-${Math.floor(1000 + Math.random() * 9000)}`;

  await db.run(`
    INSERT INTO quotes (
      id, quote_reference, lead_id, mode, total_job_cost, bus_grant,
      required_revenue, customer_contribution, actual_revenue, gross_profit,
      gross_margin_percent, commercial_recommendation, created_by
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `, [
    quoteId, quoteRef, leadId, 'NEW_LEAD',
    calcResult.costBreakdown.totalJobCost,
    calcResult.bus.grantAmount,
    calcResult.commercials.requiredRevenue,
    calcResult.commercials.customerContribution,
    calcResult.commercials.actualRevenue,
    calcResult.commercials.grossProfit,
    calcResult.commercials.grossMarginPercent,
    calcResult.recommendation.status,
    'user_sales'
  ]);

  // 4. Generate Quotation
  const genResult = await generateQuotationDocument({
    quoteId,
    quoteReference: quoteRef,
    leadId,
    calculationResult: calcResult,
    userId: 'user_sales'
  });

  console.log("\nGenerated Quotation Result:");
  console.log(`- Quote ID: ${genResult.quoteId}`);
  console.log(`- Quote Reference: ${genResult.quoteReference}`);
  console.log(`- PDF Path: ${genResult.pdfPath}`);
  console.log(`- DOCX Path: ${genResult.docxPath}`);
  console.log(`- Valid Until: ${genResult.validUntil}`);
  console.log(`- Generated At: ${genResult.generatedAt}`);

  // Check files exist
  const pdfExists = genResult.pdfPath ? fs.existsSync(genResult.pdfPath) : false;
  const docxExists = fs.existsSync(genResult.docxPath);
  console.log(`- PDF Exists: ${pdfExists}`);
  console.log(`- DOCX Exists: ${docxExists}`);

  if (docxExists) {
    console.log("\n=== END-TO-END TEST PASSED SUCCESSFULLY ===");
  } else {
    console.error("\n=== TEST FAILED: MISSING DOCX FILE ===");
    process.exit(1);
  }

  // Cleanup test lead & quote from database
  await db.run('DELETE FROM quote_line_items WHERE quote_id = ?', [quoteId]);
  await db.run('DELETE FROM quotes WHERE id = ?', [quoteId]);
  await db.run('DELETE FROM properties WHERE lead_id = ?', [leadId]);
  await db.run('DELETE FROM leads WHERE id = ?', [leadId]);
}

main().catch(err => {
  console.error("Test Error:", err);
  process.exit(1);
});
