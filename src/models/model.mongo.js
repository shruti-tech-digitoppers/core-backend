import mongoose from "mongoose";
import studentSchema from "./student.mongo.model.js";
import gradeSchema from "./grade.mongo.model.js";
import languageSchema from "./language.mongo.model.js";
import boardSchema from "./board.mongo.model.js";
import licenseSchema from "./license.mongo.model.js";
import partnerSchema from "./partner.mongo.model.js";
import schoolSchema from "./school.mongo.model.js";
import citySchema from "./city.mongo.model.js";
import stateSchema from "./state.mongo.model.js";
import countrySchema from "./country.mongo.model.js";
import gradeStreamSchema from "./grade-stream.mongo.model.js";
import l0categoriesSchema from "./l0categories.mongo.model.js";

const Student = mongoose.model("Student", studentSchema);
const Grade = mongoose.model("Grade", gradeSchema);
const GradeStream = mongoose.model("GradeStream", gradeStreamSchema);
const Language = mongoose.model("Language", languageSchema);
const Board = mongoose.model("Board", boardSchema);
const License = mongoose.model("License", licenseSchema);
const Partner = mongoose.model("Partner", partnerSchema);
const School = mongoose.model("School", schoolSchema);
const City = mongoose.model("City", citySchema);
const State = mongoose.model("State", stateSchema);
const Country = mongoose.model("Country", countrySchema);
const L0Categories = mongoose.model("L0Categories", l0categoriesSchema);

export { Student, Grade, GradeStream, Language, Board, License, Partner, School, City, State, Country, L0Categories };
