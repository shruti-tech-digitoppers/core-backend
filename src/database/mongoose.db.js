import mongoose from "mongoose";
import { Solution, Hardware } from "../models/mongo.model.js";
import { seedSolutionsAndHardware } from "../migrations/seed-solutions-hardware.js";

let catalogSeedPromise = null;

export const ensureSolutionsAndHardwareSeeded = async () => {
	if (mongoose.connection.readyState !== 1) return;
	if (catalogSeedPromise) return catalogSeedPromise;

	catalogSeedPromise = (async () => {
		try {
			const [solCount, hwCount] = await Promise.all([
				Solution.countDocuments({}),
				Hardware.countDocuments({})
			]);
			if (solCount === 0 || hwCount === 0) {
				await seedSolutionsAndHardware({ logger: console });
			}
		} catch (err) {
			console.warn("Catalog auto-seed warning:", err.message);
		} finally {
			catalogSeedPromise = null;
		}
	})();

	return catalogSeedPromise;
};

const initMongoose = async () => {
	try {
		let uri = process.env.MONGO_URI_DEV || process.env.MONGODB_URI;
		if (process.env.NODE_ENV === "production" && process.env.MONGO_URI_PROD) {
			uri = process.env.MONGO_URI_PROD;
		}
		if (!uri) {
			console.error("Mongoose connection error: Missing MONGO_URI_DEV or MONGODB_URI in environment variables.");
			return;
		}
		await mongoose.connect(uri);
		console.log("Mongoose connected");
		await ensureSolutionsAndHardwareSeeded();
	} catch (error) {
		console.log("Mongoose connection error", error);
	}
};

export default initMongoose;
