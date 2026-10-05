import type { LunelleSupabaseClient } from '@/lib/supabase';

export interface RecordedCall {
  table: string;
  ops: Array<[method: string, args: unknown[]]>;
}

type Response = { data: unknown; error: unknown };

/**
 * Minimal stand-in for the Supabase query builder. Every chained method call
 * is recorded; awaiting the chain resolves to the next queued response.
 */
export function createFakeSupabase(responses: Response[] = []) {
  const calls: RecordedCall[] = [];
  const queue = [...responses];

  function chain(call: RecordedCall): unknown {
    const builder: unknown = new Proxy(
      {},
      {
        get(_target, prop) {
          if (prop === 'then') {
            const response = queue.shift() ?? { data: null, error: null };
            return (resolve: (v: Response) => unknown, reject: (e: unknown) => unknown) =>
              Promise.resolve(response).then(resolve, reject);
          }
          return (...args: unknown[]) => {
            call.ops.push([String(prop), args]);
            return builder;
          };
        },
      },
    );
    return builder;
  }

  const client = {
    from(table: string) {
      const call: RecordedCall = { table, ops: [] };
      calls.push(call);
      return chain(call);
    },
    rpc(fn: string, args?: unknown) {
      const call: RecordedCall = { table: `rpc:${fn}`, ops: [['rpc', [args]]] };
      calls.push(call);
      return chain(call);
    },
  } as unknown as LunelleSupabaseClient;

  return {
    client,
    calls,
    queue: (response: Response) => queue.push(response),
    /** Arguments of the first call to `method` on the n-th query. */
    argsOf: (index: number, method: string) => calls[index]?.ops.find(([m]) => m === method)?.[1],
  };
}
