import { ERROR_CODES } from '../constants/error.constants.js';
import { School, License, Project } from '../models/mongo.model.js';

export const getSchool = async (req, res) => {
  const { schoolId } = req.params;
  try {
    const school = await School.findById(schoolId)
      // populate projectId so that the final school object contains _id, projectId and projectName as keys in project object
      .populate('projectId', '_id projectId projectName')
      .populate('coordinatorId', '_id name email phone')
      .populate('cityId', '_id name')
      .populate('stateId', '_id name')
      .populate('countryId', '_id name')
      .lean();
    res.json(school);
  } catch (error) {
    res.status(500).json({ errorCode: ERROR_CODES.SERVER_ERROR, message: error.message || 'Error fetching school', error });
  }
};

export const getSchools = async (req, res) => {
  const { page = 1, limit = 10, sortField = 'createdAt', sortOrder = 'desc', ...filters } = req.query;
  try {
    const schools = await School.find({})
      .populate('projectId', '_id projectId projectName')
      .populate('coordinatorId', '_id name email phone')
      .populate('cityId', '_id name')
      .populate('stateId', '_id name')
      .populate('countryId', '_id name')
      .lean();
    res.json({ message: 'Schools fetched', schools });
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
    numberOfLicenses,
    projectId,
    coordinatorId,
    licenseDays,
    platform,
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

    // create licenses using numberOfLicenses
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

    await License.insertMany(licenses);

    // update project with school count and license count
    await Project.findByIdAndUpdate(projectId, { $inc: { numberOfSchools: 1, numberOfLicenses: numberOfLicenses } });

    res.json({ message: 'School created', school });
  } catch (error) {
    res.status(500).json({ errorCode: ERROR_CODES.SERVER_ERROR, message: error.message || 'Error creating school', error });
  }
};

export const deleteSchool = async (req, res) => {
  try {
    const { schoolId } = req.params;
    await School.findByIdAndDelete(schoolId);

    // cascade delete licenses
    await License.deleteMany({ schoolId });

    res.json({ message: 'School deleted' });
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
    await School.findByIdAndUpdate(schoolId, {
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
    });
    res.json({ message: 'School updated' });
  } catch (error) {
    res.status(500).json({ errorCode: ERROR_CODES.SERVER_ERROR, message: error.message || 'Error updating school', error });
  }
};
