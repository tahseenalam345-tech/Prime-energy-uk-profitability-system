async function test() {
  const token = (process.env.GOVUK_EPC_BEARER_TOKEN || process.env.EPC_BEARER_TOKEN || 'YVgjOxtlwNKbl0s8zmZ8sN3PU6HTyv81MUsnlsjGk3ERwYtKdwQ2jl3TotSEsklm').trim();
  const postcodes = ['WA158XL', 'SW1A1AA', 'B11AA', 'CH11AA', 'AL11AA', 'LS11AA', 'M202WW', 'CR01AA', 'E161AA'];
  
  for (const pc of postcodes) {
    const searchUrl = `https://api.get-energy-performance-data.communities.gov.uk/api/domestic/search?postcode=${pc}`;
    const res = await fetch(searchUrl, { headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' } });
    const json: any = await res.json();
    
    if (json.data && json.data.length > 0) {
      for (const c of json.data.slice(0, 3)) {
        const detailUrl = `https://api.get-energy-performance-data.communities.gov.uk/api/certificate?certificate_number=${c.certificateNumber}`;
        const dres = await fetch(detailUrl, { headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' } });
        const djson: any = await dres.json();
        const d = djson.data || {};
        
        const space = d.space_heating_demand ?? d.renewable_heat_incentive?.space_heating_existing_dwelling ?? d.renewable_heat_incentive?.space_heating ?? d.space_heating_existing_dwelling;
        const water = d.water_heating_demand ?? d.renewable_heat_incentive?.water_heating ?? d.water_heating_existing_dwelling;

        console.log(`Postcode: ${pc} | Cert: ${c.certificateNumber} (${d.registration_date})`);
        console.log(`  Extracted -> Space: ${space} | Water: ${water}`);
        if (space === undefined || water === undefined) {
          const matchingKeys = Object.keys(d).filter(k => k.includes('heat') || k.includes('demand') || k.includes('energy') || k.includes('space') || k.includes('water'));
          console.log('  Related keys present in d:', matchingKeys);
          console.log('  Full d sample keys/vals:', {
            renewable_heat_incentive: d.renewable_heat_incentive,
            energy_consumption_current: d.energy_consumption_current,
            total_floor_area: d.total_floor_area
          });
        }
      }
    }
  }
}

test();
