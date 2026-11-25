import mongoose from 'mongoose';
import { Solution } from '../models/mongo.model.js';
import { ERROR_CODES } from '../constants/error.constants.js';
import { ensureSolutionsAndHardwareSeeded } from '../database/mongoose.db.js';

export const getSolutions = async (req, res) => {
  try {
    await ensureSolutionsAndHardwareSeeded();
    const includeInactive = req.query.includeInactive === 'true' || req.query.includeInactive === true;
    const filter = includeInactive ? {} : { isActive: { $ne: false } };
    const solutions = await Solution.find(filter).sort({ index: 1, createdAt: 1 });

    res.status(200).json({
      success: true,
      data: solutions,
      solutions: solutions,
      message: 'Solutions fetched successfully',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching solutions',
      errorCode: ERROR_CODES.SERVER_ERROR,
      error: error.message,
    });
  }
};

export const getSolutionById = async (req, res) => {
  try {
    const { id } = req.params;
    let solution = null;

    if (mongoose.Types.ObjectId.isValid(id)) {
      solution = await Solution.findById(id);
    }
    if (!solution) {
      solution = await Solution.findOne({ key: String(id).trim().toUpperCase() });
    }

    if (!solution) {
      return res.status(404).json({
        success: false,
        message: 'Solution not found',
        errorCode: ERROR_CODES.NOT_FOUND,
      });
    }

    res.status(200).json({
      success: true,
      data: solution,
      solution: solution,
      message: 'Solution fetched successfully',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching solution',
      errorCode: ERROR_CODES.SERVER_ERROR,
      error: error.message,
    });
  }
};

export const createSolution = async (req, res) => {
  try {
    const {
      key,
      label,
      name,
      icon,
      desc,
      description,
      index,
      isActive,
      platform,
      platforms,
      licenseRequired,
      isLicenseRequired,
      licenseCount,
    } = req.body || {};

    if (!key || (!label && !name)) {
      return res.status(400).json({
        success: false,
        message: 'Key and label/name are required',
        errorCode: ERROR_CODES.BAD_REQUEST,
      });
    }

    const cleanKey = key.trim().toUpperCase();
    const existing = await Solution.findOne({ key: cleanKey });
    if (existing) {
      return res.status(409).json({
        success: false,
        message: `Solution with key '${key}' already exists`,
        errorCode: ERROR_CODES.CONFLICT,
      });
    }

    const solution = await Solution.create({
      key: cleanKey,
      label: label || name,
      name: name || label,
      icon: icon || '🔬',
      desc: desc || description || '',
      description: description || desc || '',
      index: index !== undefined ? Number(index) : 0,
      isActive: isActive !== undefined ? isActive : true,
      platform: platform || null,
      platforms: Array.isArray(platforms) ? platforms : (platform ? [platform] : []),
      licenseRequired: licenseRequired !== undefined ? Boolean(licenseRequired) : (isLicenseRequired !== undefined ? Boolean(isLicenseRequired) : false),
      isLicenseRequired: isLicenseRequired !== undefined ? Boolean(isLicenseRequired) : (licenseRequired !== undefined ? Boolean(licenseRequired) : false),
      licenseCount: Number(licenseCount) || 0,
    });

    res.status(201).json({
      success: true,
      message: 'Solution created successfully',
      data: solution,
      solution: solution,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error creating solution',
      errorCode: ERROR_CODES.SERVER_ERROR,
      error: error.message,
    });
  }
};

export const createSolutionInBulk = async (req, res) => {
  try {
    if (!req.body || !Array.isArray(req.body)) {
      return res.status(400).json({
        success: false,
        message: 'Solutions data array is required',
        errorCode: ERROR_CODES.BAD_REQUEST,
      });
    }

    const created = await Solution.insertMany(req.body);
    res.status(201).json({
      success: true,
      message: 'Solutions created in bulk',
      count: created.length,
      data: created,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || 'Error creating solutions in bulk',
      errorCode: ERROR_CODES.SERVER_ERROR,
    });
  }
};

export const updateSolution = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = { ...req.body };

    if (updateData.key) {
      updateData.key = updateData.key.trim().toUpperCase();
    }
    if (updateData.label && !updateData.name) {
      updateData.name = updateData.label;
    }
    if (updateData.name && !updateData.label) {
      updateData.label = updateData.name;
    }

    let solution = null;
    if (mongoose.Types.ObjectId.isValid(id)) {
      solution = await Solution.findByIdAndUpdate(id, updateData, { new: true, runValidators: true });
    }
    if (!solution) {
      solution = await Solution.findOneAndUpdate({ key: String(id).trim().toUpperCase() }, updateData, { new: true, runValidators: true });
    }

    if (!solution) {
      return res.status(404).json({
        success: false,
        message: 'Solution not found',
        errorCode: ERROR_CODES.NOT_FOUND,
      });
    }

    res.status(200).json({
      success: true,
      message: 'Solution updated successfully',
      data: solution,
      solution: solution,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error updating solution',
      errorCode: ERROR_CODES.SERVER_ERROR,
      error: error.message,
    });
  }
};

export const deleteSolution = async (req, res) => {
  try {
    const { id } = req.params;
    let solution = null;

    if (mongoose.Types.ObjectId.isValid(id)) {
      solution = await Solution.findByIdAndDelete(id);
    }
    if (!solution) {
      solution = await Solution.findOneAndDelete({ key: String(id).trim().toUpperCase() });
    }

    if (!solution) {
      return res.status(404).json({
        success: false,
        message: 'Solution not found',
        errorCode: ERROR_CODES.NOT_FOUND,
      });
    }

    res.status(200).json({
      success: true,
      message: 'Solution deleted successfully',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error deleting solution',
      errorCode: ERROR_CODES.SERVER_ERROR,
      error: error.message,
    });
  }
};

