/**
 * Check if the value is an object
 * @param {*} value - The value to be checked
 * @returns {boolean} - True if the value is an object, false otherwise
 */
const isObject = (value) => {
  return typeof value === 'object' && value !== null;
}

/**
 * Trim body data for useless spaces
 * @param {Object} body - The body object to be manipulated
 * @returns {Object} - The manipulated body object
 */
const trimBody = (body) => {
  Object.keys(body).forEach((key) => {
    if (key !== 'password') {
      if (isObject(body[key])) {
        body[key] = trimBody(body[key]);
      } else {
        if (typeof body[key] === 'string') {
          body[key] = body[key].trim();
          const temp = body[key];
          if (temp.endsWith(',')) {
            body[key] = temp.slice(0, -1);
          }
        }
        if (key == 'email') {
          body[key] = body[key].toLowerCase();
        }
        if (key == 'username') {
          body[key] = body[key].toLowerCase();
        }
      }
    }
  });
  return body;
}

/**
 * Manipulate query data for boolean values(can be either boolean or string in request)
 * @param {Object} query - The query object to be manipulated
 * @returns {Object} - The manipulated query object
 */
const trimQuery = (query) => {
  Object.keys(query).forEach((key) => {
    if (query[key] == 'true') {
      query[key] = true;
    } else if (query[key] == 'false') {
      query[key] = false;
    }
  });
  return query;
}

/**
 * Trim params for useless spaces
 * @param {Object} params - The params object to be manipulated
 * @returns {Object} - The manipulated params object
 */
const trimParams = (params) => {
  Object.keys(params).forEach((key) => {
    params[key] = params[key].trim();
  });
  return params;
}

/**
 * Function to handle body, query, params
 * @param {Object} req - The request object
 * @param {Object} res - The response object
 * @param {Function} next - The next middleware function
 */
export const transform = (req, res, next) => {
  let { body, params, query } = req;
  if (isObject(body) && Object.keys(body).length > 0) {
    body = trimBody(body);
  }
  if (isObject(params) && Object.keys(params).length > 0) {
    params = trimParams(params);
  }
  if (isObject(query) && Object.keys(query).length > 0) {
    query = trimQuery(query);
  }
  req.body = body;
  req.params = params;
  req.query = query;
  next();
};