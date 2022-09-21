import { task } from "hardhat/config";
import { AirnodeRrpAddresses } from '@api3/airnode-protocol';

task("airnode", "Get the Address")
    .setAction(async(_, hre) => {
        const airnodeAddress = AirnodeRrpAddresses[80001];
        console.log(airnodeAddress);
    })