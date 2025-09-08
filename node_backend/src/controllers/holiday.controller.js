const Holiday = require('../models/holiday.model');
const { NotFoundError, BadRequestError } = require('../utils/error');

// @desc    Get all holidays
// @route   GET /api/holidays
// @access  Private
exports.getHolidays = async (req, res, next) => {
    try {
        console.log('Fetching all holidays...');
        const holidays = await Holiday.findAll();
        console.log('Holidays from database:', holidays);
        // Ensure we always return an array, even if it's empty
        const result = Array.isArray(holidays) ? holidays : [];
        console.log('Returning holidays:', result);
        res.json(result);
    } catch (error) {
        console.error('Error in getHolidays:', error);
        next(error);
    }
};

// @desc    Get past holidays
// @route   GET /api/holidays/history
// @access  Private
exports.getPastHolidays = async (req, res, next) => {
    try {
        const holidays = await Holiday.findPast();
        res.json(holidays);
    } catch (error) {
        next(error);
    }
};

// @desc    Get single holiday
// @route   GET /api/holidays/:id
// @access  Private
exports.getHoliday = async (req, res, next) => {
    try {
        const holiday = await Holiday.findById(req.params.id);
        if (!holiday) {
            throw new NotFoundError('Holiday not found');
        }
        res.json(holiday);
    } catch (error) {
        next(error);
    }
};

// @desc    Create a holiday
// @route   POST /api/holidays
// @access  Private/Admin
exports.createHoliday = async (req, res, next) => {
    try {
        const { name, date, type = 'public' } = req.body;
        
        if (!name || !date) {
            throw new BadRequestError('Name and date are required');
        }
        
        const holiday = await Holiday.create({
            name,
            date,
            type,
            created_by: req.user.id
        });

        res.status(201).json(holiday);
    } catch (error) {
        next(error);
    }
};

// @desc    Update a holiday
// @route   PUT /api/holidays/:id
// @access  Private/Admin
exports.updateHoliday = async (req, res, next) => {
    try {
        const { name, date, type } = req.body;
        const { id } = req.params;
        
        const existingHoliday = await Holiday.findById(id);
        if (!existingHoliday) {
            throw new NotFoundError('Holiday not found');
        }
        
        const updatedHoliday = await Holiday.update(id, {
            name: name || existingHoliday.name,
            date: date || existingHoliday.date,
            type: type || existingHoliday.type
        });

        res.json(updatedHoliday);
    } catch (error) {
        next(error);
    }
};

// @desc    Delete a holiday
// @route   DELETE /api/holidays/:id
// @access  Private/Admin
exports.deleteHoliday = async (req, res, next) => {
    try {
        const { id } = req.params;
        
        const holiday = await Holiday.findById(id);
        if (!holiday) {
            throw new NotFoundError('Holiday not found');
        }

        await Holiday.delete(id);
        
        res.json({ message: 'Holiday removed' });
    } catch (error) {
        next(error);
    }
};
