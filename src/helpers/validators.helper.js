import mongoose from 'mongoose';
import { ValidationError } from '../helpers/errors.helper';

/**
 * Validates and stores sync data with conflict resolution
 * @param {Object} item - The sync item to process
 * @param {mongoose.ClientSession} session - Mongoose session for transactions
 * @returns {Promise<Object>} - Processed result
 * @throws {ValidationError} - If validation fails
 */
async function validateAndStore(item, session) {
  const {
    clientId, // Unique ID generated on client side
    type,
    timestamp,
    version,
    data,
    deviceId,
  } = item;

  try {
    // 1. Basic validation
    if (!clientId || !type || !timestamp || !version || !data || !deviceId) {
      throw new ValidationError('Missing required fields');
    }

    // 2. Generate a deterministic _id from client data
    // This ensures same data from client always maps to same _id
    const documentId = generateDeterministicId({
      clientId,
      deviceId,
      type,
      timestamp,
    });

    // 2. Type-specific validation
    const validationResult = await validateByType(type, data);
    if (!validationResult.isValid) {
      throw new ValidationError(`Invalid ${type} data: ${validationResult.error}`);
    }

    // 3. Check for existing document
    const existingDoc = await mongoose
      .model(type)
      .findOne({
        _id: documentId,
      })
      .session(session);

    // 4. Handle conflicts
    if (existingDoc) {
      const conflictResult = await handleConflict(existingDoc, item);
      if (!conflictResult.shouldUpdate) {
        return {
          status: 'skipped',
          reason: conflictResult.reason,
        };
      }
    }

    // 5. Prepare the document
    const doc = {
      _id: documentId,
      type,
      timestamp,
      version,
      deviceId,
      data,
      lastModified: new Date(),
      syncHistory: [
        {
          version,
          timestamp,
          deviceId,
        },
      ],
    };

    // 6. Store or update document
    if (existingDoc) {
      // Update existing document
      await mongoose.model(type).findOneAndUpdate(
        { _id: documentId },
        {
          $set: { ...doc },
          $push: {
            syncHistory: {
              $each: [{ version, timestamp, deviceId }],
              $slice: -10, // Keep last 10 sync records
            },
          },
        },
        {
          session,
          new: true,
          runValidators: true,
        }
      );
    } else {
      // Create new document
      await mongoose.model(type).create([doc], { session });
    }

    // 7. Return success result
    return {
      status: 'success',
      _id: documentId,
      version,
    };
  } catch (error) {
    // 8. Error handling
    if (error instanceof ValidationError) {
      throw error;
    }

    if (error.name === 'MongoServerError' && error.code === 11000) {
      // Handle duplicate key errors
      throw new ValidationError('Duplicate document detected');
    }

    // Log unexpected errors
    console.error('Error in validateAndStore:', error);
    throw new Error('Failed to process sync item');
  }
}

/**
 * Validates data based on its type
 * @param {string} type - Data type
 * @param {Object} data - Data to validate
 * @returns {Promise<Object>} Validation result
 */
async function validateByType(type, data) {
  switch (type) {
    case 'profile':
      return validateProfile(data);
    case 'usage_data':
      return validateUsageData(data);
    default:
      return { isValid: false, error: 'Unknown data type' };
  }
}

/**
 * Handles conflict resolution between existing and new documents
 * @param {Object} existing - Existing document
 * @param {Object} incoming - Incoming document
 * @returns {Promise<Object>} Conflict resolution result
 */
async function handleConflict(existing, incoming) {
  // If incoming version is older, skip
  if (incoming.version < existing.version) {
    return {
      shouldUpdate: false,
      reason: 'Older version',
    };
  }

  // If same version but incoming timestamp is older, skip
  if (incoming.version === existing.version && new Date(incoming.timestamp) <= new Date(existing.timestamp)) {
    return {
      shouldUpdate: false,
      reason: 'Same version, older timestamp',
    };
  }

  // If incoming version is newer or same version with newer timestamp
  return {
    shouldUpdate: true,
  };
}

/**
 * Validates profile data
 * @param {Object} data - Profile data to validate
 * @returns {Object} Validation result
 */
function validateProfile(data) {
  const requiredFields = ['userId', 'name', 'email'];
  const missingFields = requiredFields.filter((field) => !data[field]);

  if (missingFields.length > 0) {
    return {
      isValid: false,
      error: `Missing required fields: ${missingFields.join(', ')}`,
    };
  }

  // Email validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(data.email)) {
    return {
      isValid: false,
      error: 'Invalid email format',
    };
  }

  return { isValid: true };
}

/**
 * Validates usage data
 * @param {Object} data - Usage data to validate
 * @returns {Object} Validation result
 */
function validateUsageData(data) {
  const requiredFields = ['userId', 'contentId', 'action', 'duration'];
  const missingFields = requiredFields.filter((field) => !data[field]);

  if (missingFields.length > 0) {
    return {
      isValid: false,
      error: `Missing required fields: ${missingFields.join(', ')}`,
    };
  }

  // Validate duration is a positive number
  if (typeof data.duration !== 'number' || data.duration < 0) {
    return {
      isValid: false,
      error: 'Invalid duration',
    };
  }

  // Validate action type
  const validActions = ['view', 'complete', 'pause', 'resume'];
  if (!validActions.includes(data.action)) {
    return {
      isValid: false,
      error: 'Invalid action type',
    };
  }

  return { isValid: true };
}

// Helper function to generate deterministic IDs
function generateDeterministicId(params) {
  // Using a combination of fields to create a unique, deterministic ID
  const idString = `${params.clientId}-${params.deviceId}-${params.type}-${params.timestamp}`;

  // You could use MD5 or any other hash function
  // Note: This is for document ID generation, not for security
  return crypto.createHash('md5').update(idString).digest('hex');
}

module.exports = validateAndStore;
