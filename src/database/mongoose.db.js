import mongoose from "mongoose";

const initMongoose = async () => {
	try {
		let uri = process.env.MONGO_URI_DEV;
		if (process.env.NODE_ENV === "production") {
			uri = process.env.MONGO_URI_PROD;
		}
		await mongoose.connect(uri);
		console.log("Mongoose connected");
	} catch (error) {
		console.log("Mongoose connection error", error);
	}
};

export default initMongoose;
