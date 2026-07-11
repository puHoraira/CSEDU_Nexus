const { Workshop } = require('../models/Workshop');
const { Event } = require('../models/Event');
const { ElectionAutomationService } = require('./ElectionAutomationService');
const { NotificationTargetingService } = require('./NotificationTargetingService');

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
    await this.checkElectionTransitions();
    await this.dispatchScheduledNotifications();
  }

  /**
   * Deliver due scheduled notifications and expire stale ones.
   */
  static async dispatchScheduledNotifications() {
    try {
      const sent = await NotificationTargetingService.sendScheduledNotifications();
      const expired = await NotificationTargetingService.expireOldNotifications();
      if (sent.sentCount > 0) console.log(`✓ Delivered ${sent.sentCount} scheduled notification(s)`);
      if (expired.expiredCount > 0) console.log(`✓ Expired ${expired.expiredCount} old notification(s)`);
      return { sent: sent.sentCount, expired: expired.expiredCount };
    } catch (error) {
      console.error('Error in dispatchScheduledNotifications:', error);
      return { sent: 0, expired: 0 };
    }
  }

  /**
   * Auto-advance elections whose voting window has ended (tally + close phase).
   */
  static async checkElectionTransitions() {
    try {
      return await ElectionAutomationService.runAutomationCheck();
    } catch (error) {
      console.error('Error in checkElectionTransitions:', error);
      return 0;
    }
  }

  /**
   * Start the scheduler (runs every hour)
   */
  static startScheduler() {
    // Run immediately on startup
    this.runAllChecks();

    // Heavier checks (registrations, election transitions) every hour
    setInterval(() => {
      this.runAllChecks();
    }, 60 * 60 * 1000); // 1 hour

    // Lightweight scheduled-notification dispatch every minute so timed
    // notifications fire close to their scheduledFor time.
    setInterval(() => {
      this.dispatchScheduledNotifications();
    }, 60 * 1000); // 1 minute

    console.log('✓ Scheduler started - hourly deadline checks + per-minute notification dispatch');
  }
}

module.exports = { SchedulerService };
