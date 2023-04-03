if ("serial" in navigator) {
  // The Web Serial API is supported.
} else {
  console.error('Web serial doesn\'t seem to be enabled in your browser. Check https://developer.mozilla.org/en-US/docs/Web/API/Web_Serial_API#browser_compatibility for more info.')
  document.getElementById("serial-error").innerHTML = "Web serial doesn\'t seem to be enabled in your browser. Check https://developer.mozilla.org/en-US/docs/Web/API/Web_Serial_API#browser_compatibility for more info.";
}

let reader;

document.getElementById('connect-to-serial').addEventListener('click', async () => {
  // // Prompt user to select any serial port.
  // const port = await navigator.serial.requestPort();

  // // Wait for the serial port to open.
  // await port.open({ baudRate: 115200 });

  const port = await navigator.serial.requestPort();
  await port.open({ baudRate: 115200 }); // `baudRate` was `baudrate` in previous versions.  

  let decoder = new TextDecoderStream();
  const inputDone = port.readable.pipeTo(decoder.writable);
  const inputStream = decoder.readable;
  
  reader = inputStream.getReader();
  readLoop();

  setTimeout(parseMessages, 1000);
});


async function readLoop() {
  while (true) {
    const { value, done } = await reader.read();
    if (value) {
      // log.textContent += value + '\n';
      // console.log(value + '\n');
      document.getElementById("message-log").value += value;
    }
    if (done) {
      console.log('[readLoop] DONE', done);
      reader.releaseLock();
      break;
    }
  }
}


let chartNumber = 1;
let SAMPLE_NUM = 0;
let LABEL = "";

document.getElementById('set-sample-num').addEventListener('click', async () => {
  SAMPLE_NUM = document.getElementById("sample-num").value;
});

document.getElementById('set-sample-label').addEventListener('click', async () => {
  LABEL = document.getElementById("sample-label").value;
});




function downloadFile(fileNum) {
  const trueFileNumber = parseInt(fileNum) + parseInt(SAMPLE_NUM);

  const link = document.createElement("a");
  const content = document.getElementById("textarea" + fileNum).value;
  const file = new Blob([content], { type: 'text/plain' });
  link.href = URL.createObjectURL(file);
  link.download = LABEL + ".sample" + trueFileNumber + ".csv";
  link.click();
  URL.revokeObjectURL(link.href);
}

function addFileDownload(saveButton, indexNum) {
  // saveButton is a document element
  saveButton.addEventListener('click', async () => {
    downloadFile(indexNum);
  });

}



function graphValues(lastChunk) {
  let array = lastChunk.split("\n").map(function (line) {
      return line.split(",");
  });

  // console.log(array);
  // document.getElementById("test-log").value = array;

  var textarea_list = document.getElementsByTagName("textarea");
  if (textarea_list[textarea_list.length - 1].value != lastChunk) {
    const newElement = document.createElement("div");
    const newContainer = document.createElement("div");
    // const newContent = document.createTextNode(array);
    const newContent = document.createElement("textarea");
    newContent.value = lastChunk;
    newContent.className = "displayValues";
    newContent.id = "textarea" + chartNumber;

    newContainer.className = "container";
    newElement.appendChild(newContainer);

    newContainer.appendChild(newContent);
    newElement.className = "element";

    const newGraph = document.createElement("canvas");
    newGraph.id = "chart" + chartNumber;

    newContainer.appendChild(newGraph);
    
    const elementList = document.getElementById("main-list");
    elementList.appendChild(document.createElement("hr"));
    const saveButton = document.createElement("button");
    var fileNumbTemp = parseInt(chartNumber) + parseInt(SAMPLE_NUM);
    saveButton.innerHTML = "Save file #" + fileNumbTemp;
    saveButton.id = "saveButton" + chartNumber;
    addFileDownload(saveButton, chartNumber);
    elementList.appendChild(saveButton);
    elementList.appendChild(newElement);

    chartNumber++;

    // so the array here will have elements of other arrays with each new line in a separate array and comma separated
    let startFlag = false;
    let timeArray = [];
    let leftValArray = [];
    let rightValArray = [];
    for (let x in array) {
      if (array[x].length == 3 && array[x][0] === "timestamp" && array[x][1] === "chargetimeLeft" && array[x][2] === "chargetimeRight") {
        startFlag = true;
        continue;
      }
      if (startFlag && array[x].length == 3) {
        timeArray.push(array[x][0]);
        leftValArray.push(array[x][1]);
        rightValArray.push(array[x][2]);
      }
    }

    const data = {
      labels: timeArray,
      datasets: [
        {
          label: 'Left fiber',
          data: leftValArray,
          borderColor: CHART_COLORS.red,
          backgroundColor: CHART_COLORS.red,
          yAxisID: 'y',
        },
        {
          label: 'Right fiber',
          data: rightValArray,
          borderColor: CHART_COLORS.blue,
          backgroundColor: CHART_COLORS.blue,
          // yAxisID: 'y1',
        }
      ]
    };

    new Chart(newGraph, {
      type: 'line',
      data: data,
      options: {
        responsive: true,
        maintainAspectRatio: false,    
      }
    });

  }


}


const CHART_COLORS = {
  red: 'rgb(255, 99, 132)',
  orange: 'rgb(255, 159, 64)',
  yellow: 'rgb(255, 205, 86)',
  green: 'rgb(75, 192, 192)',
  blue: 'rgb(54, 162, 235)',
  purple: 'rgb(153, 102, 255)',
  grey: 'rgb(201, 203, 207)'
};

const NAMED_COLORS = [
  CHART_COLORS.red,
  CHART_COLORS.orange,
  CHART_COLORS.yellow,
  CHART_COLORS.green,
  CHART_COLORS.blue,
  CHART_COLORS.purple,
  CHART_COLORS.grey,
];


function parseMessages() {
  const textArray = document.getElementById("message-log").value.split("EOM");
  const lastChunk = textArray[textArray.length - 2];  // grabbing the 2nd to last message (expecting EOM to be newline terminated)
  graphValues(lastChunk.trim());
  
  setTimeout(parseMessages, 1000);
}
