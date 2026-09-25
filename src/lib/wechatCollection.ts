import fs from 'fs';
import path from 'path';
import { parse } from 'smol-toml';
import { CardPageConfig } from '@/types/page';
import { getMessages } from '@/lib/i18n/messages';

const COLLECTION_DIR = path.join(process.cwd(), 'content', 'wechat_official_account_collection');
export const WECHAT_COLLECTION_BASE = '/wechat_official_account_collection';

// Turn a collection page link (e.g. /wechat_official_account_collection/a/b) into
// URL segments (['a', 'b']). Returns null for links outside the collection.
export function parseCollectionLink(link: string): string[] | null {
  const clean = link.replace(/\/$/, '');
  if (!clean.startsWith(WECHAT_COLLECTION_BASE)) {
    return null;
  }
  const rest = clean.slice(WECHAT_COLLECTION_BASE.length).replace(/^\/+/, '');
  if (!rest) {
    return null;
  }
  const segments = rest.split('/').filter(Boolean);
  return segments.length > 0 ? segments : null;
}

function readItems(segments: string[]): { link?: string }[] {
  let raw: string;
  try {
    raw = fs.readFileSync(path.join(COLLECTION_DIR, ...segments) + '.toml', 'utf-8');
  } catch {
    return [];
  }

  try {
    const config = parse(raw) as unknown as { items?: { link?: string }[] };
    return config.items ?? [];
  } catch {
    return [];
  }
}

// Count all articles in a collection: its own article cards plus,
// recursively, the articles of every sub-collection it links to.
export function countCollectionArticles(segments: string[], visited: Set<string> = new Set()): number {
  const key = segments.join('/');
  if (visited.has(key)) {
    return 0; // cycle guard
  }
  visited.add(key);

  let total = 0;
  for (const item of readItems(segments)) {
    if (item.link) {
      const sub = parseCollectionLink(item.link);
      total += sub ? countCollectionArticles(sub, visited) : 1;
    } else {
      total += 1;
    }
  }
  return total;
}

// For every card item that links to a collection page, set (or append to) its
// subtitle the auto-computed article count in the given locale.
export function applyArticleCountSubtitles(config: CardPageConfig, locale: string): CardPageConfig {
  const template = getMessages(locale).collection.articleCount;

  const items = (config.items ?? []).map((item) => {
    const sub = item.link ? parseCollectionLink(item.link) : null;
    if (!sub) {
      return item;
    }
    const countLabel = template.replace('{count}', String(countCollectionArticles(sub)));
    return {
      ...item,
      subtitle: item.subtitle ? `${item.subtitle} · ${countLabel}` : countLabel,
    };
  });

  return { ...config, items };
}
