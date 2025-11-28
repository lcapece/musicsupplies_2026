const fs = require('fs');
const https = require('https');

const TOKEN = 'nfp_wWH2zkFSqjWA7TBra2uk8uXEARtUSjW323d8';
const PASSWORD = '696$terlingstreeT';

// Read and parse CSV
function parseCSV(content) {
    const lines = content.trim().split('\n');
    const headers = lines[0].split(',');
    const data = [];

    for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(',');
        if (values.length > 0 && values[0]) {
            const row = {};
            headers.forEach((header, index) => {
                row[header] = values[index];
            });
            data.push(row);
        }
    }
    return data;
}

// Make API request
function makeRequest(method, path, data = null) {
    return new Promise((resolve, reject) => {
        const options = {
            hostname: 'api.netlify.com',
            path: path,
            method: method,
            headers: {
                'Authorization': 'Bearer ' + TOKEN,
                'Content-Type': 'application/json'
            }
        };

        const req = https.request(options, (res) => {
            let body = '';
            res.on('data', chunk => body += chunk);
            res.on('end', () => {
                if (res.statusCode >= 200 && res.statusCode < 300) {
                    resolve({ status: res.statusCode, body: body });
                } else {
                    resolve({ status: res.statusCode, body: body, error: true });
                }
            });
        });

        req.on('error', reject);

        if (data) {
            req.write(JSON.stringify(data));
        }
        req.end();
    });
}

// Delete site
async function deleteSite(siteId, siteName) {
    try {
        const result = await makeRequest('DELETE', '/api/v1/sites/' + siteId);
        if (!result.error) {
            console.log('  ✓ DELETED: ' + siteName);
            return true;
        } else {
            console.log('  ✗ FAILED to delete ' + siteName + ': Status ' + result.status);
            return false;
        }
    } catch (error) {
        console.log('  ✗ ERROR deleting ' + siteName + ':', error.message);
        return false;
    }
}

// Set password on site
async function setPassword(siteId, siteName) {
    try {
        const data = {
            password: PASSWORD
        };
        const result = await makeRequest('PUT', '/api/v1/sites/' + siteId, data);
        if (!result.error) {
            console.log('  ✓ PASSWORD SET: ' + siteName);
            return true;
        } else {
            console.log('  ✗ FAILED to set password for ' + siteName + ': Status ' + result.status);
            return false;
        }
    } catch (error) {
        console.log('  ✗ ERROR setting password for ' + siteName + ':', error.message);
        return false;
    }
}

// Main processing
async function processActions() {
    const csvContent = fs.readFileSync('netlify_actions.csv', 'utf-8');
    const actions = parseCSV(csvContent);

    let deleteCount = 0;
    let deleteSuccess = 0;
    let passwordCount = 0;
    let passwordSuccess = 0;

    console.log('\n=== PROCESSING NETLIFY ACTIONS ===\n');

    // Process deletions first
    console.log('DELETING SITES:');
    for (const row of actions) {
        if (row['Action'] && row['Action'].toLowerCase() === 'delete') {
            deleteCount++;
            const siteId = row['Project ID'];
            const siteName = row['Default Domain'] || 'unknown';
            const customDomain = row['Custom Domain'];

            if (customDomain && customDomain !== 'None') {
                console.log('  Deleting site with custom domain: ' + customDomain);
            }

            const success = await deleteSite(siteId, siteName);
            if (success) deleteSuccess++;

            // Small delay to avoid rate limiting
            await new Promise(resolve => setTimeout(resolve, 500));
        }
    }

    console.log('\nSETTING PASSWORDS:');
    // Process password settings
    for (const row of actions) {
        if (row['Action'] && row['Action'].toLowerCase() === 'password') {
            passwordCount++;
            const siteId = row['Project ID'];
            const siteName = row['Default Domain'] || 'unknown';
            const customDomain = row['Custom Domain'];

            if (customDomain && customDomain !== 'None') {
                console.log('  Setting password for: ' + customDomain + ' (' + siteName + ')');
            } else {
                console.log('  Setting password for: ' + siteName);
            }

            const success = await setPassword(siteId, siteName);
            if (success) passwordSuccess++;

            // Small delay to avoid rate limiting
            await new Promise(resolve => setTimeout(resolve, 500));
        }
    }

    console.log('\n=== SUMMARY ===');
    console.log('Deletions: ' + deleteSuccess + '/' + deleteCount + ' successful');
    console.log('Password settings: ' + passwordSuccess + '/' + passwordCount + ' successful');
    console.log('\nPassword used: ' + PASSWORD);
}

// Run the process
processActions().catch(console.error);