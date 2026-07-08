const { Workshop } = require('../models/Workshop');
const { Event } = require('../models/Event');

class SchedulerService {
  /**
   * Auto-close workshop registrations when deadline passes
   */
  static async checkAndCloseWorkshopRegistrations() {
    try {
      const now = new Date();
      
      // Find workshops with passed registration deadline that are still open
      const result = await Workshop.updateMany(
        {
          registrationDeadline: { $lt: now },
          status: { $in: ['Published', 'Registration_Open'] },
        },
        {
          $set: { status: 'Registration_Closed' },
        }
      );

      if (result.modifiedCount > 0) {
        console.log(`✓ Auto-closed ${result.modifiedCount} workshop registration(s) due to deadline`);
      }

      return result.modifiedCount;
    } catch (error) {
      console.error('Error in checkAndCloseWorkshopRegistrations:', error);
      return 0;
    }
  }

  /**
   * Auto-close event registrations when closeDate passes
   */
  static async checkAndCloseEventRegistrations() {
    try {
      const now = new Date();
      
      // Find events with passed registration close date
      const events = await Event.find({
        'registrationSettings.closeDate': { $lt: now },
        registrationRequired: true,
      });

      let closedCount = 0;
      for (const event of events) {
        const registrationStatus = event.getRegistrationStatus();
        
        // Only close if currently open or in waitlist
        if (!['Closed', 'Full'].includes(registrationStatus)) {
          // Mark it as closed by setting a past closeDate (already done)
          // The getRegistrationStatus method will automatically return 'Closed'
          closedCount++;
        }
      }

      if (closedCount > 0) {
        console.log(`✓ Auto-closed ${closedCount} event registration(s) due to deadline`);
      }

      return closedCount;
    } catch (error) {
      console.error('Error in checkAndCloseEventRegistrations:', error);
      return 0;
    }
  }

  /**
   * Run all scheduled checks
   */
  static async runAllChecks() {
    console.log('🕐 Running scheduled checks...');
    await this.checkAndCloseWorkshopRegistrations();
    await this.checkAndCloseEventRegistrations();
  }

  /**
   * Start the scheduler (runs every hour)
   */
  static startScheduler() {
    // Run immediately on startup
    this.runAllChecks();

    // Then run every hour
    setInterval(() => {
      this.runAllChecks();
    }, 60 * 60 * 1000); // 1 hour

    console.log('✓ Scheduler started - will check registration deadlines every hour');
  }
}

module.exports = { SchedulerService };
