/**
 * middleware/validate.js
 * Joi-based request validation factories.
 * Strips unknown fields to prevent mass-assignment vulnerabilities.
 */

'use strict';

const { badRequest } = require('../utils/response');

/**
 * validateBody
 * Validates req.body against a Joi schema.
 * Strips unknown fields, returns 400 with errors array on failure.
 * @param {import('joi').Schema} schema
 * @returns {Function} Express middleware
 */
function validateBody(schema) {
  return function bodyValidator(req, res, next) {
    const { error, value } = schema.validate(req.body, {
      abortEarly: false,
      stripUnknown: true,
    });

    if (error) {
      const errors = error.details.map((d) => ({
        field: d.path.join('.'),
        message: d.message,
      }));
      return badRequest(res, 'Validation failed', errors);
    }

    req.body = value; // Replace with sanitised value
    return next();
  };
}

/**
 * validateQuery
 * Validates req.query against a Joi schema.
 * Strips unknown fields, returns 400 with errors array on failure.
 * @param {import('joi').Schema} schema
 * @returns {Function} Express middleware
 */
function validateQuery(schema) {
  return function queryValidator(req, res, next) {
    const { error, value } = schema.validate(req.query, {
      abortEarly: false,
      stripUnknown: true,
    });

    if (error) {
      const errors = error.details.map((d) => ({
        field: d.path.join('.'),
        message: d.message,
      }));
      return badRequest(res, 'Query validation failed', errors);
    }

    req.query = value; // Replace with sanitised value
    return next();
  };
}

module.exports = { validateBody, validateQuery };
