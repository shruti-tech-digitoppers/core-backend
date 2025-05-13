import { L0Categories } from '../models/mongo.model.js';
import { ERROR_CODES } from '../constants/error.constants.js';

export const getL0Categories = async (req, res) => {
  try {
    const l0categories = await L0Categories.find();
    res.json({ data: l0categories, message: 'L0 categories fetched successfully' });
  } catch (error) {
    res.status(500).json({ error: error, message: error.message || 'Error fetching L0 categories', errorCode: ERROR_CODES.SERVER_ERROR });
  }
};

export const createL0Categories = async (req, res) => {
  const l0categories = req.body;

  if (!l0categories) {
    res.status(400).json({ message: 'L0 categories data is required', errorCode: ERROR_CODES.BAD_REQUEST });
    return;
  }

  try {
    await L0Categories.create(l0categories);
    res.json({ message: 'L0 categories created' });
  } catch (error) {
    res.status(500).json({ message: error.message || 'Error creating L0 categories', errorCode: ERROR_CODES.SERVER_ERROR });
  }
};

export const createL0CategoriesInBulk = async (req, res) => {
  const l0categories = req.body;

  if (!l0categories) {
    res.status(400).json({ message: 'L0 categories data is required', errorCode: ERROR_CODES.BAD_REQUEST });
    return;
  }

  try {
    await L0Categories.insertMany(l0categories);
    res.json({ message: 'L0 categories created' });
  } catch (error) {
    res.status(500).json({ message: error.message || 'Error creating L0 categories', errorCode: ERROR_CODES.SERVER_ERROR });
  }
};
