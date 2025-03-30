import { defaultWagmiConfig } from '@web3modal/wagmi/react/config';

import { cookieStorage, createStorage } from 'wagmi';
import { sepolia } from 'wagmi/chains';

export const projectId = '955bb9c5969bf3b93ba02270e8c669fc';

if (!projectId) throw new Error('Project ID is not defined');

const metadata = {
    name: 'draas-local',
    description: 'draas-local',
    url: 'https://d-raa-s.vercel.app/',
    icons: ['https://avatars.githubusercontent.com/u/37784886']
};

export const config = defaultWagmiConfig({
    chains: [sepolia],
    projectId,
    metadata,
    ssr: true,
    storage: createStorage({
        storage: cookieStorage
    })
});
