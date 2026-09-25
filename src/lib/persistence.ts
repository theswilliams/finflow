/**
 * Serialized, self-healing write queue for the optimistic Supabase store.
 *
 * The UI updates local state immediately (optimistic), then calls `persist()`.
 * This module guarantees two things the previous fire-and-forget approach did not:
 *
 *  1. ORDER: writes are executed one at a time, in the order they were issued.
 *     (e.g. "create account" always reaches the database before the
 *     "create transaction" that references it.)
 *  2. RECONCILIATION: if any write fails, the error is reported and, once the queue
 *     has drained, the local state is reloaded from the database, so the UI can
 *     never keep showing changes the database rejected.
 *
 * It has no React or Supabase imports so its behaviour is easy to unit-test.
 */
export type PersistDeps<R> = {
  /** Whether persistence is active (false in local/guest mode). */
  enabled: () => boolean;
  /** The current repository, or null when signed out. */
  getRepo: () => R | null;
  /** Reload authoritative state from the database into the UI. */
  reconcile: (repo: R) => Promise<void>;
  /** Report a failure (log/toast). `phase` says whether the write or the reload failed. */
  onError: (error: unknown, phase: "write" | "reconcile") => void;
};

export function createPersister<R>(deps: PersistDeps<R>) {
  let chain: Promise<void> = Promise.resolve();
  let pending = 0;
  let needsReconcile = false;

  /** Queue a write. Returns a promise that settles after this write (and any resulting reconcile) finishes. */
  return function persist(run: (repo: R) => Promise<unknown>): Promise<void> {
    if (!deps.enabled()) return Promise.resolve();
    const repo = deps.getRepo();
    if (!repo) return Promise.resolve();

    pending++;
    chain = chain.then(async () => {
      try {
        await run(repo);
      } catch (error) {
        needsReconcile = true;
        deps.onError(error, "write");
      } finally {
        pending--;
      }

      // Reload only when nothing else is queued, so we never clobber later optimistic edits
      // that haven't been written yet. One reload covers any number of failures.
      if (pending === 0 && needsReconcile) {
        needsReconcile = false;
        try {
          await deps.reconcile(repo);
        } catch (error) {
          deps.onError(error, "reconcile");
        }
      }
    });
    return chain;
  };
}
