# Drupal Content Editing Schema

This document is maintained as the field inventory and migration contract for the Drupal-to-Git content migration.

The migration covers every published Drupal node type present in the October 2026 backup: Research Pages, Research Pages Header Menus, Research Methods, Basic Pages, Book Pages, News, and Community Portals. Content is canonical under `content/drupal/`; Git history replaces Drupal revisions. Drupal users, passwords, developer credentials, sessions, caches, and administrative metadata are never imported.

## Canonical repository layout

```text
content/
  drupal/
    research-pages/
    navigation/
    basic-pages/
    books/
    news/
    research-methods/
    community-portals/
    _meta/
      editing-schema.md
      migration-manifest.json
      asset-map.json
```

All initial rich-text fields remain HTML. Arbitrary research-page configuration remains as authored; it is tested on the development site rather than upgraded to a new validation model.

Research Page filenames use `{encodedPageId}--{drupalNodeId}.json`. The node ID keeps filenames unique while duplicate and otherwise unsafe legacy Page IDs are resolved. The `pageId` inside each record remains the public lookup key.

## Shared editor fields

| Drupal editor field | Target key | Treatment |
| --- | --- | --- |
| Title | `title` | Preserve |
| Body, page description, or description | `bodyHtml` | Preserve as HTML |
| Published | `published` | Preserve; only `true` records ship to production |
| Revision log and revision control | Git commit / pull request | Do not import old revisions |
| Author and saved date | Git author and commit time | Do not import authors; preserve News publication/update dates needed for chronology |
| URL alias | `legacyPath` when required | Extract only for routes served by Vue |

## Content-type schema

### Basic page `page`

| Target key | Editor type | Required |
| --- | --- | --- |
| `title` | text | Yes |
| `bodyHtml` | rich HTML | No |
| `published` | boolean | Yes |

### Book page `book`

| Target key | Editor type | Required |
| --- | --- | --- |
| `title` | text | Yes |
| `bodyHtml` | rich HTML | No |
| `bookId` | content reference | Yes |
| `parentId` | content reference | No |
| `weight` | number | No |
| `depth` | number | Yes |
| `outlinePath` | ordered content-reference list | Yes |
| `published` | boolean | Yes |

The hierarchy fields come from Drupal's Book outline table. `outlinePath` preserves the full root-to-page path needed to recreate the legacy table of contents.

### News `cfde_news`

| Target key | Editor type | Required |
| --- | --- | --- |
| `title` | text | Yes |
| `summary` | text | Yes |
| `bodyHtml` | rich HTML | No |
| `thumbnailHtml` | rich HTML containing the existing asset reference | No |
| `project` | text | Yes |
| `publishedAt` | date/time | Yes |
| `updatedAt` | date/time | Yes |
| `promoted` | boolean | Yes |
| `published` | boolean | Yes |

### Research method `research_method`

| Target key | Editor type | Required |
| --- | --- | --- |
| `title` | text | Yes |
| `bodyHtml` | rich HTML | No |
| `published` | boolean | Yes |

### Research page `research_page`

| Drupal field | Target key | Editor type |
| --- | --- | --- |
| Node title | `title` | text |
| Node owner ID | `legacyAssetOwnerId` | number; temporary legacy asset-path component |
| `field_page_id` | `pageId` | text; required, stable lookup ID |
| `field_show_on_byor_front` | `showOnByorFront` | boolean |
| `field_byor_project_summary` | `projectSummary` | text |
| `field_url_to_page` | `urlToPage` | URL/text |
| `field_image_byor_front` | `byorFrontImage` | asset reference |
| `field_landing_page` | `isProjectLandingPage` | boolean |
| `field_data_points` | `dataPoints` | raw configuration text |
| `field_is_api` | `isDataPointDynamic` | boolean |
| `field_api_parameters` | `apiParameters` | JSON code |
| `field_data_type` | `dataType` | select |
| `field_data_points_list_labels` | `dataPointsListLabels` | JSON code |
| `field_data_table_format` | `dataTableFormat` | JSON code |
| `field_number_of_rows` | `numberOfRows` | number |
| `field_data_table_legend` | `dataTableLegendHtml` | rich HTML |
| `field_data_comparison` | `dataComparisonFormat` | JSON code |
| `field_filters` | `filters` | JSON code |
| `field_filter_width` | `filterWidth` | select |
| `field_data_visualizer` | `dataVisualizer` | select |
| `field_custom_visualizer` | `customVisualizer` | text |
| `field_visualizer_configuration` | `visualizerConfiguration` | JSON code |
| `field_data_visualizer_legend` | `dataVisualizerLegendHtml` | rich HTML |
| Node body | `bodyHtml` | rich HTML |
| `field_page_mode` | `mode` | select |
| `field_research_method` | `researchMethodId` | content reference |
| `field_page_header_menu_node_id` | `headerId` | content reference |
| `field_page_style` | `pageStyle` | CSS code |
| `field_display_on_kp` | `displayOnKp` | boolean |
| Node status | `published` | boolean |

`field_dev_id` and `field_dev_password` are explicitly excluded. The editor keeps JSON and CSS fields as raw code fields; it does not attempt to build forms for their nested formats.

