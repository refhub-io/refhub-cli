// scripts/smoke.ts
// Live end-to-end smoke test. Requires REFHUB_API_KEY in environment.
// Run with: npm run smoke
// Cleans up after itself (deletes the test vault at the end).

import { RefHubClient } from '../src/client.js';

const key = process.env['REFHUB_API_KEY'];
if (!key) {
  console.error('REFHUB_API_KEY not set');
  process.exit(3);
}

const client = new RefHubClient(key);
let testVaultId = '';

async function step(name: string, fn: () => Promise<unknown>) {
  process.stdout.write(`\n[smoke] ${name}... `);
  try {
    const result = await fn();
    process.stdout.write('OK\n');
    return result;
  } catch (err) {
    process.stdout.write('FAILED\n');
    console.error(err);
    process.exit(1);
  }
}

async function main() {
  console.log('RefHub CLI Smoke Test');
  console.log('=====================');

  // 1. List vaults
  const vaults = await step('list vaults', () => client.listVaults()) as { data: Array<{ id: string; name: string }> };
  console.log(`   Found ${vaults.data.length} vault(s)`);

  // 2. Read first vault if available
  if (vaults.data.length > 0) {
    const firstVault = vaults.data[0];
    await step(`read vault "${firstVault.name}"`, () => client.getVault(firstVault.id));
  }

  // 3. Create test vault
  const created = await step('create test vault', () =>
    client.createVault({ name: `smoke-test-${Date.now()}`, description: 'CLI smoke test — safe to delete', visibility: 'private' })
  ) as { data: { id: string; name: string } };
  testVaultId = created.data.id;
  console.log(`   Created vault: ${created.data.id}`);

  // 4. Tag CRUD
  const tag = await step('create tag', () =>
    client.createTag(testVaultId, { name: 'smoke-tag', color: '#ff0000' })
  ) as { data: { id: string } };
  const tagId = tag.data.id;

  await step('list tags', () => client.listTags(testVaultId));
  await step('update tag', () => client.updateTag(testVaultId, tagId, { name: 'smoke-tag-updated' }));
  await step('delete tag', () => client.deleteTag(testVaultId, tagId));

  // 5. Add item
  const item = await step('add item', () =>
    client.addItems(testVaultId, [{ title: 'Smoke Test Paper', authors: ['Test Author'], year: 2026 }])
  ) as { data: Array<{ id: string }> };
  const itemId = item.data[0].id;
  console.log(`   Item id: ${itemId}`);

  // 6. Relation CRUD
  // publication_relations.publication_id references vault_publications.id (the item id)
  const item2 = await step('add second item for relation', () =>
    client.addItems(testVaultId, [{ title: 'Related Smoke Paper', year: 2026 }])
  ) as { data: Array<{ id: string }> };
  const itemId2 = item2.data[0].id;

  const relation = await step('create relation', () =>
    client.createRelation(testVaultId, { publication_id: itemId, related_publication_id: itemId2, relation_type: 'cites' })
  ) as { data: { id: string } };
  const relationId = relation.data.id;

  await step('list relations', () => client.listRelations(testVaultId));
  await step('update relation', () => client.updateRelation(testVaultId, relationId, { relation_type: 'extends' }));
  await step('delete relation', () => client.deleteRelation(testVaultId, relationId));

  // 7. Export
  await step('export as JSON', () => client.exportVault(testVaultId, 'json'));
  await step('export as BibTeX', () => client.exportVault(testVaultId, 'bibtex'));

  // 8. Stats and audit
  await step('get stats', () => client.getStats(testVaultId));
  await step('get audit log', () => client.getAudit(testVaultId));

  // 9. Cleanup — delete test vault
  await step('delete test vault (cleanup)', () => client.deleteVault(testVaultId));

  console.log('\n✓ All smoke tests passed\n');
}

main().catch((err) => {
  console.error('Unexpected error:', err);
  if (testVaultId) {
    console.error(`WARNING: Test vault ${testVaultId} may not have been cleaned up.`);
  }
  process.exit(1);
});
