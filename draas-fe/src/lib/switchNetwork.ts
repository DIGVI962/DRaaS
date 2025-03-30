export const switchToNetwork = async (targetChainIdHex: string) => {
    try {
        if (!window.ethereum) throw new Error('MetaMask is not available');

        await window.ethereum.request({
            method: 'wallet_switchEthereumChain',
            params: [{ chainId: targetChainIdHex }]
        });

        return true;
    } catch (switchError: any) {
        // This error means the chain has not been added to MetaMask
        if (switchError.code === 4902) {
            console.warn('Network not found. You may need to add it manually.');
        } else {
            console.error('Error switching network:', switchError.message);
        }
        return false;
    }
};
