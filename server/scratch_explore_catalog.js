async function fetchPage() {
  const url = 'https://8t85bv.a.searchspring.io/api/search/search.json?siteId=8t85bv&q=stelrad+radiator&resultsPerPage=100&page=1';
  const res = await fetch(url);
  const data = await res.json();
  const rawItems = data.results.split('<div class="item">');
  console.log(`Page 1 returned ${rawItems.length - 1} items.`);
  for (let i = 1; i <= 5; i++) {
    const html = rawItems[i];
    const nameMatch = html.match(/class="name"[^>]*><a[^>]*>([^<]+)<\/a>/i);
    const urlMatch = html.match(/href="([^"]+)"/);
    const priceMatch = html.match(/class="price[^"]*"[^>]*>([^<]+)</);
    console.log(`- ${nameMatch ? nameMatch[1].trim() : 'N/A'} | Price: £${priceMatch ? priceMatch[1].trim() : 'N/A'}`);
  }
}

fetchPage().catch(console.error);
