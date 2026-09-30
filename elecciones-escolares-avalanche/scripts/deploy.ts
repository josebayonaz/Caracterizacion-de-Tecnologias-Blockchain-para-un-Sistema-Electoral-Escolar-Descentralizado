import { ethers } from "ethers";
import fs from "fs";

const PRIVATE_KEY = process.env.TESIS_PRIVATE_KEY;

if (!PRIVATE_KEY) {
  throw new Error("Falta TESIS_PRIVATE_KEY en el archivo .env");
}

async function main() {
  console.log("Iniciando despliegue de las elecciones escolares (Modo Directo)...");

  // 1. Conectar a la red local de Avalanche
  const rpcUrl = "http://127.0.0.1:9654/ext/bc/V2mXsgv43ogmPvw1pJJqcuNoZMQTBFnn8xbh98CzF2bH21AcK/rpc";
  const provider = new ethers.JsonRpcProvider(rpcUrl);

  // 2. Cargar tu llave privada
  const privateKey = `0x${PRIVATE_KEY}`;
  const wallet = new ethers.Wallet(privateKey, provider);
  console.log("Billetera conectada:", wallet.address);

  // 3. Leer el contrato ya compilado desde la carpeta artifacts
  const artifactPath = "artifacts/contracts/elecciones_escolares.sol/SchoolElection.json";
  
  if (!fs.existsSync(artifactPath)) {
    throw new Error(`No se encontró el contrato en ${artifactPath}. Verifica el nombre.`);
  }

  const artifact = JSON.parse(fs.readFileSync(artifactPath, "utf8"));

  // 4. Crear la fábrica y lanzar el contrato
  const factory = new ethers.ContractFactory(artifact.abi, artifact.bytecode, wallet);
  
  console.log("Enviando transacción de despliegue a la red...");
  const votingContract = await factory.deploy(); 
  
  await votingContract.waitForDeployment();

  const contractAddress = await votingContract.getAddress();
  console.log(`¡Éxito absoluto! Contrato desplegado en la dirección: ${contractAddress}`);
}

main().catch((error) => {
  console.error("Error crítico:", error);
  process.exitCode = 1;
});