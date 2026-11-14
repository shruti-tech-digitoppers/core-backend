import mongoose from 'mongoose';
import { Hardware, Solution } from '../models/mongo.model.js';
import { ERROR_CODES } from '../constants/error.constants.js';

export const getHardwares = async (req, res) => {
  try {
    const { solutionId, solutionIds, solutionKey, solutionKeys, includeInactive, search } = req.query;

    const filter = includeInactive === 'true' ? {} : { isActive: true };

    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { label: { $regex: search, $options: 'i' } },
        { key: { $regex: search, $options: 'i' } },
        { spec: { $regex: search, $options: 'i' } },
      ];
    }

    // Support single or multiple solution IDs
    if (solutionIds || solutionId) {
      const rawIds = (solutionIds || solutionId)
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
      if (rawIds.length === 1) {
        filter.solutions = rawIds[0];
      } else if (rawIds.length > 1) {
        filter.solutions = { $in: rawIds };
      }
    }
    // Support single or multiple solution Keys (e.g. SMART_SHALA, STEM_LAB)
    else if (solutionKeys || solutionKey) {
      const rawKeys = (solutionKeys || solutionKey)
        .split(',')
        .map((k) => k.trim().toUpperCase())
        .filter(Boolean);

      const matchedSolutions = await Solution.find({ key: { $in: rawKeys } }).select('_id');
      const matchedIds = matchedSolutions.map((s) => s._id);

      if (matchedIds.length > 0) {
        filter.solutions = { $in: matchedIds };
      } else {
        return res.status(200).json({
          success: true,
          data: [],
          hardwares: [],
          hardware: [],
          message: 'No hardware found for the given solutions',
        });
      }
    }

    const hardwareList = await Hardware.find(filter)
      .populate('solutions', 'key label name icon')
      .sort({ index: 1, createdAt: 1 });

    res.status(200).json({
      success: true,
      data: hardwareList,
      hardwares: hardwareList,
      hardware: hardwareList,
      count: hardwareList.length,
      message: 'Hardware items fetched successfully',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching hardware items',
      errorCode: ERROR_CODES.SERVER_ERROR,
      error: error.message,
    });
  }
};

export const getHardwareById = async (req, res) => {
  try {
    const { id } = req.params;
    let item = null;

    if (mongoose.Types.ObjectId.isValid(id)) {
      item = await Hardware.findById(id).populate('solutions', 'key label name icon');
    }
    if (!item) {
      item = await Hardware.findOne({ key: String(id).trim().toUpperCase() }).populate(
        'solutions',
        'key label name icon'
      );
    }

    if (!item) {
      return res.status(404).json({
        success: false,
        message: 'Hardware item not found',
        errorCode: ERROR_CODES.NOT_FOUND,
      });
    }

    res.status(200).json({
      success: true,
      data: item,
      hardware: item,
      message: 'Hardware item fetched successfully',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching hardware item',
      errorCode: ERROR_CODES.SERVER_ERROR,
      error: error.message,
    });
  }
};

export const createHardware = async (req, res) => {
  try {
    const {
      key,
      label,
      name,
      spec,
      specs,
      specification,
      icon,
      desc,
      description,
      category,
      unit,
      solutions,
      departmentCode,
      index,
      isActive,
    } = req.body || {};

    if (!key || (!label && !name)) {
      return res.status(400).json({
        success: false,
        message: 'Key and label/name are required',
        errorCode: ERROR_CODES.BAD_REQUEST,
      });
    }

    const cleanKey = key.trim().toUpperCase();
    const existing = await Hardware.findOne({ key: cleanKey });
    if (existing) {
      return res.status(409).json({
        success: false,
        message: `Hardware with key '${key}' already exists`,
        errorCode: ERROR_CODES.CONFLICT,
      });
    }

    const item = await Hardware.create({
      key: cleanKey,
      label: label || name,
      name: name || label,
      spec: spec || specification || '',
      specs: specs || [],
      specification: specification || spec || '',
      icon: icon || '🖥️',
      description: description || desc || '',
      desc: desc || description || '',
      category: category || 'GENERAL',
      unit: unit || 'Units',
      solutions: Array.isArray(solutions) ? solutions : [],
      departmentCode: departmentCode || 'OPS',
      index: index !== undefined ? Number(index) : 0,
      isActive: isActive !== undefined ? isActive : true,
    });

    const populated = await Hardware.findById(item._id).populate('solutions', 'key label name icon');

    res.status(201).json({
      success: true,
      message: 'Hardware created successfully',
      data: populated,
      hardware: populated,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error creating hardware item',
      errorCode: ERROR_CODES.SERVER_ERROR,
      error: error.message,
    });
  }
};

export const createHardwareInBulk = async (req, res) => {
  try {
    if (!req.body || !Array.isArray(req.body)) {
      return res.status(400).json({
        success: false,
        message: 'Hardware data array is required',
        errorCode: ERROR_CODES.BAD_REQUEST,
      });
    }

    const created = await Hardware.insertMany(req.body);
    res.status(201).json({
      success: true,
      message: 'Hardware created in bulk',
      count: created.length,
      data: created,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || 'Error creating hardware in bulk',
      errorCode: ERROR_CODES.SERVER_ERROR,
    });
  }
};

export const updateHardware = async (req, res) => {
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
    if (updateData.specification && !updateData.spec) {
      updateData.spec = updateData.specification;
    }
    if (updateData.spec && !updateData.specification) {
      updateData.specification = updateData.spec;
    }

    let item = null;
    if (mongoose.Types.ObjectId.isValid(id)) {
      item = await Hardware.findByIdAndUpdate(id, updateData, { new: true, runValidators: true }).populate(
        'solutions',
        'key label name icon'
      );
    }
    if (!item) {
      item = await Hardware.findOneAndUpdate(
        { key: String(id).trim().toUpperCase() },
        updateData,
        { new: true, runValidators: true }
      ).populate('solutions', 'key label name icon');
    }

    if (!item) {
      return res.status(404).json({
        success: false,
        message: 'Hardware item not found',
        errorCode: ERROR_CODES.NOT_FOUND,
      });
    }

    res.status(200).json({
      success: true,
      message: 'Hardware item updated successfully',
      data: item,
      hardware: item,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error updating hardware item',
      errorCode: ERROR_CODES.SERVER_ERROR,
      error: error.message,
    });
  }
};

export const deleteHardware = async (req, res) => {
  try {
    const { id } = req.params;
    let item = null;

    if (mongoose.Types.ObjectId.isValid(id)) {
      item = await Hardware.findByIdAndDelete(id);
    }
    if (!item) {
      item = await Hardware.findOneAndDelete({ key: String(id).trim().toUpperCase() });
    }

    if (!item) {
      return res.status(404).json({
        success: false,
        message: 'Hardware item not found',
        errorCode: ERROR_CODES.NOT_FOUND,
      });
    }

    res.status(200).json({
      success: true,
      message: 'Hardware item deleted successfully',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error deleting hardware item',
      errorCode: ERROR_CODES.SERVER_ERROR,
      error: error.message,
    });
  }
};
