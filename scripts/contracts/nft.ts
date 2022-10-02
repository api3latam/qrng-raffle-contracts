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

        const provider = new providers.WebSocketProvider(
            providerURL(network, 2));
        const signer = new Wallet(
            getPrivateKey(),
            provider
        );

        const contract = new Contract(
            address,
            abi,
            signer
        ) as NFT;

        const addressArray = [signer.address, 
            "0xd29BC939ACF8269938557A27949b228EEf478479",
            "0x849B6aA8DdB57c0BF7F16d3e8a189dbA96c99b46",
            signer.address,
            "0xd29BC939ACF8269938557A27949b228EEf478479",
            "0x849B6aA8DdB57c0BF7F16d3e8a189dbA96c99b46",
            signer.address, 
            "0xd29BC939ACF8269938557A27949b228EEf478479",
            "0x849B6aA8DdB57c0BF7F16d3e8a189dbA96c99b46"
        ]

        for (let i=0; i < addressArray.length; i++) {
            console.log(`Minting for ${addressArray[i]}\n`);
            let tx = await contract.requestToken(addressArray[i]);
            await tx.wait();
        };

        console.log('Done!');
        exit(0);

    } catch (err) {
        console.error(err)
    }
};

main();
