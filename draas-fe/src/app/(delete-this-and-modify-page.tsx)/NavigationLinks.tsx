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
        <div className='flex items-center gap-3'>
            {NAVIGATION_LINKS.map((link) => {
                const active = link.href === '/' ? pathname === link.href : pathname.includes(link.href);

                return (
                    <Link
                        className={`${active ? 'bg-rose-200 dark:bg-rose-400' : 'bg-transparent text-black'} rounded-xl px-3 py-2`}
                        key={link.href}
                        href={link.href}>
                        {link.label}
                    </Link>
                );
            })}
        </div>
    );
};

export default NavigationLinks;
