'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const NAVIGATION_LINKS = [
    { href: '/', label: 'Home' },
    { href: '/how', label: 'How it works' }
];

const NavigationLinks = () => {
    const pathname = usePathname();

    return (
        <div className='hidden items-center space-x-1 md:flex'>
            {NAVIGATION_LINKS.map((link) => {
                const active = link.href === '/' ? pathname === link.href : pathname.includes(link.href);

                return (
                    <Link
                        key={link.href}
                        href={link.href}
                        className={`rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                            active
                                ? 'bg-rose-50 text-rose-700 dark:bg-rose-900/20 dark:text-rose-300'
                                : 'text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800'
                        }`}>
                        {link.label}
                    </Link>
                );
            })}
        </div>
    );
};

export default NavigationLinks;
