import { subtask, task, types } from "hardhat/config";
import { deriveSponsorWalletAddress } from "@api3/airnode-admin";
import { getPrivateKey,
    loadJsonFile,
    providerURL } from "../scripts/utils";

task("fund", "Funds the sponsorAddress for the QRNG Airnode")
    .addOptionalParam(
        "nft", 
        "Indicates wether to fund NFT contract or not", 
        true, 
        types.boolean
    )
    .addOptionalParam(
        "raffle", 
        "Indicates wether to fund Raffle contract or not", 
        true, 
        types.boolean
    )
    .setAction(async(taskArgs, hre) => {
        try {
            const defaultAmount = JSON.stringify({ value: 0.1, unit: 'ETH' });
            const qrng = JSON.stringify(loadJsonFile('qrng.json'));
            if (taskArgs.nft) {
                await hre.run("nftFund", { amountData: defaultAmount, qrngData: qrng });
            }
            if (taskArgs.raffle) {
                await hre.run("raffleFund", { amountData: defaultAmount, qrngData: qrng });
            }
        } catch(err) {
            console.error(err);
        }
    });

subtask("nftFund", "Funds the NFT Sponsor Wallet")
    .addParam("amountData", "Amount to transfer as sponsor funds")
    .addParam("qrngData", "The information pertaining the QRNG airnode")
    .setAction(async (taskArgs, hre) => {
        const amount = JSON.parse(taskArgs.amountData);
        const provider = new hre.ethers.providers.JsonRpcProvider(
            providerURL(hre.network.name)
        );
        const signer = new hre.ethers.Wallet(getPrivateKey(), provider);
        const qrngData = JSON.parse(taskArgs.qrngData);

        const nftAddress = loadJsonFile(`addresses/nft${hre.network.name}.json`)['nft'];

        const nftSponsor = await deriveSponsorWalletAddress(
            qrngData['xpub'],
            qrngData['airnode'],
            nftAddress
        );

        console.log(
            `Funding NFT sponsor wallet at ${nftSponsor} with: \
                ${amount['value']} ${amount['unit']}\n`
          );
        await signer.sendTransaction({
            to: nftSponsor,
            value: hre.ethers.utils.parseEther(amount['value'].toString()),
          });
          console.log('Sponsor wallet funded');
    });

subtask("raffleFund", "Funds the Raffle Sponsor Wallet")
    .addParam("amountData", "Amount to transfer as sponsor funds")
    .addParam("qrngData", "The information pertaining the QRNG airnode")
    .setAction(async (taskArgs, hre) => {
        const amount = JSON.parse(taskArgs.amountData)
        const provider = new hre.ethers.providers.JsonRpcProvider(
            providerURL(hre.network.name)
        );
        const signer = new hre.ethers.Wallet(getPrivateKey(), provider);
        const qrngData = JSON.parse(taskArgs.qrngData);

        const raffleAddress = loadJsonFile(`addresses/raffle${hre.network.name}.json`)['raffle'];

        const raffleSponsor = await deriveSponsorWalletAddress(
            qrngData['xpub'],
            qrngData['airnode'],
            raffleAddress
        );

        console.log(
            `Funding Raffle sponsor wallet at ${raffleSponsor} with: \
                ${amount['value']} ${amount['unit']}\n`
          );
        await signer.sendTransaction({
            to: raffleSponsor,
            value: hre.ethers.utils.parseEther(amount['value'].toString()),
          });

        console.log('Sponsor wallet funded');
    });