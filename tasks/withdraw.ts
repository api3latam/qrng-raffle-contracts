import { task } from "hardhat/config";
import { AirnodeRrpAddresses, AirnodeRrpV0, AirnodeRrpV0Factory } from '@api3/airnode-protocol';
import { requestWithdrawal, 
    deriveSponsorWalletAddress } from "@api3/airnode-admin";
import { providerURL,
        loadJsonFile } from "../scripts/utils";

task("withdraw", "Set a request to withdraw funds from airnode")
    .setAction(async (_, hre) => {
        const qrng = loadJsonFile('qrng.json');
        const provider = new hre.ethers.providers.JsonRpcProvider(
            providerURL(hre.network.name)
        );

        const airnode = AirnodeRrpV0Factory.getContract(
            AirnodeRrpAddresses[hre.network.config.chainId as number],
            AirnodeRrpV0Factory.abi
        ) as AirnodeRrpV0

        const nftAddress = loadJsonFile(`addresses/nft${hre.network.name}.json`)['nft'];
        
        const sponsorWallet = await deriveSponsorWalletAddress(
            qrng['xpub'],
            qrng['airnode'],
            nftAddress
        )
        
        console.log('Requesting withdrawal');
        const result = await requestWithdrawal(
            airnode,
            qrng['airnode'],
            sponsorWallet
        );
        console.log(`Done with the following result: ${result}`);
    });