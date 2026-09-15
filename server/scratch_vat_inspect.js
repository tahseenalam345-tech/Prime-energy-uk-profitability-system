import fs from 'fs';

async function check() {
  const itemUrl = 'https://www.cityplumbing.co.uk/p/stelrad-vita-compact-single-radiator-450-x-900mm-764511090/p/946720';
  const pageRes = await fetch(itemUrl, {
    headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' }
  });
  const pageHtml = await pageRes.text();

  // Find all occurrences of 83.06 in the HTML
  let pos = 0;
  while ((pos = pageHtml.indexOf('83.06', pos)) !== -1) {
    console.log(`\nOccurrence of 83.06 at index ${pos}:`);
    console.log(pageHtml.slice(Math.max(0, pos - 150), pos + 250));
    pos += 5;
  }
}

check().catch(console.error);
