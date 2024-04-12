// import Irys as normal
import Irys from "@irys/sdk";
import fs from "fs";

// load Arweave wallet
const wallet = JSON.parse(
  fs.readFileSync(process.env.WALLET, 'utf-8')
);

const main = async () => {
  const token = "arweave";
  const irys = new Irys({
    url: "https://turbo.ardrive.io", // URL of the node you want to connect to, https://turbo.ardrive.io will facilitate upload using ArDrive Turbo.
    token, // Token used for payment and signing
    key: wallet, // Arweave wallet
  });

  const receipt = await irys.uploadFile("./aos/process/process.wasm", {
    tags: [
      { name: 'Content-Type', value: 'application/wasm' },
      { name: 'Data-Protocol', value: 'ao' },
      { name: 'Type', value: 'Module' },
      { name: 'Variant', value: 'ao.TN.1' },
      { name: 'Module-Format', value: 'wasm32-unknown-emscripten2' },
      { name: 'Input-Encoding', value: 'JSON-1' },
      { name: 'Output-Encoding', value: 'JSON-1' },
      { name: 'Memory-Limit', value: '500-mb' },
      { name: 'Compute-Limit', value: '9000000000000' },
    ]
  });
  console.log(receipt);
  console.log('ModuleID: ', receipt.id)
}

main()