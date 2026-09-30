import "@nomicfoundation/hardhat-ethers";
import hardhatToolboxMochaEthersPlugin from "@nomicfoundation/hardhat-toolbox-mocha-ethers";
import { configVariable, defineConfig } from "hardhat/config";
import * as dotenv from "dotenv";

const PRIVATE_KEY = process.env.TESIS_PRIVATE_KEY;

if (!PRIVATE_KEY) {
  throw new Error("Falta TESIS_PRIVATE_KEY en el archivo .env");
}


export default defineConfig({
  plugins: [hardhatToolboxMochaEthersPlugin],
  solidity: {
    profiles: {
      default: {
        version: "0.8.34",
      },
      production: {
        version: "0.8.34",
        settings: {
          optimizer: {
            enabled: true,
            runs: 200,
          },
        },
      },
    },
  },
  networks: {
    hardhatMainnet: {
      type: "edr-simulated",
      chainType: "l1",
    },
    hardhatOp: {
      type: "edr-simulated",
      chainType: "op",
    },
    sepolia: {
      type: "http",
      chainType: "l1",
      url: configVariable("SEPOLIA_RPC_URL"),
      accounts: [configVariable("SEPOLIA_PRIVATE_KEY")],
    },
    tesisSubnet: {
      type: "http",
      chainType: "l1",
      url: "http://127.0.0.1:9650/ext/bc/IV2mXsgv43ogmPvw1pJJqcuNoZMQTBFnn8xbh98CzF2bH21AcK/rpc",
      chainId: 2026,
      accounts: [`0x${PRIVATE_KEY}`],
    },
  },
});