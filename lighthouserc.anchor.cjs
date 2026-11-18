/*
 * The ADR 0004 budgets live once, in lighthouserc.json (Constitution IX: numeric budgets are not
 * restated). This config reuses that file's assertions and only says what is different about the
 * anchor essay: it is a held-essay preview, so it is built through `essay:preview` and served from
 * dist-anchor on a port of its own.
 */
const { ci } = require('./lighthouserc.json');

module.exports = {
  ci: {
    collect: {
      url: ['http://localhost:4328/essays/dacia-lapidarium/'],
      numberOfRuns: 3,
      startServerCommand: 'npm run essay:preview -- dacia-lapidarium && ASTRO_OUT_DIR=./dist-anchor npx astro preview --port 4328 --ignore-lock',
      startServerReadyPattern: 'localhost:4328',
      // the preview builds before the server starts, which takes longer than the default wait
      startServerReadyTimeout: 180000,
      settings: { chromeFlags: '--no-sandbox --headless=new' },
    },
    assert: ci.assert,
  },
};
