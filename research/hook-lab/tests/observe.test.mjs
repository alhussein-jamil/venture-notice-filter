import test from 'node:test';
import assert from 'node:assert/strict';
import { summarize } from '../scripts/observe.mjs';
function issue(title, by, body, extra = {}) {
  return { title, state: 'open', created_at: '2026-10-10T08:00:00Z',
    user: { login: by, type: 'User' }, body,
    html_url: 'https://github.com/test/repo/issues/' + by, ...extra };
}
test('only substantive distinct non-owner interest is counted', () => {
  const result = summarize([
    issue('[HookLab interest] I would try CLI', 'alice', 'I want GitHub Actions checks before running hooks.'),
    issue('[HookLab interest] Another request', 'alice', 'The same person makes a second request for CLI.'),
    issue('[HookLab interest] I would try CLI', 'alhussein-jamil', 'This is an owner comment for a test.'),
    issue('[HookLab interest] I would try CLI', 'bot[bot]', 'This is an automated issue with boilerplate.', { user: {login: 'bot[bot]', type: 'Bot'} }),
    issue('[HookLab interest] CLI', 'bob', 'Which hook failure do you need to test?'),
    issue('[HookLab bug] Wrong label', 'carol', 'My safe git checkout command was blocked.'),
    issue('[Other] Ignore', 'dave', 'Not this experiment.'),
  ], 'alhussein-jamil/venture-notice-filter');
  assert.equal(result.qualified_interest_distinct_users, 1);
  assert.equal(result.other_substantive_feedback_issues, 1);
  assert.equal(result.attributable_page_views, null);
  assert.equal(result.paid_customers, 0);
  assert.equal(result.real_revenue_eur, 0);
  assert.equal(result.buyer_willingness_to_pay_verified, false);
});
test('old, closed, and PR records do not count', () => {
  const result = summarize([
    issue('[HookLab interest] CLI', 'one', 'This is a substantial request but closed.', { state: 'closed' }),
    issue('[HookLab interest] CLI', 'two', 'This one was before experiment publication.', { created_at: '2026-10-09T12:00:00Z' }),
    issue('[HookLab interest] CLI', 'three', 'This is a pull request not an issue.', { pull_request: {url:'foo'} }),
  ], 'alhussein-jamil/venture-notice-filter');
  assert.equal(result.qualified_interest_distinct_users, 0);
});
