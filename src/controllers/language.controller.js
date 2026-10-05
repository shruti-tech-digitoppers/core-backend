import mongoose from 'mongoose';
import { Language } from '../models/mongo.model.js';
import { ERROR_CODES } from '../constants/error.constants.js';

export const getLanguages = async (req, res) => {
  try {
    const languages = await Language.find();
    res.json({ data: languages || [], message: 'Languages fetched successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching languages', errorCode: ERROR_CODES.SERVER_ERROR, error: error.message });
  }
};

export const getLanguageById = async (req, res) => {
  try {
    const { id } = req.params;
    let language = null;
    if (mongoose.Types.ObjectId.isValid(id)) {
      language = await Language.findById(id);
    }
    if (!language) {
      language = await Language.findOne({ id: id });
    }
    if (!language) {
      return res.status(404).json({ message: 'Language not found', errorCode: ERROR_CODES.NOT_FOUND });
    }
    res.json({ data: language, message: 'Language fetched successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching language', errorCode: ERROR_CODES.SERVER_ERROR, error: error.message });
  }
};

export const createLanguage = async (req, res) => {
  const language = req.body;

  if (!language) {
    return res.status(400).json({ message: 'Language data is required', errorCode: ERROR_CODES.BAD_REQUEST });
  }

  try {
    const created = await Language.create(language);
    res.json({ message: 'Language created', data: created });
  } catch (error) {
    res.status(500).json({ message: 'Error creating language', errorCode: ERROR_CODES.SERVER_ERROR, error: error.message });
  }
};

export const createLanguageInBulk = async (req, res) => {
  const languages = req.body;

  if (!languages || !Array.isArray(languages)) {
    return res.status(400).json({ message: 'Languages data array is required', errorCode: ERROR_CODES.BAD_REQUEST });
  }

  try {
    await Language.insertMany(languages);
    res.json({ message: 'Languages created' });
  } catch (error) {
    res.status(500).json({ message: 'Error creating languages', errorCode: ERROR_CODES.SERVER_ERROR, error: error.message });
  }
};
