import type { HardhatUserConfig } from "hardhat/config";
import "@nomiclabs/hardhat-ethers";
import "@nomiclabs/hardhat-waffle";
import "@typechain/hardhat";
import dotenv from "dotenv";

import "./tasks";

dotenv.config();

const config: HardhatUserConfig = {
    defaultNetwork: "hardhat",
    networks: {
        hardhat: {
            accounts: {}
        },
        mumbai: {
            url: `${process.env.MUMBAI_URL}`,
            chainId: 80001,
            accounts: [process.env.WALLET_PK || ""]
        },
        polygon: {
            url: `${process.env.POLYGON_URL}`,
            chainId: 137,
            accounts: [process.env.WALLET_PK || ""]
        }
    },
    paths: {
        artifacts: "./artifacts",
        cache: "./cache",
        sources: "./contracts",
        tests: "./tests",
    },
    typechain: {
        outDir: "./typechain",
        target: "ethers-v5",
    },
    solidity: {
        compilers: [
            {
                version: "0.8.15",
                settings: {
                    optimizer: {
                        enabled: true,
                        runs: 500
                    }
                }
            }
        ]
    }
};

export default config;
