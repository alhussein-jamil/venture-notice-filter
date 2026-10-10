import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const LAUNCHED_AT = '2026-10-10T00:00:00Z';
const TITLE = /^\[HookLab (interest|bug)\]\s*/i;
const PLACEHOLDER = /Which hook failure do you need to test\?/gi;

export function summarize(issues, repository, now = new Date().toISOString()) {
  const distinct = new Map();
  let otherFeedback = 0;
  for (const item of issues) {
    if (item.pull_request || item.state !== 'open' || item.created_at < LAUNCHED_AT) continue;
    if (!TITLE.test(item.title || '')) continue;
    const author = String(item.user?.login || '').toLowerCase();
    if (!author || author === repository.split('/')[0].toLowerCase() ||
        /\[bot\]$/i.test(author) || item.user?.type === 'Bot') continue;
    const body = String(item.body || '').replace(PLACEHOLDER, '').trim();
    if (body.length < 20) continue; // open link without substance is not a signal
    const kind = String(item.title).match(TITLE)?.[1]?.toLowerCase();
    if (kind === 'interest') {
      if (!distinct.has(author)) distinct.set(author, item.html_url);
    } else {
      otherFeedback += 1;
    }
  }
  return {
    experiment: 'Hook Regression Lab',
    observed_at: now,
    since: LAUNCHED_AT,
    repository,
    qualified_interest_distinct_users: distinct.size,
    qualified_issue_urls: [...distinct.values()],
    other_substantive_feedback_issues: otherFeedback,
    attributable_page_views: null,
    paid_customers: 0,
    real_revenue_eur: 0,
    buyer_willingness_to_pay_verified: false,
    interpretation: 'Substantive GitHub issues from distinct non-owner accounts; neither views nor payments.',
  };
}

async function fetchIssues(repository, token, client = fetch) {
  const issues = [];
  for (let page = 1; page <= 5; page++) {
    const response = await client(
      'https://api.github.com/repos/' + repository + '/issues?state=all&per_page=100&page=' + page,
      { headers: { Accept: 'application/vnd.github+json',
        'User-Agent': 'hook-regression-lab-observer',
        ...(token ? { Authorization: 'Bearer ' + token } : {}) } }
    );
    if (!response.ok) throw new Error('GitHub issues API status ' + response.status);
    const rows = await response.json();
    if (!Array.isArray(rows)) throw new Error('GitHub issues API did not return an array');
    issues.push(...rows);
    if (rows.length < 100) break;
  }
  return issues;
}

async function main() {
  const repository = process.env.GITHUB_REPOSITORY || 'alhussein-jamil/venture-notice-filter';
  if (!/^[\w.-]+\/[\w.-]+$/.test(repository)) throw new Error('Invalid repository');
  const issues = await fetchIssues(repository, process.env.GITHUB_TOKEN || '');
  const report = summarize(issues, repository);
  const dir = path.resolve('reports');
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, 'hook-lab-observation.json'), JSON.stringify(report, null, 2) + '\n');
  await writeFile(path.join(dir, 'hook-lab-observation.md'), [
    '# Hook Regression Lab — observed public feedback',
    '', '- Observed at: ' + report.observed_at,
    '- Independent substantive requests for a CLI version: ' + report.qualified_interest_distinct_users,
    '- Substantive bug reports: ' + report.other_substantive_feedback_issues,
    '- Attributable visits: not measured',
    '- Verified customers: 0', '- Real revenue: €0',
    '- Willingness to pay: not established', '',
    'Individual requests (public GitHub links):',
    ...report.qualified_issue_urls.map(url => '- ' + url),
    '',
    'A request is not payment intent; a download is not a lead. This is not a market forecast.',
  ].join('\n') + '\n');
  process.stdout.write(JSON.stringify({
    interested: report.qualified_interest_distinct_users,
    feedback: report.other_substantive_feedback_issues,
    paid: 0,
  }) + '\n');
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch(error => { console.error(error.message); process.exitCode = 1; });
}
