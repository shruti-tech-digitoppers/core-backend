import mongoose from 'mongoose';
import { Grade } from '../models/mongo.model.js';
import { ERROR_CODES } from '../constants/error.constants.js';

export const getGrades = async (req, res) => {
  try {
    const grades = await Grade.find();
    res.json({ data: grades || [], message: 'Grades fetched successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching grades', errorCode: ERROR_CODES.SERVER_ERROR, error: error.message });
  }
};

export const getGradeById = async (req, res) => {
  try {
    const { id } = req.params;
    let grade = null;
    if (mongoose.Types.ObjectId.isValid(id)) {
      grade = await Grade.findById(id);
    }
    if (!grade) {
      grade = await Grade.findOne({ id: id });
    }
    if (!grade) {
      return res.status(404).json({ message: 'Grade not found', errorCode: ERROR_CODES.NOT_FOUND });
    }
    res.json({ data: grade, message: 'Grade fetched successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching grade', errorCode: ERROR_CODES.SERVER_ERROR, error: error.message });
  }
};

export const createGrade = async (req, res) => {
  if (!req.body) {
    return res.status(400).json({ message: 'Grade data is required', errorCode: ERROR_CODES.BAD_REQUEST });
  }
  try {
    const grade = new Grade(req.body);
    await grade.save();
    res.json({ message: 'Grade created', data: grade });
  } catch (error) {
    res.status(500).json({ message: 'Error creating grade', errorCode: ERROR_CODES.SERVER_ERROR, error: error.message });
  }
};

export const createGradeInBulk = async (req, res) => {
  if (!req.body || !Array.isArray(req.body)) {
    return res.status(400).json({ message: 'Grades data array is required', errorCode: ERROR_CODES.BAD_REQUEST });
  }
  try {
    await Grade.insertMany(req.body);
    res.json({ message: 'Grades created' });
  } catch (error) {
    res.status(500).json({ message: error.message || 'Error creating grades', errorCode: ERROR_CODES.SERVER_ERROR });
  }
};

export const updateGrade = async (req, res) => {
  if (!req.params.id) {
    return res.status(400).json({ message: 'Grade ID is required', errorCode: ERROR_CODES.BAD_REQUEST });
  }
  if (!req.body) {
    return res.status(400).json({ message: 'Grade data is required', errorCode: ERROR_CODES.BAD_REQUEST });
  }
  try {
    const { id } = req.params;
    const filter = mongoose.Types.ObjectId.isValid(id) ? { _id: id } : { id: id };
    const grade = await Grade.findOneAndUpdate(filter, req.body, { new: true });
    if (!grade) {
      return res.status(404).json({ message: 'Grade not found', errorCode: ERROR_CODES.NOT_FOUND });
    }
    res.json({ message: 'Grade updated', data: grade });
  } catch (error) {
    res.status(500).json({ message: 'Error updating grade', errorCode: ERROR_CODES.SERVER_ERROR, error: error.message });
  }
};

export const deleteGrade = async (req, res) => {
  if (!req.params.id) {
    return res.status(400).json({ message: 'Grade ID is required', errorCode: ERROR_CODES.BAD_REQUEST });
  }
  try {
    const { id } = req.params;
    const filter = mongoose.Types.ObjectId.isValid(id) ? { _id: id } : { id: id };
    const grade = await Grade.findOneAndDelete(filter);
    if (!grade) {
      return res.status(404).json({ message: 'Grade not found', errorCode: ERROR_CODES.NOT_FOUND });
    }
    res.json({ message: 'Grade deleted' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting grade', errorCode: ERROR_CODES.SERVER_ERROR, error: error.message });
  }
};
