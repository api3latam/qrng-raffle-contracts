import { task } from "hardhat/config";
import { getPrivateKey, 
    writeJsonFile,
    providerURL } from "../scripts/utils";

task("deploy", "Deploys all the contracts")
    .setAction(async(_, hre) => {
        try {
            const airnodeAddress = "0xa0AD79D995DdeeB18a14eAef56A549A04e3Aa1Bd";
            const totalSpecials = 10;
            const fileName = 'addresses/nftMumbai.json';

            const artifact = await hre.artifacts.readArtifact("NFT");
            const provider = new hre.ethers.providers.JsonRpcProvider(
                providerURL
            )
            const signer = new hre.ethers.Wallet(
                getPrivateKey(),
                provider
                );

            const factory = await hre.ethers.getContractFactory(
                artifact.abi,
                artifact.bytecode, 
                signer);

            const contract = await factory.deploy(
                airnodeAddress,
                totalSpecials
            );
            console.log(`Contract deployed with address: ${contract.address}`);
            writeJsonFile({
                path: `/${fileName}`,
                data: { nft : contract.address }
            });
        console.log(`File written to: ${fileName}`);
        } catch (err) {
            console.error(err);
        }
    });
