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

            const raffleAddress = loadJsonFile(`addresses/raffle${hre.network.name}.json`)['raffle'];
            const nftAddress = loadJsonFile(`addresses/nft${hre.network.name}.json`)['nft'];

            const nftArtifact = await hre.artifacts.readArtifact("NFT");
            const raffleArtifact = await hre.artifacts.readArtifact("Raffle");

            const provider = new hre.ethers.providers.JsonRpcProvider(
                providerURL(hre.network.name)
            );
            const privateKey = getPrivateKey();
            const signer = new hre.ethers.Wallet(
                privateKey,
                provider
            );

            const nftContract = new hre.ethers.Contract(
                nftAddress,
                nftArtifact.abi,
                signer
            );
            const raffleContract = new hre.ethers.Contract(
                raffleAddress,
                raffleArtifact.abi,
                signer
            );

            const nftSponsor = await deriveSponsorWalletAddress(
                qrngData['xpub'],
                qrngData['airnode'],
                nftContract.address
            );
            const raffleSponsor = await deriveSponsorWalletAddress(
                qrngData['xpub'],
                qrngData['airnode'],
                raffleContract.address
            );
            
            console.log('Setting up NFT Contract');
            console.log('Setting up Base URI\n');
            await nftContract.setBaseURI(baseURI);
            console.log('Setting up Airnode Parameters\n');
            await nftContract.setRequestParameters(
                qrngData['airnode'],
                qrngData['endpointIdUint256'],
                nftSponsor
            );

            console.log('Setting up Raffle');
            await raffleContract.setRequestParameters(
                qrngData['airnode'],
                qrngData['endpointIdUint256'],
                raffleSponsor
            )

            console.log('Done Setting up!');

        } catch(err) {
            console.error(err);
        }
    });