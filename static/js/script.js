document.getElementById('dropArea').addEventListener('drop', dropHandler);
document.getElementById('dropArea').addEventListener('dragover', dragOverHandler);
document.getElementById('dropArea').addEventListener('dragleave', dragLeaveHandler);

function loadFile(event) {
    const file = event.target.files[0];
    processCSV(file);
}

function dropHandler(event) {
    event.preventDefault();
    const file = event.dataTransfer.files[0];
    processCSV(file);
    document.getElementById('dropArea').classList.remove('dragover');
}

function dragOverHandler(event) {
    event.preventDefault();
    document.getElementById('dropArea').classList.add('dragover');
}

function dragLeaveHandler(event) {
    event.preventDefault();
    document.getElementById('dropArea').classList.remove('dragover');
}

function processCSV(file) {
    const reader = new FileReader();
    reader.onload = function(e) {
        const text = e.target.result;
        const data = CSVToArray(text);
        const jsonData = csvToJSON(data);
        sessionStorage.setItem('csvData', JSON.stringify(jsonData));
        window.location.href = 'http://localhost:5001/csv';
    };
    reader.readAsText(file);
}

function CSVToArray(strData, strDelimiter = ",") {
    const objPattern = new RegExp(
        (
            "(\\" + strDelimiter + "|\\r?\\n|\\r|^)" +
            "(?:\"([^\"]*(?:\"\"[^\"]*)*)\"|" +
            "([^\"\\" + strDelimiter + "\\r\\n]*))"
        ),
        "gi"
    );

    const arrData = [[]];
    let arrMatches = null;

    while (arrMatches = objPattern.exec(strData)) {
        const strMatchedDelimiter = arrMatches[1];
        if (strMatchedDelimiter.length && strMatchedDelimiter !== strDelimiter) {
            arrData.push([]);
        }

        const strMatchedValue = arrMatches[2] ?
            arrMatches[2].replace(new RegExp("\"\"", "g"), "\"") :
            arrMatches[3];

        arrData[arrData.length - 1].push(strMatchedValue);
    }

    // Remove any empty fields at the end of the rows
    arrData.forEach(row => {
        while (row[row.length - 1] === "") {
            row.pop();
        }
    });

    return arrData;
}

function csvToJSON(data) {
    const keys = data[0];
    const result = [];
    for (let i = 1; i < data.length; i++) {
        const obj = {};
        for (let j = 0; j < keys.length; j++) {
            obj[keys[j]] = data[i][j];
        }
        result.push(obj);
    }
    return result;
}
