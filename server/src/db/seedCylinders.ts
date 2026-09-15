import { db, initDatabase } from './connection.js';

export interface CylinderSeedItem {
  id: string;
  brand: string;
  manufacturer: string;
  model: string;
  sku: string;
  litres: number;
  category: string;
  priceExVat: number;
  supplier: string;
  supplierUrl: string;
  manufacturerUrl: string;
  dimensions: string; // H x D mm
  coilSurfaceM2: number;
}

export const CYLINDER_CATALOG: CylinderSeedItem[] = [
  {
    id: 'cyl_gledhill_150_hp',
    brand: 'Gledhill',
    manufacturer: 'Gledhill Building Products Ltd',
    model: 'StainlessLite Plus HP 150L Heat Pump Cylinder',
    sku: 'PLUHP150',
    litres: 150,
    category: 'Required',
    priceExVat: 825.00,
    supplier: 'City Plumbing',
    supplierUrl: 'https://www.cityplumbing.co.uk/search?q=Gledhill+Heat+Pump+Cylinder',
    manufacturerUrl: 'https://www.gledhill.net/products/cylinder-ranges/stainlesslite-plus/stainlesslite-plus-heat-pump/',
    dimensions: '1118mm x 550mm',
    coilSurfaceM2: 2.5
  },
  {
    id: 'cyl_gledhill_180_hp',
    brand: 'Gledhill',
    manufacturer: 'Gledhill Building Products Ltd',
    model: 'StainlessLite Plus HP 180L Heat Pump Cylinder',
    sku: 'PLUHP180',
    litres: 180,
    category: 'Required',
    priceExVat: 895.00,
    supplier: 'City Plumbing',
    supplierUrl: 'https://www.cityplumbing.co.uk/search?q=Gledhill+Heat+Pump+Cylinder',
    manufacturerUrl: 'https://www.gledhill.net/products/cylinder-ranges/stainlesslite-plus/stainlesslite-plus-heat-pump/',
    dimensions: '1306mm x 550mm',
    coilSurfaceM2: 2.8
  },
  {
    id: 'cyl_gledhill_200_hp',
    brand: 'Gledhill',
    manufacturer: 'Gledhill Building Products Ltd',
    model: 'StainlessLite Plus HP 200L High Gain Unvented Cylinder',
    sku: 'PLUHP200',
    litres: 200,
    category: 'Required',
    priceExVat: 945.00,
    supplier: 'City Plumbing',
    supplierUrl: 'https://www.cityplumbing.co.uk/search?q=Gledhill+Heat+Pump+Cylinder',
    manufacturerUrl: 'https://www.gledhill.net/products/cylinder-ranges/stainlesslite-plus/stainlesslite-plus-heat-pump/',
    dimensions: '1494mm x 550mm',
    coilSurfaceM2: 3.0
  },
  {
    id: 'cyl_gledhill_250_hp',
    brand: 'Gledhill',
    manufacturer: 'Gledhill Building Products Ltd',
    model: 'StainlessLite Plus HP 250L High Gain Unvented Cylinder',
    sku: 'PLUHP250',
    litres: 250,
    category: 'Required',
    priceExVat: 1095.00,
    supplier: 'City Plumbing',
    supplierUrl: 'https://www.cityplumbing.co.uk/search?q=Gledhill+Heat+Pump+Cylinder',
    manufacturerUrl: 'https://www.gledhill.net/products/cylinder-ranges/stainlesslite-plus/stainlesslite-plus-heat-pump/',
    dimensions: '1744mm x 550mm',
    coilSurfaceM2: 3.3
  },
  {
    id: 'cyl_gledhill_300_hp',
    brand: 'Gledhill',
    manufacturer: 'Gledhill Building Products Ltd',
    model: 'StainlessLite Plus HP 300L High Gain Unvented Cylinder',
    sku: 'PLUHP300',
    litres: 300,
    category: 'Required',
    priceExVat: 1250.00,
    supplier: 'City Plumbing',
    supplierUrl: 'https://www.cityplumbing.co.uk/search?q=Gledhill+Heat+Pump+Cylinder',
    manufacturerUrl: 'https://www.gledhill.net/products/cylinder-ranges/stainlesslite-plus/stainlesslite-plus-heat-pump/',
    dimensions: '2050mm x 550mm',
    coilSurfaceM2: 3.8
  },
  {
    id: 'cyl_joule_cyclone_200',
    brand: 'Joule',
    manufacturer: 'Joule UK',
    model: 'Joule Cyclone HP 200L High Gain Cylinder',
    sku: 'TCHPMV-0200LFC',
    litres: 200,
    category: 'Required',
    priceExVat: 980.00,
    supplier: 'Wolseley UK',
    supplierUrl: 'https://www.wolseley.co.uk/search?q=Joule+Cyclone+Heat+Pump',
    manufacturerUrl: 'https://www.jouleuk.co.uk/cyclone-heat-pump-cylinder/',
    dimensions: '1475mm x 545mm',
    coilSurfaceM2: 3.0
  },
  {
    id: 'cyl_joule_cyclone_250',
    brand: 'Joule',
    manufacturer: 'Joule UK',
    model: 'Joule Cyclone HP 250L High Gain Cylinder',
    sku: 'TCHPMV-0250LFC',
    litres: 250,
    category: 'Required',
    priceExVat: 1140.00,
    supplier: 'Wolseley UK',
    supplierUrl: 'https://www.wolseley.co.uk/search?q=Joule+Cyclone+Heat+Pump',
    manufacturerUrl: 'https://www.jouleuk.co.uk/cyclone-heat-pump-cylinder/',
    dimensions: '1725mm x 545mm',
    coilSurfaceM2: 3.3
  },
  {
    id: 'cyl_telford_tornado_200',
    brand: 'Telford',
    manufacturer: 'Telford Copper Cylinders Ltd',
    model: 'Telford Tornado 200L Stainless Steel Heat Pump Cylinder',
    sku: 'TT200HP',
    litres: 200,
    category: 'Required',
    priceExVat: 920.00,
    supplier: 'City Plumbing',
    supplierUrl: 'https://www.cityplumbing.co.uk/search?q=Telford+Tornado+Heat+Pump',
    manufacturerUrl: 'https://www.telford-group.com/tornado-heat-pump',
    dimensions: '1500mm x 550mm',
    coilSurfaceM2: 3.0
  },
  {
    id: 'cyl_telford_tornado_250',
    brand: 'Telford',
    manufacturer: 'Telford Copper Cylinders Ltd',
    model: 'Telford Tornado 250L Stainless Steel Heat Pump Cylinder',
    sku: 'TT250HP',
    litres: 250,
    category: 'Required',
    priceExVat: 1060.00,
    supplier: 'City Plumbing',
    supplierUrl: 'https://www.cityplumbing.co.uk/search?q=Telford+Tornado+Heat+Pump',
    manufacturerUrl: 'https://www.telford-group.com/tornado-heat-pump',
    dimensions: '1750mm x 550mm',
    coilSurfaceM2: 3.3
  },
  {
    id: 'cyl_megaflo_eco_250',
    brand: 'Megaflo',
    manufacturer: 'Baxi Heating UK / Heatrae Sadia',
    model: 'Megaflo Eco 250L Heat Pump Cylinder',
    sku: '95050474',
    litres: 250,
    category: 'Required',
    priceExVat: 1450.00,
    supplier: 'City Plumbing',
    supplierUrl: 'https://www.cityplumbing.co.uk/search?q=Megaflo+Eco+Heat+Pump',
    manufacturerUrl: 'https://www.heatraesadia.com/products/cylinders/unvented-cylinders/megaflo-eco-heat-pump',
    dimensions: '1738mm x 579mm',
    coilSurfaceM2: 3.3
  }
];

