import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";

const contentRoot = path.resolve("content/drupal");
const researchDirectory = path.join(contentRoot, "research-pages");
const navigationDirectory = path.join(contentRoot, "navigation");
const researchMethodsDirectory = path.join(contentRoot, "research-methods");
const basicPagesDirectory = path.join(contentRoot, "basic-pages");
const booksDirectory = path.join(contentRoot, "books");
const newsDirectory = path.join(contentRoot, "news");
const communityPortalsDirectory = path.join(contentRoot, "community-portals");
const eglsDirectory = path.join(contentRoot, "egls");
const manifestPath = path.join(contentRoot, "_meta/migration-manifest.json");
const forbiddenKey = /^(?:field_)?(?:dev_?)?(?:id|password|password_?hash)$/i;

const researchPages = await readCollection(researchDirectory);
const headers = await readCollection(navigationDirectory);
const researchMethods = await readCollection(researchMethodsDirectory);
const basicPages = await readCollection(basicPagesDirectory);
const bookPages = await readCollection(booksDirectory);
const news = await readCollection(newsDirectory);
const communityPortals = await readCollection(communityPortalsDirectory);
const egls = await readRecursiveJsonFiles(eglsDirectory);
const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
const warnings = [];

assert.equal(researchPages.length, manifest.counts.researchPages);
assert.equal(headers.length, manifest.counts.navigation);
assert.equal(researchMethods.length, manifest.counts.researchMethods);
assert.equal(basicPages.length, manifest.counts.basicPages);
assert.equal(bookPages.length, manifest.counts.books);
assert.equal(news.length, manifest.counts.news);
assert.equal(communityPortals.length, manifest.counts.communityPortals);
assert.equal(egls.length, manifest.counts.egls);
assert.equal(manifest.content.researchPages.length, researchPages.length);
assert.equal(manifest.content.navigation.length, headers.length);
assert.equal(manifest.content.researchMethods.length, researchMethods.length);
assert.equal(manifest.content.basicPages.length, basicPages.length);
assert.equal(manifest.content.books.length, bookPages.length);
assert.equal(manifest.content.news.length, news.length);
assert.equal(manifest.content.communityPortals.length, communityPortals.length);
assert.equal(manifest.content.egls.length, egls.length);

validateUnique(researchPages, "drupalNodeId");
validateUnique(headers, "drupalNodeId");
validateUnique(researchMethods, "drupalNodeId");
validateUnique(basicPages, "drupalNodeId");
validateUnique(bookPages, "drupalNodeId");
validateUnique(news, "drupalNodeId");
validateUnique(communityPortals, "drupalNodeId");

for (const record of researchPages) {
  assert.equal(record.contentType, "researchPage");
  assert.equal(record.published, true);
  assert.equal(typeof record.drupalNodeId, "number");
  assert.equal(typeof record.legacyAssetOwnerId, "number");
  assert.equal(typeof record.title, "string");
  assert.ok(record.pageId, `Research Page ${record.drupalNodeId} has no Page ID`);
  validateLegacyPath(record);
  assertNoForbiddenKeys(record, `Research Page ${record.drupalNodeId}`);

  if (record.numberOfRows !== null && !Number.isInteger(record.numberOfRows)) {
    warnings.push(`${record.pageId}: numberOfRows is not a valid integer`);
  }

  for (const key of [
    "apiParameters",
    "dataPointsListLabels",
    "dataTableFormat",
    "dataComparisonFormat",
    "filters",
    "visualizerConfiguration",
  ]) {
    if (!record[key]) continue;
    try {
      JSON.parse(record[key]);
    } catch {
      warnings.push(`${record.pageId}: ${key} is not valid JSON`);
    }
  }
}

for (const record of headers) {
  assert.equal(record.contentType, "researchPageHeader");
  assert.equal(record.published, true);
  assert.equal(typeof record.drupalNodeId, "number");
  assert.equal(typeof record.title, "string");
  validateLegacyPath(record);
  assertNoForbiddenKeys(record, `Header Menu ${record.drupalNodeId}`);
  if (record.menu) {
    try {
      JSON.parse(record.menu);
    } catch {
      warnings.push(`Header Menu ${record.drupalNodeId}: menu is not valid JSON`);
    }
  }
}

for (const record of researchMethods) {
  assert.equal(record.contentType, "researchMethod");
  assert.equal(record.published, true);
  assert.equal(typeof record.drupalNodeId, "number");
  assert.equal(typeof record.title, "string");
  validateLegacyPath(record);
  assertNoForbiddenKeys(record, `Research Method ${record.drupalNodeId}`);
}

for (const record of basicPages) {
  validateBaseRecord(record, "basicPage", "Basic Page");
}

const bookIds = new Set(bookPages.map((record) => record.drupalNodeId));
for (const record of bookPages) {
  validateBaseRecord(record, "bookPage", "Book Page");
  assert.equal(typeof record.bookId, "number");
  assert.equal(typeof record.weight, "number");
  assert.equal(typeof record.depth, "number");
  assert.ok(Array.isArray(record.outlinePath));
  assert.equal(record.outlinePath.at(-1), record.drupalNodeId);
  assert.ok(
    record.parentId === null || bookIds.has(record.parentId),
    `Book Page ${record.drupalNodeId} references missing parent ${record.parentId}`,
  );
}

