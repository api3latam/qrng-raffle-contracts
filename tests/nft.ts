import { expect } from "chai";
import { ethers, artifacts, waffle } from "hardhat";

import { getPrivateKey, 
    providerURL,
    loadJsonFile } from "../scripts/utils";
import type { NFT } from "../typechain/contracts";

describe("NFT", async () => {
    async function tokenSetup() {
        const nftArtifact = await artifacts.readArtifact("NFT");
        const nftAddress = loadJsonFile('addresses/nftMumbai.json')['nft'];
        const deployer = new ethers.Wallet(
            getPrivateKey(),
            new ethers.providers.JsonRpcProvider(providerURL)
            );

        const nftContract = new ethers.Contract(
            nftAddress, 
            nftArtifact.abi,
            deployer) as NFT;

        return { nftContract, deployer };
    }

    it("Should show the token properties", async () => {
        const { nftContract } = await waffle.loadFixture(tokenSetup);
        expect(await nftContract.symbol()).to.equal("LAPI3");
        expect(await nftContract.name()).to.equal("LAPI3");
    })
})