import { expect } from "chai";
import { ethers, artifacts, waffle } from "hardhat";
import { anyValue } from "@nomicfoundation/hardhat-chai-matchers/withArgs";
import { deriveSponsorWalletAddress } from "@api3/airnode-admin";

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

    it("Should show the contract properties", async () => {
        const { nftContract, deployer } = await waffle.loadFixture(tokenSetup);
        const qrngData = loadJsonFile('qrng.json');
        const sponsorWalletAddress = await deriveSponsorWalletAddress(
            qrngData['xpub'],
            qrngData['airnode'],
            deployer.address
        );
    
        expect(await nftContract.symbol()).to.equal("LAPI3");
        expect(await nftContract.name()).to.equal("LAPI3");
        expect(await nftContract.airnode()).to.equal(qrngData['airnode']);
        expect(await nftContract.endpointIdUint256())
            .to.equal(qrngData['endpointIdUint256']);
        expect(await nftContract.sponsorWallet()).to.equal(sponsorWalletAddress);
    });

    it("Should mint the tokens", async () => {
        const { nftContract, deployer } = await waffle.loadFixture(tokenSetup);

        const prevBalance = await nftContract.balanceOf(deployer.address);

        await expect(await nftContract.requestToken(deployer.address))
            .to.emit(nftContract, "RequestedToken")
            .withArgs(deployer.address, anyValue);
        
        nftContract.once("GeneratedToken", async (requesterAddress, tokenId) => {
            expect(requesterAddress).to.equal(deployer.address);
            console.log(`Token ID is: ${tokenId}`)

            expect(await nftContract.ownerOf(tokenId as number))
                .to.equal(deployer.address);
            expect(await nftContract.balanceOf(deployer.address))
                .to.equal(prevBalance.add(1));
        });
    })
})