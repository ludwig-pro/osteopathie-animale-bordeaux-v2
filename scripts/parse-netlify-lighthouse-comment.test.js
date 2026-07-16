import assert from 'node:assert/strict';
import test from 'node:test';

import {
  matchesPullRequestHead,
  parseNetlifyLighthouseComment,
} from './parse-netlify-lighthouse-comment.js';

const CURRENT_SHA = '0123456789abcdef0123456789abcdef01234567';
const STALE_SHA = '89abcdef0123456789abcdef0123456789abcdef';
const PREVIEW_URL = 'https://deploy-preview-18--example-site.netlify.app';
const DEPLOY_LOG_URL =
  'https://app.netlify.com/projects/example-site/deploys/example-deploy';

function netlifyComment({
  sha = CURRENT_SHA,
  previewUrl = PREVIEW_URL,
  deployLogUrl = DEPLOY_LOG_URL,
  performance = '95',
  accessibility = '98',
  bestPractices = '100',
  seo = '100',
  includeCommit = true,
  includeDeployLog = true,
} = {}) {
  return [
    '### <span aria-hidden="true">✅</span> Deploy Preview for *example-site* ready!',
    '',
    '| Name | Link |',
    '| --- | --- |',
    includeCommit
      ? `|<span aria-hidden="true">🔨</span> Latest commit | ${sha} |`
      : '',
    includeDeployLog
      ? `|<span aria-hidden="true">🔍</span> Latest deploy log | ${deployLogUrl} |`
      : '',
    `|<span aria-hidden="true">😎</span> Deploy Preview | [${previewUrl}](${previewUrl}) |`,
    `|<span aria-hidden="true">![Lighthouse](https://example.invalid/lighthouse.svg)</span><br />Lighthouse | 1 paths audited<br />**Performance**: ${performance}<br />**Accessibility**: ${accessibility}<br />**Best Practices**: ${bestPractices}<br />**SEO**: ${seo}<br />**PWA**: -<br />[View the detailed breakdown and full score reports](https://example.invalid/report) |`,
  ]
    .filter(Boolean)
    .join('\n');
}

test('parses the real Netlify Markdown and HTML field structure', () => {
  assert.deepEqual(parseNetlifyLighthouseComment(netlifyComment()), {
    performance: 0.95,
    accessibility: 0.98,
    bestPractices: 1,
    seo: 1,
    previewUrl: PREVIEW_URL,
    deployLogUrl: DEPLOY_LOG_URL,
    commitSha: CURRENT_SHA,
  });
});

test('normalizes an uppercase full commit SHA and allows a missing deploy log', () => {
  const parsed = parseNetlifyLighthouseComment(
    netlifyComment({
      sha: CURRENT_SHA.toUpperCase(),
      includeDeployLog: false,
    })
  );

  assert.equal(parsed?.commitSha, CURRENT_SHA);
  assert.equal(parsed?.deployLogUrl, '');
});

test('matches the exact pull request preview and current head SHA', () => {
  const candidate = parseNetlifyLighthouseComment(netlifyComment());

  assert.equal(matchesPullRequestHead(candidate, 18, CURRENT_SHA), true);
});

test('rejects a stale commit on the correct pull request preview', () => {
  const candidate = parseNetlifyLighthouseComment(
    netlifyComment({ sha: STALE_SHA })
  );

  assert.equal(matchesPullRequestHead(candidate, 18, CURRENT_SHA), false);
});

test('rejects the current commit on another pull request preview', () => {
  const candidate = parseNetlifyLighthouseComment(
    netlifyComment({
      previewUrl: 'https://deploy-preview-17--example-site.netlify.app',
    })
  );

  assert.equal(matchesPullRequestHead(candidate, 18, CURRENT_SHA), false);
});

test('rejects 39-character and 41-character commit tokens', () => {
  for (const sha of ['a'.repeat(39), 'a'.repeat(41)]) {
    assert.equal(parseNetlifyLighthouseComment(netlifyComment({ sha })), null);
  }
});

