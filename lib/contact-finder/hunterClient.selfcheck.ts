// Self-check for the pure helpers in hunterClient.ts (no network / env / DB).
// Run: npx tsx lib/contact-finder/hunterClient.selfcheck.ts

import assert from 'node:assert';
import { detectDomainOrCompany, filterByJobTitle } from './hunterClient';

// detectDomainOrCompany: "." and no space -> domain (lowercased, trimmed).
assert.deepStrictEqual(detectDomainOrCompany('acme.com'), { field: 'domain', value: 'acme.com' });
assert.deepStrictEqual(detectDomainOrCompany('  ACME.com '), { field: 'domain', value: 'acme.com' });
assert.deepStrictEqual(detectDomainOrCompany('Acme Inc'), { field: 'company', value: 'Acme Inc' });
assert.deepStrictEqual(detectDomainOrCompany('foo.bar baz'), { field: 'company', value: 'foo.bar baz' });

// filterByJobTitle: case-insensitive substring match on `position`.
const emails = [
  { position: 'Senior Software Engineer' },
  { position: 'Head of Marketing' },
  { position: null },
  { position: 'Head (Sales)' },
];
assert.deepStrictEqual(
  filterByJobTitle(emails, 'engineer').map((e) => e.position),
  ['Senior Software Engineer']
);
// regex-special characters in the query are escaped, not interpreted.
assert.deepStrictEqual(
  filterByJobTitle(emails, 'Head (Sales)').map((e) => e.position),
  ['Head (Sales)']
);
assert.deepStrictEqual(filterByJobTitle(emails, 'ceo'), []);

console.log('hunterClient self-check: OK');
