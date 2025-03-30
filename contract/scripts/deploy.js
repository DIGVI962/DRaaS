const { ethers } = require('hardhat');

async function main() {
	const [deployer] = await ethers.getSigners();
	console.log('Deploying contracts with the account:', deployer.address);

	const fee = ethers.parseEther('0.01'); // Example fee amount
	const owner = deployer.address; // Or specify another address

	const ContractFactory = await ethers.getContractFactory('FileUploadFee');
	const contract = await ContractFactory.deploy(fee, owner);

	await contract.waitForDeployment();
	console.log('Contract deployed to address:', await contract.getAddress());
}

main()
	.then(() => process.exit(0))
	.catch((error) => {
		console.error(error);
		process.exit(1);
	});
