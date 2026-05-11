import api from './api';

/**
 * Download (or open) an authenticated file from the API.
 *
 * Browsers do NOT attach the bearer token when navigating via a plain
 * `<a href>` / `window.open`, so JWT-protected endpoints respond 401.
 * This helper fetches the file through axios (which injects the token),
 * wraps the response in a blob URL, and either triggers a download or
 * opens it in a new tab.
 *
 * @param path     API path (e.g. `/staff/documents/file/:id`) — relative to api.defaults.baseURL
 * @param filename Optional filename for "Save As" dialog. If omitted, opens inline in a new tab.
 */
export async function downloadAuthedFile(path: string, filename?: string): Promise<void> {
    const res = await api.get(path, { responseType: 'blob' });
    const blob = res.data as Blob;
    const url = URL.createObjectURL(blob);

    if (filename) {
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        a.remove();
    } else {
        window.open(url, '_blank', 'noopener,noreferrer');
    }

    // Revoke after a short delay so the opened tab has time to load.
    setTimeout(() => URL.revokeObjectURL(url), 60_000);
}
