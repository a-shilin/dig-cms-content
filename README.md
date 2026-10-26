# HuGeAMP CMS Content

This repository is the canonical home for HuGeAMP content in the Git-based content management workflow.

Today, Drupal is both the place where content is edited and the service that delivers that content to the existing portal. The goal of this project is to separate those responsibilities: GitHub will become the canonical home for content, a browser-based CMS will provide an editing interface, and each version of the portal will consume the content in the way that best fits its technology.

## Background

The current HuGeAMP portal is a Vue 2 application that retrieves content from Drupal endpoints. Replacing the entire portal and CMS at the same time would create an unnecessarily large transition, so the migration is designed to happen in stages.

The first stage changes the source of the content while preserving the existing portal. The later stage will use the same Git-backed content with the planned Nuxt portal and Nuxt Content. This lets the content migration move forward independently of the front-end rewrite.

## Drupal to Git migration

Published Drupal content was exported into structured files under `content/drupal/`. The files in this repository become the source of truth at cutover, and Git history replaces Drupal's revision history going forward. The one-time audit and export tooling is maintained separately in [`hugeamp-drupal-migration`](https://github.com/a-shilin/hugeamp-drupal-migration).

The initial migration covers every published Drupal node type found in the October 2026 database backup: Research Pages, Research Pages Header Menus, Research Methods, News, Basic Pages, Book Pages, and Community Portals. Together they exercise rich HTML, navigation, book hierarchy, styling, references, and the raw JSON configuration used by research pages. The backup contains no Article nodes, despite Article remaining available as a type in the Drupal editor.

The migration is intended to preserve the content the site currently uses rather than redesign it. Rich-text content will remain HTML, and research-page configuration will remain editable as raw configuration. Existing Drupal-hosted media can continue to be referenced during the initial migration and can be moved to permanent storage separately.

This repository will not contain Drupal users, sessions, caches, administrative configuration, historical revisions, or credentials. Only current published content is in scope. Developer IDs and passwords used for protected pages will require a new access-control solution and will never be copied into Git.

## Existing portal and content

During the transition, the existing Vue 2 portal will continue to operate without Nuxt Content. The separate [`hugeamp-content-api`](https://github.com/a-shilin/hugeamp-content-api) service reads this repository and exposes responses in the shapes the portal currently expects from Drupal. This keeps the front-end changes limited and allows content types to move away from Drupal incrementally.

The migration will first be tested entirely locally:

1. Export selected content with the sibling [`hugeamp-drupal-migration`](https://github.com/a-shilin/hugeamp-drupal-migration) tooling.
2. Run [`hugeamp-content-api`](https://github.com/a-shilin/hugeamp-content-api) locally alongside the Vue 2 portal.
3. Compare Git-backed pages with their Drupal-backed versions.
4. Verify content, navigation, HTML, styles, references, and research configurations before changing the production source.

After the local migration is confirmed, the compatibility service will need to be deployed so the existing portal can retrieve the Git-backed content. Hosting, caching, media storage, data-serving endpoints, deployment, and protected-page access still need to be selected before production cutover.

## Browser-based content editing

Pages CMS is the editor during the transition. The self-hosted application and its PostgreSQL dependency belong to the separate [`hugeamp-cms`](https://github.com/a-shilin/hugeamp-cms) deployment, while the repository-specific `.pages.yml` configuration belongs here beside the content it describes. The configuration exposes all seven migrated content types, uses Source-first editing for legacy HTML, resolves Research Page relationships to Header Menus and Research Methods, and keeps creation, deletion, renaming, publication state, and structural legacy identifiers locked during the pilot.

Pages CMS is an editing layer, not the content store. Its configuration will describe how the repository's files should be presented in the editor, but it will not define a separate or proprietary content format. This keeps the content independent of Pages CMS and makes it possible to replace the editor later without another migration.

## Future portal and content

The planned portal will use Nuxt and Nuxt Content. When that work begins, Nuxt Content will read the same canonical files from this repository rather than requiring the Drupal content to be converted again.

Nuxt Studio can become the browser editor at that point if it is a better fit for the new portal. Switching from Pages CMS to Nuxt Studio should primarily involve replacing the editor configuration and workflow; the content files and their Git history will remain in place.

The intended long-term arrangement is therefore:

- GitHub stores and versions the canonical content.
- Nuxt Content connects that content to the future portal.
- Nuxt Studio may provide editing integrated with the Nuxt application.
- Drupal can be retired once its remaining content, media, delivery, and access-control responsibilities have replacements.

## Detailed project documentation

Implementation details, field mappings, open decisions, and the active migration checklist are maintained in the [content schema and migration contract](content/drupal/_meta/editing-schema.md).

## Generated & precomputed EGL files

- `content/drupal/egls/` (47 JSON files across `A.json`–`Z.json`, `0-9_other.json`, `ENSG/ENSG_0.json`–`ENSG_9.json`, and `RP/RP_0.json`–`RP_9.json`) is the `egls` content collection mapping each gene symbol or Ensembl/RP ID to the EGL research pages that contain it, used by `/rest/egls?gene=<GENE>` in `dig-service-platform/cms`. It is generated from the raw `egl nodes` snapshots and `genes.tbl` by the `egl-bi` pipeline (`byGenes_merged_json` renamed to `egls`).
- `content/drupal/_derived/egls.json.gz` is retained as a fallback/derived index built by `cms/scripts/build-egls.mjs` in `dig-service-platform`.

Run the repository checks with:

```sh
npm run validate
```

Related responsibilities live in the sibling [`hugeamp-drupal-migration`](https://github.com/a-shilin/hugeamp-drupal-migration), [`hugeamp-content-api`](https://github.com/a-shilin/hugeamp-content-api), and [`hugeamp-cms`](https://github.com/a-shilin/hugeamp-cms) repositories.
