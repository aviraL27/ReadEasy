/**
 * Browser polyfills for modern ECMAScript features required by pdfjs-dist v6
 * on slightly older mobile/tablet browsers (e.g. Chrome < 126, Safari < 18).
 */

// 1. URL.parse polyfill (added in Chrome 126, Safari 18)
if (typeof URL !== 'undefined' && typeof (URL as unknown as { parse?: unknown }).parse !== 'function') {
  Object.defineProperty(URL, 'parse', {
    value: function parse(url: string | URL, base?: string | URL): URL | null {
      try {
        return base !== undefined ? new URL(url, base) : new URL(url);
      } catch {
        return null;
      }
    },
    writable: true,
    configurable: true,
  });
}

// 2. Promise.withResolvers polyfill (added in Chrome 119, Safari 17.4)
if (typeof (Promise as unknown as { withResolvers?: unknown }).withResolvers !== 'function') {
  Object.defineProperty(Promise, 'withResolvers', {
    value: function withResolvers<T>() {
      let resolve!: (value: T | PromiseLike<T>) => void;
      let reject!: (reason?: unknown) => void;
      const promise = new Promise<T>((res, rej) => {
        resolve = res;
        reject = rej;
      });
      return { promise, resolve, reject };
    },
    writable: true,
    configurable: true,
  });
}

// 3. Object.groupBy polyfill (added in Chrome 117, Safari 17.4)
if (typeof (Object as unknown as { groupBy?: unknown }).groupBy !== 'function') {
  Object.defineProperty(Object, 'groupBy', {
    value: function groupBy<T, K extends PropertyKey>(
      items: Iterable<T>,
      callback: (item: T, index: number) => K
    ): Partial<Record<K, T[]>> {
      const result = Object.create(null) as Record<K, T[]>;
      let i = 0;
      for (const item of items) {
        const key = callback(item, i++);
        if (result[key]) {
          result[key].push(item);
        } else {
          result[key] = [item];
        }
      }
      return result;
    },
    writable: true,
    configurable: true,
  });
}

export {};
