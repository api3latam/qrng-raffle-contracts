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
    .addOptionalParam(
        "picker", 
        "Indicates wether to fund Picker contract or not", 
        true, 
        types.boolean
    )
    .setAction(async(taskArgs, hre) => {
        try {
            const defaultAmount = JSON.stringify({ 
                arbitrum: {
                    value: 0.008, unit: 'ETH' 
                },
                optimism: {
                    value: 0.012, unit: 'ETH'
                },
                polygon: {
                    value: 10, unit: "MATIC"
                },
                goerli: {
                    value: 0.1, unit: "ETH"
                }
            });
            const qrng = JSON.stringify(loadJsonFile('qrng.json'));
            if (taskArgs.nft) {
                await hre.run("nftFund", { amountData: defaultAmount, qrngData: qrng });
            }
            if (taskArgs.raffle) {
                await hre.run("raffleFund", { amountData: defaultAmount, qrngData: qrng });
            }
            if (taskArgs.picker) {
                await hre.run("pickerFund", { amountData: defaultAmount, qrngData: qrng });
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

        const value = amount[hre.network.name]['value'];
        const unit = amount[hre.network.name]['unit'];

        console.log(
            `Funding NFT sponsor wallet at ${nftSponsor} with: \
                ${value} ${unit}\n`
          );
        await signer.sendTransaction({
            to: nftSponsor,
            value: hre.ethers.utils.parseEther(value.toString()),
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

        const value = amount[hre.network.name]['value'];
        const unit = amount[hre.network.name]['unit'];

        console.log(
            `Funding Raffle sponsor wallet at ${raffleSponsor} with: \
                ${value} ${unit}\n`
          );
        await signer.sendTransaction({
            to: raffleSponsor,
            value: hre.ethers.utils.parseEther(value.toString()),
          });

        console.log('Sponsor wallet funded');
    });

subtask("pickerFund", "Funds the Raffle Sponsor Wallet")
    .addParam("amountData", "Amount to transfer as sponsor funds")
    .addParam("qrngData", "The information pertaining the QRNG airnode")
    .setAction(async (taskArgs, hre) => {
        const amount = JSON.parse(taskArgs.amountData)
        const provider = new hre.ethers.providers.JsonRpcProvider(
            providerURL(hre.network.name)
        );
        const signer = new hre.ethers.Wallet(getPrivateKey(), provider);
        const qrngData = JSON.parse(taskArgs.qrngData);

        const address = loadJsonFile(`addresses/picker${hre.network.name}.json`)['picker'];

        const sponsor = await deriveSponsorWalletAddress(
            qrngData['xpub'],
            qrngData['airnode'],
            address
        );

        const value = amount[hre.network.name]['value'];
        const unit = amount[hre.network.name]['unit'];

        console.log(
            `Funding Picker sponsor wallet at ${sponsor} with: \
                ${value} ${unit}\n`
          );
        await signer.sendTransaction({
            to: sponsor,
            value: hre.ethers.utils.parseEther(value.toString()),
          });

        console.log('Sponsor wallet funded');
    });