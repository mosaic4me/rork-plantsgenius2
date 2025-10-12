import { MongoClient, Db, ObjectId } from 'mongodb';

const MONGODB_URI = process.env.MONGODB_URI || process.env.EXPO_PUBLIC_MONGODB_URI || 'mongodb+srv://plantgen:Newjab101%3E@cluster102.vvngq7e.mongodb.net/?retryWrites=true&w=majority&appName=Cluster102';
const MONGODB_DB = process.env.MONGODB_DB || process.env.EXPO_PUBLIC_MONGODB_DB || 'plantgenius';

let cachedClient: MongoClient | null = null;
let cachedDb: Db | null = null;

export async function connectToDatabase() {
  if (cachedClient && cachedDb) {
    console.log('[MongoDB] Using cached connection');
    try {
      await cachedClient.db().admin().ping();
      console.log('[MongoDB] Cached connection is alive');
      return { client: cachedClient, db: cachedDb };
    } catch (error) {
      console.log('[MongoDB] Cached connection is stale, reconnecting...', error);
      cachedClient = null;
      cachedDb = null;
    }
  }

  console.log('[MongoDB] Establishing new connection...');
  console.log('[MongoDB] URI:', MONGODB_URI.replace(/:\/\/([^:]+):([^@]+)@/, '://***:***@'));
  console.log('[MongoDB] Database:', MONGODB_DB);
  
  if (!MONGODB_URI) {
    throw new Error('MongoDB URI is not defined');
  }

  if (!MongoClient) {
    throw new Error('MongoClient is not available. Make sure mongodb package is properly installed.');
  }
  
  try {
    console.log('[MongoDB] Creating MongoClient instance...');
    const client = new MongoClient(MONGODB_URI, {
      serverSelectionTimeoutMS: 10000,
      connectTimeoutMS: 10000,
      socketTimeoutMS: 10000,
      maxPoolSize: 10,
      minPoolSize: 1,
    });
    
    console.log('[MongoDB] Connecting to MongoDB...');
    await client.connect();
    
    console.log('[MongoDB] Getting database instance...');
    const db = client.db(MONGODB_DB);
    
    if (!db) {
      throw new Error('Failed to get database instance');
    }
    
    console.log('[MongoDB] Pinging MongoDB...');
    await client.db().admin().ping();
    console.log('[MongoDB] Ping successful');

    cachedClient = client;
    cachedDb = db;

    console.log('[MongoDB] Connected successfully to database:', MONGODB_DB);
    return { client, db };
  } catch (error) {
    console.error('[MongoDB] Connection error:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      name: error instanceof Error ? error.name : 'Unknown',
      stack: error instanceof Error ? error.stack : 'No stack trace',
      type: typeof error,
    });
    throw new Error(`Failed to connect to database: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

export interface MongoUser {
  _id?: ObjectId;
  email: string;
  password: string;
  fullName: string;
  createdAt: Date;
  updatedAt: Date;
  isDeleted?: boolean;
  deletedAt?: Date;
}

export interface MongoSubscription {
  _id?: ObjectId;
  userId: string;
  planType: 'basic' | 'premium';
  status: 'active' | 'cancelled' | 'expired';
  startDate: Date;
  endDate: Date;
  paymentReference?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface MongoDailyScan {
  _id?: ObjectId;
  userId: string;
  scanDate: string;
  scanCount: number;
  createdAt: Date;
}

export async function createUser(email: string, password: string, fullName: string): Promise<MongoUser> {
  const { db } = await connectToDatabase();
  
  const existingUser = await db.collection<MongoUser>('users').findOne({ 
    email: email.toLowerCase(),
    isDeleted: { $ne: true }
  });
  
  if (existingUser) {
    throw new Error('User already exists with this email. Please use a different email or try logging in.');
  }

  const user: MongoUser = {
    email: email.toLowerCase(),
    password,
    fullName,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const result = await db.collection<MongoUser>('users').insertOne(user);
  return { ...user, _id: result.insertedId };
}

export async function findUserByEmail(email: string): Promise<MongoUser | null> {
  const { db } = await connectToDatabase();
  return db.collection<MongoUser>('users').findOne({ 
    email: email.toLowerCase(),
    isDeleted: { $ne: true }
  });
}

export async function findUserById(userId: string): Promise<MongoUser | null> {
  const { db } = await connectToDatabase();
  return db.collection<MongoUser>('users').findOne({ 
    _id: new ObjectId(userId),
    isDeleted: { $ne: true }
  });
}

export async function updateUser(userId: string, updates: Partial<MongoUser>): Promise<void> {
  const { db } = await connectToDatabase();
  await db.collection<MongoUser>('users').updateOne(
    { _id: new ObjectId(userId) },
    { $set: { ...updates, updatedAt: new Date() } }
  );
}

export async function softDeleteUser(userId: string): Promise<void> {
  const { db } = await connectToDatabase();
  await db.collection<MongoUser>('users').updateOne(
    { _id: new ObjectId(userId) },
    { 
      $set: { 
        isDeleted: true, 
        deletedAt: new Date(),
        updatedAt: new Date()
      } 
    }
  );
}

export async function getUserSubscription(userId: string): Promise<MongoSubscription | null> {
  const { db } = await connectToDatabase();
  return db.collection<MongoSubscription>('subscriptions').findOne({
    userId,
    status: 'active',
  });
}

export async function createSubscription(subscription: Omit<MongoSubscription, '_id' | 'createdAt' | 'updatedAt'>): Promise<MongoSubscription> {
  const { db } = await connectToDatabase();
  
  const newSubscription: MongoSubscription = {
    ...subscription,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const result = await db.collection<MongoSubscription>('subscriptions').insertOne(newSubscription);
  return { ...newSubscription, _id: result.insertedId };
}

export async function getDailyScans(userId: string, date: string): Promise<MongoDailyScan | null> {
  const { db } = await connectToDatabase();
  return db.collection<MongoDailyScan>('daily_scans').findOne({
    userId,
    scanDate: date,
  });
}

export async function incrementDailyScans(userId: string, date: string): Promise<void> {
  const { db } = await connectToDatabase();
  
  const existing = await getDailyScans(userId, date);
  
  if (existing) {
    await db.collection<MongoDailyScan>('daily_scans').updateOne(
      { _id: existing._id },
      { $inc: { scanCount: 1 } }
    );
  } else {
    await db.collection<MongoDailyScan>('daily_scans').insertOne({
      userId,
      scanDate: date,
      scanCount: 1,
      createdAt: new Date(),
    });
  }
}
