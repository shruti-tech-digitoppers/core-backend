import mongoose from 'mongoose';
import { Reports } from '../models/reports.mongo.model';
import { validateAndStore } from '../helpers/validators.helper';

export const getReports = async (req, res) => {
  const reports = await Reports.find();
  res.json(reports);
};

export const storeBatchReports = async (req, res) => {
  // note: expect array of reports with size not more than 500

  const reports = req.body;
  const storedReports = await processBatch(reports);
  res.json(storedReports);
};

async function processBatch(batch) {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    for (const item of batch) {
      await validateAndStore(item, session);
    }
    await session.commitTransaction();
    return { success: true };
  } catch (error) {
    await session.abortTransaction();
    return { success: false, error };
  }
}
