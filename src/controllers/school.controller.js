import { ERROR_CODES } from '../constants/error.constants.js';
import { School, License } from '../models/mongo.model.js';

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
    numberOfStudents,
    numberOfTeachers,
    numberOfLicenses,
    partnerId,
    coordinatorId,
    licenseDays,
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
    partnerId,
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
        licenseDays,
        schoolId,
        partnerId,
      };
      licenses.push(license);
    }

    await License.insertMany(licenses);

    res.json({ message: 'School created', school });
  } catch (error) {
    res.status(500).json({ errorCode: ERROR_CODES.SERVER_ERROR, message: error.message || 'Error creating school', error });
  }
};
