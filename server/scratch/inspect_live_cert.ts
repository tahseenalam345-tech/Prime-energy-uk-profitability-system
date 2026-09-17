async function searchMoreCerts() {
  const token = (process.env.GOVUK_EPC_BEARER_TOKEN || process.env.EPC_BEARER_TOKEN || 'YVgjOxtlwNKbl0s8zmZ8sN3PU6HTyv81MUsnlsjGk3ERwYtKdwQ2jl3TotSEsklm').trim();
  const postcodes = ['B1+1AA', 'M20+2WW', 'SW1A+2AA', 'WA15+8XL', 'CH1+1AA', 'AL1+1AA'];
  
  for (const pc of postcodes) {
    const searchUrl = `https://api.get-energy-performance-data.communities.gov.uk/api/domestic/search?postcode=${pc}`;
    const searchRes = await fetch(searchUrl, {
      headers: { 'Authorization': `Bearer ${token}`, 'Accept': 'application/json' }
    });
    if (searchRes.status === 200) {
      const searchJson: any = await searchRes.json();
      const certs = searchJson.data || [];
      console.log(`Postcode ${pc}: Found ${certs.length} certificates.`);
      if (certs.length > 0) {
        for (const c of certs.slice(0, 3)) {
          const detailUrl = `https://api.get-energy-performance-data.communities.gov.uk/api/certificate?certificate_number=${c.certificateNumber}`;
          const detailRes = await fetch(detailUrl, {
            headers: { 'Authorization': `Bearer ${token}`, 'Accept': 'application/json' }
          });
          const detailJson: any = await detailRes.json();
          const d = detailJson.data || {};
          console.log(`- Cert: ${c.certificateNumber} | RegDate: ${d.registration_date || c.registrationDate}`);
          console.log(`  space_heating_demand: ${d.space_heating_demand} | heating_demand: ${d.heating_demand} | space_heating: ${JSON.stringify(d.space_heating)}`);
          console.log(`  water_heating_demand: ${d.water_heating_demand} | hot_water_demand: ${d.hot_water_demand} | water_heating: ${JSON.stringify(d.water_heating)}`);
          console.log(`  energy_consumption_current: ${d.energy_consumption_current} | total_floor_area: ${d.total_floor_area}`);
          console.log(`  walls: ${JSON.stringify(d.walls)}`);
          console.log(`  roofs: ${JSON.stringify(d.roofs)}`);
          console.log(`  main_heating: ${JSON.stringify(d.main_heating)}`);
        }
      }
    }
  }
}

searchMoreCerts();
