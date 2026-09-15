// Research script to test City Plumbing queries for radiators
async function searchCP(q) {
  const url = `https://8t85bv.a.searchspring.io/api/search/search.json?siteId=8t85bv&q=${encodeURIComponent(q)}&resultsPerPage=10`;
  const res = await fetch(url);
  const data = await res.json();
  const items = [];
  if (data.results && typeof data.results === 'string') {
    const rawItems = data.results.split('<div class="item">');
    for (let i = 1; i < rawItems.length; i++) {
      const html = rawItems[i];
      const nameMatch = html.match(/class="name"[^>]*><a[^>]*>([^<]+)<\/a>/i);
      const urlMatch = html.match(/href="([^"]+)"/);
      const priceMatch = html.match(/class="price[^"]*"[^>]*>([^<]+)</);
      const skuMatch = urlMatch ? urlMatch[1].match(/\/p\/([0-9]+)$/) : null;
      if (nameMatch && priceMatch) {
        items.push({
          title: nameMatch[1].trim(),
          url: urlMatch ? urlMatch[1] : null,
          price: parseFloat(priceMatch[1].trim()),
          sku: skuMatch ? skuMatch[1] : null
        });
      }
    }
  }
  return { total: data.pagination?.totalResults || 0, items };
}

async function testSizes() {
  const tests = [
    'stelrad k1 300 400',
    'stelrad 300 x 400 k1',
    'stelrad compact k1 300 400',
    'stelrad compact 300 400',
    'stelrad k1 450 1000',
    'stelrad p+ 600 1000',
    'stelrad k2 600 1000',
    'stelrad k2 700 1000',
    'stelrad k1 900 600',
    'stelrad k2 900 1000',
    'stelrad 900 x 1000',
    'henrad k1 600 1000',
    'type 11 radiator 600 1000',
    'type 21 radiator 600 1000',
    'type 22 radiator 600 1000'
  ];

  for (const t of tests) {
    const res = await searchCP(t);
    console.log(`\nQuery: "${t}" (Total found: ${res.total})`);
    for (const item of res.items.slice(0, 2)) {
      console.log(`  -> ${item.title} | £${item.price} (SKU: ${item.sku})`);
    }
  }
}

testSizes().catch(console.error);
