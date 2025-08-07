import { ERROR_CODES } from '../constants/error.constants.js';

const BATCH_SIZE_LIMIT = 500;

export const validateReports = (req, res, next) => {
  const reports = req.body;
  if (!Array.isArray(reports)) {
    return res.status(400).json({ message: 'Reports must be an array', errorCode: ERROR_CODES.BAD_REQUEST });
  }
  if (reports.length > BATCH_SIZE_LIMIT) {
    return res.status(400).json({ message: `Batch size cannot exceed ${BATCH_SIZE_LIMIT} reports`, errorCode: ERROR_CODES.BAD_REQUEST });
  }
  next();
};