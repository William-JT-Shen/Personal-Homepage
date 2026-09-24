'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import Image from 'next/image';
import { ArrowTopRightOnSquareIcon } from '@heroicons/react/24/outline';
import { useMessages } from '@/lib/i18n/useMessages';
import { CardPageConfig } from '@/types/page';

const markdownComponents = {
    p: ({ children }: React.ComponentProps<'p'>) => <p className="mb-3 last:mb-0">{children}</p>,
    ul: ({ children }: React.ComponentProps<'ul'>) => <ul className="list-disc list-inside mb-3 space-y-1">{children}</ul>,
    ol: ({ children }: React.ComponentProps<'ol'>) => <ol className="list-decimal list-inside mb-3 space-y-1">{children}</ol>,
    li: ({ children }: React.ComponentProps<'li'>) => <li className="mb-1">{children}</li>,
    a: ({ ...props }) => (
        <a
            {...props}
            target="_blank"
            rel="noopener noreferrer"
            className="text-accent font-medium transition-all duration-200 rounded hover:bg-accent/10 hover:shadow-sm"
        />
    ),
    blockquote: ({ children }: React.ComponentProps<'blockquote'>) => (
        <blockquote className="border-l-4 border-accent/50 pl-4 italic my-4 text-neutral-600 dark:text-neutral-500">
            {children}
        </blockquote>
    ),
    strong: ({ children }: React.ComponentProps<'strong'>) => <strong className="font-semibold text-primary">{children}</strong>,
    em: ({ children }: React.ComponentProps<'em'>) => <em className="italic">{children}</em>,
    code: ({ children }: React.ComponentProps<'code'>) => (
        <code className="px-1.5 py-0.5 rounded bg-neutral-100 dark:bg-neutral-800 text-[0.95em]">{children}</code>
    ),
};

export default function CardPage({ config, embedded = false }: { config: CardPageConfig; embedded?: boolean }) {
    const messages = useMessages();
    const [activeImage, setActiveImage] = useState<{ src: string; title: string } | null>(null);

    useEffect(() => {
        if (!activeImage) return;

        const onKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') setActiveImage(null);
        };
        document.body.style.overflow = 'hidden';
        window.addEventListener('keydown', onKeyDown);

        return () => {
            document.body.style.overflow = '';
            window.removeEventListener('keydown', onKeyDown);
        };
    }, [activeImage]);

    return (
        <>
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
        >
            <div className={embedded ? "mb-4" : "mb-8"}>
                <h1 className={`${embedded ? "text-2xl" : "text-4xl"} font-serif font-bold text-primary mb-4`}>{config.title}</h1>
                {config.description && (
                    <div className={`${embedded ? "text-base" : "text-lg"} text-neutral-600 dark:text-neutral-500 max-w-2xl leading-relaxed`}>
                        <ReactMarkdown components={markdownComponents}>
                            {config.description}
                        </ReactMarkdown>
                    </div>
                )}
            </div>

            <div className={`grid ${embedded ? "gap-4" : "gap-6"}`}>
                {config.items.map((item, index) => (
                    <motion.div
                        key={index}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.4, delay: 0.1 * index }}
                        className={`bg-white dark:bg-neutral-900 ${embedded ? "p-4" : "p-6"} rounded-xl shadow-sm border border-neutral-200 dark:border-neutral-800 hover:shadow-lg transition-all duration-200 hover:scale-[1.01]`}
                    >
                        <div className="flex justify-between items-start mb-2">
                            <h3 className={`${embedded ? "text-lg" : "text-xl"} font-semibold text-primary`}>
                                {item.image ? (
                                    <button
                                        onClick={() => setActiveImage({ src: item.image as string, title: item.title })}
                                        className="group inline-flex items-center gap-1 text-left hover:text-accent transition-colors duration-200"
                                    >
                                        {item.title}
                                        <ArrowTopRightOnSquareIcon className="h-4 w-4 text-neutral-400 group-hover:text-accent transition-colors" />
                                    </button>
                                ) : item.link ? (
                                    <a
                                        href={item.link}
                                        target={item.link.startsWith('/') ? undefined : "_blank"}
                                        rel={item.link.startsWith('/') ? undefined : "noopener noreferrer"}
                                        className="group inline-flex items-center gap-1 hover:text-accent transition-colors duration-200"
                                    >
                                        {item.title}
                                        <ArrowTopRightOnSquareIcon className="h-4 w-4 text-neutral-400 group-hover:text-accent transition-colors" />
                                    </a>
                                ) : (
                                    item.title
                                )}
                            </h3>
                            {item.date && (
                                <span className="text-sm text-neutral-500 font-medium bg-neutral-100 dark:bg-neutral-800 px-2 py-1 rounded">
                                    {item.date}
                                </span>
                            )}
                        </div>
                        {item.subtitle && (
                            <p className={`${embedded ? "text-sm" : "text-base"} text-accent font-medium mb-3`}>{item.subtitle}</p>
                        )}
                        {item.content && (
                            <div className={`${embedded ? "text-sm" : "text-base"} text-neutral-600 dark:text-neutral-500 leading-relaxed`}>
                                <ReactMarkdown components={markdownComponents}>
                                    {item.content}
                                </ReactMarkdown>
                            </div>
                        )}
                        {item.tags && (
                            <div className="flex flex-wrap gap-2 mt-4">
                                {item.tags.map(tag => (
                                    <span key={tag} className="text-xs text-neutral-500 bg-neutral-50 dark:bg-neutral-800/50 px-2 py-1 rounded border border-neutral-100 dark:border-neutral-800">
                                        {tag}
                                    </span>
                                ))}
                            </div>
                        )}
                    </motion.div>
                ))}
            </div>
        </motion.div>
        {activeImage && (
            <div
                className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 md:p-8"
                onClick={() => setActiveImage(null)}
                role="dialog"
                aria-modal="true"
                aria-label={activeImage.title}
            >
                <div className="relative w-full max-w-4xl" onClick={(e) => e.stopPropagation()}>
                    <button
                        onClick={() => setActiveImage(null)}
                        className="absolute -top-10 right-0 text-sm text-white/80 hover:text-white transition-colors"
                    >
                        ✕ {messages.card.close}
                    </button>
                    <div className="bg-white rounded-xl overflow-hidden shadow-2xl">
                        <div className="relative w-full h-[70vh]">
                            <Image
                                src={activeImage.src}
                                alt={activeImage.title}
                                fill
                                className="object-contain"
                                sizes="90vw"
                            />
                        </div>
                        <div className="px-4 py-3 flex items-center justify-between border-t border-neutral-200">
                            <span className="text-sm font-medium text-neutral-700 truncate">{activeImage.title}</span>
                            <a
                                href={activeImage.src}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-xs text-accent hover:underline shrink-0 ml-3"
                            >
                                {messages.card.openInNewTab}
                            </a>
                        </div>
                    </div>
                </div>
            </div>
        )}
        </>
    );
}
