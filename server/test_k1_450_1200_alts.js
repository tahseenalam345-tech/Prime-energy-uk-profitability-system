async function testAlternatives() {
  const candidates = [
    {
      title: 'Stelrad Compact K1 Single Panel Radiator 450mm x 1200mm 143688.',
      sku: '240677',
      url: 'https://www.cityplumbing.co.uk/p/stelrad-compact-k1-single-panel-radiator-450mm-x-1200mm-143688/p/240677'
    },
    {
      title: 'Stelrad Softline Compact K1 Single Panel Radiator 450mm x 1200mm 80451112.',
      sku: '422273',
      url: 'https://www.cityplumbing.co.uk/p/stelrad-softline-compact-k1-single-panel-radiator-450mm-x-1200mm-80451112/p/422273'
    },
    {
      title: 'Stelrad Elite K1 Single Panel Radiator 450mm x 1200mm 8469.',
      sku: '906174',
      url: 'https://www.cityplumbing.co.uk/p/stelrad-elite-k1-single-panel-radiator-450mm-x-1200mm-8469/p/906174'
    }
  ];

  for (const c of candidates) {
    console.log(`\nTesting: ${c.title} (SKU ${c.sku})`);
    try {
      const res = await fetch(c.url, {
        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' }
      });
      console.log(`Status: ${res.status}`);
      if (res.ok) {
        const html = await res.text();
        const match = html.match(/"tradePrice":\s*\{"valueExVat":\s*([0-9.]+),\s*"valueIncVat":\s*([0-9.]+)/);
        if (match) {
          const ex = parseFloat(match[1]);
          const inc = parseFloat(match[2]);
          const rate = Math.round(((inc / ex) - 1) * 100);
          console.log(`SUCCESS! tradePrice found: Ex VAT = £${ex}, Inc VAT = £${inc}, Rate = ${rate}%`);
          console.log(`Captured: ${match[0]}`);
        } else {
          console.log('Page loaded but tradePrice regex did not match.');
        }
      }
    } catch (e) {
      console.log(`Error: ${e.message}`);
    }
  }
}

testAlternatives().catch(console.error);
