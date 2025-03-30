'use client';

import { Button } from '@/registry/new-york-v4/ui/button';
import { useWeb3Modal } from '@web3modal/wagmi/react';

import { LogOut } from 'lucide-react';
import { useAccount, useConnect, useDisconnect } from 'wagmi';

export default function ConnectButton() {
    const { open } = useWeb3Modal();
    const { address, isConnected } = useAccount();
    const { connect, connectors } = useConnect();
    const { disconnect } = useDisconnect();

    if (isConnected)
        return (
            <div className='flex h-auto flex-row items-center'>
                <span className='text-muted bg-neutral-900 p-1 text-sm dark:text-white'>
                    Connected to {address?.slice(0, 5)}...{address?.slice(32)}
                </span>
                <button onClick={() => disconnect()}>
                    <LogOut size={'16'} className='dark:text-black' />
                </button>
            </div>
        );

    return <Button onClick={() => open()}>Connect Wallet</Button>;
}
