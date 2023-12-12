const mongoose = require("mongoose");

var connection;

async function connectToDatabase() {
    try {
        await mongoose.connect('mongodb://localhost:27017/BotWhatsappWeb', {
            useNewUrlParser: true,
            useUnifiedTopology: true,
        });
        console.log('Conexión a la base de datos establecida');
    } catch (error) {
        console.error('Error al conectar a la base de datos:', error);
    }
}

connection = mongoose.connection;

module.exports = {connectToDatabase,connection};