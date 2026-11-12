import mongoose from "mongoose";
import appUserSchema from "./app-user.mongo.model.js";
import licenseSchema from "./license.mongo.model.js";
import reportsSchema from "./reports.mongo.model.js";
import schoolSchema from "./school.mongo.model.js";
import projectSchema from "./project.mongo.model.js";
import deviceSchema from "./device.mongo.model.js";
import updateBundleSchema from "./updateBundle.mongo.model.js";
import rolloutSchema from "./rollout.mongo.model.js";
import updateEventSchema from "./updateEvent.mongo.model.js";
import organizationSchema from "./organization.mongo.model.js";
import boardSchema from "./board.mongo.model.js";
import gradeSchema from "./grade.mongo.model.js";
import gradeStreamSchema from "./grade-stream.mongo.model.js";
import l0CategorySchema from "./l0categories.mongo.model.js";
import languageSchema from "./language.mongo.model.js";
import subjectSchema from "./subject.mongo.model.js";

const AppUser = mongoose.model("AppUser", appUserSchema);
const License = mongoose.model("License", licenseSchema);
const Reports = mongoose.model("Reports", reportsSchema);
const Project = mongoose.model("Project", projectSchema);
const School = mongoose.model("School", schoolSchema);
const Device = mongoose.model("Device", deviceSchema);
const UpdateBundle = mongoose.model("UpdateBundle", updateBundleSchema);
const Rollout = mongoose.model("Rollout", rolloutSchema);
const UpdateEvent = mongoose.model("UpdateEvent", updateEventSchema);
const Organization = mongoose.model("Organization", organizationSchema);
const Board = mongoose.model("Board", boardSchema);
const Grade = mongoose.model("Grade", gradeSchema);
const GradeStream = mongoose.model("GradeStream", gradeStreamSchema);
const L0Category = mongoose.model("L0Category", l0CategorySchema);
const L0Categories = L0Category;
const Language = mongoose.model("Language", languageSchema);
const Subject = mongoose.model("Subject", subjectSchema);

// Ensure indexes are built, especially the unique index on reportId
Reports.init().catch(err => {
  console.error("Reports index creation failed", err);
});

export { AppUser, License, Reports, School, Device, UpdateBundle, Rollout, UpdateEvent, Organization, Project, Board, Grade, GradeStream, L0Category, L0Categories, Language, Subject };

