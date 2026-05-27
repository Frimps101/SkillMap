/**
 * Send a message to the extension service worker with short retries.
 * MV3 workers sleep; the first call after idle may fail.
 */
export async function sendRuntimeMessage<T>(message: unknown): Promise<T> {
  let lastError: unknown;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      return (await chrome.runtime.sendMessage(message)) as T;
    } catch (err) {
      lastError = err;
      await new Promise((r) => setTimeout(r, 80 * (attempt + 1)));
    }
  }
  throw lastError;
}
