# YANMAR Festival 2026 Registration

Static registration frontend for GitHub Pages.

- Live URL: `https://porogirl1412.github.io/yanmar-festival-2026-registration/`
- Data source: existing Google Sheets master data
- Submission backend: existing Google Apps Script deployment

The public frontend contains no staff credentials or private API keys.

The HTML, embedded artwork, CSS, form steps and validation match the original Apps Script index.html. Only rpc() is replaced with a request-ID-based POST/postMessage transport. Both registration pages call the original public registration functions on the same backend. No custom domain is required.
