import type { HardhatRuntimeEnvironment } from "hardhat/types";
import { providerURL, getPrivateKey } from "./misc";

export async function getFactory(
    hre: HardhatRuntimeEnvironment,
    contractName: string) {
        const artifact = await hre.artifacts.readArtifact(contractName);

        const provider = new hre.ethers.providers.JsonRpcProvider(
            providerURL(hre.network.name)
        );

        const pk = getPrivateKey();
        const signer = new hre.ethers.Wallet(
            pk, provider);

        return await hre.ethers.getContractFactory(
            artifact.abi,
            artifact.bytecode,
            signer
        );
}
