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
      console.log('[MongoDB] Cached connection is stale, reconnecting...');
      cachedClient = null;
      cachedDb = null;
    }
  }

  console.log('[MongoDB] Establishing new connection...');
  console.log('[MongoDB] URI:', MONGODB_URI ? MONGODB_URI.replace(/:\/\/([^:]+):([^@]+)@/, '://***:***@') : 'Not configured');
  console.log('[MongoDB] Database:', MONGODB_DB);
  
  if (!MONGODB_URI || MONGODB_URI === '') {
    const error = new Error('MongoDB URI is not configured. Please set MONGODB_URI or EXPO_PUBLIC_MONGODB_URI environment variable.');
    console.error('[MongoDB]', error.message);
    throw error;
  }

  if (!MongoClient) {
    const error = new Error('MongoClient is not available. The mongodb package may not be properly installed.');
    console.error('[MongoDB]', error.message);
    throw error;
  }
  
  try {
    console.log('[MongoDB] Creating MongoClient instance...');
    const client = new MongoClient(MONGODB_URI, {
      serverSelectionTimeoutMS: 15000,
      connectTimeoutMS: 15000,
      socketTimeoutMS: 15000,
      maxPoolSize: 10,
      minPoolSize: 1,
      retryWrites: true,
      retryReads: true,
    });
    
    console.log('[MongoDB] Connecting to MongoDB...');
    await client.connect();
    
    console.log('[MongoDB] Getting database instance...');
    const db = client.db(MONGODB_DB);
    
    if (!db) {
      throw new Error('Failed to get database instance');
    }
    
    console.log('[MongoDB] Testing connection with ping...');
    await client.db().admin().ping();
    console.log('[MongoDB] Connection test successful');

    cachedClient = client;
    cachedDb = db;

    console.log('[MongoDB] Successfully connected to database:', MONGODB_DB);
    return { client, db };
  } catch (error) {
    console.error('[MongoDB] Connection failed:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      name: error instanceof Error ? error.name : 'Unknown',
      code: (error as any)?.code,
      codeName: (error as any)?.codeName,
    });
    
    let errorMessage = 'Failed to connect to database';
    if (error instanceof Error) {
      if (error.message.includes('ENOTFOUND') || error.message.includes('getaddrinfo')) {
        errorMessage = 'Cannot resolve MongoDB host. Please check your connection string and network.';
      } else if (error.message.includes('ETIMEDOUT') || error.message.includes('timed out')) {
        errorMessage = 'Connection to MongoDB timed out. Please check your network and firewall settings.';
      } else if (error.message.includes('Authentication failed') || error.message.includes('auth failed')) {
        errorMessage = 'MongoDB authentication failed. Please check your credentials.';
      } else if (error.message.includes('ECONNREFUSED')) {
        errorMessage = 'MongoDB connection refused. Please ensure the database server is running.';
      } else {
        errorMessage = `Failed to connect to database: ${error.message}`;
      }
    }
    
    throw new Error(errorMessage);
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
