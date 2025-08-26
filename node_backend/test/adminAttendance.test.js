const request = require('supertest');
const { getDB } = require('../src/config/db');
const app = require('../src/index');

const adminToken = 'your_admin_jwt_token_here';

beforeAll(async () => {
  // Initialize test data
  const db = getDB();
  
  // Create test users
  await db.run("INSERT INTO users (name, email, password, role) VALUES ('Admin User', 'admin@test.com', 'hashed_password', 'admin')");
  await db.run("INSERT INTO users (name, email, password, role) VALUES ('Test User', 'user@test.com', 'hashed_password', 'member')");
  
  // Create test attendance records
  const today = new Date().toISOString().split('T')[0];
  await db.run(`INSERT INTO attendance (user_id, date, status) VALUES (2, '${today}', 'present')`);
});

describe('Admin Attendance API', () => {
  // Test GET /api/admin/attendance
  it('should get all attendance records', async () => {
    const res = await request(app)
      .get('/api/admin/attendance')
      .set('Authorization', `Bearer ${adminToken}`);
    
    expect(res.statusCode).toEqual(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  // Test PATCH /api/admin/attendance/:attendanceId
  it('should update attendance status', async () => {
    const today = new Date().toISOString().split('T')[0];
    const res = await request(app)
      .patch(`/api/admin/attendance/1`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'half-day', notes: 'Left early' });
    
    expect(res.statusCode).toEqual(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toBe('half-day');
    expect(res.body.data.notes).toBe('Left early');
  });

  // Test GET /api/admin/attendance/stats
  it('should get attendance statistics', async () => {
    const res = await request(app)
      .get('/api/admin/attendance/stats')
      .set('Authorization', `Bearer ${adminToken}`);
    
    expect(res.statusCode).toEqual(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data[0]).toHaveProperty('presentDays');
    expect(res.body.data[0]).toHaveProperty('absentDays');
  });

  // Test POST /api/admin/attendance/bulk
  it('should bulk update attendance', async () => {
    const today = new Date().toISOString().split('T')[0];
    const res = await request(app)
      .post('/api/admin/attendance/bulk')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        date: today,
        updates: [
          { userId: 2, status: 'present' },
          { userId: 1, status: 'on-leave', notes: 'Sick leave' }
        ]
      });
    
    expect(res.statusCode).toEqual(200);
    expect(res.body.success).toBe(true);
    expect(res.body.results.length).toBe(2);
  });
});

afterAll(async () => {
  // Clean up test data
  const db = getDB();
  await db.run('DELETE FROM attendance');
  await db.run('DELETE FROM users');
  // Close the database connection
  await new Promise(resolve => db.close(resolve));
});
