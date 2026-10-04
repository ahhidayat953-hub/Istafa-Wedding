/**
 * Firestore Security Rules Test Suite — Verifies the "Dirty Dozen" Payloads return PERMISSION_DENIED.
 */

export interface DirtyDozenTestCase {
  id: number;
  name: string;
  collectionPath: string;
  operation: 'get' | 'list' | 'create' | 'update' | 'delete';
  auth: { uid: string; email?: string; email_verified?: boolean } | null;
  payload?: Record<string, unknown>;
  expectedResult: 'PERMISSION_DENIED';
}

export const dirtyDozenTests: DirtyDozenTestCase[] = [
  {
    id: 1,
    name: 'Unauthenticated Product Creation',
    collectionPath: '/products/prod-1',
    operation: 'create',
    auth: null,
    payload: { name: 'Unauthorized Decor' },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 2,
    name: 'Unverified Admin Email Spoof',
    collectionPath: '/products/prod-1',
    operation: 'create',
    auth: { uid: 'spoof-1', email: 'ahhidayat953@gmail.com', email_verified: false },
    payload: { name: 'Spoofed Decor' },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 3,
    name: 'Shadow Field Injection on Product',
    collectionPath: '/products/prod-1',
    operation: 'create',
    auth: { uid: 'admin-1', email: 'ahhidayat953@gmail.com', email_verified: true },
    payload: { name: 'Valid Name', ghostField: 'injected' },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 4,
    name: 'Author UID Spoofing',
    collectionPath: '/products/prod-1',
    operation: 'create',
    auth: { uid: 'admin-1', email: 'ahhidayat953@gmail.com', email_verified: true },
    payload: { authorUid: 'other-uid' },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 5,
    name: 'Forged Client Timestamp on Create',
    collectionPath: '/categories/cat-1',
    operation: 'create',
    auth: { uid: 'admin-1', email: 'ahhidayat953@gmail.com', email_verified: true },
    payload: { createdAt: '1999-01-01T00:00:00Z' },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 6,
    name: 'Immutable createdAt Mutation on Update',
    collectionPath: '/products/prod-1',
    operation: 'update',
    auth: { uid: 'admin-1', email: 'ahhidayat953@gmail.com', email_verified: true },
    payload: { createdAt: '2026-01-01T00:00:00Z' },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 7,
    name: 'Path ID Poisoning',
    collectionPath: '/products/bad$id*!',
    operation: 'get',
    auth: null,
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 8,
    name: 'Empty Images Array on Product',
    collectionPath: '/products/prod-1',
    operation: 'create',
    auth: { uid: 'admin-1', email: 'ahhidayat953@gmail.com', email_verified: true },
    payload: { images: [] },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 9,
    name: 'Unbounded Images Array Exhaustion (>20 photos)',
    collectionPath: '/products/prod-1',
    operation: 'create',
    auth: { uid: 'admin-1', email: 'ahhidayat953@gmail.com', email_verified: true },
    payload: { images: new Array(25).fill({ url: 'https://example.com/a.jpg', isPrimary: false }) },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 10,
    name: 'Value Poisoning on Settings WhatsApp Number',
    collectionPath: '/settings/main',
    operation: 'update',
    auth: { uid: 'admin-1', email: 'ahhidayat953@gmail.com', email_verified: true },
    payload: { whatsappNumber: 'not-a-phone-number!' },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 11,
    name: 'Unfiltered List Query on Non-Public Documents',
    collectionPath: '/products',
    operation: 'list',
    auth: null,
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 12,
    name: 'Self-Assigned Admin Escalation',
    collectionPath: '/admins/attacker-uid',
    operation: 'create',
    auth: { uid: 'attacker-uid', email: 'attacker@example.com', email_verified: true },
    payload: { uid: 'attacker-uid', role: 'admin' },
    expectedResult: 'PERMISSION_DENIED',
  },
];
