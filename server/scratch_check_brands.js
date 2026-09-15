async function checkRadiators() {
  const url = `https://8t85bv.a.searchspring.io/api/search/search.json?siteId=8t85bv&q=radiator&resultsPerPage=1`;
  const res = await fetch(url);
  const data = await res.json();
  console.log('Total radiators on City Plumbing:', data.pagination?.totalResults);
}

checkRadiators().catch(console.error);
