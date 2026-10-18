# Basemap

`countries.fgb` is the present-day country outlines the Atlas draws under its layers (spec 005 FR-017, research R11).

- **Source**: Natural Earth, `ne_50m_admin_0_countries` (GeoJSON), from `nvkelso/natural-earth-vector`, tag `v5.1.2`:
  https://raw.githubusercontent.com/nvkelso/natural-earth-vector/v5.1.2/geojson/ne_50m_admin_0_countries.geojson
- **Terms**: Natural Earth is in the public domain; no credit is required (https://www.naturalearthdata.com/about/terms-of-use/). The Atlas names it anyway.
- **What was kept**: the countries, and the parts of countries, that touch -25 to 65 degrees east and 20 to 65 degrees north; one property, `name`; coordinates rounded to 0.01 degree (about a kilometre).
- **Rebuild**: download the GeoJSON above, then `npx tsx scripts/build-basemap.ts <downloaded file>`. The output is deterministic.

The outlines are modern borders. The Atlas draws them as present-day reference (thin dotted grey), never as evidence for any period.
