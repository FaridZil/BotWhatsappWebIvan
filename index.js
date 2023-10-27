const { Client, LocalAuth, RemoteAuth, MessageMedia } = require("whatsapp-web.js");
const { MongoStore } = require("wwebjs-mongo");
const mongoose = require("mongoose");
const qrcode = require("qrcode-terminal");
const qr = require('qrcode');
const fetch = require("node-fetch");
var QRCode = require('qrcode');
const fs = require('fs');
const path = require('path');
const { createCanvas, Image } = require('canvas');

require("dotenv").config();

const Stellaris = MessageMedia.fromFilePath(`${__dirname}/source/img1.jpg`);

//Messgesss
const welcomeMessage = `Hola [Nombre del Usuario], ¡bienvenido al Bot del Consultorio Dental! 😁\nEstamos aquí para hacer tu experiencia más cómoda y conveniente. Puedes utilizar este bot para agendar, cancelar, posponer citas y realizar pagos de manera sencilla.\nSeleccione un numero de las opciones de menú:\n1. Agendar una cita.\n2. Cancelar una cita.\n3. Posponer una cita.\n4. Realizar un pago.\n5. Obtener información sobre nuestros servicios.`;

const welcomeMessageAdmin = 'Hola Ivan\nEligi una opcion\nSeleccione un numero de las opciones de menú:\n1. Solicitar pago.\n2. Cancelar una cita.';

const agendarCita = 'Cita agendada para el 25/11/2023 alas 3:20PM'

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

      const targetRemote = message._data.id.remote;
      const collection = connection.collection("users");

      try {
        const existingUser = await collection.findOne({ idNumber: targetRemote });
        if(existingUser){
          if(existingUser.idNumber === "5212811027657@c.us"){
            const menuResponse = existingUser.menu.response;

            if (menuResponse === '0') {
              if (message.body === "1") {
                await collection.updateOne(
                  { idNumber: targetRemote },
                  {
                    $set: {
                      'menu.response': '01',
                    }
                  }
                );
                return client.sendMessage(message.from,"Perfecto, ingrese el numero:");
              }
            }else if(menuResponse === '01'){
              await collection.updateOne(
                { idNumber: targetRemote },
                {
                  $set: {
                    'menu.response': '011',
                    'numberSell': message.body,
                  }
                }
              );
              return client.sendMessage(message.from,"Ingrese el url de pago:");
            }else if(menuResponse === "011"){
              await collection.updateOne(
                { idNumber: targetRemote },
                {
                  $set: {
                    'menu.response': '0111',
                    'urlSell': message.body,
                  }
                }
              );
              return client.sendMessage(message.from,"verifica tos datos:\n" + existingUser.numberSell + "\n" + message.body + "\n1. Enviar Pago\n2. Corregir Datos");
            }else if(menuResponse === "0111"){
              if(message.body === "1"){
                const qrText = existingUser.urlSell;
                
                QRCode.toDataURL(qrText, function(error,url){
                  if(error){
                    return;
                  }
                  const buffer = Buffer.from(url.split(',')[1], 'base64');
                  // Ruta para el archivo temporal
                  const tempFilePath = path.join(__dirname, existingUser.idNumber+ ".png");
                  // Guarda el búfer en un archivo temporal
                  fs.writeFileSync(tempFilePath, buffer);

                  // Crea un objeto MessageMedia a partir del archivo temporal
                  const media = MessageMedia.fromFilePath(tempFilePath);
                  client.sendMessage(message.from, media); 
                  client.sendMessage('521' + existingUser.numberSell + '@c.us',media);
                  fs.unlinkSync(tempFilePath);
                });
                await client.sendMessage('5215614317096@c.us','Hola, este es un mensaje de prueba desde mi bot de WhatsApp.');
                await collection.updateOne(
                  { idNumber: targetRemote },
                  {
                    $set: {
                      'menu.response': '0',
                    }
                  }
                );
                return;
              }else if(message.body === "2"){
                return;
              }else{
                return client.sendMessage(message.from, "verifica los datos:\n" + existingUser.numberSell + "\n" + existingUser.urlSell + "\n1. Enviar Pago\n2. Corregir Datos");
              }
            }
            return client.sendMessage(message.from,welcomeMessageAdmin);
          }
          
        }

        if (existingUser) {

          const menuResponse = existingUser.menu.response;

          if (menuResponse === '0') {
            if (message.body === "1") {

              await collection.updateOne(
                { idNumber: targetRemote },
                {
                  $set: {
                    'menu.response': '01',
                    'cita': "25/11/2023-15:00"
                  }
                }
              );
              return client.sendMessage(message.from, agendarCita);
            } else if (message.body === "2") {
              // Aquí se eliminará la cita
              const userQuery = { idNumber: targetRemote };
              const update = {
                $unset: { 'cita': 1 }
              };

              const result = await collection.updateOne(userQuery, update);

              if (result.modifiedCount > 0) {
                return client.sendMessage(message.from, "Cita eliminada correctamente.");
              } else {
                return client.sendMessage(message.from, "No se encontró una cita para eliminar.");
              }
            } else if (message.body === "3"){

            } else if (message.body === "4"){
              if(existingUser.menu.pago === "none"){
                return client.sendMessage(message.from, "No tiene nigun pago programado");
              }
            } else if (message.body === "5"){

            }
            return client.sendMessage(message.from, welcomeMessage);
          } else if (menuResponse === '01') {
            if (message.body === "0") {
              existingUser.menu.response = '01';
              await collection.updateOne({ idNumber: targetRemote }, { $set: { 'menu.response': '0' } });
              return client.sendMessage(message.from, welcomeMessage);
            }
            return client.sendMessage(message.from, "Su cita a cido agendada, para regresar al menu anterior ingrese: '0'");
          }

          return client.sendMessage(
            message.from,
            "El usuario ya existe en la colección users."
          );
        } else {
          const newData = {
            idNumber: targetRemote,
            menu: {
              response: '0',
            },
          };

          const result = await collection.insertOne(newData);
          console.log("Nuevo usuario insertado en la colección users:", result);

          return client.sendMessage(message.from, welcomeMessage);
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

