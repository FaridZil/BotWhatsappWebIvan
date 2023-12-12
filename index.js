const mongoose = require("mongoose");
const qrcode = require("qrcode-terminal");
const qr = require("qrcode");
const fetch = require("node-fetch");
var QRCode = require("qrcode");
const fs = require("fs");
const path = require("path");
const { Client, LocalAuth, MessageMedia } = require("whatsapp-web.js");

const { connectToDatabase, connection } = require("./db.js");
const { error } = require("console");

//////////
//Inicio
//////////

connectToDatabase()
  .then(() => {
    const client = new Client({
      authStrategy: new LocalAuth(),
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

    client.initialize();

    client.on("message", async (message) => {
      const collectionUser = connection.collection("users");

      try {
        const existingUser = await collectionUser.findOne({
          idNumber: message.from,
        });

        if (existingUser) {
          const menuResponse = existingUser.menu.response;
          if (existingUser.idNumber === "5212811XX027657@c.us") {
            adminMessage(message, client);
          } else {
            clientMessage(message, client);
          }
        } else {
          const newData = {
            idNumber: message.from,
            menu: {
              response: "0",
            },
          };
          await collectionUser.insertOne(newData);
          clientMessage(message, client);
        }

        return;
      } catch (error) {
        console.error("Error al interactuar con la base de datos:", error);
      }
    });
  })
  .catch((error) => {
    console.error("Error al conectar a la base de datos:", error);
  });

function timeDiff(fechaA, fechaB) {
  const aux = fechaB - fechaA;
  const resultado = aux / (1000 * 60 * 60);
  return resultado;
}

async function sendSell(client, message) {
  const collectionUser = connection.collection("users");
  const collectionPago = connection.collection("pagos");
  var existingUser = await collectionUser.findOne({ idNumber: message.from });
  const qrText = existingUser.urlSell;
  const fechaAux = new Date();

  QRCode.toDataURL(qrText, function (error, url) {
    if (error) {
      client.sendMessage("5212811027657@c.us", error);
      return;
    }
    const buffer = Buffer.from(url.split(",")[1], "base64");
    const ticketsFolderPath = path.join(__dirname, "source", "tickets");
    if (!fs.existsSync(ticketsFolderPath)) {
      fs.mkdirSync(ticketsFolderPath, { recursive: true });
    }
    const tempFilePath = path.join(
      ticketsFolderPath,
      "521" +
        existingUser.numberSell +
        "@c.us" +
        fechaAux.toISOString() +
        ".png"
    );
    // Guarda el búfer en un archivo temporal
    fs.writeFileSync(tempFilePath, buffer);
    // Crea un objeto MessageMedia a partir del archivo temporal
    const media = MessageMedia.fromFilePath(tempFilePath);
    client.sendMessage(message.from, media);
    client.sendMessage(
      "521" + existingUser.numberSell + "@c.us",
      "Buenos dias, adjunto su enlace de pago:\n"
    );
    client.sendMessage("521" + existingUser.numberSell + "@c.us", media);
  });

  var existePagoUser = await collectionPago.findOne({ idNumber: message.from });

  var ticketImput = {
    dateenty: fechaAux,
    datefull: "none",
    status: false,
    title: existingUser.title,
    price: existingUser.price,
  };

  if (existePagoUser) {
    existePagoUser.tickets.push(ticketImput);
  } else {
    var pagoImput = {
      idNumber: message.from,
      tickets: [],
    };

    pagoImput.tickets.push(ticketImput);

    await collectionPago.insertOne(pagoImput);
  }

  await collectionUser.updateOne(
    { idNumber: message.from },
    {
      $set: {
        "menu.response": "0",
        title: "none",
        urlSell: "none",
        numberSell: "none",
        price: "none",
      },
    }
  );
}

async function adminMessage(message, client) {
  const collectionUser = connection.collection("users");
  const collectionPago = connection.collection("pagos");
  const existingUser = await collectionUser.findOne({ idNumber: message.from });
  const regexNumber = /^\d{10}$/;
  const regexDate = /^\d{2}\/\d{2}\/\d{4}$/;
  const regexTime = /^(?:[01]\d|2[0-3]):[0-5]\d$/;
  const regexTimeRange =
    /^(?:[01]\d|2[0-3]):[0-5]\d-(?:[01]\d|2[0-3]):[0-5]\d$/;
  switch (existingUser.menu.response) {
    case "0":
      switch (message.body) {
        case "1":
          await collectionUser.updateOne(
            { idNumber: message.from },
            {
              $set: {
                "menu.response": "01",
              },
            }
          );
          client.sendMessage(message.from, "Perfecto, ingrese el numero:");
          break;
        case "2":
          await collectionUser.updateOne(
            { idNumber: message.from },
            {
              $set: {
                "menu.response": "02",
              },
            }
          );
          client.sendMessage(message.from, messageAdmin02);
          break;

        case "3":
          break;
        case "4":
          await collectionUser.updateOne(
            { idNumber: message.from },
            {
              $set: {
                "menu.response": "04",
              },
            }
          );
          client.sendMessage(
            message.from,
            "Ingrese el dia de la siguiente manera:\n\n" +
              "DIA/MES/AÑO\n" +
              "01/12/2023"
          );
          break;
        default:
          client.sendMessage(message.from, welcomeMessageAdmin);
      }
      break;
    case "01":
      if (regexNumber.test(message.body)) {
        await collectionUser.updateOne(
          { idNumber: message.from },
          {
            $set: {
              "menu.response": "011",
              numberSell: message.body,
            },
          }
        );
        client.sendMessage(message.from, "Ingrese el url de pago:");
      } else {
        client.sendMessage(
          message.from,
          "Verifique que sean 10 dígitos y solo numeros\n"
        );
        client.sendMessage(message.from, "ingrese el numero:");
      }

      break;
    case "011":
      await collectionUser.updateOne(
        { idNumber: message.from },
        {
          $set: {
            "menu.response": "0111",
            urlSell: message.body,
          },
        }
      );
      client.sendMessage(message.from, "Ingrese el titulo: ");
      break;
    case "0111":
      await collectionUser.updateOne(
        { idNumber: message.from },
        {
          $set: {
            "menu.response": "01111",
            title: message.body,
          },
        }
      );
      client.sendMessage(message.from, "Ingrese el precio:");
      break;
    case "01111":
      if (/^\d+(\.\d+)?$/.test(message.body) || /^\d+$/.test(message.body)) {
        await collectionUser.updateOne(
          { idNumber: message.from },
          {
            $set: {
              "menu.response": "011111",
              price: message.body,
            },
          }
        );

        const updateUser = await collectionUser.findOne({
          idNumber: message.from,
        });

        client.sendMessage(
          message.from,
          "verifica tos datos:\n" +
            "Titulo: " +
            updateUser.title +
            "\n" +
            "Numero: " +
            updateUser.numberSell +
            "\n" +
            "Enlace: " +
            updateUser.urlSell +
            "\n" +
            "Precio: " +
            updateUser.price +
            "\n" +
            "1. Enviar Pago\n" +
            "2. Corregir Datos\n" +
            "3. Cancelar y regresar al menu principal"
        );
      } else {
        client.sendMessage(
          message.from,
          "Verifique que este ingresando solo numeros: ejemplo =  745.50 o 800 "
        );
        client.sendMessage(message.from, "Ingrese el precio");
      }
      break;
    case "011111":
      switch (message.body) {
        case "1":
          //Aqui cuando el administrador manda el pago
          sendSell(client, message);
          break;
        case "2":
          //Aqui cuando el administrador quiera volver
          //a escribir todos los datos para mandar el pago
          await collectionUser.updateOne(
            { idNumber: message.from },
            {
              $set: {
                "menu.response": "01",
                title: "none",
                urlSell: "none",
                numberSell: "none",
                price: "none",
              },
            }
          );
          client.sendMessage(message.from, "Ingrese el numero:");
          break;
        case "3":
          //Aqui cuando el administrador quiera cancelar el envio de pago y regresar al menu principal
          await collectionUser.updateOne(
            { idNumber: message.from },
            {
              $set: {
                "menu.response": "0",
                title: "none",
                urlSell: "none",
                numberSell: "none",
                price: "none",
              },
            }
          );
          client.sendMessage(message.from, welcomeMessageAdmin);
          break;
        default:
          client.sendMessage(
            message.from,
            "verifica tos datos:\n" +
              "Titulo: " +
              existingUser.title +
              "\n" +
              "Numero: " +
              existingUser.numberSell +
              "\n" +
              "Enlace: " +
              existingUser.urlSell +
              "\n" +
              "Precio: " +
              existingUser.price +
              "\n" +
              "1. Enviar Pago\n" +
              "2. Corregir Datos\n" +
              "3. Cancelar y regresar al menu principal"
          );
          break;
      }
      break;
    case "02":
      switch (message.body) {
        case "1":
          await collectionUser.updateOne(
            { idNumber: message.from },
            {
              $set: {
                "menu.response": "021",
              },
            }
          );
          client.sendMessage(message.from, "Ingrese el numero del cliente:");
          break;
        case "2":
          break;
        case "3":
          await collectionUser.updateOne(
            { idNumber: message.from },
            {
              $set: {
                "menu.response": "0",
              },
            }
          );
          client.sendMessage(message.from, welcomeMessageAdmin);
          break;
        default:
          client.sendMessage(message.from, messageAdmin02);
          break;
      }
      break;
    case "021":
      if (regexNumber.test(message.body)) {
        const ticketOutput = await collectionPago.findOne({
          idNumber: message.from,
        });
        if (ticketOutput) {
          client.sendMessage(
            message.from,
            "Datos del ticket\n" +
              "Numero: " +
              ticketOutput.idNumber +
              "\n" +
              "Fecha: " +
              ticketOutput.tickets[ticketOutput.tickets.length - 1].dateenty +
              "\n" +
              "Titulo: " +
              ticketOutput.tickets[ticketOutput.tickets.length - 1].title +
              "\n" +
              "Precio: " +
              ticketOutput.tickets[ticketOutput.tickets.length - 1].price
          );
          const arrayArchivos = buscarArchivosPorNumero(ticketOutput.idNumber);
          console.log(arrayArchivos);
          if (arrayArchivos.length > 0) {
            const media = MessageMedia.fromFilePath(arrayArchivos[0]);
            client.sendMessage(message.from, media);
            client.sendMessage(
              message.from,
              "Elija una opcion\n\n" +
                "1._Confirmar pago\n" +
                "2._Pago incorrecto\n"
            );
            await collectionUser.updateOne(
              { idNumber: message.from },
              {
                $set: {
                  "menu.response": "0211",
                  numberTicket: "521" + message.body + "@c.us",
                },
              }
            );
          }
        } else {
          client.sendMessage(message.from, "ticket no encontrado");
        }
      } else {
        client.sendMessage(
          message.from,
          "Numero no valido\nVerifique que el numero contenga solo 10 digitos\n\n" +
            "Vuelva a ingresar el numero:"
        );
      }

      break;
    case "0211":
      console.log(message.body);
      switch (message.body) {
        case "1":
          const auxVar = await collectionPago.findOne({
            idNumber: existingUser.numberTicket,
          });
          const ticketLength = auxVar.tickets.length;

          const updateQuery = {
            $set: {
              [`tickets.${ticketLength - 1}.status`]: true,
              [`tickets.${ticketLength - 1}.datefull`]: new Date(),
              activation: false,
            },
          };

          await collectionPago.updateOne(
            { idNumber: existingUser.numberTicket },
            updateQuery
          );
          client.sendMessage(message.from, "Pago confirmado");

          await collectionUser.updateOne(
            { idNumber: message.from },
            { $set: { "menu.response": "0" } }
          );

          mostrarCitasDisponibles(existingUser.numberTicket, client);
          break;
        case "2":
          await collectionUser.updateOne(
            { idNumber: message.from },
            { $set: { "menu.response": "0" } }
          );
          client.sendMessage(message.from, welcomeMessageAdmin);
          break;
        default:
      }
      break;
    case "04":
      if (regexDate.test(message.body)) {
        var partesFecha = message.body.split("/");
        var fechaAux = new Date(
          partesFecha[2],
          partesFecha[1] - 1,
          partesFecha[0],
          0,
          0,
          0,
          0
        );
        var arrayVacio = [];
        await collectionUser.updateOne(
          { idNumber: message.from },
          {
            $set: {
              "menu.response": "041",
              datecitation: fechaAux,
              hourcitation: arrayVacio,
            },
          }
        );

        client.sendMessage(
          message.from,
          "Ingrese el horario disponible con este formato: 14:20-15:16"
        );
      } else {
        client.sendMessage(message.from, "Formato no valido");
        client.sendMessage(
          message.from,
          "Ingrese el dia de la siguiente manera:\n\n" +
            "DIA/MES/AÑO\n" +
            "01/12/2023"
        );
      }
      break;
    case "041":
      if (regexTimeRange.test(message.body)) {
        subirCitaHoraUsuario(message, client);
      } else if (message.body === "1") {
        subirDiaCreado(message);
      } else if (message.body === "2") {
        await collectionUser.updateOne(
          { idNumber: message.from },
          {
            $set: {
              "menu.response": "0",
              hourcitation: [],
              datecitation: new Date(0, 0, 0, 0, 0, 0, 0),
            },
          }
        );
        client.sendMessage(message.from, welcomeMessageAdmin);
      } else {
        client.sendMessage(message.from, "Formato no valido");
        client.sendMessage(
          message.from,
          "Ingrese el horario disponible con este formato: 14:20-15:16"
        );
      }
      break;
    default:
  }

  return;
}

async function clientMessage(message, client) {
  const collectionPago = connection.collection("pagos");
  const collectionDiary = connection.collection("diary");
  const collectionUser = connection.collection("users");
  const existingPagoUser = await collectionPago.findOne({
    idNumber: message.from,
  });
  const existingUser = await collectionUser.findOne({ idNumber: message.from });
  switch (existingUser.menu.response) {
    case "0":
      switch (message.body) {
        //Aqui se agenda
        case "1":
          if (existingPagoUser) {
            console.log(JSON.stringify(existingPagoUser, null, 2));
            if (
              existingPagoUser.tickets[existingPagoUser.tickets.length - 1]
                .status &&
              !existingPagoUser.tickets[existingPagoUser.tickets.length - 1]
                .activation
            ) {
              mostrarCitasDisponibles(message.from, client);
            } else {
              client.sendMessage(
                message.from,
                "Aun no se a comprobado el pago\nEspere un momento en breve se le proporsionara una lista de horarios disponibles"
              );
            }
          } else {
            client.sendMessage(
              message.from,
              "Para poder agendar una cita nesesita apartar con x\n"
            );
            client.sendMessage(message.from, imagenData);
            client.sendMessage(message.from, welcomeMessage);
          }
          break;
        case "4":
          client.sendMessage(
            message.from,
            "Por supuesto, solo necesitas enviar una captura del comprobante de pago, exclusivamente en formato de imagen."
          );
          await collectionUser.updateOne(
            { idNumber: message.from },
            {
              $set: {
                "menu.response": "04",
              },
            }
          );
          break;
        default:
          client.sendMessage(message.from, welcomeMessage);
      }
      break;
    case "01":
      var citapropuestaAux = existingUser.citapropuesta;
      var opciones = 0;
      var opcionesDia = [];
      var auxOpciones = 0;
      for (x = 0; x < citapropuestaAux.length; x++) {
        for (y = 0; y < citapropuestaAux[x].appointments.length; y++) {
          opciones++;
          auxOpciones++;
        }
        opcionesDia.push(auxOpciones);
        auxOpciones = 0;
      }
      if (/^[0-9]+$/.test(message.body)) {
        if (parseInt(message.body) > 0 && parseInt(message.body) <= opciones) {
          var direccion = encontrarPosicionYDireccion(
            parseInt(message.body),
            opcionesDia
          );
          console.log(
            JSON.stringify(
              citapropuestaAux[direccion[0]].appointments[direccion[1]],
              null,
              2
            )
          );
          console.log(JSON.stringify(citapropuestaAux[direccion[0]], null, 2));
          var diaDiary = await collectionDiary.findOne({
            dateday: citapropuestaAux[direccion[0]].dateday,
          });
          console.log(JSON.stringify(diaDiary, null, 2));
          if (
            diaDiary &&
            diaDiary.appointments[direccion[1]].status === false &&
            diaDiary.appointments[direccion[1]].idNumber === "none"
          ) {
            await collectionDiary.updateOne(
              { dateday: diaDiary.dateday },
              {
                $set: {
                  [`appointments.${direccion[1]}.status`]: true,
                  [`appointments.${direccion[1]}.idNumber`]: message.from,
                },
              }
            );
            var auxTicketUser = await collectionPago.findOne({
              idNumber: message.from,
            });
            await collectionPago.updateOne(
              { idNumber: message.from },
              {
                $set: {
                  [`tickets.${
                    auxTicketUser.tickets.length - 1
                  }.activation`]: true,
                },
              }
            );
            await collectionUser.updateOne(
              { idNumber: message.from },
              { $set: { "menu.response": "0" } }
            );
            client.sendMessage(
              message.from,
              `Su cita está programada para el día ${diaDiary.dateday.toDateString()}\n alas hora ${
                diaDiary.appointments[direccion[1]].date1hour
              }`
            );
            client.sendMessage(message.from,welcomeMessage);
          }
        } else {
          client.sendMessage(message.from, "Numero no valido");
          mostrarCitasDisponibles(message.from, client);
        }
      } else {
        client.sendMessage(message.from, "entrada no valida");
        mostrarCitasDisponibles(message.from, client);
      }
      break;
    case "04":
      if (message.hasMedia && message.type === "image") {
        const fechaAux = new Date();

        message
          .downloadMedia()
          .then(async (mediaData) => {
            
            const folderPath = path.join(__dirname, "source", "comprobantex");
            const tempFilePath = path.join(
              folderPath,
              message.from + fechaAux.toISOString() + ".png"
            );
            fs.writeFileSync(tempFilePath, mediaData.data, "base64");
            await collectionUser.updateOne(
              { idNumber: message.from },
              {
                $set: {
                  "menu.response": "0",
                },
              }
            );
            if(existingPagoUser){

            }else{

              var ticketImput = {
                dateenty: fechaAux,
                datefull: "none",
                status: false,
                title: "Cita",
                price: "200",
                activation: false
              };

              var pagoImput = {
                idNumber: message.from,
                tickets: [],
              };
          
              pagoImput.tickets.push(ticketImput);
          
              await collectionPago.insertOne(pagoImput);
            }
            client.sendMessage(
              message.from,
              "Perfecto en breve le mandaremos una lista de los espacios disponibles para su cita"
            );
          })
          .catch((error) => {
            console.log(error);
          });
      } else {
        client.sendMessage(
          message.from,
          "Porfavor Ingrese una imagen del comprobante de pago"
        );
      }
      break;
    default:
  }
  return;
}

async function buscarTicketsPendientes(message) {
  const collectionPago = await connection.collection("pagos");
  const clientPago = collectionPago.findOne({ idNumber: message.body });

  if (clientPago) {
  }
}

function buscarArchivosPorNumero(numero) {
  var arrayResultados = [];
  const folderPath = path.join(__dirname, "source", "comprobantex");

  // Leer los archivos en la carpeta
  const archivos = fs.readdirSync(folderPath);

  // Filtrar los archivos que comiencen con el número solicitado
  archivos.forEach((nombreArchivo) => {
    // Verificar si el nombre del archivo comienza con el número
    if (nombreArchivo.startsWith(numero)) {
      // Agregar el nombre completo del archivo al array de resultados
      arrayResultados.push(path.join(folderPath, nombreArchivo));
    }
  });

  return arrayResultados;
}

async function subirDiasDisponibles(dia, horas, collectionDiary) {
  var fechaAux = new Date(2023, 10, dia, 0, 0, 0, 0);
  console.log("\nVisteeeee: " + fechaAux + "\n");
  var diaExiste = await collectionDiary.findOne({
    dateday: fechaAux,
  });
  if (diaExiste) {
    console.log("Existe");
  } else {
    var diaAIngresar = {
      dateday: fechaAux,
      appointments: [],
    };

    for (x = 0; x < horas.datehour.length; x++) {
      var appointmentAux = {
        datehour: horas.datehour[x],
        idNumber: 0,
      };
      diaAIngresar.appointments.push(appointmentAux);
    }

    await collectionDiary.insertOne(diaAIngresar);
  }
}

async function buscarCitasDisponibles(collectionDiary) {
  var x = 0,
    aux = 0;
  var diasDisponibles = [];
  var fechaActual = new Date();
  fechaActual.setHours(0, 0, 0, 0);
  var auxDia = fechaActual.getDate();

  var fechasDisponibles = {
    diasDisponibles: [],
    horasDisponibles: [],
  };

  while (x <= 3) {
    fechaActual.setDate(auxDia + aux);
    aux++;
    const diaryExist = await collectionDiary.findOne({
      dateday: fechaActual,
    });
    if (diaryExist) {
      fechasDisponibles.diasDisponibles.push(diaryExist.dateday.getDate());
      for (y = 0; y < diaryExist.appointments.length; y++) {
        fechasDisponibles.horasDisponibles.push(
          diaryExist.appointments[y].datehour
        );
      }
    } else {
      x++;
    }
  }
  return fechasDisponibles;
}

async function setDayAppointments(appointmentsList, dayTime, collectionDiary) {
  dateActuality = new Date();
  dateActuality.setHours(0, 0, 0, 0);
  //console.log("\n65 64 " + appointmentsList[0].datehour + "\n");
  const dayJobs = {
    dateday: dayTime,
    appointments: [],
  };

  console.log("\ndateActuality:" + dateActuality.getDate() + "\n");
  console.log("\ndayTime:" + dayTime.getDate() + "\n");
  console.log("\n" + (dateActuality.getDate() === dayTime.getDate()) + "\n");
  console.log("\n" + (dateActuality.getDate() <= dayTime.getDate()) + "\n");

  if (
    dateActuality.getDate() === dayTime.getDate() ||
    dateActuality.getDate() <= dayTime.getDate()
  ) {
    for (x = 0; x < appointmentsList.length; x++) {
      var citaAux = {
        datehour: appointmentsList[x].datehour,
        status: appointmentsList[x].status,
      };
      console.log("\n" + citaAux + "\n");
      dayJobs.appointments.push(citaAux);
    }
    await collectionDiary.insertOne(dayJobs);
  }
}

async function subirCitaHoraUsuario(message, client) {
  const collectionUser = connection.collection("users");
  var user = await collectionUser.findOne({ idNumber: message.from });
  var horas = user.hourcitation;
  const [startTime, endTime] = message.body.split("-");
  var citaHora = {
    date1hour: startTime,
    date2hour: endTime,
    status: false,
    idNumber: "none",
  };
  horas.push(citaHora);
  if (true) {
    (async () => {
      await collectionUser.updateOne(
        { idNumber: message.from },
        { $set: { hourcitation: horas } }
      );
    })();

    (async () => {
      await verHorasDeCitasUser(message, client);
    })();

    client.sendMessage(
      message.from,
      "Puede elejir una opcion\n\n" + "1.Terminar\n" + "2.Cancelar\n"
    );
    client.sendMessage(
      message.from,
      "o bien puede ingresar otro espacio de cita con el mismo formato"
    );
  } else {
    client.sendMessage(
      message.from,
      "La hora que ingresaste se solapa con otra verifica que no lo haga y vuelve a introducir una valida"
    );
    verHorasDeCitasUser(message, client);
  }
}

async function verHorasDeCitasUser(message, client) {
  const collectionUser = connection.collection("users");
  const user = await collectionUser.findOne({ idNumber: message.from });

  let resultado = "";

  for (let i = 0; i < user.hourcitation.length; i++) {
    const cita = user.hourcitation[i];
    resultado += `cita ${i + 1} ${cita.date1hour} a ${cita.date2hour}`;
    if (i < user.hourcitation.length - 1) {
      resultado += "\n"; // Agregar salto de línea excepto para la última cita
    }
  }
  client.sendMessage(message.from, resultado);
}

async function citasSeSolapan(number, body) {
  const collectionUser = connection.collection("users");
  var user = await collectionUser.findOne({ idNumber: number });
  var hourcitation2 = user.hourcitation;

  const [horaInicio, horaFin] = body.split("-");
  const auxCita = {
    date1hour: horaInicio,
    date2hour: horaFin,
  };

  hourcitation2.push(auxCita);
  //Si esta vacio significa que no hay citas por ende no se puede solapar en este caso
  if (hourcitation2.length === 0) {
    return true;
  }

  // Ordenar las citas por la hora de inicio
  hourcitation2.sort((a, b) => {
    return (
      parseInt(a.date1hour.replace(":", "")) -
      parseInt(b.date1hour.replace(":", ""))
    );
  });

  // Verificar si hay alguna superposición
  for (let i = 0; i < hourcitation2.length - 1; i++) {
    const currentCita = hourcitation2[i];
    const nextCita = hourcitation2[i + 1];

    // Convertir horas a números enteros para comparar
    const currentStart = parseInt(currentCita.date1hour.replace(":", ""));
    const currentEnd = parseInt(currentCita.date2hour.replace(":", ""));
    const nextStart = parseInt(nextCita.date1hour.replace(":", ""));
    const nextEnd = parseInt(nextCita.date2hour.replace(":", ""));
    console.log(currentStart);
    console.log(currentEnd);
    console.log(nextStart);
    console.log(nextEnd);
    console.log(currentStart <= nextStart);
    console.log(nextStart < currentEnd);
    console.log(nextStart <= currentStart);
    console.log(currentStart < nextEnd);
    // Verificar superposición
    if (
      (nextStart >= currentStart && nextStart <= currentEnd) ||
      (currentStart >= nextStart && currentStart <= nextEnd)
    ) {
      return false; // Hay superposición
    }
  }
  return true; // No hay superposición
}

async function subirDiaCreado(message) {
  const collectionUser = connection.collection("users");
  const collectionDiary = connection.collection("diary");
  var user = await collectionUser.findOne({ idNumber: message.from });
  var diaCreado = {
    dateday: user.datecitation,
    appointments: user.hourcitation,
  };
  await collectionDiary.insertOne(diaCreado);

  collectionUser.updateOne(
    { idNumber: message.from },
    {
      $set: {
        hourcitation: [],
        datecitation: new Date(0, 0, 0, 0, 0, 0, 0),
        "menu.response": "0",
      },
    }
  );
}
async function mostrarCitasDisponibles(number, client) {
  var fechaHoraActual = new Date();
  const collectionDiary = connection.collection("diary");
  const collectionUser = connection.collection("users");

  fechaHoraActual.setHours(0, 0, 0, 0);

  const query = {
    dateday: { $gte: fechaHoraActual },
    "appointments.status": false,
  };

  const citasDisponibles = await collectionDiary.find(query).toArray();

  // Crear un string con citas disponibles por día
  let citasPorDia = "";
  let diaHoraCita = 1;
  if (citasDisponibles.length > 0) {
    citasDisponibles.forEach((dia) => {
      citasPorDia += `Citas disponibles para el día ${dia.dateday}:\n`;
      dia.appointments.forEach((cita, index) => {
        if (cita.status === false) {
          citasPorDia += `${diaHoraCita}._ Cita disponible a las ${cita.date1hour}\n`;
          diaHoraCita++;
        }
      });
      citasPorDia += "\n";
    });
    await collectionUser.updateOne(
      { idNumber: number },
      { $set: { citapropuesta: citasDisponibles, "menu.response": "01" } }
    );
    client.sendMessage(number, citasPorDia);
  } else {
    client.sendMessage(
      number,
      "Por el momento no sea subido los horarios, intentelo de nuevo mas tarde"
    );
    await collectionUser.updateOne(
      { idNumber: number },
      { $set: { citapropuesta: citasDisponibles, "menu.response": "0" } }
    );
  }
}

function encontrarPosicionYDireccion(numeroUsuario, array) {
  var r = [];
  var numeroAux = numeroUsuario;
  for (x = 0; x < array.length; x++) {
    if (array[x] >= numeroAux) {
      r.push(x);
      r.push(numeroAux - 1);
      break;
    } else {
      numeroAux -= array[x];
    }
  }

  return r;
}

//Messgesss
const welcomeMessage =
  "¡bienvenido al Bot del Consultorio Dental! 😁\n" +
  "Estamos aquí para hacer tu experiencia más cómoda y conveniente.\n" +
  "Puedes utilizar este bot para agendar, cancelar, posponer citas y realizar pagos de manera sencilla.\n" +
  "Seleccione un numero de las opciones de menú:\n\n" +
  "1. Agendar una cita.\n" +
  "2. Cancelar una cita.\n" +
  "3. Posponer una cita.\n" +
  "4. Enviar Comprobante de pago.\n" +
  "5. Obtener información sobre nuestros servicios.";

const welcomeMessageAdmin =
  "Hola Ivan\n" +
  "Eligi una opcion\n\n" +
  "1. Solicitar pago.\n" +
  "2. Confirmar pago.\n" +
  "3. Cancelar una cita.\n" +
  "4. Crear dia de trabajo";

const messageAdmin02 =
  "Eligi una opcion\n\n" +
  "1. Comprobar el pago del cliente con su numero\n" +
  "2. Ver la lista de pendientes a corroborar el pago de los clientes\n" +
  "3. Regresar al menu principal";

const imagenData = MessageMedia.fromFilePath("./img1.jpg");
