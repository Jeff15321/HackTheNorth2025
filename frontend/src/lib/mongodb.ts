import { MongoClient } from "mongodb";

const uri = process.env.MONGODB_URI;
if (!uri) {
  // Intentionally not throwing to allow the app to boot without credentials.
  // API routes will handle absence gracefully.
}

let cachedClient: MongoClient | null = null;

export async function getMongoClient(): Promise<MongoClient> {
  if (cachedClient) return cachedClient;
  if (!uri) throw new Error("MONGODB_URI is not set in environment");
  const client = new MongoClient(uri);
  await client.connect();
  cachedClient = client;
  return client;
}

export async function getDb() {
  const client = await getMongoClient();
  const dbName = process.env.MONGODB_DB_NAME || "htn";
  return client.db(dbName);
}


