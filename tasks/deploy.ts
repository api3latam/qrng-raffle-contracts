import { task } from "hardhat/config";
import { AirnodeRrpAddresses } from '@api3/airnode-protocol';
import { getPrivateKey, 
    writeJsonFile,
    providerURL } from "../scripts/utils";
import type { NFT, Raffle } from "../typechain";

task("deploy", "Deploys all the contracts")
    .setAction(async(_, hre) => {
        try {

            const airnodeAddress = AirnodeRrpAddresses[hre.network.config.chainId as number];
            const totalSpecials = 10;

            const raffleFile = `addresses/raffle${hre.network.name}.json`;
            const nftFile = `addresses/nft${hre.network.name}.json`;

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

            const nftFactory = await hre.ethers.getContractFactory(
                nftArtifact.abi,
                nftArtifact.bytecode, 
                signer
            );
            const raffleFactory = await hre.ethers.getContractFactory(
                raffleArtifact.abi,
                raffleArtifact.bytecode,
                signer
            );

            const nftContract = await nftFactory.deploy(
                airnodeAddress,
                totalSpecials
            ) as NFT;
            const raffleContract = await raffleFactory.deploy(
                airnodeAddress
            ) as Raffle;

            console.log(`NFT contract deployed with address: ${nftContract.address}\n`);
            console.log(`Raffle contract deployed with address: ${raffleContract.address}\n`);

            console.log('Saving addresses to files...\n')
            writeJsonFile({
                path: `/${nftFile}`,
                data: { nft : nftContract.address }
            });
            writeJsonFile({
                path: `/${raffleFile}`,
                data: { raffle : raffleContract.address }
            });

        } catch (err) {
            console.error(err);
        }
    });
