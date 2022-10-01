interface networkDefinitions {
    [name: string]: {networkId: number}
}

const networksData: networkDefinitions = {
    "goerli": {networkId: 5} ,
    "mumbai": {networkId: 80001},
    "polygon": {networkId: 137}
};

export default networksData;
