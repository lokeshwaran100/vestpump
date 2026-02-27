import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";

// Dummy router address for local node
const DUMMY_ROUTER_ADDRESS = "0x9Ac64Cc6e4415144C455BD8E4837Fea55603e5c3";

const deployTokenFactory: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployer } = await hre.getNamedAccounts();
  const { deploy } = hre.deployments;

  await deploy("TokenFactory", {
    from: deployer,
    args: [DUMMY_ROUTER_ADDRESS],
    log: true,
    autoMine: true, // Mine automatically on local nodes
  });

  const tokenFactory = await hre.ethers.getContract("TokenFactory", deployer);
  console.log("TokenFactory deployed to:", await tokenFactory.getAddress());
};

export default deployTokenFactory;

// Tags are useful if you have multiple deploy files and only want to run one of them.
// e.g. yarn deploy --tags TokenFactory
deployTokenFactory.tags = ["TokenFactory"];
