import { Grade } from "../models/mongo.model.js";
import { ERROR_CODES } from "../constants/error.constants.js";

export const getGrades = async (req, res) => {
try {
  const grades = await Grade.find();
  res.json({ data: grades || [] });
} catch (error) {
  res.status(500).json({ message: "Error fetching grades", errorCode: ERROR_CODES.SERVER_ERROR });
  }
};

export const getGradeById = async (req, res) => {
  try {
    const grade = await Grade.findById(req.params.id);
    res.json({ data: grade || {} });
  } catch (error) {
    res.status(500).json({ message: "Error fetching grade", errorCode: ERROR_CODES.SERVER_ERROR });
  }
};

export const createGrade = async (req, res) => {
  if (!req.body) {
    res.status(400).json({ message: "Grade data is required", errorCode: ERROR_CODES.BAD_REQUEST });
    return;
  }
  const grade = new Grade(req.body);
  try {
    await grade.save();
    res.json({ message: "Grade created" });
  } catch (error) {
    res.status(500).json({ message: "Error creating grade", errorCode: ERROR_CODES.SERVER_ERROR });
  }
};

export const createGradeInBulk = async (req, res) => {
  const grades = req.body;

  if (!grades) {
    res.status(400).json({ message: "Grades data is required", errorCode: ERROR_CODES.BAD_REQUEST });
    return;
  }

  try {
    await Grade.insertMany(grades);
    res.json({ message: "Grades created" });
  } catch (error) {
    res.status(500).json({ message: "Error creating grades", errorCode: ERROR_CODES.SERVER_ERROR });
  }
};

export const updateGrade = async (req, res) => {
  if (!req.params.id) {
    res.status(400).json({ message: "Grade ID is required", errorCode: ERROR_CODES.BAD_REQUEST });
    return;
  }

  if (!req.body) {
    res.status(400).json({ message: "Grade data is required", errorCode: ERROR_CODES.BAD_REQUEST });
    return;
  }

  try {
    const grade = await Grade.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json({ data: grade });
  } catch (error) {
    res.status(500).json({ message: "Error updating grade", errorCode: ERROR_CODES.SERVER_ERROR });
  }
};

export const deleteGrade = async (req, res) => {
  if (!req.params.id) {
    res.status(400).json({ message: "Grade ID is required", errorCode: ERROR_CODES.BAD_REQUEST });
    return;
  }

  try {
    await Grade.findByIdAndDelete(req.params.id);
    res.json({ message: "Grade deleted" });
  } catch (error) {
    res.status(500).json({ message: "Error deleting grade", errorCode: ERROR_CODES.SERVER_ERROR });
  }
};
