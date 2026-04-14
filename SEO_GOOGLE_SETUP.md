# Makena Events: Google SEO Setup Checklist

Last updated: 2026-04-14

## 1) Deploy the new SEO files
Deploy the latest repo so these URLs are live:
- https://makenaevents.com/sitemap.xml
- https://makenaevents.com/robots.txt

Also verify these clean URLs open in browser:
- https://makenaevents.com/
- https://makenaevents.com/afronation
- https://makenaevents.com/fete-de-la-musique
- https://makenaevents.com/get-discount

## 2) Add Search Console property (Domain)
1. Open Google Search Console.
2. Click `Add property`.
3. Choose `Domain` and enter: `makenaevents.com`.
4. Copy the DNS TXT verification value.
5. In your DNS provider, add the TXT record to the root domain.
6. Wait for DNS propagation, then click `Verify`.

## 3) Submit sitemap
1. In Search Console, open `Sitemaps`.
2. Add sitemap URL: `https://makenaevents.com/sitemap.xml`.
3. Confirm status changes to `Success`.

## 4) Request indexing for key pages
In Search Console `URL Inspection`, request indexing for:
- https://makenaevents.com/
- https://makenaevents.com/afronation
- https://makenaevents.com/fete-de-la-musique
- https://makenaevents.com/get-discount

## 5) Validate crawl and canonical behavior
Check each page in URL Inspection:
- URL is on Google: `Yes` (may take time)
- Crawled page: canonical equals the clean URL
- No robots.txt block
- No duplicate selected as canonical

## 6) Connect Analytics (recommended)
If GA4 is not installed yet:
1. Create GA4 property.
2. Add GA script to all pages in `<head>`.
3. Link GA4 to Search Console in GA Admin.

Recommended tracked actions:
- Clicks to Eventbrite ticket links
- Discount form submit completions

## 7) Weekly SEO monitoring (first 30 days)
Every week, review:
- Search Console `Pages` indexing report
- Search Console `Performance` report for queries and CTR
- Top pages: `/afronation` and `/fete-de-la-musique`

If impressions rise but CTR stays low:
- Iterate title/meta descriptions on affected pages.

If pages are not indexed after 7-10 days:
- Re-run URL Inspection
- Confirm live canonical URL and robots access
- Re-submit for indexing
