import { subtask, task, types } from "hardhat/config";
import { AirnodeRrpAddresses } from '@api3/airnode-protocol';
import { getPrivateKey, 
    writeJsonFile,
    providerURL } from "../scripts/utils";
import type { NFT, Raffle } from "../typechain";

task("deploy", "Deploys all the contracts")
    .addOptionalParam(
        "nft", 
        "Indicates wether to deploy NFT contract or not", 
        true, 
        types.boolean
    )
    .addOptionalParam(
        "raffle", 
        "Indicates wether to deploy Raffle contract or not", 
        true, 
        types.boolean
    )
    .addOptionalParam(
        "picker", 
        "Indicates wether to deploy Picker contract or not", 
        true, 
        types.boolean
    )
    .setAction(async(taskArgs, hre) => {
        try {
            const airnodeAddress = AirnodeRrpAddresses[hre.network.config.chainId as number];
            if (taskArgs.nft) {
                await hre.run("nftDeploy", { airnode: airnodeAddress });
            }
            if (taskArgs.raffle) {
                await hre.run("raffleDeploy", { airnode: airnodeAddress });
            } 
            if (taskArgs.picker) {
                await hre.run("pickerDeploy", { airnode: airnodeAddress });
            }
        } catch (err) {
            console.error(err);
        }
    });

subtask("nftDeploy", "Deploys NFT contract")
    .addParam("airnode", "Airnode RRP Address for the specified network")
    .setAction(async(taskArgs, hre) => {
        const totalSpecials = 100;
        const airnodeAddress = taskArgs.airnode;
        const file = `addresses/nft${hre.network.name}.json`;
        const artifact = await hre.artifacts.readArtifact("NFT");

        const provider = new hre.ethers.providers.JsonRpcProvider(
            providerURL(hre.network.name)
        );
        const privateKey = getPrivateKey();
        const signer = new hre.ethers.Wallet(
            privateKey,
            provider
            );        
        
        const factory = await hre.ethers.getContractFactory(
            artifact.abi,
            artifact.bytecode, 
            signer
        );

        const contract = await factory.deploy(
            airnodeAddress,
            totalSpecials
        ) as NFT;

        console.log(`NFT contract deployed with address: ${contract.address}\n`);

        console.log('Saving addresses to file...\n')
            writeJsonFile({
                path: `/${file}`,
                data: { nft : contract.address }
            });
    });

subtask("raffleDeploy", "Deploys the Raffle contract")
    .addParam("airnode", "Airnode RRP Address for the specified network")
    .setAction(async(taskArgs, hre) => {
        const airnodeAddress = taskArgs.airnode;
        const file = `addresses/raffle${hre.network.name}.json`;
        const artifact = await hre.artifacts.readArtifact("Raffle");

        const provider = new hre.ethers.providers.JsonRpcProvider(
            providerURL(hre.network.name)
        );
        const privateKey = getPrivateKey();
        const signer = new hre.ethers.Wallet(
            privateKey,
            provider
            );

        
        const factory = await hre.ethers.getContractFactory(
            artifact.abi,
            artifact.bytecode,
            signer
        );

        
        const contract = await factory.deploy(
            airnodeAddress
        ) as Raffle;

        console.log(`Raffle contract deployed with address: ${contract.address}\n`);
        
        console.log('Saving addresses to file...\n')
        writeJsonFile({
            path: `/${file}`,
            data: { raffle : contract.address }
        });
    });

subtask("pickerDeploy", "Deploys the Picker contract")
    .addParam("airnode", "Airnode RRP Address for the specified network")
    .setAction(async(taskArgs, hre) => {
        const airnodeAddress = taskArgs.airnode;
        const file = `addresses/picker${hre.network.name}.json`;
        const artifact = await hre.artifacts.readArtifact("Picker");

        const provider = new hre.ethers.providers.JsonRpcProvider(
            providerURL(hre.network.name)
        );
        const privateKey = getPrivateKey();
        const signer = new hre.ethers.Wallet(
            privateKey,
            provider
            );

        
        const raffleFactory = await hre.ethers.getContractFactory(
            artifact.abi,
            artifact.bytecode,
            signer
        );

        
        const contract = await raffleFactory.deploy(
            airnodeAddress
        ) as Raffle;

        console.log(`Picker contract deployed with address: ${contract.address}\n`);
        
        console.log('Saving addresses to file...\n')
        writeJsonFile({
            path: `/${file}`,
            data: { picker : contract.address }
        });
    });
