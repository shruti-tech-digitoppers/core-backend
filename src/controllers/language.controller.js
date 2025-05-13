import { Language } from "../models/mongo.model.js";
import { ERROR_CODES } from "../constants/error.constants.js";

export const createLanguage = async (req, res) => {
  const language = req.body;

  if (!language) {
    res.status(400).json({ message: "Language data is required", errorCode: ERROR_CODES.BAD_REQUEST });
    return;
  }

  try {
    await Language.create(language);
    res.json({ message: "Language created" });
  } catch (error) {
    res.status(500).json({ message: "Error creating language", errorCode: ERROR_CODES.SERVER_ERROR });
  }
};

export const createLanguageInBulk = async (req, res) => {
  const languages = req.body;

  if (!languages) {
    res.status(400).json({ message: "Languages data is required", errorCode: ERROR_CODES.BAD_REQUEST });
    return;
  }

  try {
    await Language.insertMany(languages);
    res.json({ message: "Languages created" });
  } catch (error) {
    res.status(500).json({ message: "Error creating languages", errorCode: ERROR_CODES.SERVER_ERROR });
  }
};