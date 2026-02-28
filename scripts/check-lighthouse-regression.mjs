import fs from 'node:fs/promises';
import path from 'node:path';

const CATEGORIES = ['performance', 'accessibility', 'best-practices', 'seo'];
const DEFAULT_FLOORS = {
  performance: 0.6,
  accessibility: 0.85,
  'best-practices': 0.65,
  seo: 0.55,
};

function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (!token.startsWith('--')) {
      continue;
    }

    const key = token.slice(2);
    const next = argv[i + 1];
    if (!next || next.startsWith('--')) {
      args[key] = 'true';
      continue;
    }

    args[key] = next;
    i += 1;
  }
  return args;
}

async function findLatestReport(reportsDir) {
  const files = await fs.readdir(reportsDir);
  const reportFiles = files.filter((file) => /^lhr-.*\.json$/i.test(file));

  if (reportFiles.length === 0) {
    throw new Error(`No Lighthouse reports found in ${reportsDir}`);
  }

  const reportsWithStats = await Promise.all(
    reportFiles.map(async (file) => {
      const reportPath = path.join(reportsDir, file);
      const stat = await fs.stat(reportPath);
      return { reportPath, mtimeMs: stat.mtimeMs };
    })
  );

  reportsWithStats.sort((a, b) => b.mtimeMs - a.mtimeMs);
  return reportsWithStats[0].reportPath;
}

function readScore(report, category) {
  const score = report?.categories?.[category]?.score;
  return typeof score === 'number' ? score : null;
}

function formatScore(score) {
  return typeof score === 'number' ? score.toFixed(2) : 'n/a';
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const baselinePath = args.baseline;

  if (!baselinePath) {
    throw new Error('Missing required argument: --baseline <path>');
  }

  const reportsDir = args['reports-dir'] ?? '.lighthouseci';
  const reportPath = args.report ?? (await findLatestReport(reportsDir));
  const deltaThreshold = Number.parseFloat(
    process.env.LIGHTHOUSE_DELTA_THRESHOLD ?? '0.05'
  );

  const baselineRaw = await fs.readFile(baselinePath, 'utf8');
  const baseline = JSON.parse(baselineRaw);

  const reportRaw = await fs.readFile(reportPath, 'utf8');
  const report = JSON.parse(reportRaw);

  const failures = [];

  console.log(`Lighthouse report: ${reportPath}`);
  console.log(
    `Lighthouse URL: ${report.finalUrl ?? report.requestedUrl ?? 'unknown'}`
  );
  console.log(`Delta threshold: ${deltaThreshold.toFixed(2)}`);

  for (const category of CATEGORIES) {
    const baselineScore = baseline?.categories?.[category];
    const currentScore = readScore(report, category);
    const floor = DEFAULT_FLOORS[category];

    if (typeof baselineScore !== 'number') {
      throw new Error(
        `Baseline for category "${category}" is missing or invalid in ${baselinePath}`
      );
    }

    if (currentScore === null) {
      failures.push(
        `[${category}] Missing score in Lighthouse report (baseline ${formatScore(
          baselineScore
        )})`
      );
      continue;
    }

    const drop = baselineScore - currentScore;
    console.log(
      `[${category}] baseline=${formatScore(
        baselineScore
      )} current=${formatScore(currentScore)} drop=${drop.toFixed(
        2
      )} floor=${floor.toFixed(2)}`
    );

    if (currentScore < floor) {
      failures.push(
        `[${category}] score ${formatScore(
          currentScore
        )} is below floor ${floor.toFixed(2)}`
      );
    }

    if (drop > deltaThreshold) {
      failures.push(
        `[${category}] drop ${drop.toFixed(
          2
        )} exceeds threshold ${deltaThreshold.toFixed(2)}`
      );
    }
  }

  if (failures.length > 0) {
    console.error('\nLighthouse regression checks failed:');
    for (const failure of failures) {
      console.error(`- ${failure}`);
    }
    process.exit(1);
  }

  console.log('\nLighthouse regression checks passed.');
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
