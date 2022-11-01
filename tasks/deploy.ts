import { subtask, task, types } from "hardhat/config";
import { AirnodeRrpAddresses } from '@api3/airnode-protocol';
import { writeJsonFile, getFactory } from "../scripts/utils";
import type { NFT, Raffle, Spooky } from "../typechain";

task("deploy", "Deploys all the contracts")
    .addOptionalParam(
        "nft", 
        "Indicates wether to deploy NFT contract or not", 
        false, 
        types.boolean
    )
    .addOptionalParam(
        "raffle", 
        "Indicates wether to deploy Raffle contract or not", 
        false, 
        types.boolean
    )
    .addOptionalParam(
        "picker", 
        "Indicates wether to deploy Picker contract or not", 
        false, 
        types.boolean
    )
    .addOptionalParam(
        "spooky",
        "Indicates wether to deploy Spooky contract or no",
        false,
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
            if (taskArgs.spooky) {
                await hre.run('spookyDeploy', { airnode: airnodeAddress });
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
        
        const factory = await getFactory(hre, "NFT");

        const contract = await factory.deploy(
            airnodeAddress,
            totalSpecials) as NFT;

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
        
        const factory = await getFactory(hre, "Raffle")
        
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
        
        const factory = await getFactory(hre, "Picker")
        
        const contract = await factory.deploy(
            airnodeAddress
        ) as Raffle;

        console.log(`Picker contract deployed with address: ${contract.address}\n`);
        
        console.log('Saving addresses to file...\n')
        writeJsonFile({
            path: `/${file}`,
            data: { picker : contract.address }
        });
    });

subtask("spookyDeploy", "Deploys Spooky contract")
    .addParam("airnode", "Airnode RRP Address for the specified network")
    .setAction(async(taskArgs, hre) => {
        const airnodeAddress = taskArgs.airnode;
        const file = `addresses/spooky${hre.network.name}.json`;
        
        const factory = await getFactory(hre, "Spooky")
        
        const contract = await factory.deploy(
            airnodeAddress
        ) as Spooky;

        console.log(`Spooky contract deployed with address: ${contract.address}\n`);
        
        console.log('Saving addresses to file...\n')
        writeJsonFile({
            path: `/${file}`,
            data: { spooky : contract.address }
        });
    });
