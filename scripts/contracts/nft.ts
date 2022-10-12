import { Wallet,
        Contract,
        providers } from "ethers";
import { getPrivateKey,
    providerURL,
    loadJsonFile } from "../utils";
import type { NFT } from "../../typechain";
import { exit } from "process";

const main = async () => {
    try {

        require("dotenv").config();

        const abi = loadJsonFile(
            "artifacts/contracts/NFT.sol/NFT.json"
        )['abi'];
        const network = process.env['NETWORK']?.toLowerCase()
            || "goerli";
        const address = loadJsonFile(
            `addresses/nft${network}.json`
        )['nft'];

        const provider = new providers.JsonRpcProvider(
            providerURL(network, 1));
        const signer = new Wallet(
            getPrivateKey(),
            provider
        );

        const contract = new Contract(
            address,
            abi,
            signer
        ) as NFT;

        const addressArray = [signer.address]

        for (let i=0; i < addressArray.length; i++) {
            console.log(`Minting shiny for ${addressArray[i]}\n`);
            let tx = await contract.mintShinny(addressArray[i]);
            await tx.wait();
        };

        console.log('Done!');
        exit(0);

    } catch (err) {
        console.error(err)
    }
};

main();
