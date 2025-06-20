const mongoose = require('mongoose');



const courseSchema =  mongoose.Schema({
    title:        { type: String, required: true },      
    profName:     { type: String, required: true },
    user:     { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    schedule: [{                                       
        dayOfWeek:  { type: Number, min: 0, max: 6 },     
        startTime:  { type: String },                   
        endTime:    { type: String },  
        status:     { type: String, enum: ['scheduled', 'cancelled'], default: 'scheduled' },                   
      }]
    
})

module.exports = mongoose.model('Course', courseSchema);