import Link from 'next/link';

import NavigationLinks from '@/app/(delete-this-and-modify-page.tsx)/NavigationLinks';
import ThemeSwitch from '@/app/(delete-this-and-modify-page.tsx)/ThemeSwitch';

const NavigationBar = () => {
    return (
        <nav className='flex w-full flex-col-reverse items-center justify-between gap-6 bg-rose-100 sm:flex-row sm:px-0 md:px-10 lg:py-6'>
            <NavigationLinks />
            <div className='flex w-full justify-between gap-6 sm:w-auto sm:items-center'>
                <ThemeSwitch />
            </div>
        </nav>
    );
};

export default NavigationBar;
