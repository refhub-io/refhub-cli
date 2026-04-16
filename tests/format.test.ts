// tests/format.test.ts
import { describe, it, expect, vi, afterEach } from 'vitest';
import { format } from '../src/format.js';

describe('format', () => {
  afterEach(() => vi.restoreAllMocks());

  it('writes JSON to stdout in JSON mode', () => {
    const spy = vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
    format({ data: [{ id: '1', name: 'Test' }] }, false);
    const raw = String(spy.mock.calls[0]?.[0]);
    const parsed = JSON.parse(raw);
    expect(parsed.data[0].id).toBe('1');
  });

  it('JSON mode output ends with newline', () => {
    const spy = vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
    format({ data: [] }, false);
    expect(String(spy.mock.calls[0]?.[0])).toMatch(/\n$/);
  });

  it('falls back to JSON when data is not an array in table mode', () => {
    const spy = vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
    format({ data: { id: '1' } }, true);
    const raw = String(spy.mock.calls[0]?.[0]);
    expect(() => JSON.parse(raw)).not.toThrow();
  });

  it('falls back to JSON when array is empty in table mode', () => {
    const spy = vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
    format({ data: [] }, true, ['id', 'name']);
    const raw = String(spy.mock.calls[0]?.[0]);
    const parsed = JSON.parse(raw);
    expect(parsed.data).toEqual([]);
  });

  it('renders table with specified columns in table mode', () => {
    const spy = vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
    format({ data: [{ id: 'v1', name: 'Vault A', visibility: 'private', extra: 'ignored' }] }, true, ['id', 'name', 'visibility']);
    const output = String(spy.mock.calls[0]?.[0]);
    expect(output).toContain('id');
    expect(output).toContain('name');
    expect(output).toContain('Vault A');
    expect(output).not.toContain('extra');
  });

  it('uses all object keys as columns when columns not specified in table mode', () => {
    const spy = vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
    format({ data: [{ id: 'v1', name: 'Vault A' }] }, true);
    const output = String(spy.mock.calls[0]?.[0]);
    expect(output).toContain('id');
    expect(output).toContain('Vault A');
  });
});
