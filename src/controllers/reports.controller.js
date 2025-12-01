import { processReports } from '../services/reports.service.js';

export const storeBatchReports = async (req, res) => {
  try {
    const reports = req.body;
    const license = req.license;

    // Process reports
    const result = await processReports(reports, license);

    if (!result.success) {
      return res.status(result.error.errorCode === 'VALIDATION_ERROR' ? 400 : 500).json(result.error);
    }

    return res.status(200).json({
      message: 'Reports stored successfully',
      data: result.data
    });
  } catch (err) {
    return res.status(500).json({ message: 'Unexpected error', error: err.message });
  }
};

// WebSocket handler for real-time report syncing
export const handleWebSocketReports = async (socket, reports) => {
  const license = socket.license;

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