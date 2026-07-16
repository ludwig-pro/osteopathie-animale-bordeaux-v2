const FULL_SHA_PATTERN = /^[0-9a-f]{40}$/i;
const SCORE_PATTERN = /^(?:0|[1-9][0-9]?|100)$/;

function extractTableCell(body, label) {
  const match = body.match(
    new RegExp(`${label}[ \\t]*\\|[ \\t]*([^\\r\\n|]+)[ \\t]*\\|`, 'i')
  );

  return match ? match[1].trim() : null;
}

function extractScore(body, label) {
  const match = body.match(
    new RegExp(
      `(?:\\*\\*)?${label}(?:\\*\\*)?[ \\t]*:[ \\t]*([^<\\r\\n|]*)(?=[ \\t]*(?:<br[ \\t]*/?>|\\r?\\n|\\||$))`,
      'i'
    )
  );
  const token = match?.[1].trim();

  if (!token || !SCORE_PATTERN.test(token)) {
    return null;
  }

  return Number(token) / 100;
}

function extractHttpsUrl(value) {
  if (typeof value !== 'string') {
    return null;
  }

  try {
    const url = new URL(value);
    return url.protocol === 'https:' ? value : null;
  } catch {
    return null;
  }
}

export function parseNetlifyLighthouseComment(body) {
  if (typeof body !== 'string') {
    return null;
  }

  const scores = {
    performance: extractScore(body, 'Performance'),
    accessibility: extractScore(body, 'Accessibility'),
    bestPractices: extractScore(body, 'Best Practices'),
    seo: extractScore(body, 'SEO'),
  };

  if (Object.values(scores).some((score) => score === null)) {
    return null;
  }

  const commitToken = extractTableCell(body, 'Latest commit');
  if (!commitToken || !FULL_SHA_PATTERN.test(commitToken)) {
    return null;
  }

  const previewMatch = body.match(
    /Deploy Preview[ \t]*\|[ \t]*\[([^\]\r\n]+)\]/i
  );
  const previewUrl = extractHttpsUrl(previewMatch?.[1].trim());
  if (!previewUrl) {
    return null;
  }

  const deployLogToken = extractTableCell(body, 'Latest deploy log');
  const deployLogUrl = extractHttpsUrl(deployLogToken) ?? '';

  return {
    ...scores,
    previewUrl,
    deployLogUrl,
    commitSha: commitToken.toLowerCase(),
  };
}

export function matchesPullRequestHead(candidate, issueNumber, headSha) {
  if (
    !candidate ||
    typeof candidate !== 'object' ||
    !Number.isInteger(issueNumber) ||
    issueNumber <= 0 ||
    typeof headSha !== 'string' ||
    !FULL_SHA_PATTERN.test(headSha) ||
    typeof candidate.commitSha !== 'string' ||
    !FULL_SHA_PATTERN.test(candidate.commitSha) ||
    typeof candidate.previewUrl !== 'string'
  ) {
    return false;
  }

  if (candidate.commitSha.toLowerCase() !== headSha.toLowerCase()) {
    return false;
  }

  try {
    const preview = new URL(candidate.previewUrl);
    const hostnamePattern = new RegExp(
      `^deploy-preview-${issueNumber}--[a-z0-9-]+\\.netlify\\.app$`
    );

    return (
      preview.protocol === 'https:' &&
      preview.username === '' &&
      preview.password === '' &&
      preview.port === '' &&
      preview.search === '' &&
      preview.hash === '' &&
      preview.pathname === '/' &&
      hostnamePattern.test(preview.hostname)
    );
  } catch {
    return false;
  }
}
