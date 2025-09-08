const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth.middleware');
const { checkRole } = require('../middleware/roleCheck');
const holidayController = require('../controllers/holiday.controller');

const { 
    getHolidays, 
    getPastHolidays, 
    getHoliday, 
    createHoliday, 
    updateHoliday, 
    deleteHoliday 
} = holidayController;

// Public routes
router.get('/', getHolidays);
router.get('/history', getPastHolidays);
router.get('/:id', getHoliday);

// Protected admin routes
router.post('/', authenticate, checkRole(['super_admin', 'admin']), createHoliday);
router.put('/:id', authenticate, checkRole(['super_admin', 'admin']), updateHoliday);
router.delete('/:id', authenticate, checkRole(['super_admin', 'admin']), deleteHoliday);

module.exports = router;