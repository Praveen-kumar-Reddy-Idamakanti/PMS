const { getDB, query, run } = require('../config/db');

class AdminSetting {
  /**
   * Create admin settings for a user
   * @param {Object} settings - The settings to create
   * @returns {Promise<Object>} The created settings
   */
  static async create(settings) {
    const { user_id, company_name, timezone, location_check_in, photo_check_in } = settings;
    const now = new Date().toISOString();
    
    const sql = `
      INSERT INTO admin_settings (
        user_id, company_name, timezone, location_check_in, photo_check_in, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `;
    
    const params = [
      user_id,
      company_name || 'My Company',
      timezone || 'UTC+00:00',
      location_check_in ? 1 : 0,
      photo_check_in ? 1 : 0,
      now,
      now
    ];
    
    const result = await run(sql, params);
    return this.getById(result.lastID);
  }

  /**
   * Get settings by ID
   * @param {number} id - The settings ID
   * @returns {Promise<Object|null>} The settings or null if not found
   */
  static async getById(id) {
    const sql = 'SELECT * FROM admin_settings WHERE id = ?';
    const rows = await query(sql, [id]);
    return rows[0] || null;
  }

  /**
   * Get settings by user ID
   * @param {number} userId - The user ID
   * @returns {Promise<Object|null>} The settings or null if not found
   */
  static async getByUserId(userId) {
    const sql = 'SELECT * FROM admin_settings WHERE user_id = ?';
    const rows = await query(sql, [userId]);
    return rows[0] || null;
  }

  /**
   * Update settings
   * @param {number} id - The settings ID
   * @param {Object} updates - The fields to update
   * @returns {Promise<Object>} The updated settings
   */
  static async update(id, updates) {
    const allowedFields = ['company_name', 'timezone', 'location_check_in', 'photo_check_in'];
    const validUpdates = Object.entries(updates)
      .filter(([key]) => allowedFields.includes(key))
      .reduce((obj, [key, value]) => {
        obj[key] = value;
        return obj;
      }, {});

    if (Object.keys(validUpdates).length === 0) {
      return this.getById(id);
    }

    const setClause = Object.keys(validUpdates)
      .map(key => `${key} = ?`)
      .join(', ');
    
    const params = [...Object.values(validUpdates), id];
    const sql = `
      UPDATE admin_settings 
      SET ${setClause}, updated_at = ? 
      WHERE id = ?
    `;
    
    params.splice(-1, 0, new Date().toISOString());
    
    await run(sql, params);
    return this.getById(id);
  }

  /**
   * Get or create settings for a user
   * @param {number} userId - The user ID
   * @returns {Promise<Object>} The settings
   */
  static async getOrCreate(userId) {
    let settings = await this.getByUserId(userId);
    
    if (!settings) {
      settings = await this.create({
        user_id: userId,
        company_name: 'My Company',
        timezone: 'UTC+00:00',
        photo_check_in: false
      });
    }
    
    return settings;
  }
}

module.exports = AdminSetting;
