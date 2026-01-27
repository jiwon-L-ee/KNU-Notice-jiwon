/**
 * @file logger.js
 * @description Request logging middleware for Express applications.
 * Logs the method, URL, and duration of each request to the console.
 * Sensitive data in the request body (like passwords) is redacted before logging.
 */

/**
 * Middleware function to log HTTP requests and responses.
 * Logs the start of a request (including safe body content) and the completion
 * of the response including the status code and duration.
 *
 * @function logger
 * @param {import('express').Request} req - The Express request object.
 * @param {import('express').Response} res - The Express response object.
 * @param {import('express').NextFunction} next - The Express next middleware function.
 * @returns {void} Calls next() to continue the request chain.
 */
const logger = (req, res, next) => {
  const start = Date.now();
  const { method, url, body } = req;
  const timestamp = new Date().toISOString();

  // Redact sensitive information from body (e.g., password)
  const safeBody = { ...body };
  if (safeBody.password) safeBody.password = '******';

  // Log request with body
  console.log(`[${timestamp}] ${method} ${url} - Request started`);
  if (method !== 'GET' && Object.keys(safeBody).length > 0) {
    console.log(`Body: ${JSON.stringify(safeBody, null, 2)}`);
  }

  // Hook into finish event to log response details
  res.on('finish', () => {
    const duration = Date.now() - start;
    const { statusCode } = res;
    console.log(`[${timestamp}] ${method} ${url} ${statusCode} - ${duration}ms`);
  });

  next();
};

export default logger;