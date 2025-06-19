const mongoose = require('mongoose');



const courseSchema =  mongoose.Schema({
    title:        { type: String, required: true },      // “Calculus I”
    code:         { type: String, required: true },
    profName:     { type: String, required: true },
    user:     { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    schedule: [{                                       // weekly template
        dayOfWeek:  { type: Number, min: 0, max: 6 },     // 0=Sunday…6=Saturday
        startTime:  { type: String },                     // “10:00” (24h “HH:mm”)
        endTime:    { type: String },  
        status:     { type: String, enum: ['scheduled', 'cancelled'], default: 'scheduled' },                   // “11:00”
      }]
    
})

module.exports = mongoose.model('Course', courseSchema);