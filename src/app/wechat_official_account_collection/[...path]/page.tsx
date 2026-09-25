import { notFound } from 'next/navigation';
import fs from 'fs';
import path from 'path';
import { parse } from 'smol-toml';
import { Metadata } from 'next';
import CardPage from '@/components/pages/CardPage';
import WeChatBackButton from '@/components/pages/WeChatBackButton';
import { CardPageConfig } from '@/types/page';
import { applyArticleCountSubtitles } from '@/lib/wechatCollection';

const COLLECTION_DIR = path.join(process.cwd(), 'content', 'wechat_official_account_collection');
const COLLECTION_BASE_URL = '/wechat_official_account_collection';

// Recursively collect every *.toml file under the collection directory,
// mapping each file's path (relative to the directory, without extension)
// to URL segments.
function collectTomlPaths(dir: string, base: string): string[][] {
  const results: string[][] = [];

  let entries: fs.Dirent[];
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return results;
  }

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...collectTomlPaths(fullPath, path.join(base, entry.name)));
    } else if (entry.isFile() && entry.name.endsWith('.toml')) {
      const rel = path.join(base, entry.name.slice(0, -'.toml'.length));
      results.push(rel.split(path.sep).filter(Boolean));
    }
  }

  return results;
}

function getConfigForPath(segments: string[]): CardPageConfig | null {
  // Guard against path traversal (segments come from the URL at dev time)
  if (segments.some((s) => s === '' || s === '.' || s === '..' || s.includes('/') || s.includes('\\'))) {
    return null;
  }

  let raw: string;
  try {
    raw = fs.readFileSync(path.join(COLLECTION_DIR, ...segments) + '.toml', 'utf-8');
  } catch {
    return null;
  }

  try {
    const config = parse(raw) as unknown as { type?: string } & CardPageConfig;
    if (config.type !== 'card') {
      return null;
    }
    return config as CardPageConfig;
  } catch (error) {
    console.error(`Error parsing wechat collection TOML ${segments.join('/')}:`, error);
    return null;
  }
}

export function generateStaticParams() {
  return collectTomlPaths(COLLECTION_DIR, '').map((p) => ({
    path: p,
  }));
}

function urlForPath(segments: string[]): string {
  return `${COLLECTION_BASE_URL}/${segments.join('/')}`;
}

// Find the page whose card links to the given URL (the semantic parent).
function findReferringPage(currentUrl: string): string | null {
  const target = currentUrl.replace(/\/$/, '');
  let found: string | null = null;

  const scan = (dir: string, base: string) => {
    let entries: fs.Dirent[];
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
      return;
    }

    for (const entry of entries) {
      if (found) return;
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        scan(fullPath, path.join(base, entry.name));
      } else if (entry.isFile() && entry.name.endsWith('.toml')) {
        const rel = path.join(base, entry.name.slice(0, -'.toml'.length));
        const href = urlForPath(rel.split(path.sep).filter(Boolean));
        if (href === target) return; // skip the page itself

        let raw: string;
        try {
          raw = fs.readFileSync(fullPath, 'utf-8');
        } catch {
          return;
        }

        try {
          const config = parse(raw) as unknown as { items?: { link?: string }[] };
          for (const item of config.items ?? []) {
            if (item.link && item.link.replace(/\/$/, '') === target) {
              found = href;
              return;
            }
          }
        } catch {
          // ignore unparsable files
        }
      }
    }
  };

  scan(COLLECTION_DIR, '');
  return found;
}

// Determine where the "back" button should lead:
// 1. the closest existing ancestor page (folder hierarchy), otherwise
// 2. the page that links to this one (semantic parent), otherwise
// 3. the official account listing page.
function findParentHref(segments: string[]): string {
  for (let len = segments.length - 1; len >= 1; len--) {
    const prefix = segments.slice(0, len);
    if (fs.existsSync(path.join(COLLECTION_DIR, ...prefix) + '.toml')) {
      return urlForPath(prefix);
    }
  }

  const referring = findReferringPage(urlForPath(segments));
  if (referring) {
    return referring;
  }

  return '/official_account';
}

export async function generateMetadata({ params }: { params: Promise<{ path: string[] }> }): Promise<Metadata> {
  const { path: segments } = await params;
  const config = getConfigForPath(segments);

  if (!config) {
    return {};
  }

  return {
    title: config.title,
    description: config.description,
  };
}

export default async function WeChatCollectionPage({ params }: { params: Promise<{ path: string[] }> }) {
  const { path: segments } = await params;
  const config = getConfigForPath(segments);

  if (!config) {
    notFound();
  }

  // Back button on every collection page (the "official_account" listing
  // page is the root level and has none).
  const parentHref = findParentHref(segments);

  // Collection pages are single-locale; pick the count label language from
  // the page title's content.
  const labelLocale = /[一-鿿]/.test(config.title) ? 'zh' : 'en';
  const displayConfig = applyArticleCountSubtitles(config, labelLocale);

  return (
    <div className="max-w-3xl mx-auto">
      {parentHref && (
        <div className="mb-4 -mt-2">
          <WeChatBackButton href={parentHref} />
        </div>
      )}
      <CardPage config={displayConfig} />
    </div>
  );
}
