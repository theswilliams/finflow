import { describe, expect, it, vi } from "vitest";
import { createPersister } from "./persistence";

type Repo = { name: string };
const repo: Repo = { name: "repo" };

function setup(over: Partial<Parameters<typeof createPersister<Repo>>[0]> = {}) {
  const onError = vi.fn();
  const reconcile = vi.fn().mockResolvedValue(undefined);
  const persist = createPersister<Repo>({
    enabled: () => true,
    getRepo: () => repo,
    reconcile,
    onError,
    ...over,
  });
  return { persist, onError, reconcile };
}

const deferred = () => {
  let resolve!: () => void;
  let reject!: (e: unknown) => void;
  const promise = new Promise<void>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
};

describe("createPersister: ordering", () => {
  it("runs writes one at a time, in the order issued", async () => {
    const { persist } = setup();
    const log: string[] = [];
    const first = deferred();
    const p1 = persist(async () => {
      log.push("start 1");
      await first.promise;
      log.push("end 1");
    });
    const p2 = persist(async () => {
      log.push("start 2");
    });
    await Promise.resolve();
    expect(log).toEqual(["start 1"]); // 2 must wait for 1 (e.g. account before its transaction)
    first.resolve();
    await Promise.all([p1, p2]);
    expect(log).toEqual(["start 1", "end 1", "start 2"]);
  });

  it("keeps processing later writes after one fails", async () => {
    const { persist } = setup();
    const ran = vi.fn();
    const p1 = persist(async () => {
      throw new Error("boom");
    });
    const p2 = persist(async () => ran());
    await Promise.all([p1, p2]);
    expect(ran).toHaveBeenCalledTimes(1);
  });
});

describe("createPersister: reconciliation", () => {
  it("does not reload after successful writes", async () => {
    const { persist, reconcile, onError } = setup();
    await persist(async () => undefined);
    expect(reconcile).not.toHaveBeenCalled();
    expect(onError).not.toHaveBeenCalled();
  });

  it("reports a failed write and reloads authoritative state afterwards", async () => {
    const { persist, reconcile, onError } = setup();
    const err = new Error("violates foreign key");
    await persist(async () => {
      throw err;
    });
    expect(onError).toHaveBeenCalledWith(err, "write");
    expect(reconcile).toHaveBeenCalledTimes(1);
    expect(reconcile).toHaveBeenCalledWith(repo);
  });

  it("waits for the queue to drain before reloading, and reloads only once for several failures", async () => {
    const { persist, reconcile } = setup();
    const gate = deferred();
    const order: string[] = [];
    reconcile.mockImplementation(async () => {
      order.push("reconcile");
    });
    const p1 = persist(async () => {
      await gate.promise;
      order.push("write 1 failed");
      throw new Error("1");
    });
    const p2 = persist(async () => {
      order.push("write 2 failed");
      throw new Error("2");
    });
    const p3 = persist(async () => {
      order.push("write 3 ok");
    });
    gate.resolve();
    await Promise.all([p1, p2, p3]);
    expect(order).toEqual(["write 1 failed", "write 2 failed", "write 3 ok", "reconcile"]);
    expect(reconcile).toHaveBeenCalledTimes(1);
  });

  it("reports a failed reload without throwing, and later writes still work", async () => {
    const { persist, reconcile, onError } = setup();
    reconcile.mockRejectedValueOnce(new Error("offline"));
    await persist(async () => {
      throw new Error("write failed");
    });
    expect(onError).toHaveBeenCalledWith(expect.objectContaining({ message: "offline" }), "reconcile");
    const ran = vi.fn();
    await persist(async () => ran());
    expect(ran).toHaveBeenCalled();
  });

  it("reloads again for a failure that happens after an earlier reload", async () => {
    const { persist, reconcile } = setup();
    await persist(async () => {
      throw new Error("a");
    });
    await persist(async () => {
      throw new Error("b");
    });
    expect(reconcile).toHaveBeenCalledTimes(2);
  });
});

describe("createPersister: disabled", () => {
  it("does nothing in local/guest mode", async () => {
    const run = vi.fn();
    const { persist, reconcile } = setup({ enabled: () => false });
    await persist(run);
    expect(run).not.toHaveBeenCalled();
    expect(reconcile).not.toHaveBeenCalled();
  });

  it("does nothing while signed out (no repository)", async () => {
    const run = vi.fn();
    const { persist } = setup({ getRepo: () => null });
    await persist(run);
    expect(run).not.toHaveBeenCalled();
  });
});
