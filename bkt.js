const { connectToDatabase, connection } = require("./db.js");

connectToDatabase().then(async () => {
  try {
    const collectionDiary = connection.collection("diary");
    const curretTime = new Date();
    const curretTimeClearDay = new Date();
    curretTimeClearDay.setHours(0, 0, 0, 0);
    const diaryExist = await collectionDiary.findOne({
      dateday: curretTimeClearDay,
    });

    if (diaryExist) {
      if (diaryExist.appointments) {
        var timeFull = [];
        for (x = 0; x < diaryExist.appointments.length; x++) {
          if(diaryExist.appointments[x].status){
            timeFull.push(diaryExist.appointments[x].datehour);
          }
          
        }
        console.log("\n" + timeFull.toLocaleString() + "\n");
      } else {
        console.log("No existe el atrivuto");
      }
    } else {
      /*
            console.log("no existe la fecha");
            const newDate = {
              dateday: curretTimeClearDay,
              appointments: []
            }
            const nuevaCita = {
              datehour: "fechaA", // Fecha y hora aleatoria para la cita
              usernumber: "faker.random.uuid()", // Número de usuario aleatorio
              departuretime: "fechaB", // Hora de partida aleatoria
              departuretimeproximity: "fechaC", // Hora de partida de proximidad aleatoria
            }
            newDate.appointments.push(nuevaCita);
            console.log("hora:\n" + curretTime );
  
            await collectionDiary.insertOne(newDate)
            */
    }
    /*
    var horasValidas = [];
    var timeAux1 = new Date();
    timeAux1.setHours(17, 0, 0, 0);
    const horasValidas0 = {
      datehour: timeAux1.getHours(),
      status: false,
    };
    var timeAux2 = new Date();
    timeAux2.setHours(19, 0, 0, 0);
    const horasValidas1 = {
      datehour: timeAux2.getHours(),
      status: true,
    };
    var timeAux3 = new Date();
    timeAux3.setHours(21, 0, 0, 0);
    const horasValidas2 = {
      datehour: timeAux3.getHours(),
      status: false,
    };
    var timeAux4 = new Date();
    timeAux4.setHours(23, 0, 0, 0);
    const horasValidas3 = {
      datehour: timeAux4.getHours(),
      status: true,
    };

    horasValidas.push(horasValidas0);
    horasValidas.push(horasValidas1);
    horasValidas.push(horasValidas2);
    horasValidas.push(horasValidas3);
    var fechaAux = new Date();
    fechaAux.setDate(12);
    fechaAux.setHours(0,0,0,0);
    setDayAppointments(horasValidas, fechaAux, collectionDiary);
    */
    const diasDisx = buscarCitasDisponibles(collectionDiary);
    diasDisx.finally(( async() => {
      console.log("\dias disponibles:" + (await diasDisx).diasDisponibles + "\n");
      console.log("\nhoras disponibles:" + (await diasDisx).horasDisponibles + "\n");
      var auxHora = {
        datehour: []
      }

      auxHora.datehour.push(10);
      auxHora.datehour.push(11);
      auxHora.datehour.push(12);
      auxHora.datehour.push(13);
      auxHora.datehour.push(14);
      auxHora.datehour.push(15);
      auxHora.datehour.push(16);
      subirDiasDisponibles(13,auxHora,collectionDiary);
    }));
  } catch (error) {
    console.log("Error al interactuar con la base de datos\n" + error);
  }
});

//Para que funcione esta funcion el dayTime debe venir con la hora seteanda en 0
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

  if ((dateActuality.getDate() === dayTime.getDate()) || (dateActuality.getDate() <= dayTime.getDate())) {
    for (x = 0; x < appointmentsList.length; x++) {
      var citaAux = {
        datehour: appointmentsList[x].datehour,
        status: appointmentsList[x].status,
      };
      console.log("\n" + citaAux + "\n")
      dayJobs.appointments.push(citaAux);
    }
    await collectionDiary.insertOne(dayJobs);
  }

  
}

async function buscarCitasDisponibles(collectionDiary){
  var x = 0, aux = 0;
  var diasDisponibles = [];
  var fechaActual = new Date();
  fechaActual.setHours(0,0,0,0);
  var auxDia = fechaActual.getDate();

  var fechasDisponibles = {
    diasDisponibles: [],
    horasDisponibles: []
  }

  while(x <= 3){
    fechaActual.setDate(auxDia + aux );
    aux++;
    const diaryExist = await collectionDiary.findOne({
      dateday: fechaActual,
    });
    if(diaryExist){
      fechasDisponibles.diasDisponibles.push(diaryExist.dateday.getDate());
      for(y = 0; y < diaryExist.appointments.length; y++){
        fechasDisponibles.horasDisponibles.push(diaryExist.appointments[y].datehour);
      }

    }else{
      x++;
    }
  }
  return fechasDisponibles;
}

async function subirDiasDisponibles(dia,horas,collectionDiary){
  var fechaAux = new Date(2023,10,dia,0,0,0,0);
  console.log("\nVisteeeee: " + fechaAux + "\n")
  var diaExiste = await collectionDiary.findOne({
    dateday: fechaAux
  });
  if(diaExiste){
    console.log("Existe");
  }else{
    var diaAIngresar = {
      dateday: fechaAux,
      appointments: []
    }
    
    for(x = 0; x < horas.datehour.length; x++){
      var appointmentAux = {
        datehour: horas.datehour[x],
        idNumber: 0,
      }
      diaAIngresar.appointments.push(appointmentAux);
    }

    await collectionDiary.insertOne(diaAIngresar);
  }
}