import { task } from "hardhat/config";
import { deriveSponsorWalletAddress } from "@api3/airnode-admin";
import { getPrivateKey,
    loadJsonFile,
    providerURL } from "../scripts/utils";

task("fund", "Funds the sponsorAddress for the QRNG Airnode")
    .setAction(async(_, hre) => {
        try {

            const amount = { value: 0.1, unit: 'ETH' };
            const provider = new hre.ethers.providers.JsonRpcProvider(
                providerURL(hre.network.name)
            );
            const signer = new hre.ethers.Wallet(getPrivateKey(), provider);
            const qrngData = loadJsonFile('qrng.json');

            const nftAddress = loadJsonFile(`addresses/nft${hre.network.name}.json`)['nft'];
            const raffleAddress = loadJsonFile(`addresses/raffle${hre.network.name}.json`)['raffle'];

            const nftSponsor = await deriveSponsorWalletAddress(
                qrngData['xpub'],
                qrngData['airnode'],
                nftAddress
            );
            const raffleSponsor = await deriveSponsorWalletAddress(
                qrngData['xpub'],
                qrngData['airnode'],
                raffleAddress
            );

            console.log(
                `Funding NFT sponsor wallet at ${nftSponsor} with: \
                    ${amount['value']} ${amount['unit']}\n`
              );
            await signer.sendTransaction({
                to: nftSponsor,
                value: hre.ethers.utils.parseEther(amount['value'].toString()),
              });

            console.log(
                `Funding Raffle sponsor wallet at ${raffleSponsor} with: \
                    ${amount['value']} ${amount['unit']}\n`
              );
            await signer.sendTransaction({
                to: raffleSponsor,
                value: hre.ethers.utils.parseEther(amount['value'].toString()),
              });

            console.log('Sponsor wallets funded');

        } catch(err) {
            console.error(err);
        }
    });