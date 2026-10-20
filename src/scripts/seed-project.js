import dotenv from "dotenv";
import mongoose from "mongoose";
import { Project } from "../models/mongo.model.js";

dotenv.config();

const seedProject = async () => {
  const uri = process.env.NODE_ENV === "production" 
    ? process.env.MONGO_URI_PROD 
    : process.env.MONGO_URI_DEV;

  if (!uri) {
    throw new Error("MongoDB URI is not defined in environment variables");
  }

  console.log("Connecting to MongoDB...");
  await mongoose.connect(uri);
  console.log("MongoDB connected successfully");

  try {
    const projectData = {
      projectName: "Project 1",
      projectId: "project1",
      email: "user@example.com",
      phone: "1234567890",
      address: "123 Main St",
      numberOfSchools: 10,
      numberOfLicenses: 100,
      country: new mongoose.Types.ObjectId("6868565d73fe067f85b4b118"),
      createdAt: new Date("2022-01-01T00:00:00.000Z"),
      updatedAt: new Date("2022-01-01T00:00:00.000Z"),
      isActive: true
    };

    const existingProject = await Project.findOne({ projectId: projectData.projectId });

    if (existingProject) {
      console.log(`Project with projectId '${projectData.projectId}' already exists:`);
      console.log(existingProject);
      return existingProject;
    }

    const createdProject = await Project.create(projectData);
    console.log("Successfully seeded project:");
    console.log(createdProject);
    return createdProject;
  } catch (error) {
    console.error("Error seeding project:", error);
    throw error;
  } finally {
    await mongoose.disconnect();
    console.log("Disconnected from MongoDB");
  }
};

seedProject().catch((err) => {
  console.error("Seed script failed:", err);
  process.exit(1);
});
