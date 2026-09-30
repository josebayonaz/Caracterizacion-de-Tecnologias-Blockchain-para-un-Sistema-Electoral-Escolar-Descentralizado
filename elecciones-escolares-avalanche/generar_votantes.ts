import { ethers } from "ethers";
import fs from "fs";

const PRIVATE_KEY = process.env.TESIS_PRIVATE_KEY;

if (!PRIVATE_KEY) {
  throw new Error("Falta TESIS_PRIVATE_KEY en el archivo .env");
}

async function main() {
  // 1. Configuración de red y administrador
  const rpcUrl = "http://127.0.0.1:9654/ext/bc/V2mXsgv43ogmPvw1pJJqcuNoZMQTBFnn8xbh98CzF2bH21AcK/rpc";
  const provider = new ethers.JsonRpcProvider(rpcUrl);
  const adminPrivateKey = `0x${PRIVATE_KEY}`;
  const adminWallet = new ethers.Wallet(adminPrivateKey, provider);

  // IMPORTANTE: Pon la dirección de tu contrato desplegado
  const contractAddress = "0x5FC8d32690cc91D4c39d9d3abcBD16989F875707"; 
  const artifactPath = "artifacts/contracts/elecciones_escolares.sol/SchoolElection.json";
  const artifact = JSON.parse(fs.readFileSync(artifactPath, "utf8"));
  
  const electionContract = new ethers.Contract(contractAddress, artifact.abi, adminWallet);

  // 2. Parámetros de la prueba
  const NUM_VOTERS = 1000; 
  const voters = [];

  console.log(`1. Generando ${NUM_VOTERS} billeteras criptográficas...`);
  for (let i = 0; i < NUM_VOTERS; i++) {
    const wallet = ethers.Wallet.createRandom();
    voters.push({ address: wallet.address, privateKey: wallet.privateKey });
  }

  // Guardamos las llaves privadas en un archivo para que Diablo pueda usarlas después
  fs.writeFileSync("voters_diablo.json", JSON.stringify(voters, null, 2));
  console.log("¡Billeteras guardadas en voters_diablo.json!");

  // 3. Inyección masiva en el contrato (Registro en el Padrón)
  console.log("2. Inyectando estudiantes en la blockchain (esto puede tomar unos minutos)...");
  
  // Obtenemos el nonce actual para poder enviar transacciones en paralelo
  let currentNonce = await adminWallet.getNonce();
  const BATCH_SIZE = 50; 

  for (let i = 0; i < NUM_VOTERS; i += BATCH_SIZE) {
    const batch = voters.slice(i, i + BATCH_SIZE);
    const txPromises = [];
    
    for (const voter of batch) {
      // Registramos con grado 11 y antigüedad 3 para cumplir los requisitos del RF-04
      const tx = await electionContract.registerStudent(voter.address, 11, 3, { nonce: currentNonce++ });
      txPromises.push(tx.wait());
    }
    
    // Esperamos a que la Subnet mine el bloque con las 50 transacciones
    await Promise.all(txPromises);
    console.log(`   Progreso: Registrados ${i + batch.length} / ${NUM_VOTERS} estudiantes.`);
  }

  console.log("¡Padrón electoral completamente registrado en la blockchain!");
}

main().catch((error) => {
  console.error("Error crítico durante la generación:", error);
  process.exitCode = 1;
});