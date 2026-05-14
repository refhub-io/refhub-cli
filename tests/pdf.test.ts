// tests/pdf.test.ts
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ManagementClient, resolveManagementClient } from '../src/client.js';
import { handlePdfUpload } from '../src/commands/pdf.js';

const pdfBytes = Buffer.from('%PDF-1.4 fake pdf content');

describe('handlePdfUpload', () => {
  let mgmt: ManagementClient;
  let stdoutSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    mgmt = new ManagementClient('jwt_test');
    stdoutSpy = vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
    vi.spyOn(process.stderr, 'write').mockImplementation(() => true);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('sends raw bytes with application/pdf content-type', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true, status: 200,
      json: () => Promise.resolve({ data: { stored: true, provider: 'google_drive', fileId: 'f1' } }),
    });
    vi.stubGlobal('fetch', fetchMock);

    vi.mock('fs', () => ({ readFileSync: () => pdfBytes }));

    await handlePdfUpload(mgmt, 'pub-1', '/fake/file.pdf', false);

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toContain('/publications/pub-1/pdf');
    expect((init.headers as Record<string, string>)['Content-Type']).toBe('application/pdf');
    expect(init.body).toBeInstanceOf(Buffer);
  });

  it('sends JWT in Authorization header', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true, status: 200,
      json: () => Promise.resolve({ data: { stored: true } }),
    }));
    vi.mock('fs', () => ({ readFileSync: () => pdfBytes }));

    await handlePdfUpload(mgmt, 'pub-1', '/fake/file.pdf', false);

    const [, init] = vi.mocked(fetch).mock.calls[0] as [string, RequestInit];
    expect((init.headers as Record<string, string>)['Authorization']).toBe('Bearer jwt_test');
  });

  it('writes result to stdout', async () => {
    const responseData = { stored: true, provider: 'google_drive', fileId: 'f1', pdfUrl: 'https://drive.google.com/...' };
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true, status: 200,
      json: () => Promise.resolve({ data: responseData }),
    }));
    vi.mock('fs', () => ({ readFileSync: () => pdfBytes }));

    await handlePdfUpload(mgmt, 'pub-1', '/fake/file.pdf', false);

    const output = JSON.parse(String(stdoutSpy.mock.calls[0]?.[0]));
    expect(output.data.stored).toBe(true);
    expect(output.data.fileId).toBe('f1');
  });
});

describe('ManagementClient', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('doiMetadata sends POST with doi in body and JWT header', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true, status: 200,
      json: () => Promise.resolve({ data: { title: 'A Paper', authors: [], doi: '10.1/x', url: '', type: 'article' } }),
    }));
    const mgmt = new ManagementClient('jwt_abc');
    await mgmt.doiMetadata('10.1/x');

    const [url, init] = vi.mocked(fetch).mock.calls[0] as [string, RequestInit];
    expect(url).toContain('/doi-metadata');
    expect(JSON.parse(String(init.body)).doi).toBe('10.1/x');
    expect((init.headers as Record<string, string>)['Authorization']).toBe('Bearer jwt_abc');
  });

  it('doiMetadata returns null when data is null', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true, status: 200,
      json: () => Promise.resolve({ data: null }),
    }));
    const mgmt = new ManagementClient('jwt_abc');
    const result = await mgmt.doiMetadata('10.1/missing');
    expect(result).toBeNull();
  });
});

describe('resolveManagementClient', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    delete process.env['REFHUB_JWT'];
  });

  it('returns a ManagementClient when --jwt is passed', () => {
    const mgmt = resolveManagementClient('jwt_explicit');
    expect(mgmt).toBeInstanceOf(ManagementClient);
  });

  it('returns a ManagementClient when REFHUB_JWT is set', () => {
    process.env['REFHUB_JWT'] = 'jwt_from_env';
    const mgmt = resolveManagementClient(undefined);
    expect(mgmt).toBeInstanceOf(ManagementClient);
  });

  it('exits with code 3 when no JWT is available', () => {
    delete process.env['REFHUB_JWT'];
    const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => { throw new Error('exit'); });
    vi.spyOn(process.stderr, 'write').mockImplementation(() => true);
    expect(() => resolveManagementClient(undefined)).toThrow('exit');
    expect(exitSpy).toHaveBeenCalledWith(3);
  });
});
