async function check() {
  const url = 'https://8t85bv.a.searchspring.io/api/search/search.json?siteId=8t85bv&q=p%2B+450+radiator';
  const res = await fetch(url);
  const data = await res.json();
  const items = data.results.split('<div class="item">');
  for (let i = 1; i < Math.min(items.length, 10); i++) {
    const nameMatch = items[i].match(/class="name"[^>]*><a[^>]*>([^<]+)<\/a>/i);
    console.log(nameMatch ? nameMatch[1].trim() : 'N/A');
  }
}
check().catch(console.error);
