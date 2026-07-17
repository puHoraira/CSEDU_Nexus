require('dotenv').config();
const mongoose = require('mongoose');
const Role = require('../src/models/Role');
const Permission = require('../src/models/Permission');

async function grantPermission() {
  try {
    console.log('Connecting to:', process.env.MONGODB_URI?.substring(0, 20) + '...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    const permission = await Permission.findOne({ key: 'governance.ecAppointment.create' });
    if (!permission) {
      console.error('Permission governance.ecAppointment.create not found!');
      await mongoose.connection.close();
      process.exit(1);
    }
    console.log('Found permission:', permission.key);

    const moderatorRole = await Role.findOne({ name: 'Moderator' });
    if (!moderatorRole) {
      console.error('Moderator role not found!');
      await mongoose.connection.close();
      process.exit(1);
    }
    console.log('Found Moderator role with', moderatorRole.permissions.length, 'permissions');

    if (!moderatorRole.permissions.includes(permission._id)) {
      moderatorRole.permissions.push(permission._id);
      await moderatorRole.save();
      console.log('✅ Added governance.ecAppointment.create permission to Moderator role');
    } else {
      console.log('✅ Moderator already has governance.ecAppointment.create permission');
    }

    await mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error('Error:', error.message);
    console.error('Stack:', error.stack);
    process.exit(1);
  }
}

grantPermission();
