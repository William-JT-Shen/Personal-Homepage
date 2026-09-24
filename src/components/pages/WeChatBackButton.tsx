'use client';

import { useMessages } from '@/lib/i18n/useMessages';

export default function WeChatBackButton({ href }: { href: string }) {
    const messages = useMessages();

    return (
        <a
            href={href}
            className="inline-flex items-center gap-1 text-sm font-medium text-accent transition-all duration-200 rounded px-2 py-1 hover:bg-accent/10 hover:shadow-sm"
        >
            {messages.collection.back}
        </a>
    );
}
