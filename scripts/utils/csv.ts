import { parse } from 'csv-parse';
import fs from "fs";

export async function loadColumnToArray(file: string) {
    const appRoot = require("app-root-path");
    try {
        const records: any[] = [];
        const filePath = `${appRoot}/${file}`;

        const parser = fs.createReadStream(filePath)
            .pipe(parse({delimiter: ","}));
        
        for await (const record of parser) {
            records.push(record);
        }

        return records;
    } catch (err) {
        console.error(err);
    }
};
