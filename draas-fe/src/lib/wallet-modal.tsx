'use client';

import { Badge } from '@/registry/new-york-v4/ui/badge';
import { Button } from '@/registry/new-york-v4/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger
} from '@/registry/new-york-v4/ui/dropdown-menu';
import { useWeb3Modal } from '@web3modal/wagmi/react';

import { LogOut, Wallet } from 'lucide-react';
import { useAccount, useConnect, useDisconnect } from 'wagmi';

export default function ConnectButton() {
    const { open } = useWeb3Modal();
    const { address, isConnected } = useAccount();
    const { disconnect } = useDisconnect();

    if (isConnected) {
        return (
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button variant='outline' size='sm' className='flex items-center gap-2'>
                        <Wallet className='size-4' />
                        <span className='font-mono text-xs'>
                            {address?.slice(0, 5)}...{address?.slice(-4)}
                        </span>
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align='end' className='w-56'>
                    <DropdownMenuLabel>Wallet Connected</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem className='flex items-center justify-between'>
                        <span>Address</span>
                        <Badge variant='outline' className='font-mono text-xs'>
                            {address?.slice(0, 5)}...{address?.slice(-4)}
                        </Badge>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem className='cursor-pointer text-red-500' onClick={() => disconnect()}>
                        <LogOut className='mr-2 size-4' />
                        <span>Disconnect</span>
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>
        );
    }

    return (
        <Button size='sm' onClick={() => open()} className='bg-rose-600 hover:bg-rose-700'>
            <Wallet className='mr-2 size-4' />
            Connect Wallet
        </Button>
    );
}
