import { Wallet,
    Contract,
    providers } from "ethers";
import { getPrivateKey,
    providerURL,
    loadJsonFile,
    writeJsonFile } from "../utils/misc";
import { loadColumnToArray } from "../utils/csv";
import type { Spooky } from "../../typechain";
import { exit } from "process";

const writeDoneAddresses = (addressList: string[]) => {
    writeJsonFile({
        path: '/done.json',
        data: { addresses: addressList }
    });
}

const main = async () => {
    let done: string[] = [];
    const prevDone: string[] = loadJsonFile('done.json')['addresses'];
    const addresses = await loadColumnToArray("addresses.csv") as string[];

    if (prevDone.length > 0) {
        done = done.concat(prevDone);
    }

    try {
        require("dotenv").config();

        const abi = loadJsonFile(
            "artifacts/contracts/Spooky.sol/Spooky.json"
        )['abi'];
        const network = process.env['NETWORK']?.toLowerCase()
            || "arbitrum";
        const address = loadJsonFile(
            `addresses/spooky${network}.json`
        )['spooky'];

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
        ) as Spooky;
        
        console.log(`Already done for ${done.length} \
        \nPending: ${addresses.length - done.length} \
        \nTotal: ${addresses.length}`)
        
        for (let a=0; a < addresses.length; a++) {
            let current = addresses[a][0];
            if (done.includes(current)) {
                console.log(`Already done for: ${current}`);
            } else {
                console.log(`Minting for: ${current}\n`);
                await contract.requestToken(current);
                done.push(current);
            };
        }

        writeDoneAddresses(done);
        console.log("Done Minting for all!");
        exit(0);
    } catch(err) {
        console.log("There was an error. \
        \nSaving minting checkpoint ...\n");
        writeDoneAddresses(done);
        console.error(err);
    }
};

main();
