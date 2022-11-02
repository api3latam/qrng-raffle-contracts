import { task } from "hardhat/config";
import { AirnodeRrpAddresses, AirnodeRrpV0, AirnodeRrpV0Factory } from '@api3/airnode-protocol';
import { requestWithdrawal, 
    deriveSponsorWalletAddress,
    unsponsorRequester } from "@api3/airnode-admin";
import { providerURL,
        loadJsonFile, 
        getPrivateKey } from "../scripts/utils/misc";

task("withdraw", "Set a request to withdraw funds from airnode")
    .setAction(async (_, hre) => {
        const qrng = loadJsonFile('qrng.json');
        const provider = new hre.ethers.providers.JsonRpcProvider(
            providerURL(hre.network.name)
        );

        const airnodeContract = AirnodeRrpV0Factory.getContract(
            AirnodeRrpAddresses[hre.network.config.chainId as number],
            AirnodeRrpV0Factory.abi
        ) as AirnodeRrpV0;

        const signer = new hre.ethers.Wallet(getPrivateKey(), provider);
        const spookyAddress = loadJsonFile(`addresses/spooky${hre.network.name}.json`)['spooky'];
        
        const sponsorWallet = await deriveSponsorWalletAddress(
            qrng['xpub'],
            qrng['airnode'],
            signer.address
        );
        
        const airnode = airnodeContract.connect(signer)

        console.log('Requesting withdrawal');
        await requestWithdrawal(
            airnode,
            qrng['airnode'],
            sponsorWallet
        );
        console.log('Done requesting withdrawal!\
        \nUnsponsoring requester contract');

        await unsponsorRequester(
            airnode,
            spookyAddress
        );
        console.log(`Done unsponsoring contract with address: \
        ${spookyAddress}`);
    });