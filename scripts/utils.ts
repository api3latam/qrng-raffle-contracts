import { utils } from "ethers";
import { config } from "dotenv";
import fs from "fs";

config();

export function getPrivateKey() {
    const inputKey = process.env['WALLET_PK'] 
        ? process.env['WALLET_PK'] : null;
    let privateKey;
    if (inputKey) {
        privateKey = utils.isHexString(inputKey) ? inputKey : "0x" + inputKey;
        return new utils.SigningKey(privateKey);
    }
    else {
        throw Error(`Theres no Private Key available`)
    }
};

export const providerURL = process.env['MUMBAI_URL'] || "";

export function loadJsonFile(file: string) {
    const appRoot = require("app-root-path");
    try {
        const data = fs.readFileSync(`${appRoot}${file[0] === "/" ? file : "/" + file}`);
        return JSON.parse(data as any);
    } catch (err) {
        return {};
    }   
};

export function writeJsonFile(args: {data: any, path: string, mode?: string}) {
    const appRoot = require("app-root-path");
    let prevData: any;
    if (args.mode === "a") {
        prevData = loadJsonFile(args.path);
    } else {
        prevData = {}
    }
    const parsedData = JSON.stringify(
        { ...prevData, ...args.data },
        null,
        2
    );
    fs.writeFileSync(appRoot + args.path, parsedData);
    console.log(`File written to: ${appRoot}${args.path}`);
};