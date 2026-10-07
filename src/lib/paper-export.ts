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
  const prevHeight = element.style.height;
  const prevMaxHeight = element.style.maxHeight;
  const prevOverflow = element.style.overflow;
  const prevBorderRadius = element.style.borderRadius;

  element.setAttribute('data-export-paper', 'true');

  // Ensure container expands without clipping or scrollbars
  element.style.overflow = 'visible';
  element.style.maxHeight = 'none';
  element.style.height = 'auto';
  element.style.borderRadius = '0';

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

    // Calculate exact full height including table, headers, and footer totals
    const table = element.querySelector('table');
    const tfoot = element.querySelector('tfoot');
    const elRect = element.getBoundingClientRect();

    let contentBottom = 0;
    if (tfoot) {
      const tfootRect = tfoot.getBoundingClientRect();
      contentBottom = Math.max(contentBottom, tfootRect.bottom - elRect.top);
    }
    if (table) {
      const tableRect = table.getBoundingClientRect();
      contentBottom = Math.max(contentBottom, tableRect.bottom - elRect.top);
    }

    const calculatedHeight = Math.ceil(
      Math.max(
        element.scrollHeight || 0,
        element.offsetHeight || 0,
        contentBottom + 40
      )
    );
    const neededHeight = options?.height
      ? Math.max(calculatedHeight, options.height)
      : calculatedHeight;

    element.style.height = `${neededHeight}px`;

    return await toJpeg(element, {
      quality: 0.98,
      pixelRatio: 2.5,
      backgroundColor: '#ffffff',
      filter: combinedFilter,
      width: neededWidth,
      height: neededHeight,
      ...options,
    });
  } finally {
    element.style.width = prevWidth;
    element.style.maxWidth = prevMaxWidth;
    element.style.height = prevHeight;
    element.style.maxHeight = prevMaxHeight;
    element.style.overflow = prevOverflow;
    element.style.borderRadius = prevBorderRadius;
    if (previous === null) element.removeAttribute('data-export-paper');
    else element.setAttribute('data-export-paper', previous);
  }
}

