import mongoose from "mongoose";

const initMongoose = async () => {
	try {
		const uri =
			process.env.MONGODB_URI ||
			process.env.MONGO_URI ||
			(process.env.NODE_ENV === "production" ? process.env.MONGO_URI_PROD : process.env.MONGO_URI_DEV) ||
			process.env.MONGO_URI_PROD ||
			process.env.MONGO_URI_DEV;

		if (!uri) {
			console.error("❌ [MongoDB] Error: No MongoDB connection URI found in environment variables (MONGODB_URI / MONGO_URI_PROD / MONGO_URI_DEV).");
			return;
		}

		await mongoose.connect(uri);
		console.log("✅ [MongoDB] Connected successfully");
	} catch (error) {
		console.error("❌ [MongoDB] Connection error:", error.message || error);
	}
};

export default initMongoose;
