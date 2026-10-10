// Runs only inside this tab; no shell commands are ever executed.
export const sampleCases = [
  'BLOCK | rm -rf /',
  'BLOCK | rm -rf ./build',
  'BLOCK | rm -r -f /',
  'ALLOW | rm /Users/me/soft-hold-enrollment/file.txt',
  'ALLOW | echo "rm -rf /"',
  'ALLOW | git checkout --detach origin/main',
  'ALLOW | gh issue create --title "document rm -rf"'
].join('\n');

export function parseCases(raw) {
  if (typeof raw !== 'string' || raw.length > 40000) throw new Error('Input must be text under 40 KB.');
  const cases = [];
  for (const [index, line] of raw.split(/\r?\n/).entries()) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const separator = trimmed.indexOf('|');
    if (separator < 0) throw new Error('Line ' + (index + 1) + ' needs ALLOW | or BLOCK |.');
    const expectation = trimmed.slice(0, separator).trim().toUpperCase();
    const command = trimmed.slice(separator + 1).trim();
    if (!['ALLOW', 'BLOCK'].includes(expectation) || !command || command.length > 2000) {
      throw new Error('Invalid label or command on line ' + (index + 1) + '.');
    }
    cases.push({ expectation, command, line: index + 1 });
    if (cases.length > 150) throw new Error('Maximum 150 test cases.');
  }
  if (!cases.length) throw new Error('Add at least one labeled command.');
  return cases;
}

export function evaluate(pattern, raw) {
  if (typeof pattern !== 'string' || pattern.length > 400) throw new Error('Regex must be under 400 characters.');
  if (!pattern) throw new Error('Enter a regex pattern.');
  let expression;
  try { expression = new RegExp(pattern, 'i'); }
  catch (e) { throw new Error('Invalid regex: ' + e.message); }
  const cases = parseCases(raw);
  const rows = cases.map(item => {
    const actual = expression.test(item.command) ? 'BLOCK' : 'ALLOW';
    return { ...item, actual, pass: actual === item.expectation };
  });
  const failures = rows.filter(x => !x.pass);
  return {
    rows,
    count: rows.length,
    passed: rows.length - failures.length,
    failed: failures.length,
    falsePositives: rows.filter(x => x.expectation === 'ALLOW' && x.actual === 'BLOCK').length,
    falseNegatives: rows.filter(x => x.expectation === 'BLOCK' && x.actual === 'ALLOW').length
  };
}

function elem(type, content, className) {
  const node = document.createElement(type);
  node.textContent = content;
  if (className) node.className = className;
  return node;
}

function showReport(report) {
  const grid = document.querySelector('#results');
  grid.replaceChildren();
  document.querySelector('#summary').textContent =
    report.passed + '/' + report.count + ' passed · ' +
    report.falsePositives + ' false positive(s) · ' +
    report.falseNegatives + ' false negative(s)';
  for (const row of report.rows) {
    const article = elem('article', '', 'result ' + (row.pass ? 'ok' : 'bad'));
    const top = elem('div', '', 'result-top');
    top.append(elem('strong', row.pass ? 'PASS' : 'FAIL'), elem('span', 'Expected ' +
      row.expectation + ' · actual ' + row.actual));
    article.append(top, elem('code', row.command));
    grid.append(article);
  }
  document.querySelector('#export').disabled = false;
}

if (typeof document !== 'undefined') {
  const pattern = document.querySelector('#pattern');
  const cases = document.querySelector('#cases');
  const msg = document.querySelector('#message');
  let lastReport = null;
  pattern.value = String.raw`(?:^|[;&|]\s*)rm\s+-(?:rf|fr)\b`;
  cases.value = sampleCases;
  function run() {
    try {
      lastReport = evaluate(pattern.value, cases.value);
      msg.textContent = 'Nothing was executed. Regex comparison only.';
      msg.className = 'notice';
      showReport(lastReport);
    } catch (error) {
      lastReport = null;
      msg.textContent = error.message;
      msg.className = 'notice error';
      document.querySelector('#results').replaceChildren();
      document.querySelector('#summary').textContent = 'Unable to evaluate';
      document.querySelector('#export').disabled = true;
    }
  }
  document.querySelector('#run').addEventListener('click', run);
  document.querySelector('#reset').addEventListener('click', () => {
    cases.value = sampleCases;
    run();
  });
  document.querySelector('#export').addEventListener('click', () => {
    if (!lastReport) return;
    const data = JSON.stringify({
      kind: 'hook-regression-lab-v1', evaluatedAt: new Date().toISOString(),
      regex: pattern.value, results: lastReport
    }, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'hook-regression-report.json';
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  });
  run();
}
