import { Reports } from '../models/mongo.model.js';
import { validateAndStore } from '../helpers/validators.helper.js';
import { ERROR_CODES } from '../constants/error.constants.js';

export const processReports = async (reports, license) => {
  try {
    // Add metadata to each report
    const reportsWithMetadata = reports.map(report => ({
      // const metrics = {
      //   completionPercentage: report.completionPercentage,
      //   duration: report.duration, // milliseconds
      //   correctAnswers: report.correctAnswers || null,
      //   totalQuestionsAttempted: report.totalQuestionsAttempted || null,
      //   pagesViewed: report.pagesViewed || null,
      //   interactionPoints: report.interactionPoints || null,
      //   level: report.level || null
      // }
  
      // delete report.completionPercentage;
      // delete report.duration;
      // delete report.correctAnswers;
      // delete report.totalQuestionsAttempted;
      // delete report.pagesViewed;
      // delete report.interactionPoints;
      // delete report.level;
      // report.metrics = metrics;

      ...report,
      reportId: `${license.licenseKey}_d1g1_${report.userId}_d1g1_${report.timestamp}`,
      deviceInfo: {
        type: report.deviceInfo.type,
        os: report.deviceInfo.os,
        id: license.registeredTo, // Schema expects 'id', not 'deviceId'
      },
      metadata: {
        orgId: license.orgId,
        schoolId: license.schoolId,
        licenseKey: license.licenseKey,
        projectId: license.projectId,
        syncedAt: new Date(),
        syncStatus: 'synced'
      }
    }));

    // Validate all reports in parallel
    const validationResults = await Promise.all(
      reportsWithMetadata.map(report => validateAndStore(report, Reports))
    );

    const validReports = [];
    const invalidReports = [];

    validationResults.forEach((result, idx) => {
      if (!result.error) {
        validReports.push(reportsWithMetadata[idx]);
      } else {
        invalidReports.push({
          report: reportsWithMetadata[idx],
          error: result.error
        });
      }
    });

    // Store valid reports if any exist
    let storedReports = [];
    if (validReports.length > 0) {
      try {
        const rawResult = await Reports.insertMany(validReports, {
          ordered: false, // Continue processing even if some documents fail
          rawResult: true // Return the raw MongoDB driver result so we can inspect writeErrors
        });

        const insertedCount = rawResult.insertedCount || rawResult.nInserted || 0;

        if (insertedCount > 0) {
          const insertedIds = Object.values(rawResult.insertedIds || {});
          storedReports = await Reports.find({ _id: { $in: insertedIds } });
        }

        if (rawResult.writeErrors && rawResult.writeErrors.length) {
          rawResult.writeErrors.forEach((err) => {
            console.error(`[WRITE_ERROR] Index ${err.index} code ${err.code}: ${err.errmsg}`);
            console.error(`[WRITE_ERROR] Offending document:`);
            console.dir(validReports[err.index], { depth: null });
          });
        }

        if (storedReports.length !== insertedCount) {
          console.warn(`[WARNING] Mismatch: expected ${insertedCount} retrieved ${storedReports.length} docs after insertion`);
        }
      } catch (error) {
        console.error(`[ERROR] insertMany failed:`, error);
        
        // Log detailed validation errors
        if (error.writeErrors) {
          error.writeErrors.forEach((writeError, index) => {
            console.error(`[ERROR] Document ${index} failed:`, writeError.errmsg);
            console.error(`[ERROR] Failed document:`, JSON.stringify(validReports[writeError.index], null, 2));
          });
        }
        
        // Try to get partial results from the error
        if (error.result && error.result.insertedIds) {
          const insertedIds = Object.values(error.result.insertedIds);
          storedReports = await Reports.find({ _id: { $in: insertedIds } });
          console.log(`[DEBUG] Recovered ${storedReports.length} successfully inserted reports from partial failure`);
        }
        
        // If no partial success, continue with empty array but log the issue
        if (storedReports.length === 0) {
          console.error(`[ERROR] No reports were inserted due to validation errors`);
        }
      }
    }

    // Prepare sync status for each report
    const syncStatus = reportsWithMetadata.map((report, index) => {
      const storedReport = storedReports.find(
        stored => stored.deviceInfo.id === report.deviceInfo.id && 
                 stored.timestamp === report.timestamp
      );
      
      const invalidReport = invalidReports.find(
        invalid => invalid.report.deviceInfo.id === report.deviceInfo.id && 
                  invalid.report.timestamp === report.timestamp
      );

      return {
        reportId: report.reportId || `report_${index}`,
        synced: !!storedReport,
        error: invalidReport?.error || null,
        syncedAt: storedReport?.syncedAt || null
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
            syncedAt: report.metadata.syncedAt
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