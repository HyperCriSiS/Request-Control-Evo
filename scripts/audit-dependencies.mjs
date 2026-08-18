import { spawnSync } from 'node:child_process';

const allowedHighAdvisories = new Set([
  'GHSA-w3rx-r6r6-pgpr',
  'GHSA-5p2g-fcmc-qvqq',
]);

const severityRank = {
  info: 0,
  low: 1,
  moderate: 2,
  high: 3,
  critical: 4,
};

const audit = spawnSync('npm', ['audit', '--json'], {
  encoding: 'utf8',
  shell: process.platform === 'win32',
});

if (audit.error) {
  throw audit.error;
}

let report;
try {
  report = JSON.parse(audit.stdout);
} catch (error) {
  console.error(audit.stdout);
  console.error(audit.stderr);
  throw new Error(`Unable to parse npm audit JSON: ${error.message}`);
}

if (report.error) {
  console.error(report.error);
  process.exit(1);
}

if (!report.metadata || !report.vulnerabilities) {
  throw new Error('npm audit returned an incomplete report.');
}

const vulnerabilities = report.vulnerabilities;

function advisoryIdsFor(packageName, seen = new Set()) {
  if (seen.has(packageName)) return new Set();
  seen.add(packageName);

  const vulnerability = vulnerabilities[packageName];
  if (!vulnerability) return new Set();

  const ids = new Set();
  for (const via of vulnerability.via || []) {
    if (typeof via === 'string') {
      for (const id of advisoryIdsFor(via, seen)) ids.add(id);
      continue;
    }

    const match = String(via.url || '').match(/GHSA-[a-z0-9-]+/i);
    if (match) ids.add(match[0].toUpperCase());
  }
  return ids;
}

const blocking = [];
const accepted = [];

for (const [packageName, vulnerability] of Object.entries(vulnerabilities)) {
  if ((severityRank[vulnerability.severity] || 0) < severityRank.high) continue;

  const advisoryIds = advisoryIdsFor(packageName);
  const unknown = [...advisoryIds].filter((id) => !allowedHighAdvisories.has(id));

  if (advisoryIds.size === 0 || unknown.length > 0) {
    blocking.push({
      packageName,
      severity: vulnerability.severity,
      advisoryIds: [...advisoryIds],
    });
  } else {
    accepted.push({ packageName, advisoryIds: [...advisoryIds] });
  }
}

if (accepted.length > 0) {
  console.warn('Known upstream-only high-severity audit findings:');
  for (const item of accepted) {
    console.warn(`- ${item.packageName}: ${item.advisoryIds.join(', ')}`);
  }
  console.warn('These findings currently originate from image-size 2.0.2 via Mozilla addons-linter/web-ext and have no patched release available in that dependency chain.');
}

if (blocking.length > 0) {
  console.error('Blocking high/critical dependency vulnerabilities detected:');
  for (const item of blocking) {
    console.error(`- ${item.packageName} (${item.severity}): ${item.advisoryIds.join(', ') || 'unresolved advisory chain'}`);
  }
  process.exit(1);
}

console.log('Dependency audit policy passed: no unapproved high/critical vulnerabilities.');
