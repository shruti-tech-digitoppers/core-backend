import mongoose from "mongoose";
import studentSchema from "./student.mongo.model.js";
import licenseSchema from "./license.mongo.model.js";
import reportsSchema from "./reports.mongo.model.js";
import schoolSchema from "./school.mongo.model.js";

const Student = mongoose.model("Student", studentSchema);
const License = mongoose.model("License", licenseSchema);
const Reports = mongoose.model("Reports", reportsSchema);
const School = mongoose.model("School", schoolSchema);

// Ensure indexes are built, especially the unique index on reportId
Reports.init().catch(err => {
  console.error("Reports index creation failed", err);
});

export { Student, License, Reports, School };
