const  mongoose  = require('mongoose');
const debug = require('debug')('development:mongoose')
const config = require('config')


mongoose
.connect(`${config.get("MONGODB_URI")}/Attend_track`)
.then(()=>{
    debug('connected')
})        
.catch((err)=>{
    debug(err);
})    

module.exports = mongoose.connection;
