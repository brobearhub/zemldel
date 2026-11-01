export type ExclusiveRequestGuard = {
  capture: () => number;
  invalidate: () => void;
  isCurrent: (generation: number) => boolean;
};

export function createExclusiveRequestGuard(): ExclusiveRequestGuard {
  let generation = 0;

  return {
    capture: () => generation,
    invalidate: () => {
      generation += 1;
    },
    isCurrent: (candidate) => candidate === generation,
  };
}
