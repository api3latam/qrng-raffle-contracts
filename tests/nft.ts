import { expect } from "chai";
import { ethers, artifacts } from "hardhat";
import { anyValue } from "@nomicfoundation/hardhat-chai-matchers/withArgs";
import { getPrivateKey, 
    providerURL,
    loadJsonFile } from "../scripts/utils";
import type { NFT } from "../typechain/contracts";

describe("NFT", async () => {
    async function tokenSetup() {
        const hre = require("hardhat");
        const nftArtifact = await artifacts.readArtifact("NFT");
        const nftAddress = loadJsonFile(
            `addresses/nft${hre.network.name}.json`
        )['nft'];
        const deployer = new ethers.Wallet(
            getPrivateKey(),
            new ethers.providers.JsonRpcProvider(
                providerURL(hre.network.name))
            );

        const nftContract = new ethers.Contract(
            nftAddress, 
            nftArtifact.abi,
            deployer) as NFT;

        return { nftContract, deployer };
    }

    it("Should show the contract properties", async () => {
        const { nftContract } = await tokenSetup();
        const qrngData = loadJsonFile('qrng.json');
    
        expect(await nftContract.symbol()).to.equal("QTC");
        expect(await nftContract.name()).to.equal("Quantum Choice");
        expect(await nftContract.airnode()).to.equal(qrngData['airnode']);
        expect(await nftContract.endpointIdUint256())
            .to.equal(qrngData['endpointIdUint256']);
    });

    it("Should mint the tokens", async () => {
        try {
            const { nftContract, deployer } = await tokenSetup();

            await expect(await nftContract.requestToken(deployer.address))
                .to.emit(nftContract, "RequestedToken")
                .withArgs(deployer.address, anyValue);
        } catch (err) {
            console.error(err);
        };
    });

    it("Should mint a shinny", async() => {
        try {
            const { nftContract, deployer } = await tokenSetup();

            const shinnyCount = await nftContract.shinnyCount();

            await expect(await nftContract.mintShinny(deployer.address))
                .to.emit(nftContract, "GenerateShinny")
                .withArgs(deployer.address, shinnyCount.add(1));
        } catch (err) {
            console.error(err);
        }
    })
})