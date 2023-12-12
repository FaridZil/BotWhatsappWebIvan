const bcrypt = require('bcrypt');

// Supongamos que estos son los valores proporcionados por el usuario en el frontend
const usernameFromUser = 'faridzil';
const passwordFromUser = '666666';

// Aquí simulo la recuperación de las credenciales almacenadas en la base de datos
const usernameFromDatabase = 'faridzil';
const hashedPasswordFromDatabase = '$2a$10$dJf1pG6.DusWx7j3EZwZyORO72ut2mmBtPOrpKijQEOE0cEjcNAyO'; // Contraseña encriptada

// Verificar si el nombre de usuario coincide
if (usernameFromUser === usernameFromDatabase) {
    // Verificar si la contraseña proporcionada coincide con la contraseña encriptada en la base de datos
    bcrypt.compare(passwordFromUser, hashedPasswordFromDatabase, (err, result) => {
        if (result) {
            console.log('Las credenciales son correctas. El usuario puede iniciar sesión.');
            // Aquí iniciarías sesión en tu aplicación.
        } else {
            console.log('Contraseña incorrecta. El usuario no puede iniciar sesión.');
        }
    });
} else {
    console.log('El nombre de usuario no coincide. El usuario no puede iniciar sesión.');
}
