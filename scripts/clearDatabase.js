import 'dotenv/config';
import mongoose from 'mongoose';

const uri = process.argv[2] || process.env.MONGO_DB_URI;

if (!uri) {
    console.error("Error: Please provide your MongoDB URI either in .env (MONGO_DB_URI) or as an argument:");
    console.error("  node scripts/clearDatabase.js \"mongodb+srv://<username>:<password>@cluster.mongodb.net/igbot\"");
    process.exit(1);
}

async function clearCollections() {
    try {
        console.log("Connecting to MongoDB...");
        await mongoose.connect(uri, {
            serverSelectionTimeoutMS: 5000,
        });
        console.log("Connected successfully.");

        const db = mongoose.connection.db;

        // Clear shortcodes collection
        let countShortcodes = 0;
        try {
            const res1 = await db.collection('shortcodes').deleteMany({});
            countShortcodes = res1.deletedCount;
            console.log(`Successfully deleted ${countShortcodes} document(s) from 'shortcodes' collection.`);
        } catch (e) {
            console.log(`'shortcodes' collection was empty or not found: ${e.message}`);
        }

        // Clear shorturls collection (legacy)
        let countShorturls = 0;
        try {
            const res2 = await db.collection('shorturls').deleteMany({});
            countShorturls = res2.deletedCount;
            console.log(`Successfully deleted ${countShorturls} document(s) from 'shorturls' collection.`);
        } catch (e) {
            console.log(`'shorturls' collection was empty or not found: ${e.message}`);
        }

        console.log(`Database cleanup completed. Total removed: ${countShortcodes + countShorturls} records.`);
    } catch (err) {
        console.error("Failed to clear database collections:", err.message);
        process.exit(1);
    } finally {
        await mongoose.disconnect();
        process.exit(0);
    }
}

clearCollections();
