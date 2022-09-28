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

    it("Should mint the tokens", async (done) => {
        try {
            const { nftContract, deployer } = await tokenSetup();

            const prevBalance = await nftContract.balanceOf(deployer.address);

            await expect(await nftContract.requestToken(deployer.address))
                .to.emit(nftContract, "RequestedToken")
                .withArgs(deployer.address, anyValue);

            const listener = async () => {
                new Promise((resolve, reject) => {
                    nftContract.once("GeneratedToken", async (requesterAddress, tokenId) => {
                        expect(requesterAddress).to.equal(deployer.address);
                        console.log(`Token ID is: ${tokenId}`)

                        expect(await nftContract.ownerOf(tokenId as number))
                            .to.equal(deployer.address);
                        expect(await nftContract.balanceOf(deployer.address))
                            .to.equal(prevBalance.add(1));
                    });
                    resolve(true);
                });
            await listener();
            done();
            };
        } catch (err) {
            done(err);
        };
    });
})