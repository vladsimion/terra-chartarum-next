import { checkArchiveUrls } from '../src/migration/archive-check.js';
import { requireUrls } from '../src/migration/baseline.js';

/* Verifies the archive patch on live archive URLs (spec 008 FR-019, contracts/cli-additions.md). By hand at cutover; network. */
let urls: string[];
try {
  urls = requireUrls(process.argv.slice(2));
} catch (error) {
  console.error((error as Error).message.replace(/^baseline: /, 'archive:check: ').replace(' to measure', ' to check'));
  process.exit(2);
}
const failures = await checkArchiveUrls(urls);
for (const f of failures) console.log(`${f.url}: ${f.check}: ${f.message}`);
console.log(`archive:check: ${urls.length} URLs, ${failures.length} failures`);
process.exit(failures.length > 0 ? 1 : 0);
