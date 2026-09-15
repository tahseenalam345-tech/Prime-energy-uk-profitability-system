import { db, initDatabase } from './connection.js';
import { ashpSeedData } from './ashpProductsSeed.js';

export async function seedAshpDatabase() {
  await initDatabase();
  console.log(`Starting ASHP Product & Pricing Database seed (${ashpSeedData.length} models)...`);

  const statements: Array<{ sql: string; args?: any[] }> = [];

  for (const item of ashpSeedData) {
    statements.push({
      sql: `
        INSERT INTO products (
          id, family, brand, manufacturer, product_family, model, sku, category,
          product_type, system_type, nominal_capacity, marketing_nominal_kw,
          rated_output_at_design, rated_output_kw, rated_output_condition,
          design_temperature, flow_temperature, capacity_source, capacity_source_url,
          refrigerant, phase, electrical_requirements, specifications, product_source,
          source_date, mcs_status, mcs_product_name, mcs_manufacturer, mcs_product_reference,
          mcs_directory_url, mcs_verification_date, mcs_standard_version, mcs_notes,
          ofgem_pel_status, ofgem_pel_version, ofgem_source_url, bus_product_eligibility_status,
          data_confidence, manual_review_required, verification_status, notes, active
        ) VALUES (
          ?, ?, ?, ?, ?, ?, ?, ?,
          ?, ?, ?, ?,
          ?, ?, ?,
          ?, ?, ?, ?,
          ?, ?, ?, ?, ?,
          ?, ?, ?, ?, ?,
          ?, ?, ?, ?,
          ?, ?, ?, ?,
          ?, ?, ?, ?, 1
        )
        ON CONFLICT(id) DO UPDATE SET
          brand = excluded.brand,
          manufacturer = excluded.manufacturer,
          product_family = excluded.product_family,
          model = excluded.model,
          sku = excluded.sku,
          category = excluded.category,
          product_type = excluded.product_type,
          system_type = excluded.system_type,
          nominal_capacity = excluded.nominal_capacity,
          marketing_nominal_kw = excluded.marketing_nominal_kw,
          rated_output_at_design = excluded.rated_output_at_design,
          rated_output_kw = excluded.rated_output_kw,
          rated_output_condition = excluded.rated_output_condition,
          design_temperature = excluded.design_temperature,
          flow_temperature = excluded.flow_temperature,
          capacity_source = excluded.capacity_source,
          capacity_source_url = excluded.capacity_source_url,
          refrigerant = excluded.refrigerant,
          phase = excluded.phase,
          electrical_requirements = excluded.electrical_requirements,
          specifications = excluded.specifications,
          product_source = excluded.product_source,
          source_date = excluded.source_date,
          mcs_status = excluded.mcs_status,
          mcs_product_name = excluded.mcs_product_name,
          mcs_manufacturer = excluded.mcs_manufacturer,
          mcs_product_reference = excluded.mcs_product_reference,
          mcs_directory_url = excluded.mcs_directory_url,
          mcs_verification_date = excluded.mcs_verification_date,
          mcs_standard_version = excluded.mcs_standard_version,
          mcs_notes = excluded.mcs_notes,
          ofgem_pel_status = excluded.ofgem_pel_status,
          ofgem_pel_version = excluded.ofgem_pel_version,
          ofgem_source_url = excluded.ofgem_source_url,
          bus_product_eligibility_status = excluded.bus_product_eligibility_status,
          data_confidence = excluded.data_confidence,
          manual_review_required = excluded.manual_review_required,
          verification_status = excluded.verification_status,
          notes = excluded.notes,
          active = 1,
          updated_at = CURRENT_TIMESTAMP
      `,
      args: [
        item.id,
        'ASHP',
        item.brand,
        item.manufacturer,
        item.product_family,
        item.model,
        item.sku,
        item.category,
        item.product_type,
        item.system_type,
        item.marketing_nominal_kw,
        item.marketing_nominal_kw,
        item.rated_output_kw,
        item.rated_output_kw,
        item.rated_output_condition,
        item.design_temperature,
        item.flow_temperature,
        item.capacity_source,
        item.capacity_source_url,
        item.refrigerant,
        item.phase,
        item.electrical_requirements,
        JSON.stringify(item.specifications),
        item.product_source,
        item.source_date,
        item.mcs_status,
        item.mcs_product_name,
        item.mcs_manufacturer,
        item.mcs_product_reference,
        item.mcs_directory_url,
        item.mcs_verification_date,
        item.mcs_standard_version,
        item.mcs_notes,
        item.ofgem_pel_status,
        item.ofgem_pel_version,
        item.ofgem_source_url,
        item.bus_product_eligibility_status,
        item.data_confidence,
        item.manual_review_required,
        item.verification_status,
        item.notes
      ]
    });

    for (let idx = 0; idx < item.prices.length; idx++) {
      const p = item.prices[idx];
      const priceId = `price_${item.id}_${p.source_type.toLowerCase()}_${idx}`;
      statements.push({
        sql: `
          INSERT INTO product_prices (
            id, product_id, supplier, source_type, source_url, price_basis,
            date_collected, price_captured_at, price_ex_vat, price_inc_vat,
            vat_rate, currency, unit, availability, confidence, is_current, notes
          ) VALUES (
            ?, ?, ?, ?, ?, ?,
            ?, ?, ?, ?,
            0.0, ?, 'EACH', ?, ?, 1, ?
          )
          ON CONFLICT(id) DO UPDATE SET
            price_ex_vat = excluded.price_ex_vat,
            price_inc_vat = excluded.price_inc_vat,
            availability = excluded.availability,
            confidence = excluded.confidence,
            notes = excluded.notes
        `,
        args: [
          priceId,
          item.id,
          p.supplier,
          p.source_type,
          p.source_url,
          p.price_basis,
          p.captured_at,
          p.captured_at + 'T12:00:00Z',
          p.price_ex_vat,
          p.price_inc_vat,
          p.currency,
          p.availability,
          p.confidence,
          p.notes || null
        ]
      });
    }
  }

  for (let i = 0; i < statements.length; i += 100) {
    await db.batch(statements.slice(i, i + 100), 'write');
  }

  console.log(`ASHP Database seed complete: ${ashpSeedData.length} models seeded.`);
}

if (process.argv[1]?.includes('seedAshp')) {
  seedAshpDatabase();
}
