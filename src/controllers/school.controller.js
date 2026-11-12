import crypto from 'crypto';
import { ERROR_CODES } from '../constants/error.constants.js';
import { School, License, Project } from '../models/mongo.model.js';

export const getSchool = async (req, res) => {
  const { schoolId } = req.params;
  try {
    const school = await School.findById(schoolId)
      .populate('projectId', '_id projectId projectName')
      .populate('coordinatorId', '_id name email phone')
      .populate('cityId', '_id name')
      .populate('stateId', '_id name')
      .populate('countryId', '_id name')
      .lean();
    
    if (!school) {
      return res.status(404).json({ errorCode: ERROR_CODES.NOT_FOUND, message: 'School not found' });
    }
    
    res.json({ success: true, school });
  } catch (error) {
    res.status(500).json({ errorCode: ERROR_CODES.SERVER_ERROR, message: error.message || 'Error fetching school', error });
  }
};

export const getSchools = async (req, res) => {
  const { page = 1, limit = 50, projectId, search } = req.query;
  try {
    const query = {};
    if (projectId) {
      query.projectId = projectId;
    }
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { schoolId: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }

    const schools = await School.find(query)
      .populate('projectId', '_id projectId projectName')
      .populate('coordinatorId', '_id name email phone')
      .populate('cityId', '_id name')
      .populate('stateId', '_id name')
      .populate('countryId', '_id name')
      .sort({ createdAt: -1 })
      .lean();

    res.json({ success: true, message: 'Schools fetched', count: schools.length, schools });
  } catch (error) {
    res.status(500).json({ errorCode: ERROR_CODES.SERVER_ERROR, message: error.message || 'Error fetching schools', error });
  }
};

export const createSchool = async (req, res) => {
  const {
    name,
    email,
    phone,
    address,
    block,
    cityId,
    stateId,
    countryId,
    numberOfStudents = 0,
    numberOfTeachers = 0,
    numberOfLicenses = 0,
    projectId,
    coordinatorId,
    licenseDays = 365,
    platform = 'all',
  } = req.body;

  const school = new School({
    name,
    email,
    phone,
    address,
    block,
    cityId,
    stateId,
    countryId,
    numberOfStudents,
    numberOfTeachers,
    numberOfLicenses,
    projectId,
    coordinatorId,
    schoolId: `school${Date.now()}`,
  });

  try {
    const savedSchool = await school.save();
    const schoolId = savedSchool._id.toString();
    const schoolIdPart = schoolId.substring(schoolId.length - 3, schoolId.length);

    // Create licenses using numberOfLicenses
    const licenses = [];
    for (let i = 0; i < numberOfLicenses; i++) {
      const license = {
        licenseKey: `lic${schoolIdPart}${i + 1}`,
        apiKey: crypto.randomBytes(32).toString('hex'),
        licenseDays,
        schoolId,
        projectId,
        platform,
      };
      licenses.push(license);
    }

    if (licenses.length > 0) {
      await License.insertMany(licenses);
    }

    // Update project with school count and license count
    if (projectId) {
      await Project.findByIdAndUpdate(projectId, { 
        $inc: { numberOfSchools: 1, numberOfLicenses: numberOfLicenses } 
      });
    }

    res.status(201).json({ success: true, message: 'School created', school: savedSchool });
  } catch (error) {
    res.status(500).json({ errorCode: ERROR_CODES.SERVER_ERROR, message: error.message || 'Error creating school', error });
  }
};

export const deleteSchool = async (req, res) => {
  try {
    const { schoolId } = req.params;
    const school = await School.findByIdAndDelete(schoolId);

    if (school) {
      // Cascade delete licenses
      await License.deleteMany({ schoolId });

      // Decrement project count
      if (school.projectId) {
        await Project.findByIdAndUpdate(school.projectId, {
          $inc: { numberOfSchools: -1, numberOfLicenses: -(school.numberOfLicenses || 0) }
        });
      }
    }

    res.json({ success: true, message: 'School deleted' });
  } catch (error) {
    res.status(500).json({ errorCode: ERROR_CODES.SERVER_ERROR, message: error.message || 'Error deleting school', error });
  }
};

export const updateSchool = async (req, res) => {
  const { schoolId } = req.params;
  const {
    name,
    email,
    phone,
    address,
    block,
    cityId,
    stateId,
    countryId,
    numberOfLicenses,
    projectId,
    coordinatorId,
    licenseDays,
    platform,
    isActive,
  } = req.body;

  try {
    const updated = await School.findByIdAndUpdate(schoolId, {
      name,
      email,
      phone,
      address,
      block,
      cityId,
      stateId,
      countryId,
      numberOfLicenses,
      projectId,
      coordinatorId,
      licenseDays,
      platform,
      isActive,
    }, { new: true });

    res.json({ success: true, message: 'School updated', school: updated });
  } catch (error) {
    res.status(500).json({ errorCode: ERROR_CODES.SERVER_ERROR, message: error.message || 'Error updating school', error });
  }
};
