/** Serializes async work per key — one in-flight operation per connection. */
export class ConnectLock {
  private readonly locks = new Map<string, Promise<unknown>>();

  run<T>(key: string, fn: () => Promise<T>): Promise<T> {
    const existing = this.locks.get(key);
    if (existing) return existing as Promise<T>;

    const task = fn().finally(() => {
      this.locks.delete(key);
    });
    this.locks.set(key, task);
    return task;
  }
}
