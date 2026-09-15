import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const db = new Database(path.resolve(__dirname, 'prime_energy.db'));

console.log('Adding 3 Test Properties to Prime Energy database...');

const insertLead = db.prepare(`
  INSERT OR REPLACE INTO leads (id, reference_no, customer_name, email, phone, lead_source, status, assigned_to)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?)
`);

const insertProp = db.prepare(`
  INSERT OR REPLACE INTO properties (
    id, lead_id, address_line1, address_line2, postcode, country,
    epc_rating, epc_floor_area, property_type, property_status,
    bedrooms, bathrooms, ownership, wall_insulation, roof_insulation,
    existing_heating_system, boiler_type, on_off_gas_grid,
    cylinder_space, existing_radiator_count, existing_pipework,
    previous_government_grant, fuse_board_condition, conservation_area,
    boundary_planning_risk, listed_building, sales_notes
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`);

// TEST A: Low heat demand ~4kW
insertLead.run(
  'lead_test_a',
  'TEST-DEMO-A',
  '[TEST DATA] Test A - Low Demand (~4kW)',
  'test.a.low@example.co.uk',
  '07700 900901',
  'TEST_SUITE',
  'NEW',
  'user_sales'
);
insertProp.run(
  'prop_test_a',
  'lead_test_a',
  '12 Greenfield Way',
  'Clifton',
  'BS1 4AA',
  'England',
  'C',
  100.0,
  'Semi detached',
  'Existing property',
  2,
  1,
  'Owner-occupier',
  'Insulated',
  'Insulated',
  'Gas Central Heating',
  'Combi',
  'On gas grid',
  'Yes',
  8,
  'Standard 15mm+',
  'None',
  'Modern',
  'No',
  'No',
  'No',
  '[TEST DATA] Target heat demand: ~4.0 kW (100 m² @ 40 W/m² C-Rating x 1.0 multiplier). Expected unit: ~4kW ASHP.'
);

// TEST B: Medium heat demand ~7kW
insertLead.run(
  'lead_test_b',
  'TEST-DEMO-B',
  '[TEST DATA] Test B - Medium Demand (~7kW)',
  'test.b.med@example.co.uk',
  '07700 900902',
  'TEST_SUITE',
  'NEW',
  'user_sales'
);
insertProp.run(
  'prop_test_b',
  'lead_test_b',
  '45 Oakfield Road',
  'Headingley',
  'LS6 2NW',
  'England',
  'D',
  130.0,
  'Semi detached',
  'Existing property',
  3,
  1,
  'Owner-occupier',
  'Insulated',
  'Insulated',
  'Gas Central Heating',
  'Combi',
  'On gas grid',
  'Yes',
  11,
  'Standard 15mm+',
  'None',
  'Modern',
  'No',
  'No',
  'No',
  '[TEST DATA] Target heat demand: ~7.15 kW (130 m² @ 55 W/m² D-Rating x 1.0 multiplier). Expected unit: ~7kW / 8kW rated ASHP.'
);

// TEST C: Higher heat demand ~10kW
insertLead.run(
  'lead_test_c',
  'TEST-DEMO-C',
  '[TEST DATA] Test C - High Demand (~10kW)',
  'test.c.high@example.co.uk',
  '07700 900903',
  'TEST_SUITE',
  'NEW',
  'user_sales'
);
insertProp.run(
  'prop_test_c',
  'lead_test_c',
  'Highfields House, Church Lane',
  'Pannal',
  'HG3 1AA',
  'England',
  'D',
  160.0,
  'Detached',
  'Existing property',
  4,
  2,
  'Owner-occupier',
  'Insulated',
  'Insulated',
  'Oil Boiler',
  'Regular',
  'Off gas grid',
  'Yes',
  15,
  'Standard 15mm+',
  'None',
  'Modern',
  'No',
  'No',
  'No',
  '[TEST DATA] Target heat demand: ~10.12 kW (160 m² @ 55 W/m² D-Rating x 1.15 Detached multiplier). Expected unit: ~10kW rated ASHP. £9k off-gas grant.'
);

// Also ensure brand is populated for baseline products
db.prepare("UPDATE products SET brand = manufacturer WHERE brand IS NULL").run();

console.log('3 Test properties created successfully in database!');
