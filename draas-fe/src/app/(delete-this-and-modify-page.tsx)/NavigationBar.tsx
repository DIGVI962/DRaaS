'use client';

import Link from 'next/link';

import NavigationLinks from '@/app/(delete-this-and-modify-page.tsx)/NavigationLinks';
import ThemeSwitch from '@/app/(delete-this-and-modify-page.tsx)/ThemeSwitch';
import ConnectButton from '@/lib/wallet-modal';

import { MonitorCheck } from 'lucide-react';

const NavigationBar = () => {
    return (
        <nav className='sticky top-0 z-50 w-full border-b border-gray-200 bg-white px-6 py-3 dark:border-gray-800 dark:bg-gray-950'>
            <div className='mx-auto flex max-w-7xl items-center justify-between'>
                <div className='flex items-center gap-8'>
                    <Link
                        href='/'
                        className='flex items-center gap-2 text-xl font-bold text-rose-700 dark:text-rose-300'>
                        <MonitorCheck className='size-6' />
                        <span>DRaaS</span>
                    </Link>
                    <NavigationLinks />
                </div>
                <div className='flex items-center gap-4'>
                    <ThemeSwitch />
                    <ConnectButton />
                </div>
            </div>
        </nav>
    );
};

export default NavigationBar;
