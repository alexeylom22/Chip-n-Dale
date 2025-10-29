var GLOBAL_DATA = [];
var SYMBOLS_LIST = [",", ";"];
var WRONG_MCC = [441];


function cleanClipboardText(rawText) {
    var modifiedText = rawText.replace('"', '');
    const lines = modifiedText.split(/\r?\n/);
    const startIndex = lines.findIndex(line => line.includes("MCC") && line.includes("MNC"));
    if (startIndex === -1) return ""; 
    return lines.slice(startIndex).join("\n")
        .replace(/None|Begin|End/g, "")
        .trim();
}

function parseCSVFromText(text) {
    Papa.parse(text, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => processParsedData(results.data)
    });
}

// File logic

class CSVRow{
    constructor(mcc, mnc, price){
        this.MCC = mcc;
        this.MNC = mnc;
        this.Price = price;
    }
}

function setMNC(table, order, MCC, MNC, Price, groupSeparator){
    if (MNC.split(groupSeparator).length == 1){
        var row = table.insertRow(-1);
        var cell1 = row.insertCell(0);
        var cell2 = row.insertCell(1);
        var cell3 = row.insertCell(2);
        var cell4 = row.insertCell(3);

        cell1.innerHTML = order;
        cell2.innerHTML = MCC;
        cell3.innerHTML = MNC;
        cell4.innerHTML = Price;

        var object_row = new CSVRow(parseInt(MCC), parseInt(MNC), Price);
        GLOBAL_DATA.push(object_row);

    } else {
        var temp_array = MNC.split(groupSeparator);
        console.log(temp_array);
        for ( el in temp_array){
            MNC = parseInt(temp_array[el]);
            var row = table.insertRow(-1);
            var cell1 = row.insertCell(0);
            var cell2 = row.insertCell(1);
            var cell3 = row.insertCell(2);
            var cell4 = row.insertCell(3);

            cell1.innerHTML = order;
            cell2.innerHTML = MCC;
            cell3.innerHTML = MNC;
            cell4.innerHTML = Price;
            var object_row = new CSVRow(parseInt(MCC), parseInt(MNC), Price);
            GLOBAL_DATA.push(object_row);

        }
    }
}

function generateFile(){

    console.log("Generating file...");
    const titleKeys = Object.keys(GLOBAL_DATA[0])

    const refinedData = []

    refinedData.push(titleKeys)

    GLOBAL_DATA.forEach(item => {
    refinedData.push(Object.values(item))  
    })

    let csvContent = ''
    
    refinedData.forEach(row => {
        csvContent += row.join(',') + '\n'
    })


    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8,' })
    const objUrl = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.setAttribute('href', objUrl)
    link.setAttribute('class', "btn btn-success");

    // Time
    var currentdate = new Date(); 
    var datetime = currentdate.getHours() + ""  
        + currentdate.getMinutes() + "" 
        + currentdate.getSeconds() + ""
        +  currentdate.getDate() + ""
        + (currentdate.getMonth()+1)  + "" 
        + currentdate.getFullYear() + "";
    // Time end

    var utc = new Date().toJSON().slice(0,10).replace(/-/g,'/');
    link.setAttribute('download', 'price_'+ datetime +'.csv')
    link.textContent = 'Click to Download';
    document.getElementById("input_group").hidden = true;

    document.getElementById("append_btn").append(link)
}


// Interface for both logics
function processParsedData(results){
    var table = document.getElementById("render_table");
    for (let i = 0; i < results.length; i++){
        // Let's add a little bit logic to this code
        let MCC = results[i]["MCC"];

        if (!MCC){
            continue;
        }    
        if (MCC.length === 0){
            continue;
        }
        let MNC = results[i]["MNC"];
        let Price = false;
        if (results[i]["New Price"]){
            Price = results[i]["New Price"]
        } else if (results[i]["Xelogic_gw0"]){
            Price = results[i]["Xelogic_gw0"]
        }

        if ((Price.length === 0) || (Price === false )){
            continue;
        }

        // let Price = results[i]["New Price"];

        var GroupSeparator = ",";

        SYMBOLS_LIST.forEach(symbol => {
            if (MCC.includes(symbol) || MNC.includes(symbol)){
                GroupSeparator = symbol;
            }
        });

        if (MCC.split(GroupSeparator).length == 1){
            if (WRONG_MCC.includes(parseInt(MCC))) continue;
            setMNC(table, i+1, MCC, MNC, Price, GroupSeparator);
        } else {
            var temp_array = MCC.split(",");
            for ( el in temp_array){
                if (WRONG_MCC.includes(parseInt(temp_array[el]))) continue;
                setMNC(table, i+1, temp_array[el], MNC, Price, GroupSeparator);
            }
        }
    }
    generateFile();

}
document.addEventListener('DOMContentLoaded', function(){ 
    document.getElementById('fileInput').addEventListener('change', function(event) {
        const file = event.target.files[0];
        if (file) {
            Papa.parse(file, {
                header: true,
                complete: (results) => processParsedData(results.data),
                error: (error) => console.error('Error parsing CSV:', error)
            });
        }
    });

    document.getElementById('pasteButton').addEventListener('click', async () => {
        let text = document.getElementById('inputText').value.trim();
        const cleaned = cleanClipboardText(text);
        document.getElementById('inputText').value = cleaned;
        parseCSVFromText(cleaned);
    });
});