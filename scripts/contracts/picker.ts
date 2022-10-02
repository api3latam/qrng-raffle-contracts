import { Wallet, 
    Contract,
    providers,
    utils } from "ethers";
import { AirnodeRrpAddresses } from '@api3/airnode-protocol';
import { getPrivateKey,
    providerURL,
    loadJsonFile } from "../utils";
import networksData from "../networks";
import type { Picker, IAirnodeRrpV0 } from "../../typechain";

const main = async () => {
    try {
        require("dotenv").config();

        const abi = loadJsonFile(
            "artifacts/contracts/Picker.sol/Picker.json"
        )['abi'];
        const network = process.env['NETWORK']?.toLowerCase() 
            || "goerli";
        const address = loadJsonFile(
            `addresses/picker${network}.json`
        )['picker'];

        const airnodeAddress = AirnodeRrpAddresses[
            networksData[network].networkId
        ];

        const airnodeAbi = loadJsonFile(
            "artifacts/@api3/airnode-protocol/contracts/rrp/interfaces/IAirnodeRrpV0.sol/IAirnodeRrpV0.json"
        )['abi'];

        const provider = new providers.WebSocketProvider(
            providerURL(network, 2));
        const signer = new Wallet(
            getPrivateKey(),
            provider);

        const contract = new Contract(
            address,
            abi,
            signer
        ) as Picker;
        const airnode = new Contract(
            airnodeAddress,
            airnodeAbi,
            provider
        ) as IAirnodeRrpV0;

        const filterPicker = contract.filters.RequestedUint();

        console.log('Requesting number!');
        await contract.requestNumber(250);

        contract.on(filterPicker, 
            (requestedId) => {
                console.log(`Requested Id is: 
                    ${requestedId}\n`);
                const filterAirnode = airnode.filters.FulfilledRequest(
                    null,
                    requestedId);
                console.log('Waiting for Airnode Response\n');
                airnode.on(filterAirnode, (
                    requesterAirnode,
                    _,
                    data) => {
                        console.log(`The returned value from QRNG Airnode ${requesterAirnode}\n
                        is: ${data}`);
                        const arrayifiedData = utils.arrayify(data);
                        console.log(`The number is: ${new TextDecoder().decode(arrayifiedData)}`)
                });
        });

    } catch (err) {
        console.error(err);
    }
};

main();
