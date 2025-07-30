import { Reports } from '../models/mongo.model.js';
import { validateAndStore } from '../helpers/validators.helper.js';
import { ERROR_CODES } from '../constants/error.constants.js';

const BATCH_SIZE_LIMIT = 500;

export const validateBatchSize = (reports) => {
  if (!Array.isArray(reports)) {
    return {
      isValid: false,
      error: {
        message: 'Reports must be an array',
        errorCode: ERROR_CODES.BAD_REQUEST
      }
    };
  }

  if (reports.length > BATCH_SIZE_LIMIT) {
    return {
      isValid: false,
      error: {
        message: `Batch size cannot exceed ${BATCH_SIZE_LIMIT} reports`,
        errorCode: ERROR_CODES.BAD_REQUEST
      }
    };
  }

  return { isValid: true };
};

export const processReports = async (reports, license) => {
  try {
    // Add metadata to each report
    const reportsWithMetadata = reports.map(report => {
      const metrics = {
        completionPercentage: report.completionPercentage,
        duration: report.duration, // milliseconds
        correctAnswers: report.correctAnswers || null,
        totalQuestionsAttempted: report.totalQuestionsAttempted || null,
        pagesViewed: report.pagesViewed || null,
        interactionPoints: report.interactionPoints || null,
        level: report.level || null
      }
  
      delete report.completionPercentage;
      delete report.duration;
      delete report.correctAnswers;
      delete report.totalQuestionsAttempted;
      delete report.pagesViewed;
      delete report.interactionPoints;
      delete report.level;
      report.metrics = metrics;

      return {
        ...report,
        reportId: report.metadata.licenseKey + '_d1g1_' + report.userId + '_d1g1_' + report.timestamp,
        deviceInfo: {
          type: report.deviceInfo.type,
          os: report.deviceInfo.os,
          deviceId: license.registeredTo,
        },
        metadata: {
          schoolId: license.schoolId,
          licenseKey: license.licenseKey,
          projectId: license.projectId
        }
      }
    });

    // Validate each report individually
    const validationResults = await Promise.all(
      reportsWithMetadata.map(async (report, index) => {
        const validationResult = await validateAndStore(report, Reports);
        return {
          report,
          index,
          isValid: !validationResult.error,
          error: validationResult.error
        };
      })
    );

    // Separate valid and invalid reports
    const validReports = validationResults
      .filter(result => result.isValid)
      .map(result => result.report);

    const invalidReports = validationResults
      .filter(result => !result.isValid)
      .map(result => ({
        report: result.report,
        error: result.error
      }));

    // Store valid reports if any exist
    let storedReports = [];
    if (validReports.length > 0) {
      storedReports = await Reports.insertMany(validReports, {
        ordered: false // Continue processing even if some documents fail
      });
    }

    // Prepare sync status for each report
    const syncStatus = reportsWithMetadata.map((report, index) => {
      const storedReport = storedReports.find(
        stored => stored.deviceInfo.deviceId === report.deviceInfo.deviceId && 
                 stored.timestamp === report.timestamp
      );
      
      const invalidReport = invalidReports.find(
        invalid => invalid.report.deviceInfo.deviceId === report.deviceInfo.deviceId && 
                  invalid.report.timestamp === report.timestamp
      );

      return {
        reportId: report.reportId || `report_${index}`,
        synced: !!storedReport,
        error: invalidReport?.error || null,
        storedAt: storedReport?.syncedAt || null
      };
    });

    return {
      success: true,
      data: {
        totalCount: reports.length,
        validCount: storedReports.length,
        invalidCount: invalidReports.length,
        syncStatus,
        details: {
          validReports: storedReports.map(report => ({
            id: report._id,
            reportId: report.reportId,
            syncedAt: report.syncedAt
          })),
          invalidReports: invalidReports.map(({ report, error }) => ({
            reportId: report.reportId,
            error: error.message,
            details: error.details
          }))
        }
      }
    };

  } catch (error) {
    console.error('Error processing reports:', error);
    return {
      success: false,
      error: {
        message: 'Error processing reports',
        error: error.message,
        errorCode: ERROR_CODES.INTERNAL_SERVER_ERROR
      }
    };
  }
}; 