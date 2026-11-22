import { main } from '../src/linkcheck/main.js';

/*
 * The weekly link and manifest checker (spec 010 US4). Run by .github/workflows/link-check.yml:
 *   npx tsx scripts/link-check.ts --dir . --state linkcheck-state.json [--dry-run]
 * Needs JIRA_USER, JIRA_API_TOKEN, GITHUB_TOKEN and GITHUB_REPOSITORY unless --dry-run.
 */
process.exitCode = await main(process.argv.slice(2), process.env, {
  stdout: (s) => process.stdout.write(s),
  stderr: (s) => process.stderr.write(s),
});
