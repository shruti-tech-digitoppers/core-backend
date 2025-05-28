import { Reports } from '../models/mongo.model.js';
import { validateAndStore } from '../helpers/validators.helper.js';
import { ERROR_CODES } from '../constants/error.constants.js';
import { validateBatchSize, processReports } from '../services/reports.service.js';

const BATCH_SIZE_LIMIT = 500;

export const storeBatchReports = async (req, res) => {
  const reports = req.body;
  const license = req.license;

  // Validate batch size
  const { isValid, error } = validateBatchSize(reports);
  if (!isValid) {
    return res.status(400).json(error);
  }

  // Process reports
  const result = await processReports(reports, license);
  
  if (!result.success) {
    return res.status(result.error.errorCode === 'VALIDATION_ERROR' ? 400 : 500)
      .json(result.error);
  }

  return res.status(200).json({
    message: 'Reports stored successfully',
    data: result.data
  });
};

// WebSocket handler for real-time report syncing
export const handleWebSocketReports = async (socket, reports) => {
  const license = socket.license;

  // Validate batch size
  const { isValid, error } = validateBatchSize(reports);
  if (!isValid) {
    socket.emit('error', error);
    return;
  }

  // Process reports
  const result = await processReports(reports, license);
  
  if (!result.success) {
    socket.emit('error', result.error);
    return;
  }

  socket.emit('reportsSynced', {
    message: 'Reports synced successfully',
    data: result.data
  });
};