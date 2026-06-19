type CookieValue = { name: string; value: string };

export function headers() {
  return new Headers();
}

export function cookies() {
  const store = new Map<string, string>();
  return {
    get: (name: string) => {
      const value = store.get(name);
      return value ? { name, value } : undefined;
    },
    getAll: (): CookieValue[] => [...store.entries()].map(([name, value]) => ({ name, value })),
    has: (name: string) => store.has(name),
    set: (name: string, value: string) => {
      store.set(name, value);
    },
    delete: (name: string) => {
      store.delete(name);
    },
  };
}

