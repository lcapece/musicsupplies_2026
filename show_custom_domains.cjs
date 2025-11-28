const fs = require('fs');
const sites = JSON.parse(fs.readFileSync('netlify_sites.json', 'utf8'));

console.log('\n=== SITES WITH CUSTOM DOMAINS ===\n');
const customDomainSites = sites.filter(s => s.custom_domain);
customDomainSites.forEach((site, i) => {
    const updatedAt = site.updated_at ? new Date(site.updated_at).toISOString().replace('T', ' ').substr(0, 19) : 'N/A';
    console.log((i + 1) + '. ' + site.name);
    console.log('   Custom Domain: ' + site.custom_domain);
    console.log('   Netlify Domain: https://' + site.default_domain);
    console.log('   Project ID: ' + site.id);
    console.log('   Last Updated: ' + updatedAt);
    console.log('');
});
