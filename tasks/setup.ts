import { task } from "hardhat/config";
import { deriveSponsorWalletAddress } from '@api3/airnode-admin';
import { getPrivateKey,
    loadJsonFile,
    providerURL } from "../scripts/utils";

task("setup", "Config parameters for NFT contract")
    .setAction(async(_, hre) => {
        try {
            const baseURI = "https://api.coolcatsnft.com/cat/";
            const qrngData = loadJsonFile('qrng.json');
            const contractAddress = loadJsonFile(`addresses/nft${hre.network.name}.json`)['nft'];

            const artifact = await hre.artifacts.readArtifact("NFT");
            const provider = new hre.ethers.providers.JsonRpcProvider(
                providerURL(hre.network.name)
            )
            const privateKey = getPrivateKey()
            const signer = new hre.ethers.Wallet(
                privateKey,
                provider
                );

            const contract = new hre.ethers.Contract(
                contractAddress,
                artifact.abi,
                signer
            )

            const sponsorWalletAddress = await deriveSponsorWalletAddress(
                qrngData['xpub'],
                qrngData['airnode'],
                contract.address
            );

            console.log('Setting up Base URI\n');
            await contract.setBaseURI(baseURI);
            console.log('Setting up Airnode Parameters\n');
            await contract.setRequestParameters(
                qrngData['airnode'],
                qrngData['endpointIdUint256'],
                sponsorWalletAddress
            );

            console.log('Done Setting up!');
        } catch(err) {
            console.error(err);
        }
    });