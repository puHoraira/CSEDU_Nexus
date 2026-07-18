const mongoose = require("mongoose");

const ecAppointmentSchema = new mongoose.Schema(
  {
    termId: { type: mongoose.Schema.Types.ObjectId, ref: "EcTerm", required: true },
    postId: { type: mongoose.Schema.Types.ObjectId, ref: "EcPost", required: true },
    memberId: { type: mongoose.Schema.Types.ObjectId, ref: "Member", required: true },
    startsOn: { type: Date, required: true },
    endsOn: { type: Date, default: null },
    source: {
      type: String,
      enum: ["Election", "VacancyFill", "Nomination"],
      default: "Election",
    },
  },
  { timestamps: true }
);

ecAppointmentSchema.index(
  { termId: 1, postId: 1 },
  {
    unique: true,
    partialFilterExpression: { endsOn: null },
  }
);

// Post-save middleware to update Member's ecExperience array
ecAppointmentSchema.post('save', async function(doc) {
  try {
    const { Member } = require('./Member');
    const { EcPost } = require('./EcPost');
    const { EcTerm } = require('./EcTerm');
    
    // Fetch the member
    const member = await Member.findById(doc.memberId);
    if (!member) {
      console.error(`Member ${doc.memberId} not found for EC appointment`);
      return;
    }

    // Fetch post details
    const post = await EcPost.findById(doc.postId);
    if (!post) {
      console.error(`Post ${doc.postId} not found for EC appointment`);
      return;
    }

    // Check if this appointment already exists in ecExperience
    const existingExp = member.ecExperience.find(exp => 
      exp.termId && exp.termId.toString() === doc.termId.toString() &&
      exp.postId && exp.postId.toString() === doc.postId.toString()
    );

    if (!existingExp) {
      // Add new EC experience entry
      member.ecExperience.push({
        termId: doc.termId,
        postId: doc.postId,
        postName: post.title,
        startDate: doc.startsOn,
        endDate: doc.endsOn,
        isCurrent: doc.endsOn === null || doc.endsOn === undefined,
        performanceRating: 'Not_Rated',
        achievements: [],
        responsibilities: [],
        eventsOrganized: 0,
        meetingsAttended: 0,
        totalMeetings: 0
      });

      await member.save();
      console.log(`Added EC experience for member ${member.studentId}: ${post.title}`);
    }
  } catch (error) {
    console.error('Error updating member ecExperience:', error);
  }
});

// Pre-update middleware to handle appointment end date changes
ecAppointmentSchema.pre('findOneAndUpdate', async function() {
  const update = this.getUpdate();
  
  // If endsOn is being set, mark the experience as ended
  if (update.endsOn || (update.$set && update.$set.endsOn)) {
    const appointmentId = this.getQuery()._id;
    const appointment = await this.model.findOne(this.getQuery());
    
    if (appointment) {
      const { Member } = require('./Member');
      const member = await Member.findById(appointment.memberId);
      
      if (member) {
        const exp = member.ecExperience.find(e => 
          e.termId && e.termId.toString() === appointment.termId.toString() &&
          e.postId && e.postId.toString() === appointment.postId.toString()
        );
        
        if (exp) {
          exp.endDate = update.endsOn || update.$set.endsOn;
          exp.isCurrent = false;
          await member.save();
          console.log(`Ended EC experience for member ${member.studentId}`);
        }
      }
    }
  }
});

const EcAppointment = mongoose.model("EcAppointment", ecAppointmentSchema);

module.exports = { EcAppointment };
