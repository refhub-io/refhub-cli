// scripts/smoke.ts
// Live end-to-end smoke test. Requires REFHUB_API_KEY in environment.
// Run with: npm run smoke
// Cleans up after itself (deletes the test vault at the end).

import { RefHubClient, RefHubError } from '../src/client.js';

const key = process.env['REFHUB_API_KEY'];
if (!key) {
  console.error('REFHUB_API_KEY not set');
  process.exit(3);
}

const client = new RefHubClient(key);
let testVaultId = '';

/** A failed step. Its details are already printed; it only stops the run, so cleanup still happens. */
class SmokeFailure extends Error {}

async function step(name: string, fn: () => Promise<unknown>) {
  process.stdout.write(`\n[smoke] ${name}... `);
  try {
    const result = await fn();
    process.stdout.write('OK\n');
    return result;
  } catch (err) {
    process.stdout.write('FAILED\n');
    console.error(err);
    throw new SmokeFailure(name);
  }
}

/** For operations that should be rejected -- fails the smoke test if the call succeeds, or rejects with the wrong code. */
async function expectRejection(name: string, fn: () => Promise<unknown>, expectedCode: string) {
  process.stdout.write(`\n[smoke] ${name}... `);
  try {
    await fn();
  } catch (err) {
    if (err instanceof RefHubError && err.code === expectedCode) {
      process.stdout.write(`OK (correctly rejected: ${err.code})\n`);
      return;
    }
    process.stdout.write(`FAILED (expected code ${expectedCode})\n`);
    console.error(err);
    throw new SmokeFailure(name);
  }
  process.stdout.write(`FAILED (expected to be rejected with ${expectedCode}, but it succeeded)\n`);
  throw new SmokeFailure(name);
}

/** Deletes the test vault if a failed run left it behind. Never throws, so it can't hide the original failure. */
async function cleanUpTestVault() {
  if (!testVaultId) return;
  const vaultId = testVaultId;
  process.stdout.write(`\n[smoke] cleanup: delete test vault ${vaultId}... `);
  try {
    await client.deleteVault(vaultId);
    testVaultId = '';
    process.stdout.write('OK\n');
  } catch (err) {
    process.stdout.write('FAILED\n');
    console.error(`WARNING: test vault ${vaultId} was not cleaned up; delete it by hand.`, err);
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

  // 9. Archive lifecycle — irreversible, so this runs last, right before cleanup.
  // No unarchive step exists anywhere in this flow by design.
  const archived = await step('archive test vault', () => client.archiveVault(testVaultId)) as { data: { archived_at: string | null } };
  if (!archived.data.archived_at) {
    console.error('FAILED: archiveVault succeeded but archived_at was not set on the response');
    throw new SmokeFailure('archive test vault');
  }

  await expectRejection(
    'write against archived vault is rejected',
    () => client.updateVault(testVaultId, { name: 'should not be allowed' }),
    'vault_archived',
  );
  await expectRejection(
    're-archiving an already-archived vault is rejected',
    () => client.archiveVault(testVaultId),
    'vault_archived',
  );
  await step('read still works on an archived vault', () => client.getVault(testVaultId));

  // 10. Cleanup — delete test vault (owner can still delete an archived vault outright)
  await step('delete archived test vault (cleanup)', () => client.deleteVault(testVaultId));
  testVaultId = '';

  console.log('\n✓ All smoke tests passed\n');
}

main()
  .catch((err) => {
    if (!(err instanceof SmokeFailure)) console.error('Unexpected error:', err);
    process.exitCode = 1;
  })
  // Runs after a failure at any step, so a failed run doesn't leave a smoke-test vault in the live account.
  .finally(cleanUpTestVault);
