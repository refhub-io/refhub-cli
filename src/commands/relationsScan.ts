// src/commands/relationsScan.ts
//
// Scans Semantic Scholar references/citations for vault items and creates
// "cites" relations to sibling items already in the same vault — matched
// by DOI, falling back to exact title, mirroring the RefHub frontend's own
// relationship-suggestion matching (findMatchingPublication in
// publicationMatching.ts). Pure client-side orchestration on top of the
// existing discover/enrich building blocks — no dedicated backend route.
import type { Command } from 'commander';
import { RefHubClient, resolveClient, run } from '../client.js';
import type { Item, Relation, SemanticScholarPaper } from '../types.js';

function normalizeDoi(doi: string): string {
  return doi.trim().toLowerCase().replace(/^https?:\/\/(dx\.)?doi\.org\//, '');
}

function normalizeTitle(title: string): string {
  return title.trim().toLowerCase().replace(/\s+/g, ' ');
}

export function findMatchingItem(paper: SemanticScholarPaper, items: Item[], excludeId: string): Item | undefined {
  const paperDoi = paper.external_ids?.['DOI'] ?? paper.external_ids?.['doi'];
  if (paperDoi) {
    const normalized = normalizeDoi(paperDoi);
    const doiMatch = items.find((i) => i.id !== excludeId && i.doi && normalizeDoi(i.doi) === normalized);
    if (doiMatch) return doiMatch;
  }
  if (paper.title) {
    const normalized = normalizeTitle(paper.title);
    return items.find((i) => i.id !== excludeId && i.title && normalizeTitle(i.title) === normalized);
  }
  return undefined;
}

function relationExists(relations: Relation[], publicationId: string, relatedPublicationId: string): boolean {
  return relations.some((r) => r.publication_id === publicationId && r.related_publication_id === relatedPublicationId);
}

export type ScanOutcome = 'skipped_no_doi' | 'lookup_failed' | 'no_matches' | 'scanned';

export interface ScanItemResult {
  outcome: ScanOutcome;
  suggested: number;
  created: number;
  skippedDuplicate: number;
}

/**
 * Scans one item's Semantic Scholar references (papers it cites) and
 * citations (papers that cite it), matches each against `allItems`, and
 * creates a "cites" relation for every new match. `existingRelations` is
 * mutated with pending creations so a whole-vault scan doesn't propose the
 * same pair twice across items.
 */
export async function scanItemRelations(
  item: Item,
  client: RefHubClient,
  vaultId: string,
  allItems: Item[],
  existingRelations: Relation[],
  opts: { dryRun: boolean; limit?: number },
): Promise<ScanItemResult> {
  if (!item.doi) return { outcome: 'skipped_no_doi', suggested: 0, created: 0, skippedDuplicate: 0 };

  const lookup = await client.semanticScholarLookup({ doi: item.doi });
  const paperId = lookup.data.paper_id;
  if (!paperId) return { outcome: 'lookup_failed', suggested: 0, created: 0, skippedDuplicate: 0 };

  const [referencesResult, citationsResult] = await Promise.all([
    client.semanticScholarPaperList('references', paperId, opts.limit),
    client.semanticScholarPaperList('citations', paperId, opts.limit),
  ]);

  let suggested = 0;
  let created = 0;
  let skippedDuplicate = 0;

  // references: this item cites the matched paper
  for (const paper of referencesResult.data) {
    const matched = findMatchingItem(paper, allItems, item.id);
    if (!matched) continue;
    suggested++;
    if (relationExists(existingRelations, item.id, matched.id)) {
      skippedDuplicate++;
      continue;
    }
    if (!opts.dryRun) {
      await client.createRelation(vaultId, { publication_id: item.id, related_publication_id: matched.id, relation_type: 'cites' });
    }
    existingRelations.push({ id: 'pending', vault_id: vaultId, publication_id: item.id, related_publication_id: matched.id, relation_type: 'cites', created_at: '', updated_at: '' });
    created++;
  }

  // citations: the matched paper cites this item
  for (const paper of citationsResult.data) {
    const matched = findMatchingItem(paper, allItems, item.id);
    if (!matched) continue;
    suggested++;
    if (relationExists(existingRelations, matched.id, item.id)) {
      skippedDuplicate++;
      continue;
    }
    if (!opts.dryRun) {
      await client.createRelation(vaultId, { publication_id: matched.id, related_publication_id: item.id, relation_type: 'cites' });
    }
    existingRelations.push({ id: 'pending', vault_id: vaultId, publication_id: matched.id, related_publication_id: item.id, relation_type: 'cites', created_at: '', updated_at: '' });
    created++;
  }

  return { outcome: suggested === 0 ? 'no_matches' : 'scanned', suggested, created, skippedDuplicate };
}

export function registerRelationsScan(relations: Command): void {
  relations
    .command('scan')
    .description('Scan Semantic Scholar references/citations and create "cites" relations to sibling items in this vault, matched by DOI or exact title')
    .requiredOption('--vault <id>')
    .option('--item <itemId>', 'scan a single item instead of the whole vault')
    .option('--dry-run', 'show what would be created without writing')
    .option('--limit <n>', 'references/citations fetched per item from Semantic Scholar, 1-25', (v) => parseInt(v, 10))
    .action(async (opts, cmd) => {
      const g = cmd.optsWithGlobals();
      const client = resolveClient(g.apiKey);
      const dryRun = opts.dryRun ?? false;

      await run(async () => {
        const vaultResult = await client.getVault(opts.vault);
        const allItems = vaultResult.data.items;
        const existingRelations = [...vaultResult.data.relations];

        const targets = opts.item ? allItems.filter((i) => i.id === opts.item) : allItems;
        if (opts.item && targets.length === 0) {
          process.stderr.write(JSON.stringify({ error: { code: 'item_not_found', message: `Item ${opts.item} not found in vault ${opts.vault}.` } }) + '\n');
          process.exit(2);
        }

        const withDoi = targets.filter((i) => i.doi);
        if (withDoi.length === 0) {
          process.stdout.write(JSON.stringify({ data: { dry_run: dryRun, scanned: 0, suggested: 0, created: 0, skipped_duplicate: 0, no_doi: targets.length, message: 'No items with a DOI to scan.' } }, null, 2) + '\n');
          return;
        }

        let suggested = 0;
        let created = 0;
        let skippedDuplicate = 0;
        let noMatches = 0;
        let lookupFailed = 0;

        for (const item of withDoi) {
          const result = await scanItemRelations(item, client, opts.vault, allItems, existingRelations, { dryRun, limit: opts.limit });
          suggested += result.suggested;
          created += result.created;
          skippedDuplicate += result.skippedDuplicate;
          if (result.outcome === 'no_matches') noMatches++;
          if (result.outcome === 'lookup_failed') lookupFailed++;
          // pace Semantic Scholar calls — each item makes a lookup + references + citations request
          await new Promise((r) => setTimeout(r, 1000));
        }

        process.stdout.write(JSON.stringify({
          data: {
            dry_run: dryRun,
            scanned: withDoi.length,
            no_doi: targets.length - withDoi.length,
            lookup_failed: lookupFailed,
            no_matches: noMatches,
            suggested,
            created,
            skipped_duplicate: skippedDuplicate,
          },
        }, null, 2) + '\n');
      });
    });
}
