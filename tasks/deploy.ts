import { task } from "hardhat/config";
import { AirnodeRrpAddresses } from '@api3/airnode-protocol';
import { getPrivateKey, 
    writeJsonFile,
    providerURL } from "../scripts/utils";
import type { NFT } from "../typechain";

task("deploy", "Deploys all the contracts")
    .setAction(async(_, hre) => {
        try {

            const airnodeAddress = AirnodeRrpAddresses[hre.network.config.chainId as number];
            const totalSpecials = 10;
            const fileName = `addresses/nft${hre.network.name}.json`;

            const artifact = await hre.artifacts.readArtifact("NFT");
            const provider = new hre.ethers.providers.JsonRpcProvider(
                providerURL(hre.network.name)
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

            console.log('Saving address to file...\n')
            writeJsonFile({
                path: `/${fileName}`,
                data: { nft : contract.address }
            });

        } catch (err) {
            console.error(err);
        }
    });
