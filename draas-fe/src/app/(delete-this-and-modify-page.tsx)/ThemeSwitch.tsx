'use client';

import { JSX, useEffect, useState } from 'react';

import { useTheme } from 'next-themes';

import { Button } from '@/registry/new-york-v4/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger
} from '@/registry/new-york-v4/ui/dropdown-menu';

import { Monitor, Moon, Sun } from 'lucide-react';

// Define the type for each switch option
interface SwitchOption {
    name: string;
    value: string;
    iconSvg: JSX.Element;
}

// Define the data with type annotations
const SWITCH_DATA: SwitchOption[] = [
    {
        name: 'System',
        value: 'system',
        iconSvg: <Monitor className='mr-2 size-4' />
    },
    {
        name: 'Light',
        value: 'light',
        iconSvg: <Sun className='mr-2 size-4' />
    },
    {
        name: 'Dark',
        value: 'dark',
        iconSvg: <Moon className='mr-2 size-4' />
    }
];

const ThemeSwitch: React.FC = () => {
    const { theme, setTheme } = useTheme();

    // State to manage the component mount status
    const [mounted, setMounted] = useState(false);

    useEffect(() => setMounted(true), []);

    if (!mounted) return null;

    // Determine current icon to display
    const currentTheme = theme || 'system';
    const currentThemeData = SWITCH_DATA.find((t) => t.value === currentTheme) || SWITCH_DATA[0];

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant='outline' size='sm' className='flex h-9 w-9 items-center justify-center p-0'>
                    {currentThemeData.iconSvg}
                    <span className='sr-only'>Toggle theme</span>
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align='end'>
                {SWITCH_DATA.map((data) => (
                    <DropdownMenuItem
                        key={data.value}
                        onClick={() => {
                            setTheme(data.value);
                        }}
                        className='flex cursor-pointer items-center gap-2'>
                        {data.iconSvg}
                        <span>{data.name}</span>
                    </DropdownMenuItem>
                ))}
            </DropdownMenuContent>
        </DropdownMenu>
    );
};

export default ThemeSwitch;
