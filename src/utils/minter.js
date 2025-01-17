import {create as ipfsHttpClient} from "ipfs-http-client";
import { useContractKit } from "@celo-tools/use-contractkit";
import MyNFT from "../contracts/MyNFT-address.json";
import IERC20Token from "../contracts/IERC20Token.json";
import axios from "axios";
import { BigNumber, ethers } from "ethers";
import Web3 from "web3";

// initialize IPFS
const client = ipfsHttpClient("https://ipfs.infura.io:5001/api/v0");
const cUSDContractAddress = "0x874069Fa1Eb16D44d622F2e0Ca25eeA172369bC1";

// mint an NFT
export const createNft = async (
    minterContract,
    performActions,
    {name, description}
) => {
    await performActions(async (kit) => {
        if (!name || !description) return;
        const {defaultAccount} = kit;
        // convert NFT metadata to JSON format
        const data = JSON.stringify({
            name,
            description,
            owner: defaultAccount,
        });
        try {
            // save NFT metadata to IPFS
            const added = await client.add(data);

            // IPFS url for uploaded metadata
            const url = `https://ipfs.infura.io/ipfs/${added.path}`;

            const price = ethers.utils.parseUnits(String(1), "ether");
      console.log(price);

      const cUSDContract = new kit.web3.eth.Contract(IERC20Token.abi, cUSDContractAddress);
      await cUSDContract.methods
        .approve(MyNFT.MyNFT, price)
          .send({ from: defaultAccount })

      const _address = await fetchNftContractOwner(minterContract);
            console.log({minterContract})

            // mint the NFT and save the IPFS url to the blockchain
            let transaction = await minterContract.methods
                .payToMint(_address, price, url)
                .send({ from: defaultAccount })
            console.log({transaction})
            return transaction;
        } catch (error) {
            console.log("Error uploading file: ", error);
        }
    });
};


// function to upload a file to IPFS
export const uploadToIpfs = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
        const added = await client.add(file, {
            progress: (prog) => console.log(`received: ${prog}`),
        });
        return `https://ipfs.infura.io/ipfs/${added.path}`;
    } catch (error) {
        console.log("Error uploading file: ", error);
    }
};



// fetch all NFTs on the smart contract
export const getNfts = async (minterContract) => {
    try {
        const nfts = [];
        const nftsLength = await minterContract.methods.totalSupply().call();
        for (let i = 0; i < Number(nftsLength); i++) {
            const nft = new Promise(async (resolve) => {
                const res = await minterContract.methods.tokenURI(i).call();
                const meta = await fetchNftMeta(res);
                const owner = await fetchNftOwner(minterContract, i);
                resolve({
                    index: i,
                    owner,
                    name: meta.data.name,
                    description: meta.data.description,
                });
            });
            nfts.push(nft);
        }
        return Promise.all(nfts);
    } catch (e) {
        console.log({e});
    }
};

// get the metedata for an NFT from IPFS
export const fetchNftMeta = async (ipfsUrl) => {
    try {
        if (!ipfsUrl) return null;
        const meta = await axios.get(ipfsUrl);
        return meta;
    } catch (e) {
        console.log({e});
    }
};


// get the owner address of an NFT
export const fetchNftOwner = async (minterContract, index) => {
    try {
        return await minterContract.methods.ownerOf(index).call();
    } catch (e) {
        console.log({e});
    }
};

// get the address that deployed the NFT contract
export const fetchNftContractOwner = async (minterContract) => {
    try {
        let owner = await minterContract.methods.owner().call();
        return owner;
    } catch (e) {
        console.log({e});
    }
};

