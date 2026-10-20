import { checkArchiveUrls } from '../src/migration/archive-check.js';

/* Verifies the archive patch on live archive URLs (spec 008 FR-019, contracts/cli-additions.md). By hand at cutover; network. */
const urls = process.argv.slice(2).filter((a) => a !== '--');
if (urls.length === 0) {
  console.error('archive:check: give at least one archive URL');
  process.exit(2);
}
const failures = await checkArchiveUrls(urls);
for (const f of failures) console.log(`${f.url}: ${f.check}: ${f.message}`);
console.log(`archive:check: ${urls.length} URLs, ${failures.length} failures`);
process.exit(failures.length > 0 ? 1 : 0);
