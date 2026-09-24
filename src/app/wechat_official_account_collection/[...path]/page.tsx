import { notFound } from 'next/navigation';
import fs from 'fs';
import path from 'path';
import { parse } from 'smol-toml';
import { Metadata } from 'next';
import CardPage from '@/components/pages/CardPage';
import { CardPageConfig } from '@/types/page';

const COLLECTION_DIR = path.join(process.cwd(), 'content', 'wechat_official_account_collection');

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

  return (
    <div className="max-w-3xl mx-auto">
      <CardPage config={config} />
    </div>
  );
}
