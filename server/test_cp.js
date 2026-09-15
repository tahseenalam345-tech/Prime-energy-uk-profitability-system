async function main() {
  const url = 'https://8t85bv.a.searchspring.io/api/search/search.json?siteId=8t85bv&q=air+source+heat+pump&resultsPerPage=5';
  console.log('Fetching City Plumbing catalogue via SearchSpring API...');
  const res = await fetch(url);
  const data = await res.json();
  const items = data.results.split('<div class="item">');
  console.log('Total items in response:', items.length - 1);
  
  for (let i = 1; i < items.length; i++) {
    const html = items[i];
    
    // Extract title, url, sku, and price
    const altMatch = html.match(/alt="([^"]+)"/);
    const urlMatch = html.match(/href="([^"]+)"/);
    const priceMatch = html.match(/class="price[^"]*"[^>]*>([^<]+)</);
    const skuMatch = html.match(/\/p\/([0-9]+)/);
    
    // Derive title from alt attribute or slug
    let title = altMatch ? altMatch[1] : 'N/A';
    if (title === 'N/A' && urlMatch) {
      const slugMatch = urlMatch[1].match(/\/p\/([^/]+)\/p\//);
      if (slugMatch) {
        title = slugMatch[1].replace(/-/g, ' ').toUpperCase();
      }
    }

    console.log(`\n--- Item ${i} ---`);
    console.log('Title:', title);
    console.log('Product URL:', urlMatch ? urlMatch[1] : 'N/A');
    console.log('Price:', priceMatch ? `£${priceMatch[1].trim()}` : 'N/A');
    console.log('City Plumbing SKU:', skuMatch ? skuMatch[1] : 'N/A');
  }
}

main().catch(console.error);
