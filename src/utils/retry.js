const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// Exponential backoff: try, then wait 2 s, 4 s, 8 s between retries
export async function withRetry(task, retries = 3, baseDelayMs = 2000) {
  for (let attempt = 0; ; attempt++) {
    try {
      return await task();
    } catch (error) {
      if (attempt >= retries) throw error;
      await wait(baseDelayMs * 2 ** attempt);
    }
  }
}

// Give up on a network call that hangs (e.g. weak signal)
export function withTimeout(promise, ms = 15000) {
  return Promise.race([
    promise,
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error("Request timed out")), ms),
    ),
  ]);
}
