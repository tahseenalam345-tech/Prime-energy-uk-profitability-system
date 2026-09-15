async function main() {
  const url = 'https://www.cityplumbing.co.uk/p/stelrad-planar-k2-600-x-1000-140956/p/423459';
  console.log('Fetching', url);
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      }
    });
    console.log('Status:', res.status);
    const html = await res.text();
    console.log('HTML length:', html.length);
    
    // Look for price or vat indicators in HTML
    const vatMatches = html.match(/.{0,50}(?:inc|ex|including|excluding)\s*vat.{0,50}/gi);
    console.log('VAT mentions in page:', vatMatches?.slice(0, 5));
    
    const priceMatches = html.match(/.{0,50}532\.87.{0,50}/gi);
    console.log('532.87 matches:', priceMatches);
  } catch (err) {
    console.error('Fetch error:', err.message);
  }
}

main().catch(console.error);
