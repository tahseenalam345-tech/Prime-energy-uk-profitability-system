import fs from 'fs';

async function fetchPage(page) {
  const url = `https://8t85bv.a.searchspring.io/api/search/search.json?siteId=8t85bv&q=radiator&resultsPerPage=100&page=${page}`;
  const res = await fetch(url);
  const data = await res.json();
  const items = [];
  if (data.results && typeof data.results === 'string') {
    const raw = data.results.split('<div class="item">');
    for (let i = 1; i < raw.length; i++) {
      const html = raw[i];
      const nameMatch = html.match(/class="name"[^>]*><a[^>]*>([^<]+)<\/a>/i);
      const urlMatch = html.match(/href="([^"]+)"/);
      const priceMatch = html.match(/class="price[^"]*"[^>]*>([^<]+)</);
      const skuMatch = urlMatch ? urlMatch[1].match(/\/p\/([0-9]+)$/) : null;
      if (nameMatch && priceMatch) {
        items.push({
          title: nameMatch[1].trim(),
          url: urlMatch ? urlMatch[1] : null,
          price: parseFloat(priceMatch[1].trim()),
          sku: skuMatch ? skuMatch[1] : null,
          page
        });
      }
    }
  }
  return items;
}

async function scrapeAll() {
  console.log('Fetching first page to check pagination...');
  const url = 'https://8t85bv.a.searchspring.io/api/search/search.json?siteId=8t85bv&q=radiator&resultsPerPage=100&page=1';
  const res = await fetch(url);
  const data = await res.json();
  const totalPages = data.pagination?.totalPages || 31;
  console.log(`Total results: ${data.pagination?.totalResults}, total pages: ${totalPages}`);

  const allItems = [];
  // Fetch with batch concurrency of 5
  for (let p = 1; p <= totalPages; p += 5) {
    const batch = [];
    for (let j = p; j < p + 5 && j <= totalPages; j++) {
      batch.push(fetchPage(j));
    }
    const results = await Promise.all(batch);
    for (const resList of results) {
      allItems.push(...resList);
    }
    console.log(`Fetched up to page ${Math.min(p + 4, totalPages)} / ${totalPages} (Total scraped: ${allItems.length})`);
  }

  console.log(`Scraping complete: ${allItems.length} radiators retrieved.`);
  fs.writeFileSync('./city_plumbing_all_radiators.json', JSON.stringify(allItems, null, 2));
}

scrapeAll().catch(console.error);
