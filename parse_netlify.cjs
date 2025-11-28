const fs = require('fs');

// Read the JSON file
const sites = JSON.parse(fs.readFileSync('netlify_sites.json', 'utf8'));

// Prepare CSV headers
const headers = ['Project Name', 'Site URL', 'Default Domain', 'Custom Domain', 'Project ID', 'Last Updated', 'Created At', 'Deploy Status', 'SSL Status', 'Repository'];

// Prepare CSV data
const csvData = sites.map(site => {
    const updatedAt = site.updated_at ? new Date(site.updated_at).toISOString().replace('T', ' ').substr(0, 19) : 'N/A';
    const createdAt = site.created_at ? new Date(site.created_at).toISOString().replace('T', ' ').substr(0, 19) : 'N/A';

    return [
        site.name || 'N/A',
        'https://' + (site.default_domain || 'N/A'),
        site.default_domain || 'N/A',
        site.custom_domain || 'None',
        site.id || 'N/A',
        updatedAt,
        createdAt,
        (site.published_deploy && site.published_deploy.state) || 'N/A',
        site.ssl_status || 'N/A',
        site.repo_url || 'None'
    ];
});

// Sort by last updated (most recent first)
csvData.sort((a, b) => {
    const dateA = a[5] === 'N/A' ? new Date(0) : new Date(a[5]);
    const dateB = b[5] === 'N/A' ? new Date(0) : new Date(b[5]);
    return dateB - dateA;
});

// Create CSV content
let csvContent = headers.map(h => '"' + h + '"').join(',') + '\n';
csvContent += csvData.map(row => row.map(cell => '"' + String(cell).replace(/"/g, '""') + '"').join(',')).join('\n');

// Write to CSV file
fs.writeFileSync('netlify_sites.csv', csvContent);

console.log('Successfully exported ' + sites.length + ' Netlify sites to netlify_sites.csv\n');
console.log('Preview of sites (most recently updated first):');
csvData.slice(0, 10).forEach((site, i) => {
    console.log((i + 1) + '. ' + site[0] + ' - ' + site[1]);
    console.log('   Last updated: ' + site[5]);
});

// Also create a summary
console.log('\n=== SUMMARY ===');
console.log('Total sites: ' + sites.length);
console.log('Sites with custom domains: ' + sites.filter(s => s.custom_domain).length);
console.log('Sites with SSL: ' + sites.filter(s => s.ssl_status).length);