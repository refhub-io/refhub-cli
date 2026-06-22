// tests/pdf.test.ts
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { RefHubClient } from '../src/client.js';
import { handlePdfUpload } from '../src/commands/pdf.js';

const pdfBytes = Buffer.from('%PDF-1.4 fake pdf content');

describe('handlePdfUpload', () => {
  let client: RefHubClient;
  let stdoutSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    client = new RefHubClient('rhk_test');
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

    await handlePdfUpload(client, 'vault-1', 'item-1', '/fake/file.pdf', false);

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toContain('/vaults/vault-1/items/item-1/pdf');
    expect((init.headers as Record<string, string>)['Content-Type']).toBe('application/pdf');
    expect(init.body).toBeInstanceOf(Buffer);
  });

  it('sends API key in Authorization header', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true, status: 200,
      json: () => Promise.resolve({ data: { stored: true } }),
    }));
    vi.mock('fs', () => ({ readFileSync: () => pdfBytes }));

    await handlePdfUpload(client, 'vault-1', 'item-1', '/fake/file.pdf', false);

    const [, init] = vi.mocked(fetch).mock.calls[0] as [string, RequestInit];
    expect((init.headers as Record<string, string>)['Authorization']).toBe('Bearer rhk_test');
  });

  it('writes result to stdout', async () => {
    const responseData = { stored: true, provider: 'google_drive', fileId: 'f1', pdfUrl: 'https://drive.google.com/...' };
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true, status: 200,
      json: () => Promise.resolve({ data: responseData }),
    }));
    vi.mock('fs', () => ({ readFileSync: () => pdfBytes }));

    await handlePdfUpload(client, 'vault-1', 'item-1', '/fake/file.pdf', false);

    const output = JSON.parse(String(stdoutSpy.mock.calls[0]?.[0]));
    expect(output.data.stored).toBe(true);
    expect(output.data.fileId).toBe('f1');
  });
});

