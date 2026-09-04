import '@testing-library/jest-dom/vitest';
import 'whatwg-fetch';

if (typeof window !== 'undefined' && !window.matchMedia) {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: (query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    }),
  });
}

/**
 * jsdom 26 expands `:scope` to `tag#id.class` without CSS.escape.
 * React 18 `useId()` is `:r0:`, so nwsapi throws DOMException (name SyntaxError).
 * MUI v9 Select/List uses `:scope` for focus/layout in tests.
 */
function isInvalidSelectorError(error: unknown): boolean {
  return (
    error instanceof SyntaxError ||
    (typeof DOMException !== "undefined" &&
      error instanceof DOMException &&
      error.name === "SyntaxError") ||
    (error instanceof Error && error.name === "SyntaxError")
  );
}

function cssEscape(value: string): string {
  if (typeof CSS !== "undefined" && typeof CSS.escape === "function") {
    return CSS.escape(value);
  }
  return value.replace(/[^a-zA-Z0-9_-]/g, (ch) => `\\${ch}`);
}

function elementAsSelector(element: Element): string {
  const tag = element.tagName.toLowerCase();
  const id = element.id ? `#${cssEscape(element.id)}` : "";
  const classes = Array.from(element.classList)
    .filter(Boolean)
    .map((cls) => `.${cssEscape(cls)}`)
    .join("");
  return `${tag}${id}${classes}`;
}

function rewriteScopeSelector(selector: string, element: Element): string {
  return selector.replace(/:scope/g, elementAsSelector(element));
}

function queryRoot(element: Element): ParentNode {
  const root = element.getRootNode();
  if (root instanceof Document || (typeof ShadowRoot !== "undefined" && root instanceof ShadowRoot)) {
    return root;
  }
  return element.ownerDocument;
}

if (typeof Element !== "undefined") {
  const originalMatches = Element.prototype.matches;
  const originalClosest = Element.prototype.closest;
  const originalQuerySelector = Element.prototype.querySelector;
  const originalQuerySelectorAll = Element.prototype.querySelectorAll;

  Element.prototype.matches = function (this: Element, selectors: string) {
    try {
      return originalMatches.call(this, selectors);
    } catch (error) {
      if (!isInvalidSelectorError(error) || !selectors.includes(":scope")) {
        throw error;
      }
      return originalMatches.call(this, rewriteScopeSelector(selectors, this));
    }
  };

  Element.prototype.closest = function (this: Element, selectors: string) {
    try {
      return originalClosest.call(this, selectors);
    } catch (error) {
      if (!isInvalidSelectorError(error) || !selectors.includes(":scope")) {
        throw error;
      }
      return originalClosest.call(this, rewriteScopeSelector(selectors, this));
    }
  };

  Element.prototype.querySelector = function (this: Element, selectors: string) {
    try {
      return originalQuerySelector.call(this, selectors);
    } catch (error) {
      if (!isInvalidSelectorError(error) || !selectors.includes(":scope")) {
        throw error;
      }
      return queryRoot(this).querySelector(rewriteScopeSelector(selectors, this));
    }
  };

  Element.prototype.querySelectorAll = function (this: Element, selectors: string) {
    try {
      return originalQuerySelectorAll.call(this, selectors);
    } catch (error) {
      if (!isInvalidSelectorError(error) || !selectors.includes(":scope")) {
        throw error;
      }
      return queryRoot(this).querySelectorAll(rewriteScopeSelector(selectors, this));
    }
  };
}
