import mongoose from 'mongoose';
import { GradeStream } from '../models/mongo.model.js';
import { ERROR_CODES } from '../constants/error.constants.js';

export const getGradeStreams = async (req, res) => {
  try {
    const gradeStreams = await GradeStream.find();
    res.json({ data: gradeStreams || [], message: 'Grade streams fetched successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching grade streams', errorCode: ERROR_CODES.SERVER_ERROR, error: error.message });
  }
};

export const getGradeStreamById = async (req, res) => {
  try {
    const { id } = req.params;
    let gradeStream = null;
    if (mongoose.Types.ObjectId.isValid(id)) {
      gradeStream = await GradeStream.findById(id);
    }
    if (!gradeStream) {
      gradeStream = await GradeStream.findOne({ id: id });
    }
    if (!gradeStream) {
      return res.status(404).json({ message: 'Grade stream not found', errorCode: ERROR_CODES.NOT_FOUND });
    }
    res.json({ data: gradeStream, message: 'Grade stream fetched successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching grade stream', errorCode: ERROR_CODES.SERVER_ERROR, error: error.message });
  }
};

export const createGradeStream = async (req, res) => {
  if (!req.body) {
    return res.status(400).json({ message: 'Grade stream data is required', errorCode: ERROR_CODES.BAD_REQUEST });
  }
  try {
    const gradeStream = new GradeStream(req.body);
    await gradeStream.save();
    res.json({ message: 'Grade stream created', data: gradeStream });
  } catch (error) {
    res.status(500).json({ message: 'Error creating grade stream', errorCode: ERROR_CODES.SERVER_ERROR, error: error.message });
  }
};

export const createGradeStreamInBulk = async (req, res) => {
  if (!req.body || !Array.isArray(req.body)) {
    return res.status(400).json({ message: 'Grade streams data array is required', errorCode: ERROR_CODES.BAD_REQUEST });
  }
  try {
    await GradeStream.insertMany(req.body);
    res.json({ message: 'Grade streams created' });
  } catch (error) {
    res.status(500).json({ message: error.message || 'Error creating grade streams', errorCode: ERROR_CODES.SERVER_ERROR });
  }
};