`legacyAssetOwnerId` does not import a Drupal user or author record. The current Vue 2 portal uses the numeric value to construct some existing Drupal asset URLs. It can be removed after those assets receive stable, user-independent locations.

### Research Pages Header Menu `research_pages_header_menu`

| Drupal field | Target key | Editor type |
| --- | --- | --- |
| Node title | `title` | text |
| `field_menu` | `menu` | JSON code |
| `field_header_logo` | `logoHtml` | rich HTML |
| `field_portal_style` | `styleCss` | CSS code |
| Node status | `published` | boolean |

### Community portal `community_portals`

| Drupal field | Target key | Editor type |
| --- | --- | --- |
| Node title | `title` | text |
| Node body | `bodyHtml` | rich HTML |
| `field_portal_address` | `portalAddress` | URL |
| `field_group` | `group` | select/reference |
| `field_weight` | `weight` | number |
| `field_on_a2fkp` | `onA2fkp` | boolean |
| Promotion status | `promoted` | boolean |
| Node status | `published` | boolean |

## Local-first architecture

| Part | GitHub | Local pilot | Hosted later |
| --- | --- | --- | --- |
| Content | Canonical files | Read directly from checkout | Remains Git-backed |
| Drupal importer | `hugeamp-drupal-migration` | Run only when regenerating the export | Archived after final cutover |
| Vue compatibility API | `hugeamp-content-api` | Local Node server | Separately deployed read service |
| Pages CMS | `.pages.yml` in this repository | `hugeamp-cms` local stack | Self-hosted `hugeamp-cms` stack |
| Assets | References and manifest | Existing Drupal URLs | Drupal initially, then object storage/CDN |
| Protected pages | Non-secret policy name only | Deferred | Hosting/edge access layer |

Pages CMS and Nuxt Studio are interchangeable editing layers. Both must edit the same canonical content files. Their configuration is not canonical content.

The current Pages CMS pilot exposes every migrated content type. Rich HTML starts in Source mode, raw research configuration remains in code fields, and Research Page header/method relationships use collection references. Creation, rename, delete, publication state, stable lookup identifiers, book hierarchy, and migrated News timestamps remain locked. Nullable and unmodeled legacy values are preserved when an unrelated field is saved.

## Open decisions and verification list

### Decided for the local migration

- [x] Local-only testing; no hosting is required.
- [x] Migration scope: all current published Drupal node content.
- [x] Existing Drupal asset URLs remain in place temporarily.
- [x] Password-protected pages are deferred; legacy credentials are excluded.

### Full export audit on October 16, 2026

- 661 of 662 Research Pages are published and exported.
- 28 of 28 Research Pages Header Menus are published and exported.
- 48 of 48 Research Methods are published and exported.
- 6 of 6 Basic Pages are published and exported.
- 33 of 33 Book Pages are published and exported.
- 114 of 115 News items are published and exported.
- 23 of 23 Community Portals are published and exported.
- No other published node types exist in the backup; the Article type has no records.
- Six active URL aliases are preserved as `legacyPath`: `/tutorial`, `/score-plot`, `/update`, `/Kanoni_GLGC`, `/NIDDK_awards`, and `/ampcmd_description`.
- Exported records pass structural, manifest, publication-status, Drupal-identity, and excluded-credential-key checks.
- Duplicate Page IDs: `kc_gene_set_browser_old` and `kc_entity_protein` each identify two published records.
- Page ID `pankbase_ news` contains a space and is encoded only in its filename; its stored value is unchanged.
- Research Page `bacos_T2D_DEGs_299` has invalid JSON in `filters`.
- Header Menu node 67 has invalid JSON in `menu`.
- Research Page node 309 has a nonnumeric `numberOfRows` source value.
- `context_test` and `region_region_test` reference Header Menu nodes 523 and 549, which are not in the published header export.
- `T1D_test_135` and `Atla_T2D_567` reference Research Method nodes 133 and 273, which are not present in the current node table.

These values are preserved rather than silently corrected. Each must be either confirmed as intentional, corrected in the source content, or handled explicitly by the compatibility layer.

### Before first migrated output is committed

- [x] Define the local development API endpoint and the Vue 2 manual source switch.
- [x] Build a read-only inventory of every published Drupal node type.
- [x] Verify representative field mappings against live Drupal responses and identify malformed source values without changing them.
- [x] Audit header and research-method references; document the four known stale references above.
- [x] Audit Vue calls to Drupal content endpoints and implement the first compatibility responses.
- [x] Scan generated content keys for credentials and other excluded data.

### Before production cutover

- [ ] Choose static API hosting, domain, caching, CORS, rollback, and promotion workflow.
- [ ] Locate a complete Drupal public-files export and choose durable asset storage.
- [ ] Inventory external consumers of Drupal REST/Views endpoints.
- [ ] Choose an access solution for protected pages.

## Protected-page replacement

Protected records may later carry a non-secret declaration:

```json
{ "access": "protected", "accessPolicy": "kc-internal-preview" }
```

The content API route—not client-side code—must enforce that policy. A small trusted group can use an edge password gate; named users should use organization login/SSO. Actual passwords, hashes, membership lists, and OAuth secrets never enter Git.
