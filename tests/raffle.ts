import { Contract, Event, Signer, Wallet } from "ethers";

const { expect } = require("chai");
const hre = require("hardhat");
const { ethers } = hre;

describe("Raffle", function () {
  let RaffleContract: Contract,
    raffleContract: Contract,
    address1: Wallet,
    address2: Wallet;

  it("Deploys", async function () {
    [address1, address2] = await ethers.getSigners();
    RaffleContract = await ethers.getContractFactory("Raffler");
    raffleContract = await RaffleContract.deploy(
      "0xa0AD79D995DdeeB18a14eAef56A549A04e3Aa1Bd",
      "0x0000000000000000000000000000000000000000"
    );
    await raffleContract.deployed();
  });

  it("Creates a raffle", async function () {
    const twoHours: number = 2 * 60 * 60;
    // Convert float to integer
    const now: number = Math.floor(Date.now() / 1000);
    const receipt = await raffleContract.create(
      ethers.utils.parseEther(".0001"),
      5,
      "Test Raffle",
      now - twoHours, // Workaround for setting timestamp manually because of forking
      now + twoHours
    );
    const rc = await receipt.wait();
    const [raffleId] = rc.events.find(
      (event: Event) => event.event === "RaffleCreated"
    ).args;
    const raffle = await raffleContract.raffles(raffleId);
    expect(raffle.raffleId).to.equal(1);
  });

  it("Enters raffle", async function () {
    const accounts = await ethers.getSigners();
    for (let account of accounts) {
      const tx = await raffleContract.connect(account).enter(1, 10, {
        value: ethers.utils.parseEther(".001"),
      });
      await tx.wait();
    }

    const entries = await raffleContract.getEntries(1);
    const [firstEntry] = await raffleContract.getEnteredRaffles(
      address1.address
    );
    expect(firstEntry).to.equal(1);
    expect(entries.length).to.equal(200);
  });

  it.skip("Pick Winner", async function () {
    let accountBalance = await address1.getBalance();
    let randomNumbers = [];
    for (let i = 0; i < 5; i++) {
      randomNumbers.push(Math.floor(Math.random() * 99999));
    }
    console.log(randomNumbers);
    const tx = await raffleContract.pickWinners(1, randomNumbers);
    await tx.wait();
    accountBalance = await address1.getBalance();
    const winners = await raffleContract.getWinners(1);
    expect(winners.length).to.equal(5);
    console.log(winners);
  });

  it.skip("Make Params", async function () {
    const { encode } = require("@api3/airnode-abi");
    const parameters = [
      { type: "string", name: "_path", value: "0,1,2,3,4" },
      {
        type: "string",
        name: "_type",
        value: "uint256,uint256,uint256,uint256,uint256",
      },
      { type: "uint256", name: "size", value: "5" },
    ];
    const encodedData = encode(parameters);

    const params = await raffleContract.getParams(5);
    expect(params).to.equal(encodedData);
  });

  it.skip("Test events", async function () {});
});