test('accepts score boundaries and keeps 1 as one percent', () => {
  const boundaries = parseNetlifyLighthouseComment(
    netlifyComment({
      performance: '0',
      accessibility: '1',
      bestPractices: '99',
      seo: '100',
    })
  );

  assert.deepEqual(
    {
      performance: boundaries?.performance,
      accessibility: boundaries?.accessibility,
      bestPractices: boundaries?.bestPractices,
      seo: boundaries?.seo,
    },
    {
      performance: 0,
      accessibility: 0.01,
      bestPractices: 0.99,
      seo: 1,
    }
  );
});

test('rejects invalid score tokens without truncating them', () => {
  for (const performance of ['-1', '95.5', '+95', '095', '101']) {
    assert.equal(
      parseNetlifyLighthouseComment(netlifyComment({ performance })),
      null,
      performance
    );
  }
});

test('returns false for missing or malformed candidates and head SHAs', () => {
  for (const candidate of [
    null,
    undefined,
    {},
    { commitSha: CURRENT_SHA, previewUrl: null },
  ]) {
    assert.doesNotThrow(() =>
      matchesPullRequestHead(candidate, 18, CURRENT_SHA)
    );
    assert.equal(matchesPullRequestHead(candidate, 18, CURRENT_SHA), false);
  }

  const candidate = parseNetlifyLighthouseComment(netlifyComment());
  for (const headSha of [null, '', 'a'.repeat(39), 'g'.repeat(40)]) {
    assert.equal(matchesPullRequestHead(candidate, 18, headSha), false);
  }
  assert.equal(matchesPullRequestHead(candidate, 0, CURRENT_SHA), false);
  assert.equal(matchesPullRequestHead(candidate, 18.5, CURRENT_SHA), false);
});

test('rejects decorated preview URLs', () => {
  const decoratedUrls = [
    'https://user:password@deploy-preview-18--example-site.netlify.app/',
    'https://deploy-preview-18--example-site.netlify.app:8443/',
    'https://deploy-preview-18--example-site.netlify.app/?source=test',
    'https://deploy-preview-18--example-site.netlify.app/#report',
    'https://deploy-preview-18--example-site.netlify.app/path',
  ];

  for (const previewUrl of decoratedUrls) {
    const candidate = parseNetlifyLighthouseComment(
      netlifyComment({ previewUrl })
    );
    assert.equal(
      matchesPullRequestHead(candidate, 18, CURRENT_SHA),
      false,
      previewUrl
    );
  }
});

test('rejects empty site labels and nested lookalike hostnames', () => {
  const invalidHostnames = [
    'https://deploy-preview-18--.netlify.app',
    'https://deploy-preview-18--site.netlify.app.evil.netlify.app',
  ];

  for (const previewUrl of invalidHostnames) {
    const candidate = parseNetlifyLighthouseComment(
      netlifyComment({ previewUrl })
    );
    assert.equal(
      matchesPullRequestHead(candidate, 18, CURRENT_SHA),
      false,
      previewUrl
    );
  }
});

test('rejects bodies without the full commit row', () => {
  assert.equal(
    parseNetlifyLighthouseComment(netlifyComment({ includeCommit: false })),
    null
  );
});

test('rejects a non-HTTPS Deploy Preview URL', () => {
  assert.equal(
    parseNetlifyLighthouseComment(
      netlifyComment({
        previewUrl: 'http://deploy-preview-18--example-site.netlify.app',
      })
    ),
    null
  );
});

test('parses score labels separated by Markdown line endings', () => {
  const body = [
    `Latest commit | ${CURRENT_SHA} |`,
    `Deploy Preview | [${PREVIEW_URL}](${PREVIEW_URL}) |`,
    '**Performance**: 95',
    '**Accessibility**: 98',
    '**Best Practices**: 100',
    '**SEO**: 100',
  ].join('\n');

  assert.deepEqual(parseNetlifyLighthouseComment(body), {
    performance: 0.95,
    accessibility: 0.98,
    bestPractices: 1,
    seo: 1,
    previewUrl: PREVIEW_URL,
    deployLogUrl: '',
    commitSha: CURRENT_SHA,
  });
});
