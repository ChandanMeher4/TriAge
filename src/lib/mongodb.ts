import { MongoClient } from "mongodb";

type GlobalWithMongo = typeof globalThis & {
  _mongoClientPromise?: Promise<MongoClient>;
};

const g = global as GlobalWithMongo;

/**
 * Returns a singleton MongoClient promise.
 * The URI check is deferred to call time (not module load time)
 * so Next.js can safely import this module during compilation.
 */
function createClientPromise(): Promise<MongoClient> {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error('Missing environment variable: "MONGODB_URI"');
  }

  if (process.env.NODE_ENV === "development") {
    // Reuse across HMR hot reloads in development
    if (!g._mongoClientPromise) {
      g._mongoClientPromise = new MongoClient(uri).connect();
    }
    return g._mongoClientPromise;
  }

  // In production create a new client per module scope
  return new MongoClient(uri).connect();
}

// clientPromise is only resolved when first awaited at request time
const clientPromise: Promise<MongoClient> = Promise.resolve().then(
  createClientPromise,
);

export default clientPromise;
