import { notFound } from 'next/navigation';
import fs from 'fs';
import path from 'path';
import { parse } from 'smol-toml';
import { Metadata } from 'next';
import CardPage from '@/components/pages/CardPage';
import { CardPageConfig } from '@/types/page';

const COLLECTION_DIR = path.join(process.cwd(), 'content', 'wechat_official_account_collection');

function decodeAccountParam(account: string): string {
  // generateStaticParams returns URL-encoded values (required by output: 'export'
  // for non-ASCII segments); the page receives them decoded, this is a safety net.
  try {
    return decodeURIComponent(account);
  } catch {
    return account;
  }
}

function getAccountConfig(account: string): CardPageConfig | null {
  account = decodeAccountParam(account);

  // Guard against path traversal (account comes from the URL at dev time)
  if (account.includes('/') || account.includes('\\') || account.includes('..')) {
    return null;
  }

  let raw: string;
  try {
    raw = fs.readFileSync(path.join(COLLECTION_DIR, `${account}.toml`), 'utf-8');
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
    console.error(`Error parsing wechat account TOML ${account}:`, error);
    return null;
  }
}

export function generateStaticParams() {
  let files: string[] = [];
  try {
    files = fs.readdirSync(COLLECTION_DIR);
  } catch {
    return [];
  }

  return files
    .filter((file) => file.endsWith('.toml'))
    .map((file) => ({
      account: file.slice(0, -'.toml'.length),
    }));
}

export async function generateMetadata({ params }: { params: Promise<{ account: string }> }): Promise<Metadata> {
  const { account } = await params;
  const config = getAccountConfig(account);

  if (!config) {
    return {};
  }

  return {
    title: config.title,
    description: config.description,
  };
}

export default async function WeChatAccountPage({ params }: { params: Promise<{ account: string }> }) {
  const { account } = await params;
  const config = getAccountConfig(account);

  if (!config) {
    notFound();
  }

  return (
    <div className="max-w-3xl mx-auto">
      <CardPage config={config} />
    </div>
  );
}
