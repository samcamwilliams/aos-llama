import Irys from "@irys/sdk";
import fs from "fs";

// load Arweave wallet
const wallet = JSON.parse(
  fs.readFileSync(process.env.WALLET, 'utf-8')
);

// Helper function to read file in chunks
function readFileInChunks(filePath, chunkSize) {
  const fileBuffer = fs.readFileSync(filePath);
  const chunks = [];
  for (let offset = 0; offset < fileBuffer.length; offset += chunkSize) {
    chunks.push(fileBuffer.slice(offset, Math.min(offset + chunkSize, fileBuffer.length)));
  }
  return chunks;
}

// Helper function to upload a file chunk
async function uploadChunk(uploader, chunkData, previousId) {
  const tags = [
    { name: 'Content-Type', value: 'application/octet-stream' },
    { name: 'Data-Protocol', value: 'Onchain-Llama' },
    { name: 'Type', value: 'Model-Chunk' }
  ];
  if (previousId) {
    tags.push({ name: 'Next-Chunk', value: previousId });
  }
  const receipt = await uploader.uploadFileFromBuffer(chunkData, {
    tags: tags
  });
  return receipt.id;
}

const main = async () => {
  const token = "arweave";
  const uploader = new Irys({
    url: "https://turbo.ardrive.io", // URL of the node you want to connect to, https://turbo.ardrive.io will facilitate upload using ArDrive Turbo.
    token, // Token used for payment and signing
    key: wallet, // Arweave wallet
  });

  // Define the chunk size, e.g., 100 MB
  const chunkSize = 100 * 1024 * 1024;

  // Process the model file in chunks
  const modelChunks = readFileInChunks("./model.bin", chunkSize);
  let previousId = null;

  // Upload the tokenizer.bin last
  const tokenizerData = fs.readFileSync("./tokenizer.bin");
  const lastId = await irys.uploadFileFromBuffer(tokenizerData, {
    tags: [
      { name: 'Data-Protocol', value: 'Onchain-Llama' },
      { name: 'Type', value: 'Tokenizer' },
      { name: 'Content-Type', value: 'application/octet-stream' },
    ]
  });
  console.log(`Uploaded tokenizer. ID: ${lastId}`);

  // Upload chunks in reverse order
  for (let i = modelChunks.length - 1; i >= 0; i--) {
    lastId = await uploadChunk(irys, modelChunks[i], previousId);
    console.log(`Uploaded chunk ${i + 1}. ID: ${lastId}...`);
  }

  console.log(`Upload complete. Model ID: ${lastId}.`);
}

main()