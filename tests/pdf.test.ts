// tests/pdf.test.ts
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { RefHubClient } from '../src/client.js';
import { handlePdfUpload } from '../src/commands/pdf.js';

const pdfBytes = Buffer.from('%PDF-1.4 fake pdf content');

function mockResumableFetchSequence(resultData: Record<string, unknown> = { stored: true, provider: 'google_drive', fileId: 'f1' }) {
  return vi.fn()
    .mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ data: { upload_url: 'https://drive.example/upload-session', file_name: 'file.pdf' } }),
    })
    .mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ id: 'f1', webViewLink: 'https://drive.google.com/...' }),
      text: () => Promise.resolve(''),
    })
    .mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ data: resultData }),
    });
}

describe('handlePdfUpload', () => {
  let client: RefHubClient;
  let stdoutSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    client = new RefHubClient('rhk_test');
    stdoutSpy = vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
    vi.spyOn(process.stderr, 'write').mockImplementation(() => true);
    vi.mock('fs', () => ({ readFileSync: () => pdfBytes }));
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('uploads via the resumable session flow: session, direct Drive PUT, then complete', async () => {
    const fetchMock = mockResumableFetchSequence();
    vi.stubGlobal('fetch', fetchMock);

    await handlePdfUpload(client, 'vault-1', 'item-1', '/fake/file.pdf', false);

    expect(fetchMock).toHaveBeenCalledTimes(3);
    const [sessionUrl] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(sessionUrl).toContain('/vaults/vault-1/items/item-1/pdf/session');

    const [driveUrl, driveInit] = fetchMock.mock.calls[1] as [string, RequestInit];
    expect(driveUrl).toBe('https://drive.example/upload-session');
    expect(driveInit.method).toBe('PUT');
    expect((driveInit.headers as Record<string, string>)['Content-Type']).toBe('application/pdf');
    expect(driveInit.body).toBe(pdfBytes);

    const [completeUrl] = fetchMock.mock.calls[2] as [string, RequestInit];
    expect(completeUrl).toContain('/vaults/vault-1/items/item-1/pdf/complete');
  });

  it('sends API key in Authorization header on the session request', async () => {
    vi.stubGlobal('fetch', mockResumableFetchSequence());

    await handlePdfUpload(client, 'vault-1', 'item-1', '/fake/file.pdf', false);

    const [, init] = vi.mocked(fetch).mock.calls[0] as [string, RequestInit];
    expect((init.headers as Record<string, string>)['Authorization']).toBe('Bearer rhk_test');
  });

  it('writes result to stdout', async () => {
    const responseData = { stored: true, provider: 'google_drive', fileId: 'f1', driveUrl: 'https://drive.google.com/...' };
    vi.stubGlobal('fetch', mockResumableFetchSequence(responseData));

    await handlePdfUpload(client, 'vault-1', 'item-1', '/fake/file.pdf', false);

    const output = JSON.parse(String(stdoutSpy.mock.calls[0]?.[0]));
    expect(output.data.stored).toBe(true);
    expect(output.data.fileId).toBe('f1');
  });
});