export async function seedCylinders() {
  await initDatabase();
  console.log('Seeding enriched Hot Water Cylinder catalog...');

  const stmts: Array<{ sql: string; args?: any[] }> = [];

  for (const cyl of CYLINDER_CATALOG) {
    const specs = JSON.stringify({
      volumeLitres: cyl.litres,
      dimensions: cyl.dimensions,
      coilSurfaceM2: cyl.coilSurfaceM2,
      unvented: true
    });

    stmts.push({
      sql: `
        INSERT OR REPLACE INTO products (
          id, family, brand, manufacturer, product_family, model, sku, category,
          product_type, system_type, nominal_capacity, marketing_nominal_kw,
          specifications, product_source, capacity_source_url, source_date,
          data_confidence, verification_status, active, notes, updated_at
        ) VALUES (?, 'CYLINDER', ?, ?, 'Domestic HW Cylinder', ?, ?, ?, 'Unvented Cylinder', 'Indirect High Recovery', ?, ?, ?, ?, ?, '2026-09-12', 'HIGH', 'VERIFIED', 1, ?, CURRENT_TIMESTAMP)
      `,
      args: [
        cyl.id,
        cyl.brand,
        cyl.manufacturer,
        cyl.model,
        cyl.sku,
        cyl.category,
        cyl.litres,
        cyl.litres,
        specs,
        cyl.supplier,
        cyl.manufacturerUrl,
        `Official Manufacturer Spec Sheet & Merchant Price List. Dimensions: ${cyl.dimensions}. High gain heat pump coil: ${cyl.coilSurfaceM2} m².`
      ]
    });

    const priceIncVat = Math.round(cyl.priceExVat * 1.20 * 100) / 100;
    stmts.push({
      sql: `
        INSERT OR REPLACE INTO product_prices (
          id, product_id, supplier, source_type, source_url, price_basis,
          date_collected, price_ex_vat, price_inc_vat, vat_rate, currency,
          unit, availability, confidence, is_current, notes
        ) VALUES (?, ?, ?, 'CITY_PLUMBING', ?, 'EX_VAT', '2026-09-12', ?, ?, 0.20, 'GBP', 'EACH', 'In stock', 'MARKET_CONFIRMED', 1, ?)
      `,
      args: [
        `price_${cyl.id}`,
        cyl.id,
        cyl.supplier,
        cyl.supplierUrl,
        cyl.priceExVat,
        priceIncVat,
        `Trade price ex VAT: £${cyl.priceExVat.toFixed(2)}. Inc 20% VAT: £${priceIncVat.toFixed(2)}.`
      ]
    });
  }

  await db.batch(stmts, 'write');
  console.log(`Successfully seeded ${CYLINDER_CATALOG.length} enriched domestic heat pump cylinders.`);
}

if (process.argv[1]?.includes('seedCylinders.ts') || process.argv[1]?.includes('seedCylinders.js')) {
  seedCylinders();
}
