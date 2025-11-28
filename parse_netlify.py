import json
import csv
from datetime import datetime

# Read the JSON file
with open('netlify_sites.json', 'r') as f:
    sites = json.load(f)

# Prepare CSV data
csv_data = []
for site in sites:
    # Parse updated_at timestamp
    updated_at = site.get('updated_at', 'N/A')
    if updated_at != 'N/A':
        try:
            dt = datetime.fromisoformat(updated_at.replace('Z', '+00:00'))
            updated_at = dt.strftime('%Y-%m-%d %H:%M:%S')
        except:
            pass
    
    csv_data.append({
        'Project Name': site.get('name', 'N/A'),
        'Site URL': f"https://{site.get('default_domain', 'N/A')}",
        'Default Domain': site.get('default_domain', 'N/A'),
        'Custom Domain': site.get('custom_domain', 'N/A') if site.get('custom_domain') else 'None',
        'Project ID': site.get('id', 'N/A'),
        'Last Updated': updated_at,
        'Created At': site.get('created_at', 'N/A')[:19].replace('T', ' ') if site.get('created_at') else 'N/A',
        'Deploy Status': site.get('published_deploy', {}).get('state', 'N/A') if site.get('published_deploy') else 'N/A',
        'SSL Status': site.get('ssl_status', 'N/A') if site.get('ssl_status') else 'N/A',
        'Repository': site.get('repo_url', 'N/A') if site.get('repo_url') else 'None'
    })

# Sort by last updated (most recent first)
csv_data.sort(key=lambda x: x['Last Updated'], reverse=True)

# Write to CSV
with open('netlify_sites.csv', 'w', newline='', encoding='utf-8') as f:
    if csv_data:
        writer = csv.DictWriter(f, fieldnames=csv_data[0].keys())
        writer.writeheader()
        writer.writerows(csv_data)

print(f"Successfully exported {len(csv_data)} Netlify sites to netlify_sites.csv")
print("\nPreview of sites:")
for i, site in enumerate(csv_data[:10], 1):
    print(f"{i}. {site['Project Name']} - {site['Site URL']} (Last updated: {site['Last Updated']})")
