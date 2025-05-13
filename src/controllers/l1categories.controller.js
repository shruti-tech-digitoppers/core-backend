import { L1Categories } from '../models/mongo.model.js';

export const getL1Categories = async (req, res) => {
  try {
    const l1categories = await L1Categories.find();
    res.json({ data: l1categories, message: 'L1 categories fetched successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message, message: 'Error fetching L1 categories', errorCode: ERROR_CODES.SERVER_ERROR });
  }
};

export const createL1Categories = async (req, res) => {
  const l1categories = req.body;

  if (!l1categories) {
    res.status(400).json({ message: 'L1 categories data is required', errorCode: ERROR_CODES.BAD_REQUEST });
    return;
  }

  try {
    await L1Categories.create(l1categories);
    res.json({ message: 'L1 categories created' });
  } catch (error) {
    res.status(500).json({ message: 'Error creating L1 categories', errorCode: ERROR_CODES.SERVER_ERROR });
  }
};

export const createL1CategoriesInBulk = async (req, res) => {
  const l1categories = req.body;

  if (!l1categories) {
    res.status(400).json({ message: 'L1 categories data is required', errorCode: ERROR_CODES.BAD_REQUEST });
    return;
  }

  try {
    await L1Categories.insertMany(l1categories);
    res.json({ message: 'L1 categories created' });
  } catch (error) {
    res.status(500).json({ message: 'Error creating L1 categories', errorCode: ERROR_CODES.SERVER_ERROR });
  }
};
