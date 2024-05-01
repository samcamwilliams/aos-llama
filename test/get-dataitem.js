import fs from 'fs';
import path from 'path';

const GRAPHQL = "https://g8way.io/graphql"
const GATEWAY = "https://g8way.io"
const CACHE_DIR = path.join(process.cwd(), '.cache');

async function blobToUint8Array(blob) {
  const arrayBuffer = await blob.arrayBuffer();
  const uint8Array = new Uint8Array(arrayBuffer);
  return uint8Array;
}

function ensureCacheDirExists() {
  if (!fs.existsSync(CACHE_DIR)) {
    console.log('Creating cache directory:', CACHE_DIR);
    fs.mkdirSync(CACHE_DIR, { recursive: true });
  }
}

async function readFromCache(id) {
  ensureCacheDirExists();
  const filePath = path.join(CACHE_DIR, `${id}.json`);
  if (fs.existsSync(filePath)) {
    const object = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    if (object.Data) {
      object.Data = Uint8Array.from(Buffer.from(object.Data, 'base64'));
    }
    return object;
  }
  return null;
}

async function writeToCache(id, object) {
  ensureCacheDirExists();
  const filePath = path.join(CACHE_DIR, `${id}.json`);
  if (object.Data) {
    object.Data = Buffer.from(object.Data).toString('base64');
  }
  fs.writeFileSync(filePath, JSON.stringify(object), 'utf8');
}

export async function getDataItem(tx) {
  /**
   * This function needs to use graphql to get the dataitem metadata and a gateway to get 
   * the data, then combine them together in a single JSON data object
   */
  const cached = await readFromCache(tx);
  if (cached) {
    console.log('Read data item from cache:', tx);
    return cached;
  }
  else {
    const gqlResponse = await fetch(GRAPHQL, {
      method: 'POST',
      body: JSON.stringify({ query: query(tx) }),
      headers: { 'Content-Type': 'application/json' }
    });

    const gqlData = await gqlResponse.json();
    const { data: { transaction } } = gqlData;

    if (!transaction) {
      throw new Error("Failed to retreive data item. Transaction not found: " + tx);
    }

    if (!transaction.height) {
      console.warn("WARNING: Transaction does not have a height yet. Setting 0 for height and timestamp...");
    }

    const dataItem = {
      Id: transaction.id,
      Anchor: transaction.anchor,
      Target: transaction.recipient,
      Owner: transaction.owner.address,
      Tags: transaction.tags,
      'Block-Height': transaction.block.height || 0,
      Timestamp: transaction.block.timestamp || 0,
    };

    const gatewayResponse = await fetch(GATEWAY + '/' + dataItem.Id);
    const blob = await gatewayResponse.blob();
    const Data = await blobToUint8Array(blob);
    const completeDataItem = { ...dataItem, Data};
    await writeToCache(tx, completeDataItem);
    console.log("Wrote data item to cache:", tx);
    return readFromCache(tx);
  }
}


function query(tx) {
  return `query {
  transaction(id: "${tx}") {
    id 
    anchor
    recipient
    owner {
      address 
    }
    tags {
      name 
      value 
    }
    block {
      height
      timestamp
    }
  }
}
  `
}
