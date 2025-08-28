import { Subject } from '../models/mongo.model.js';
import { ERROR_CODES } from '../constants/error.constants.js';

export const getSubjects = async (req, res) => {
  try {
    const subjects = await Subject.find();
    res.json({ data: subjects, message: 'Subjects fetched successfully' });
  } catch (error) {
    res.status(500).json({ error: error, message: error.message || 'Error fetching subjects', errorCode: ERROR_CODES.SERVER_ERROR });
  }
};

export const getSubject = async (req, res) => {
  try {
    const { id } = req.params;

    let subject = null;
    if (/^[0-9a-fA-F]{24}$/.test(id)) {
      subject = await Subject.findById(id);
    }
    if (!subject) {
      subject = await Subject.findOne({ id: id });
    }

    if (!subject) {
      res.status(404).json({ message: 'Subject not found', errorCode: ERROR_CODES.NOT_FOUND });
      return;
    }

    res.json({ data: subject, message: 'Subject fetched successfully' });
  } catch (error) {
    res.status(500).json({ error: error, message: error.message || 'Error fetching subject', errorCode: ERROR_CODES.SERVER_ERROR });
  }
};

export const createSubject = async (req, res) => {
  const subject = req.body;

  if (!subject) {
    res.status(400).json({ message: 'Subject data is required', errorCode: ERROR_CODES.BAD_REQUEST });
    return;
  }

  try {
    await Subject.create(subject);
    res.json({ message: 'Subject created' });
  } catch (error) {
    res.status(500).json({ message: error.message || 'Error creating subject', errorCode: ERROR_CODES.SERVER_ERROR });
  }
};

export const createSubjectsInBulk = async (req, res) => {
  const subjects = req.body;

  if (!subjects) {
    res.status(400).json({ message: 'Subjects data is required', errorCode: ERROR_CODES.BAD_REQUEST });
    return;
  }

  try {
    await Subject.insertMany(subjects);
    res.json({ message: 'Subjects created' });
  } catch (error) {
    res.status(500).json({ message: error.message || 'Error creating subjects', errorCode: ERROR_CODES.SERVER_ERROR });
  }
};


