interface networkDefinitions {
    [name: string]: {networkId: number}
}

export const networksData: networkDefinitions = {
    "goerli": {networkId: 5} ,
    "mumbai": {networkId: 80001},
    "polygon": {networkId: 137},
    "arbitrum": {networkId: 42161},
    "optimism": {networkId: 10}
};
