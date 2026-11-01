export type LatestFinanceRequestRunner<T> = {
  run: (
    key: string,
    load: (signal: AbortSignal) => Promise<T>,
  ) => Promise<void>;
  cancel: () => void;
  currentKey: () => string | null;
};

/**
 * Последний выбранный conversation — единственный источник, которому
 * разрешено обновить finance state. Abort экономит сеть, sequence защищает
 * даже от transport, который проигнорировал signal.
 */
export function createLatestFinanceRequestRunner<T>(
  apply: (value: T) => void,
): LatestFinanceRequestRunner<T> {
  let sequence = 0;
  let key: string | null = null;
  let controller: AbortController | null = null;

  return {
    async run(nextKey, load) {
      sequence += 1;
      const requestSequence = sequence;
      key = nextKey;
      controller?.abort();
      controller = new AbortController();
      let value: T;
      try {
        value = await load(controller.signal);
      } catch (error) {
        if (requestSequence !== sequence || controller.signal.aborted) {
          return;
        }
        throw error;
      }
      if (requestSequence === sequence && key === nextKey) {
        apply(value);
      }
    },
    cancel() {
      sequence += 1;
      key = null;
      controller?.abort();
      controller = null;
    },
    currentKey() {
      return key;
    },
  };
}
