import { toJpeg } from 'html-to-image';

/**
 * Capture document colors and clean paper layout rather than the workspace's
 * screen-only dark theme, interactive buttons, or overflowing containers.
 */
export async function toPaperJpeg(
  element: HTMLElement,
  options?: Parameters<typeof toJpeg>[1],
) {
  const previous = element.getAttribute('data-export-paper');
  const prevWidth = element.style.width;
  const prevMaxWidth = element.style.maxWidth;

  element.setAttribute('data-export-paper', 'true');

  // Ensure container expands to accommodate the full sheet without clipping
  const neededWidth = Math.max(element.scrollWidth || 0, 1150);
  element.style.width = `${neededWidth}px`;
  element.style.maxWidth = 'none';

  const combinedFilter = (node: HTMLElement) => {
    if (node.classList) {
      if (
        node.classList.contains('print:hidden') ||
        (typeof node.className === 'string' && node.className.includes('print:hidden'))
      ) {
        return false;
      }
    }
    if (node.getAttribute && node.getAttribute('data-screen-only') === 'true') {
      return false;
    }
    if (options?.filter) {
      return options.filter(node);
    }
    return true;
  };

  try {
    // Brief layout settle tick so light styles and DOM reflow complete
    await new Promise((r) => setTimeout(r, 60));

    return await toJpeg(element, {
      quality: 0.98,
      pixelRatio: 2.5,
      backgroundColor: '#ffffff',
      filter: combinedFilter,
      width: neededWidth,
      ...options,
    });
  } finally {
    element.style.width = prevWidth;
    element.style.maxWidth = prevMaxWidth;
    if (previous === null) element.removeAttribute('data-export-paper');
    else element.setAttribute('data-export-paper', previous);
  }
}

