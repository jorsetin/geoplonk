export const EXPLORER_TITLE = 'geoplonk';
// Standard DOM only. Observe the head, not the panorama's frequent mutations.
export function keepNeutralTitle(doc: Document): () => void {
  let nativeTitle = doc.title;
  let watchedHead: HTMLHeadElement | null = null;
  let watchedRoot: HTMLElement | null = null;
  const observer = new MutationObserver(refresh);
  function refresh() {
    if (doc.head !== watchedHead || doc.documentElement !== watchedRoot) {
      observer.disconnect();
      watchedHead = doc.head;
      watchedRoot = doc.documentElement;
      observer.observe(doc, { childList: true });
      if (watchedRoot) observer.observe(watchedRoot, { childList: true });
      if (watchedHead) observer.observe(watchedHead, { childList: true, subtree: true, characterData: true });
    }
    if (!doc.head) return;
    if (doc.title !== EXPLORER_TITLE) {
      nativeTitle = doc.title;
      doc.title = EXPLORER_TITLE;
    }
  }
  // Always observe even when document_start precedes the root/head.
  observer.observe(doc, { childList: true });
  refresh();
  return () => { observer.disconnect(); if (doc.title === EXPLORER_TITLE) doc.title = nativeTitle; };
}
