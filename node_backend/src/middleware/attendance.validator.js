const { body, query } = require('express-validator');

// Common validation rules for location
const locationValidation = [
    body('location.latitude')
        .if(body('location').exists())
        .isFloat({ min: -90, max: 90 })
        .withMessage('Latitude must be a valid coordinate between -90 and 90'),
    
    body('location.longitude')
        .if(body('location').exists())
        .isFloat({ min: -180, max: 180 })
        .withMessage('Longitude must be a valid coordinate between -180 and 180'),
    
    body('location.address')
        .if(body('location').exists())
        .optional()
        .isString()
        .withMessage('Address must be a string')
        .trim()
        .isLength({ max: 500 })
        .withMessage('Address cannot be longer than 500 characters')
];

// Validation rules for check-in/check-out
const checkInOutValidation = [
    body('notes')
        .optional()
        .isString()
        .withMessage('Notes must be a string')
        .trim()
        .isLength({ max: 1000 })
        .withMessage('Notes cannot be longer than 1000 characters'),
    
    body('photo')
        .optional()
        .isString()
        .withMessage('Photo must be a base64 encoded string')
        .isLength({ max: 10485760 }) // ~10MB
        .withMessage('Photo size is too large (max 10MB)'),
    
    // Add location validation
    ...locationValidation
];

// Validation rules for getting attendance records
const getRecordsValidation = [
    query('startDate')
        .optional()
        .isISO8601()
        .withMessage('Start date must be a valid ISO 8601 date')
        .toDate(),
    
    query('endDate')
        .optional()
        .isISO8601()
        .withMessage('End date must be a valid ISO 8601 date')
        .toDate()
        .custom((value, { req }) => {
            if (req.query.startDate && new Date(value) < new Date(req.query.startDate)) {
                throw new Error('End date must be after start date');
            }
            return true;
        }),
    
    query('limit')
        .optional()
        .isInt({ min: 1, max: 100 })
        .withMessage('Limit must be between 1 and 100')
        .toInt(),
    
    query('offset')
        .optional()
        .isInt({ min: 0 })
        .withMessage('Offset must be a positive integer')
        .toInt(),
    
    query('userId')
        .optional()
        .isInt({ min: 1 })
        .withMessage('User ID must be a positive integer')
        .toInt()
];

// Validation rules for attendance summary
const summaryValidation = [
    query('startDate')
        .optional()
        .isISO8601()
        .withMessage('Start date must be a valid ISO 8601 date')
        .toDate(),
    
    query('endDate')
        .optional()
        .isISO8601()
        .withMessage('End date must be a valid ISO 8601 date')
        .toDate()
        .custom((value, { req }) => {
            if (req.query.startDate && new Date(value) < new Date(req.query.startDate)) {
                throw new Error('End date must be after start date');
            }
            return true;
        }),
    
    query('userId')
        .optional()
        .isInt({ min: 1 })
        .withMessage('User ID must be a positive integer')
        .toInt()
];

// Export validation middleware as arrays
module.exports = {
    checkInValidation: [
        ...checkInOutValidation
    ],
    
    checkOutValidation: [
        ...checkInOutValidation
    ],
    
    getRecordsValidation: [...getRecordsValidation],
    summaryValidation: [...summaryValidation]
};
