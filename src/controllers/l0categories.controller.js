import mongoose from 'mongoose';
import { L0Category } from '../models/mongo.model.js';
import { ERROR_CODES } from '../constants/error.constants.js';

export const getL0Categories = async (req, res) => {
  try {
    const l0categories = await L0Category.find();
    res.json({ data: l0categories || [], message: 'L0 categories fetched successfully' });
  } catch (error) {
    res.status(500).json({ error: error, message: error.message || 'Error fetching L0 categories', errorCode: ERROR_CODES.SERVER_ERROR });
  }
};

export const getL0CategoryById = async (req, res) => {
  try {
    const { id } = req.params;
    let category = null;
    if (mongoose.Types.ObjectId.isValid(id)) {
      category = await L0Category.findById(id);
    }
    if (!category) {
      category = await L0Category.findOne({ id: id });
    }
    if (!category) {
      return res.status(404).json({ message: 'L0 category not found', errorCode: ERROR_CODES.NOT_FOUND });
    }
    res.json({ data: category, message: 'L0 category fetched successfully' });
  } catch (error) {
    res.status(500).json({ error: error, message: error.message || 'Error fetching L0 category', errorCode: ERROR_CODES.SERVER_ERROR });
  }
};

export const createL0Categories = async (req, res) => {
  const l0categories = req.body;

  if (!l0categories) {
    return res.status(400).json({ message: 'L0 categories data is required', errorCode: ERROR_CODES.BAD_REQUEST });
  }

  try {
    const category = await L0Category.create(l0categories);
    res.json({ message: 'L0 categories created', data: category });
  } catch (error) {
    res.status(500).json({ message: error.message || 'Error creating L0 categories', errorCode: ERROR_CODES.SERVER_ERROR });
  }
};

export const createL0CategoriesInBulk = async (req, res) => {
  const l0categories = req.body;

  if (!l0categories || !Array.isArray(l0categories)) {
    return res.status(400).json({ message: 'L0 categories data array is required', errorCode: ERROR_CODES.BAD_REQUEST });
  }

  try {
    await L0Category.insertMany(l0categories);
    res.json({ message: 'L0 categories created' });
  } catch (error) {
    res.status(500).json({ message: error.message || 'Error creating L0 categories', errorCode: ERROR_CODES.SERVER_ERROR });
  }
};
