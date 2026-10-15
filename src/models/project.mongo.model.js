import mongoose from "mongoose";
// import { registerSearchSync } from "../search/search-sync.hooks.js";

const schema = new mongoose.Schema({
	orgId: { type: mongoose.Schema.Types.ObjectId, ref: "Organization", required: true, index: true },
	projectName: { type: String, required: true },
	projectNameLower: { type: String, index: true },
	projectId: { type: String, required: true },
	projectIdLower: { type: String, index: true },
	email: { type: String, required: true },
	phone: { type: String, required: true },
	address: { type: String },
	numberOfSchools: { type: Number, default: 0 },
	numberOfLicenses: { type: Number, default: 0 },
	country: { type: mongoose.Schema.Types.ObjectId, required: true },
	createdAt: { type: Date, default: Date.now },
	updatedAt: { type: Date, default: Date.now },
	isActive: { type: Boolean, default: true },
	deactivatedAt: { type: Date, default: null },
	deactivatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
	settings: {
		purpose: { type: String },
	},
});

function normalize(doc) {
	if (!doc) return;
	if (typeof doc.projectName === 'string') doc.projectNameLower = doc.projectName.toLowerCase();
	if (typeof doc.projectId === 'string') doc.projectIdLower = doc.projectId.toLowerCase();
}

schema.pre('save', function (next) {
	normalize(this);
	next();
});

// Ensure normalization also applies to bulk inserts (insertMany does not trigger `save`)
schema.pre('insertMany', function (next, docs) {
	try {
		if (Array.isArray(docs)) docs.forEach((d) => normalize(d));
	} catch (_) { }
	next();
});

schema.pre('findOneAndUpdate', function (next) {
	const update = this.getUpdate() || {};
	const $set = update.$set || {};
	if (typeof $set.projectName === 'string') $set.projectNameLower = $set.projectName.toLowerCase();
	if (typeof $set.projectId === 'string') $set.projectIdLower = $set.projectId.toLowerCase();
	update.$set = $set;
	this.setUpdate(update);
	next();
});

// Compound indexes to accelerate org-scoped prefix lookups
schema.index({ orgId: 1, projectNameLower: 1 });
schema.index({ orgId: 1, projectIdLower: 1 });

// registerSearchSync(schema, 'project');

export default schema;