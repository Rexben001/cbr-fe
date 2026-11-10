import '@testing-library/jest-dom/vitest';

// ProseMirror measures the current browser selection when editor commands
// focus or scroll. jsdom deliberately has no layout engine, so provide the
// harmless empty geometry that browser-based tests would otherwise supply.
Range.prototype.getClientRects = () => [] as unknown as DOMRectList;
Range.prototype.getBoundingClientRect = () => new DOMRect(0, 0, 0, 0);
