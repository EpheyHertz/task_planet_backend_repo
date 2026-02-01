import mongoose from 'mongoose';
import dns from 'node:dns';

// Fix DNS resolution for MongoDB SRV records on Windows
dns.setServers(['1.1.1.1', '8.8.8.8']);

const clientOptions = { 
  serverApi: { 
    version: '1' as const, 
    strict: true, 
    deprecationErrors: true 
  } 
};

const connectDB = async (): Promise<void> => {
  try {
    const mongoURI = process.env.MONGODB_URI;
    
    if (!mongoURI) {
      throw new Error('MONGODB_URI is not defined in environment variables');
    }

    // Connect using Mongoose with Stable API
    await mongoose.connect(mongoURI, clientOptions);
    await mongoose.connection.db?.admin().command({ ping: 1 });
    console.log('✅ Pinged your deployment. You successfully connected to MongoDB!');
  } catch (error: any) {
    console.error('❌ Error connecting to MongoDB:', error.message);
    console.log('\n💡 Troubleshooting tips:');
    console.log('   1. Check if your IP is whitelisted in MongoDB Atlas (Network Access)');
    console.log('   2. Try changing DNS to 8.8.8.8 (Google) or 1.1.1.1 (Cloudflare)');
    console.log('   3. Verify your password is correct in .env');
    console.log('   4. Check your internet connection\n');
    if (process.env.NODE_ENV === 'production') {
      process.exit(1);
    }
  }
};

export default connectDB;
