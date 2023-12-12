const { connectToDatabase, connection } = require("./db.js");

connectToDatabase().then(async () => {
  const array = [1, 1, 6];
  console.log(encontrarPosicionYDireccion(1, array));
  console.log(encontrarPosicionYDireccion(2, array));
  console.log(encontrarPosicionYDireccion(3, array));
  console.log(encontrarPosicionYDireccion(4, array));
  console.log(encontrarPosicionYDireccion(5, array));
  console.log(encontrarPosicionYDireccion(6, array));
  console.log(encontrarPosicionYDireccion(7, array));
  console.log(encontrarPosicionYDireccion(8, array));
});

async function mostrarCitasDisponibles() {
  console.log("entre");
  // Obtener la fecha y hora actual
  var fechaActual = new Date();
  fechaActual.setHours(0, 0, 0, 0);
  const collectionDiary = connection.collection("diary");
  console.log(fechaActual);
  const query = {
    dateday: { $gte: fechaActual },
    "appointments.status": false,
  };

  const citasDisponibles = await collectionDiary.find(query).toArray();

  console.log(JSON.stringify(citasDisponibles, null, 2));
  let citasPorDia = "";
  let diaCita = 1;
  citasDisponibles.forEach((dia) => {
    citasPorDia += `Citas disponibles para el día ${dia.dateday}:\n`;
    dia.appointments.forEach((cita, index) => {
      if (cita.status === false) {
        citasPorDia += `${diaCita}._ Cita disponible a las ${cita.date1hour}\n`;
        diaCita++;
      }
    });
    citasPorDia += "\n";
  });
  console.log(citasPorDia);

  return citasDisponibles;
}

function encontrarPosicionYDireccion(numeroUsuario, array) {
  var r = [];
  var numeroAux = numeroUsuario;
  for (x = 0; x < array.length; x++) {
    if (array[x] >= numeroAux) {
      r.push(x);
      r.push(numeroAux);
      break;
    }else{
      numeroAux-= array[x];
    }
  }

  return r;
}

function message1() {
  const message = {
    from: "5212811027657@c.us",
    body: "",
  };

  return message;
}

async function citasSeSolapan(hourcitation) {
  // Ordenar las citas por la hora de inicio
  hourcitation.sort((a, b) => {
    return (
      parseInt(a.date1hour.replace(":", "")) -
      parseInt(b.date1hour.replace(":", ""))
    );
  });

  // Verificar si hay alguna superposición
  for (let i = 0; i < hourcitation.length - 1; i++) {
    const currentCita = hourcitation[i];
    const nextCita = hourcitation[i + 1];

    // Convertir horas a números enteros para comparar
    const currentStart = parseInt(currentCita.date1hour.replace(":", ""));
    const currentEnd = parseInt(currentCita.date2hour.replace(":", ""));
    const nextStart = parseInt(nextCita.date1hour.replace(":", ""));
    const nextEnd = parseInt(nextCita.date2hour.replace(":", ""));

    // Verificar superposición
    if (
      (currentStart <= nextStart && nextStart < currentEnd) ||
      (nextStart <= currentStart && currentStart < nextEnd)
    ) {
      return false; // Hay superposición
    }
  }
  return true; // No hay superposición
}
