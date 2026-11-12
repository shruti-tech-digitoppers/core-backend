import { ERROR_CODES } from '../constants/error.constants.js';
import { Project, School, License } from '../models/mongo.model.js';

export const getProjects = async (req, res) => {
  try {
    const { search, isActive } = req.query;
    const query = {};

    if (isActive !== undefined) {
      query.isActive = isActive === 'true';
    } else {
      query.isActive = true; // Default to active projects
    }

    if (search) {
      query.$or = [
        { projectName: { $regex: search, $options: 'i' } },
        { projectId: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }

    const projects = await Project.find(query)
      .populate('country', '_id name code')
      .sort({ createdAt: -1 })
      .lean();

    return res.status(200).json({
      success: true,
      message: 'Projects fetched successfully',
      count: projects.length,
      projects
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      errorCode: ERROR_CODES.SERVER_ERROR,
      message: error.message || 'Error fetching projects',
      error
    });
  }
};

export const getProject = async (req, res) => {
  try {
    const { id } = req.params;
    // Query by either Mongo ObjectId _id or string projectId (e.g. "p12345")
    const query = id.match(/^[0-9a-fA-F]{24}$/) ? { _id: id } : { projectId: id };

    const project = await Project.findOne(query)
      .populate('country', '_id name code')
      .lean();

    if (!project) {
      return res.status(404).json({
        success: false,
        errorCode: ERROR_CODES.NOT_FOUND,
        message: 'Project not found'
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Project fetched successfully',
      project
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      errorCode: ERROR_CODES.SERVER_ERROR,
      message: error.message || 'Error fetching project',
      error
    });
  }
};

export const getProjectSchools = async (req, res) => {
  try {
    const { id } = req.params;
    const projectQuery = id.match(/^[0-9a-fA-F]{24}$/) ? { _id: id } : { projectId: id };
    const project = await Project.findOne(projectQuery);

    if (!project) {
      return res.status(404).json({
        success: false,
        errorCode: ERROR_CODES.NOT_FOUND,
        message: 'Project not found'
      });
    }

    const schools = await School.find({ projectId: project._id })
      .populate('coordinatorId', '_id name email phone')
      .populate('cityId', '_id name')
      .populate('stateId', '_id name')
      .populate('countryId', '_id name')
      .lean();

    return res.status(200).json({
      success: true,
      message: 'Project schools fetched successfully',
      projectId: project.projectId,
      projectMongoId: project._id,
      projectName: project.projectName,
      count: schools.length,
      schools
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      errorCode: ERROR_CODES.SERVER_ERROR,
      message: error.message || 'Error fetching project schools',
      error
    });
  }
};

export const createProject = async (req, res) => {
  try {
    const { projectName, email, phone, address, country, numberOfSchools = 0, numberOfLicenses = 0 } = req.body;

    if (!projectName || !email || !phone || !country) {
      return res.status(400).json({
        success: false,
        message: 'projectName, email, phone, and country are required'
      });
    }

    const projectId = req.body.projectId || `p${Date.now()}`;
    const project = new Project({
      projectName,
      projectId,
      email,
      phone,
      address,
      country,
      numberOfSchools,
      numberOfLicenses,
      isActive: true
    });

    const savedProject = await project.save();

    return res.status(201).json({
      success: true,
      message: 'Project created successfully',
      project: savedProject
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      errorCode: ERROR_CODES.SERVER_ERROR,
      message: error.message || 'Error creating project',
      error
    });
  }
};

export const updateProject = async (req, res) => {
  try {
    const { id } = req.params;
    const query = id.match(/^[0-9a-fA-F]{24}$/) ? { _id: id } : { projectId: id };

    const updatedProject = await Project.findOneAndUpdate(
      query,
      { $set: req.body },
      { new: true }
    );

    if (!updatedProject) {
      return res.status(404).json({
        success: false,
        errorCode: ERROR_CODES.NOT_FOUND,
        message: 'Project not found'
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Project updated successfully',
      project: updatedProject
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      errorCode: ERROR_CODES.SERVER_ERROR,
      message: error.message || 'Error updating project',
      error
    });
  }
};

export const deleteProject = async (req, res) => {
  try {
    const { id } = req.params;
    const query = id.match(/^[0-9a-fA-F]{24}$/) ? { _id: id } : { projectId: id };

    const project = await Project.findOneAndDelete(query);
    if (!project) {
      return res.status(404).json({
        success: false,
        errorCode: ERROR_CODES.NOT_FOUND,
        message: 'Project not found'
      });
    }

    // Cascade delete mapped schools and licenses
    await School.deleteMany({ projectId: project._id });
    await License.deleteMany({ projectId: project._id });

    return res.status(200).json({
      success: true,
      message: 'Project and linked schools/licenses deleted successfully'
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      errorCode: ERROR_CODES.SERVER_ERROR,
      message: error.message || 'Error deleting project',
      error
    });
  }
};
