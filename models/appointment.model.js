const mongoose = require("mongoose");

const appointmentSchema = new mongoose.Schema({
    datehour: {
        type: Date,
        required: true,
    },
    usernumber: {
        type: String,
        required: true
    },
    departuretime: {
        type: Date,
        required: true,
    },
    departuretimeproximity: {
        type: Date,
        required: true,
    }
});

const dateSchema = new mongoose.Schema({
    dateday: {
        type: Date,
        required: true,
    },
    appointments: [appointmentSchema]
});

// Crea modelos a partir de los esquemas
const Appointment = mongoose.model('Appointment', appointmentSchema);
const DateModel = mongoose.model('DateModel', dateSchema);

module.exports = {
    Appointment,
    DateModel
};