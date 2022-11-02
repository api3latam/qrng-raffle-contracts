import { task, subtask, types } from "hardhat/config";
import { deriveSponsorWalletAddress } from '@api3/airnode-admin';
import { getPrivateKey,
    loadJsonFile,
    providerURL } from "../scripts/utils/misc";
import { Spooky } from "../typechain";

task("setup", "Config parameters for deployed contract")
    .addOptionalParam(
        "nft", 
        "Indicates wether to setup NFT contract or not", 
        false, 
        types.boolean
    )
    .addOptionalParam(
        "raffle", 
        "Indicates wether to setup Raffle contract or not", 
        false, 
        types.boolean
    )
    .addOptionalParam(
        "picker", 
        "Indicates wether to setup Picker contract or not", 
        false, 
        types.boolean
    )
    .addOptionalParam(
        "spooky", 
        "Indicates wether to setup Spooky contract or not", 
        false, 
        types.boolean
    )
    .setAction(async(taskArgs, hre) => {
        try {
            const qrng = JSON.stringify(loadJsonFile('qrng.json'));
            if (taskArgs.nft) {
                await hre.run("nftSetup", { qrngData: qrng });
            }
            if (taskArgs.raffle) {
                await hre.run("raffleSetup", { qrngData: qrng });
            }
            if (taskArgs.picker) {
                await hre.run("pickerSetup", { qrngData: qrng });
            }
            if (taskArgs.spooky) {
                await hre.run("spookySetup", { qrngData: qrng });
            }
        } catch(err) {
            console.error(err);
        }
    });

subtask("nftSetup", "Config for NFT contract")
    .addParam("qrngData", "The information pertaining the QRNG airnode")
    .setAction(async (taskArgs, hre) => {
        const baseURI = "https://ipfs.io/ipfs/QmSYW7VqabVYBHi6pY4U9WPTzKMksBekbWRQhdtjWaVH8S/";
        const nftAddress = loadJsonFile(`addresses/nft${hre.network.name}.json`)['nft'];
        const nftArtifact = await hre.artifacts.readArtifact("NFT");
        const qrngData = JSON.parse(taskArgs.qrngData);

        const provider = new hre.ethers.providers.JsonRpcProvider(
            providerURL(hre.network.name)
        );
        const privateKey = getPrivateKey();
        const signer = new hre.ethers.Wallet(
            privateKey,
            provider
        );

        const nftContract = new hre.ethers.Contract(
            nftAddress,
            nftArtifact.abi,
            signer
        );
        const nftSponsor = await deriveSponsorWalletAddress(
            qrngData['xpub'],
            qrngData['airnode'],
            nftContract.address
        );

        console.log('Setting up NFT Contract\n');
        console.log('Setting up Base URI\n');
        await nftContract.setBaseURI(
            baseURI
        );
        console.log('Setting up Airnode Parameters\n');
        await nftContract.setRequestParameters(
            qrngData['airnode'],
            qrngData['endpointIdUint256'],
            nftSponsor
        );
        console.log('Done Setting up!');
    });

subtask("raffleSetup", "Config for Raffle contract")
    .addParam("qrngData", "The information pertaining the QRNG airnode")
    .setAction(async (taskArgs, hre) => {
        const raffleAddress = loadJsonFile(`addresses/raffle${hre.network.name}.json`)['raffle'];
        const raffleArtifact = await hre.artifacts.readArtifact("Raffle");
        const qrngData = JSON.parse(taskArgs.qrngData);

        const provider = new hre.ethers.providers.JsonRpcProvider(
            providerURL(hre.network.name)
        );
        const privateKey = getPrivateKey();
        const signer = new hre.ethers.Wallet(
            privateKey,
            provider
        );

        const raffleContract = new hre.ethers.Contract(
            raffleAddress,
            raffleArtifact.abi,
            signer
        );

        const raffleSponsor = await deriveSponsorWalletAddress(
            qrngData['xpub'],
            qrngData['airnode'],
            raffleContract.address
        );
        
        console.log('Setting up Raffle\n');
        await raffleContract.setRequestParameters(
            qrngData['airnode'],
            qrngData['endpointIdUint256'],
            qrngData['endpointIdUint256Array'],
            raffleSponsor
        );
        console.log('Done Setting up!');
    });

subtask("pickerSetup", "Config for Picker contract")
    .addParam("qrngData", "The information pertaining the QRNG airnode")
    .setAction(async (taskArgs, hre) => {
        const address = loadJsonFile(`addresses/picker${hre.network.name}.json`)['picker'];
        const artifact = await hre.artifacts.readArtifact("Picker");
        const qrngData = JSON.parse(taskArgs.qrngData);

        const provider = new hre.ethers.providers.JsonRpcProvider(
            providerURL(hre.network.name)
        );
        const privateKey = getPrivateKey();
        const signer = new hre.ethers.Wallet(
            privateKey,
            provider
        );

        const contract = new hre.ethers.Contract(
            address,
            artifact.abi,
            signer
        );

        const sponsor = await deriveSponsorWalletAddress(
            qrngData['xpub'],
            qrngData['airnode'],
            contract.address
        );
        
        console.log('Setting up Picker\n');
        await contract.setRequestParameters(
            qrngData['airnode'],
            qrngData['endpointIdUint256'],
            sponsor
        );
        console.log('Done Setting up!');
    });

subtask("spookySetup", "Config for Spooky contract")
    .addParam("qrngData", "The information pertaining the QRNG airnode")
    .setAction(async (taskArgs, hre) => {
        const address = loadJsonFile(`addresses/spooky${hre.network.name}.json`)['spooky'];
        const artifact = await hre.artifacts.readArtifact("Spooky");
        const qrngData = JSON.parse(taskArgs.qrngData);
        const baseURI = "https://ipfs.io/ipfs/QmbtPBSckw21ST2EVmbYzkE1fL3ms8s7ZTj3piMFkc9peZ/";

        const provider = new hre.ethers.providers.JsonRpcProvider(
            providerURL(hre.network.name)
        );
        const privateKey = getPrivateKey();
        const signer = new hre.ethers.Wallet(
            privateKey,
            provider
        );

        const contract = new hre.ethers.Contract(
            address,
            artifact.abi,
            signer
        ) as Spooky;

        const sponsor = await deriveSponsorWalletAddress(
            qrngData['xpub'],
            qrngData['airnode'],
            signer.address
        );
        
        console.log('Setting up Spooky Contract\n');
        console.log('Setting up Base URI\n');
        await contract.setBaseURI(
            baseURI
        );
        console.log('Setting up Airnode Parameters\n');
        await contract.setRequestParameters(
            qrngData['airnode'],
            qrngData['endpointIdUint256'],
            signer.address,
            sponsor
        );
        console.log('Done Setting up!');

    });
    