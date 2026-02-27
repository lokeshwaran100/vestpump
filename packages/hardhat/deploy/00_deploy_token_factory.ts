import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";

// PancakeSwap V2 Router — testnet (BSC Testnet, chain 97)
const PANCAKE_ROUTER_TESTNET = "0xD99D1c33F9fC3444f8101754aBC46c52416550D1";
// Fallback dummy router for local hardhat/localhost
const DUMMY_ROUTER_ADDRESS = "0x9Ac64Cc6e4415144C455BD8E4837Fea55603e5c3";

const deployTokenFactory: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployer } = await hre.getNamedAccounts();
  const { deploy } = hre.deployments;
  const network = hre.network.name;

  // Use the real PancakeSwap router on testnet/mainnet, dummy on local
  const routerAddress = network === "bscTestnet" || network === "bsc" ? PANCAKE_ROUTER_TESTNET : DUMMY_ROUTER_ADDRESS;

  console.log(`Deploying TokenFactory on ${network} with router: ${routerAddress}`);

  await deploy("TokenFactory", {
    from: deployer,
    args: [routerAddress],
    log: true,
    autoMine: network === "localhost" || network === "hardhat",
    waitConfirmations: network === "localhost" || network === "hardhat" ? 0 : 3,
  });

  const tokenFactory = await hre.ethers.getContract("TokenFactory", deployer);
  console.log("TokenFactory deployed to:", await tokenFactory.getAddress());
};

export default deployTokenFactory;

// Tags are useful if you have multiple deploy files and only want to run one of them.
// e.g. yarn deploy --tags TokenFactory
deployTokenFactory.tags = ["TokenFactory"];
