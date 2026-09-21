import { toJpeg } from 'html-to-image';

/** Capture document colors rather than the workspace's screen-only dark theme. */
export async function toPaperJpeg(
  element: HTMLElement,
  options?: Parameters<typeof toJpeg>[1],
) {
  const previous = element.getAttribute('data-export-paper');
  element.setAttribute('data-export-paper', '');
  try {
    return await toJpeg(element, options);
  } finally {
    if (previous === null) element.removeAttribute('data-export-paper');
    else element.setAttribute('data-export-paper', previous);
  }
}
