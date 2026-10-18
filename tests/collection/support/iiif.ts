import type { Page, Route } from '@playwright/test';

/*
 * A local stand-in for an institution's IIIF server (spec 004 SC-003: "timed against a local tile
 * server"). The fixture record points at https://example.org/iiif/road/; the specs intercept those
 * requests and answer them with an Image API 2 info.json and a 256 px grey tile for every region.
 */
const BASE = 'https://example.org/iiif/road/';
const INFO = {
  '@context': 'http://iiif.io/api/image/2/context.json',
  '@id': 'https://example.org/iiif/road',
  protocol: 'http://iiif.io/api/image',
  width: 4096,
  height: 3072,
  tiles: [{ width: 256, scaleFactors: [1, 2, 4, 8, 16] }],
  profile: ['http://iiif.io/api/image/2/level0.json'],
};

/** A 256 x 256 grey PNG, built once. */
function greyTile(): Buffer {
  // minimal valid PNG: 1x1 grey pixel; the viewer scales it, which is enough to prove a tile arrived
  return Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR4nGNgYGD4DwABBAEAwS2OUAAAAABJRU5ErkJggg==', 'base64');
}

export interface TileLog {
  infoRequests: number;
  tileTimes: number[];
}

/** Serves the fixture's IIIF source and records when tiles are answered. */
export async function serveIiif(page: Page, options: { fail?: boolean } = {}): Promise<TileLog> {
  const log: TileLog = { infoRequests: 0, tileTimes: [] };
  await page.route(`${BASE}**`, async (route: Route) => {
    if (options.fail) return route.abort('failed');
    const url = route.request().url();
    if (url.endsWith('info.json')) {
      log.infoRequests += 1;
      return route.fulfill({ contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: JSON.stringify(INFO) });
    }
    // the still image the page shows first is a /full/ region; a tile is any other region
    if (!url.includes('/full/')) log.tileTimes.push(Date.now());
    return route.fulfill({ contentType: 'image/png', headers: { 'access-control-allow-origin': '*' }, body: greyTile() });
  });
  return log;
}
