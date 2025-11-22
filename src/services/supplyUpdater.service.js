const { Wallet, Contract, JsonRpcProvider } = require('ethers');
require('dotenv/config');

const provider = new JsonRpcProvider(process.env.ARBITRUM_SEPOLIA_RPC);
const wallet = new Wallet(process.env.PRIVATE_KEY, provider);

const CONTRACT_ADDRESS = process.env.CONTRACT_ADDRESS;

const ABI = [
  "function updateBatch(string[] symbols, uint256[] supplies) external"
];

const contract = new Contract(CONTRACT_ADDRESS, ABI, wallet);

// This is your live API endpoint (you already have it running)
const API_URL = "http://localhost:3000/api/top100"; // ← your existing Express route

async function fetchLatestSupplies() {
  const response = await fetch(API_URL);
  const json = await response.json();
  
  if (!json.success || !json.data) throw new Error("Invalid API response");
  
   // optional, keeps order consistent
  
  return {
    symbols: json.data.map(t => t.symbol),
    supplies: json.data.map(t => BigInt(t.circulating_supply_median))
  };
}

async function updateAllSupplies() {
  try {
    console.log("Fetching latest supplies from your API...");
    const { symbols, supplies } = await fetchLatestSupplies();
    
    console.log(`Updating ${symbols.length} tokens on-chain...`);
    const tx = await contract.updateBatch(symbols, supplies);
    console.log(`Tx: https://arbiscan.io/tx/${tx.hash}`);
    
    await tx.wait();
    console.log(`All 100 tokens updated — Block ${tx.blockNumber}`);
  } catch (error) {
    console.error("Update failed:", error.message);
  }
}

// Run every 30 minutes — fully automatic forever
setInterval(updateAllSupplies, 30 * 60 * 1000);
updateAllSupplies(); // run now