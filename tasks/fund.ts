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
            const contractAddress = loadJsonFile(`addresses/nft${hre.network.name}.json`)['nft'];

            const sponsorWalletAddress = await deriveSponsorWalletAddress(
                qrngData['xpub'],
                qrngData['airnode'],
                contractAddress
            );

            console.log(
                `Funding sponsor wallet at ${sponsorWalletAddress} with: \
                    ${amount['value']} ${amount['unit']}\n`
              );
            await signer.sendTransaction({
                to: sponsorWalletAddress,
                value: hre.ethers.utils.parseEther(amount['value'].toString()),
              });
            console.log('Sponsor wallet funded');

        } catch(err) {
            console.error(err);
        }
    });