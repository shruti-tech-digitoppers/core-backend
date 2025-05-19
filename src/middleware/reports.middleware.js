export const validateReports = (req, res, next) => {
  const reports = req.body;
  if (!Array.isArray(reports)) {
    return res.status(400).json({ message: 'Invalid reports' });
  }
  
  next();
};