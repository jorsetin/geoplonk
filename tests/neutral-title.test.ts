// @vitest-environment jsdom
import { expect, test } from 'vitest';
import { keepNeutralTitle, EXPLORER_TITLE } from '../src/content/neutral-title';
const flush = () => new Promise(resolve => setTimeout(resolve, 0));
test('neutral title survives Maps updates and title/head replacements, then restores latest native title', async () => {
 document.title='Shibuya Station - Google Maps';
 const stop=keepNeutralTitle(document);
 expect(document.title).toBe(EXPLORER_TITLE);
 document.title='Another place - Google Maps';
 await flush(); expect(document.title).toBe(EXPLORER_TITLE);
 document.querySelector('title')!.outerHTML='<title>A third place</title>';
 await flush(); expect(document.title).toBe(EXPLORER_TITLE);
 document.head.outerHTML='<head><title>A fourth place</title></head>';
 await flush(); expect(document.title).toBe(EXPLORER_TITLE);
 stop(); expect(document.title).toBe('A fourth place');
 document.title='Normal Maps'; await flush(); expect(document.title).toBe('Normal Maps');
});
test('title guard tolerates document_start before head creation', async () => {
 const doc=document.implementation.createHTMLDocument('');
 doc.head.remove();
 const stop=keepNeutralTitle(doc);
 const head=doc.createElement('head'); head.innerHTML='<title>Place name</title>';
 doc.documentElement.prepend(head);
 await flush(); expect(doc.title).toBe(EXPLORER_TITLE);
 stop(); expect(doc.title).toBe('Place name');
});
