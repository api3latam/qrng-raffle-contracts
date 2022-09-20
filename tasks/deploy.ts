import { task } from "hardhat/config";
import { AirnodeRrpAddresses } from '@api3/airnode-protocol';
import { deriveSponsorWalletAddress } from '@api3/airnode-admin';
import { getPrivateKey, 
    writeJsonFile,
    loadJsonFile,
    providerURL } from "../scripts/utils";
import type { NFT } from "../typechain";

task("deploy", "Deploys all the contracts")
    .setAction(async(_, hre) => {
        try {

            const airnodeAddress = AirnodeRrpAddresses[hre.network.config.chainId as number];
            const totalSpecials = 10;
            const baseURI = "https://api.coolcatsnft.com/cat/";
            const fileName = 'addresses/nftMumbai.json';
            const qrngData = loadJsonFile('qrng.json');

            const artifact = await hre.artifacts.readArtifact("NFT");
            const provider = new hre.ethers.providers.JsonRpcProvider(
                providerURL
            )
            const privateKey = getPrivateKey()
            const signer = new hre.ethers.Wallet(
                privateKey,
                provider
                );

            const factory = await hre.ethers.getContractFactory(
                artifact.abi,
                artifact.bytecode, 
                signer);
            const contract = await factory.deploy(
                airnodeAddress,
                totalSpecials
            ) as NFT;

            console.log(`Contract deployed with address: ${contract.address}\n`);
            
            const sponsorWalletAddress = await deriveSponsorWalletAddress(
                qrngData['xpub'],
                qrngData['airnode'],
                signer.address
            );

            console.log('Setting up Base URI\n');
            await contract.setBaseURI(baseURI);
            console.log('Setting up Airnode Parameters\n');
            await contract.setRequestParameters(
                qrngData['airnode'],
                qrngData['endpointIdUint256'],
                sponsorWalletAddress
            );

            console.log('Done setting-up. Saving address to file...\n')
            writeJsonFile({
                path: `/${fileName}`,
                data: { nft : contract.address }
            });

        } catch (err) {
            console.error(err);
        }
    });
