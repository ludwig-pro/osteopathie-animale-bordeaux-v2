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

function formatDelta(value) {
  return typeof value === 'number' ? value.toFixed(2) : 'n/a';
}

function buildMarkdownReport(summary) {
  const statusIcon = summary.passed ? '✅' : '❌';
  const lines = [
    '<!-- lighthouse-remote-report -->',
    `## ${statusIcon} Lighthouse Remote Report`,
    '',
    `- Source: ${summary.source}`,
    `- URL: ${summary.url}`,
    `- Delta threshold: ${summary.deltaThreshold.toFixed(2)}`,
    `- Baseline: \`${summary.baselinePath}\``,
    `- Report file: \`${summary.reportPath}\``,
    '',
    '| Category | Baseline | Current | Drop | Floor | Status |',
    '|---|---:|---:|---:|---:|---|',
  ];

  for (const result of summary.categories) {
    lines.push(
      `| ${result.category} | ${formatScore(result.baseline)} | ${formatScore(
        result.current
      )} | ${formatDelta(result.drop)} | ${formatScore(result.floor)} | ${
        result.status
      } |`
    );
  }

  if (summary.failures.length > 0) {
    lines.push('', '**Failures**');
    for (const failure of summary.failures) {
      lines.push(`- ${failure}`);
    }
  } else {
    lines.push('', 'No regression detected.');
  }

  return lines.join('\n');
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const baselinePath = args.baseline;

  if (!baselinePath) {
    throw new Error('Missing required argument: --baseline <path>');
  }

  const reportsDir = args['reports-dir'] ?? '.lighthouseci';
  const hasProvidedScores =
    args['score-performance'] ||
    args['score-accessibility'] ||
    args['score-best-practices'] ||
    args['score-seo'];
  const reportPath = hasProvidedScores
    ? null
    : args.report ?? (await findLatestReport(reportsDir));
  const deltaThreshold = Number.parseFloat(
    process.env.LIGHTHOUSE_DELTA_THRESHOLD ?? '0.05'
  );

  const baselineRaw = await fs.readFile(baselinePath, 'utf8');
  const baseline = JSON.parse(baselineRaw);

  const report = reportPath
    ? JSON.parse(await fs.readFile(reportPath, 'utf8'))
    : null;
  const providedScores = {
    performance: args['score-performance'],
    accessibility: args['score-accessibility'],
    'best-practices': args['score-best-practices'],
    seo: args['score-seo'],
  };

  const failures = [];
  const categoryResults = [];
  const source =
    args.source ?? (reportPath ? 'lhci-report' : 'external-scores');
  const reportUrl =
    args.url ?? report?.finalUrl ?? report?.requestedUrl ?? 'unknown';

  if (reportPath) {
    console.log(`Lighthouse report: ${reportPath}`);
  } else {
    console.log('Lighthouse report: n/a (external scores mode)');
  }
  console.log(`Lighthouse URL: ${reportUrl}`);
  console.log(`Source: ${source}`);
  console.log(`Delta threshold: ${deltaThreshold.toFixed(2)}`);

  for (const category of CATEGORIES) {
    const baselineScore = baseline?.categories?.[category];
    let currentScore = readScore(report, category);
    const floor = DEFAULT_FLOORS[category];

    if (typeof baselineScore !== 'number') {
      throw new Error(
        `Baseline for category "${category}" is missing or invalid in ${baselinePath}`
      );
    }

    let drop = null;
    const status = [];

    if (currentScore === null && providedScores[category] != null) {
      const providedRaw = Number.parseFloat(providedScores[category]);
      if (Number.isFinite(providedRaw)) {
        currentScore = providedRaw > 1 ? providedRaw / 100 : providedRaw;
      }
    }

    if (currentScore === null) {
      failures.push(
        `[${category}] Missing score in Lighthouse report (baseline ${formatScore(
          baselineScore
        )})`
      );
      status.push('❌ missing');
      categoryResults.push({
        category,
        baseline: baselineScore,
        current: null,
        drop,
        floor,
        status: status.join(', '),
      });
      continue;
    }

    drop = baselineScore - currentScore;
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
      status.push('❌ floor');
    }

    if (drop > deltaThreshold) {
      failures.push(
        `[${category}] drop ${drop.toFixed(
          2
        )} exceeds threshold ${deltaThreshold.toFixed(2)}`
      );
      status.push('❌ delta');
    }

    if (status.length === 0) {
      status.push('✅ pass');
    }

    categoryResults.push({
      category,
      baseline: baselineScore,
      current: currentScore,
      drop,
      floor,
      status: status.join(', '),
    });
  }

  const summary = {
    passed: failures.length === 0,
    source,
    baselinePath,
    reportPath: reportPath ?? 'n/a',
    url: reportUrl,
    deltaThreshold,
    categories: categoryResults,
    failures,
  };

  if (args['summary-file']) {
    await fs.writeFile(args['summary-file'], JSON.stringify(summary, null, 2));
  }

  if (args['markdown-file']) {
    const markdown = buildMarkdownReport(summary);
    await fs.writeFile(args['markdown-file'], markdown);
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
