const { Client, LocalAuth, RemoteAuth, MessageMedia } = require("whatsapp-web.js");
const { MongoStore } = require("wwebjs-mongo");
const mongoose = require("mongoose");
const qrcode = require("qrcode-terminal");
require("dotenv").config();

const Stellaris = MessageMedia.fromFilePath(`${__dirname}/source/img1.jpg`);

const url = "mongodb://localhost:27017/BotWhatsappWeb";
// Load the session data
mongoose
  .connect(url, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => {
    const store = new MongoStore({ mongoose: mongoose });
    //Conexion de la session whatsapp Remota
    /*const client = new Client({
      authStrategy: new RemoteAuth({
        store: store,
        backupSyncIntervalMs: 300000,
      }),
    });*/
    //Conexion de la session whatsapp Local
    const client = new Client({
      authStrategy: new LocalAuth()
  });
   

    client.on("qr", (qr) => {
      qrcode.generate(qr, { small: true });
    });

    client.on("ready", () => {
      console.log("Client is ready!");
    });

    client.on("remote_session_saved", () => {
      console.log("Session saved");
    });

    client.on("message", async (message) => {
      console.log(message);

      const targetRemote = message._data.id.remote;
      const collection = connection.collection("users");

      try {
        const existingUser = await collection.findOne({ idNumber: targetRemote });

        if (existingUser) {
          return client.sendMessage(
            message.from,
            "El usuario ya existe en la colección users."
          );
        } else {
          const newData = {
            idNumber: targetRemote,
            menu: {
              pago: "none",
              respuesta: "talvez",
            },
          };

          const result = await collection.insertOne(newData);
          console.log("Nuevo usuario insertado en la colección users:", result);

          const welcomeMessage = `Hola [Nombre del Usuario], ¡bienvenido al Bot del Consultorio Dental! 😁\nEstamos aquí para hacer tu experiencia más cómoda y conveniente. Puedes utilizar este bot para agendar, cancelar, posponer citas y realizar pagos de manera sencilla.\nSeleccione un numero de las opciones de menú:\n1. Agendar una cita.\n2. Cancelar una cita.\n3. Posponer una cita.\n4. Realizar un pago.\n5. Obtener información sobre nuestros servicios.`;

          return client.sendMessage(message.from,welcomeMessage);
        }
      } catch (error) {
        console.error("Error al interactuar con la base de datos:", error);
        return client.sendMessage(
          message.from,
          "Error al interactuar con la base de datos."
        );
      }

      if (message.hasMedia) {
        const media = await message.downloadMedia();
        console.log(media);
      }

      if (message.body === "cuerpo del mensaje") {
        return client.sendMessage(message.from, "Hola carnal");
      }

      if (message.body === "img") {
        return client.sendMessage(message.from, Stellaris);
      }

      return client.sendMessage(message.from, "Nose carnal\nNosecarnl\nComandos:\n1)..img");
    });

    client.initialize();
  });

const connection = mongoose.connection;

connection.once("open", () => {
  console.log("La Base de datos esta conectada exitosamente");
});

