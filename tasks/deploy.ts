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
    .setAction(async(taskArgs, hre) => {
        try {
            const airnodeAddress = AirnodeRrpAddresses[hre.network.config.chainId as number];
            if (taskArgs.nft) {
                await hre.run("nftDeploy", { airnode: airnodeAddress });
            }
            if (taskArgs.raffle) {
                await hre.run("raffleDeploy", { airnode: airnodeAddress });
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
        const nftFile = `addresses/nft${hre.network.name}.json`;
        const nftArtifact = await hre.artifacts.readArtifact("NFT");

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

        const nftContract = await nftFactory.deploy(
            airnodeAddress,
            totalSpecials
        ) as NFT;

        console.log(`NFT contract deployed with address: ${nftContract.address}\n`);

        console.log('Saving addresses to file...\n')
            writeJsonFile({
                path: `/${nftFile}`,
                data: { nft : nftContract.address }
            });
    });

subtask("raffleDeploy", "Deploys the Raffle contract")
    .addParam("airnode", "Airnode RRP Address for the specified network")
    .setAction(async(taskArgs, hre) => {
        const airnodeAddress = taskArgs.airnode;
        const raffleFile = `addresses/raffle${hre.network.name}.json`;
        const raffleArtifact = await hre.artifacts.readArtifact("Raffle");

        const provider = new hre.ethers.providers.JsonRpcProvider(
            providerURL(hre.network.name)
        );
        const privateKey = getPrivateKey();
        const signer = new hre.ethers.Wallet(
            privateKey,
            provider
            );

        
        const raffleFactory = await hre.ethers.getContractFactory(
            raffleArtifact.abi,
            raffleArtifact.bytecode,
            signer
        );

        
        const raffleContract = await raffleFactory.deploy(
            airnodeAddress
        ) as Raffle;

        console.log(`Raffle contract deployed with address: ${raffleContract.address}\n`);
        
        console.log('Saving addresses to file...\n')
        writeJsonFile({
            path: `/${raffleFile}`,
            data: { raffle : raffleContract.address }
        });
    });