for (const record of news) {
  validateBaseRecord(record, "news", "News item");
  assert.equal(typeof record.summary, "string");
  assert.equal(typeof record.project, "string");
  assert.equal(typeof record.promoted, "boolean");
  assert.ok(!Number.isNaN(Date.parse(record.publishedAt)));
  assert.ok(!Number.isNaN(Date.parse(record.updatedAt)));
}

for (const record of communityPortals) {
  validateBaseRecord(record, "communityPortal", "Community Portal");
  assert.equal(typeof record.portalAddress, "string");
  assert.ok(record.group === null || typeof record.group === "string");
  assert.ok(record.weight === null || typeof record.weight === "number");
  assert.equal(typeof record.onA2fkp, "boolean");
  assert.equal(typeof record.promoted, "boolean");
}

for (const { file, data } of egls) {
  assert.ok(data && typeof data === "object" && !Array.isArray(data), `EGLs file ${file} must be a JSON object`);
  for (const [gene, pageIds] of Object.entries(data)) {
    assert.ok(typeof gene === "string" && gene.length > 0, `EGLs file ${file} contains empty gene key`);
    assert.ok(
      Array.isArray(pageIds) && pageIds.length > 0 && pageIds.every((id) => typeof id === "string" && id.length > 0),
      `EGLs file ${file} gene ${gene} must map to a non-empty array of page IDs`,
    );
  }
}

const pageIdGroups = researchPages.reduce((groups, record) => {
  if (!groups.has(record.pageId)) groups.set(record.pageId, []);
  groups.get(record.pageId).push(record);
  return groups;
}, new Map());
for (const [pageId, records] of pageIdGroups) {
  if (records.length > 1) warnings.push(`${pageId}: duplicate Page ID (${records.length} records)`);
}

const headerIds = new Set(headers.map((header) => String(header.drupalNodeId)));
const researchMethodIds = new Set(
  researchMethods.map((method) => String(method.drupalNodeId)),
);
for (const record of researchPages) {
  if (record.headerId && !headerIds.has(String(record.headerId))) {
    warnings.push(`${record.pageId}: Header Menu ${record.headerId} is not in the published export`);
  }
  if (record.researchMethodId && !researchMethodIds.has(String(record.researchMethodId))) {
    warnings.push(
      `${record.pageId}: Research Method ${record.researchMethodId} is not in the published export`,
    );
  }
}

console.log(
  `Validated ${researchPages.length} Research Pages, ${headers.length} Header Menus, ` +
    `${researchMethods.length} Research Methods, ${basicPages.length} Basic Pages, ` +
    `${bookPages.length} Book Pages, ${news.length} News items, ` +
    `${communityPortals.length} Community Portals, and ${egls.length} EGL bucket/shard files.`,
);
if (warnings.length === 0) {
  console.log("No content warnings.");
} else {
  console.log(`${warnings.length} source-data warnings were preserved:`);
  for (const warning of warnings.sort()) console.log(`  ${warning}`);
}

async function readCollection(directory) {
  const filenames = (await readdir(directory))
    .filter((filename) => filename.endsWith(".json"))
    .sort();
  return Promise.all(
    filenames.map(async (filename) =>
      JSON.parse(await readFile(path.join(directory, filename), "utf8")),
    ),
  );
}

async function readRecursiveJsonFiles(directory, prefix = "") {
  const entries = (await readdir(directory, { withFileTypes: true })).sort((a, b) =>
    a.name.localeCompare(b.name),
  );
  const results = [];
  for (const entry of entries) {
    const relPath = prefix ? `${prefix}/${entry.name}` : entry.name;
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      results.push(...(await readRecursiveJsonFiles(fullPath, relPath)));
    } else if (entry.isFile() && entry.name.endsWith(".json")) {
      results.push({
        file: relPath,
        data: JSON.parse(await readFile(fullPath, "utf8")),
      });
    }
  }
  return results;
}

function validateUnique(records, key) {
  const values = new Set();
  for (const record of records) {
    assert.ok(!values.has(record[key]), `Duplicate ${key}: ${record[key]}`);
    values.add(record[key]);
  }
}

function validateBaseRecord(record, contentType, label) {
  assert.equal(record.contentType, contentType);
  assert.equal(record.published, true);
  assert.equal(typeof record.drupalNodeId, "number");
  assert.equal(typeof record.title, "string");
  assert.ok(record.bodyHtml === null || typeof record.bodyHtml === "string");
  validateLegacyPath(record);
  assertNoForbiddenKeys(record, `${label} ${record.drupalNodeId}`);
}

function validateLegacyPath(record) {
  assert.ok(
    record.legacyPath === null ||
      (typeof record.legacyPath === "string" && /^\//.test(record.legacyPath)),
    `${record.contentType} ${record.drupalNodeId} has an invalid legacyPath`,
  );
}

function assertNoForbiddenKeys(value, location) {
  if (Array.isArray(value)) {
    for (const item of value) assertNoForbiddenKeys(item, location);
    return;
  }
  if (!value || typeof value !== "object") return;

  for (const [key, child] of Object.entries(value)) {
    assert.ok(!forbiddenKey.test(key), `${location} contains excluded key ${key}`);
    assertNoForbiddenKeys(child, location);
  }
}
