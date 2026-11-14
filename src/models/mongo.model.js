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
import coordinatorSchema from "./coordinator.mongo.model.js";
import citySchema from "./city.mongo.model.js";
import stateSchema from "./state.mongo.model.js";
import countrySchema from "./country.mongo.model.js";
import solutionSchema from "./solution.mongo.model.js";
import hardwareSchema from "./hardware.mongo.model.js";

const AppUser = mongoose.models.AppUser || mongoose.model("AppUser", appUserSchema);
const License = mongoose.models.License || mongoose.model("License", licenseSchema);
const Reports = mongoose.models.Reports || mongoose.model("Reports", reportsSchema);
const Project = mongoose.models.Project || mongoose.model("Project", projectSchema);
const School = mongoose.models.School || mongoose.model("School", schoolSchema);
const Device = mongoose.models.Device || mongoose.model("Device", deviceSchema);
const UpdateBundle = mongoose.models.UpdateBundle || mongoose.model("UpdateBundle", updateBundleSchema);
const Rollout = mongoose.models.Rollout || mongoose.model("Rollout", rolloutSchema);
const UpdateEvent = mongoose.models.UpdateEvent || mongoose.model("UpdateEvent", updateEventSchema);
const Organization = mongoose.models.Organization || mongoose.model("Organization", organizationSchema);
const Board = mongoose.models.Board || mongoose.model("Board", boardSchema);
const Grade = mongoose.models.Grade || mongoose.model("Grade", gradeSchema);
const GradeStream = mongoose.models.GradeStream || mongoose.model("GradeStream", gradeStreamSchema);
const L0Category = mongoose.models.L0Category || mongoose.model("L0Category", l0CategorySchema);
const L0Categories = L0Category;
const Language = mongoose.models.Language || mongoose.model("Language", languageSchema);
const Subject = mongoose.models.Subject || mongoose.model("Subject", subjectSchema);
const Coordinator = mongoose.models.Coordinator || mongoose.model("Coordinator", coordinatorSchema);
const City = mongoose.models.City || mongoose.model("City", citySchema);
const State = mongoose.models.State || mongoose.model("State", stateSchema);
const Country = mongoose.models.Country || mongoose.model("Country", countrySchema);
const Solution = mongoose.models.Solution || mongoose.model("Solution", solutionSchema);
const Hardware = mongoose.models.Hardware || mongoose.model("Hardware", hardwareSchema);

// Ensure indexes are built, especially the unique index on reportId
Reports.init().catch(err => {
  console.error("Reports index creation failed", err);
});

export {
  AppUser,
  License,
  Reports,
  School,
  Device,
  UpdateBundle,
  Rollout,
  UpdateEvent,
  Organization,
  Project,
  Board,
  Grade,
  GradeStream,
  L0Category,
  L0Categories,
  Language,
  Subject,
  Coordinator,
  City,
  State,
  Country,
  Solution,
  Hardware
};

