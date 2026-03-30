var GLOBAL_DATA = [];

// PROPERTIES
var DATE_OPTIONS = {
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
    second: 'numeric'
  };
  
var DELIVERY_DELAY = 1; // 


// UTILITY Arrays
const notReturnedMSGS = [];
const UnknownMSGS = [];
const returnedMSGS = [];
const mergedRawData = [];
const generedMSG = [];
const clientMSGS = [];
const clientIndex = new Map();
const candidates = new Map();

const stats = {
    returned: {},     // SID -> { total, vendors: {vendor: count} }
    notReturned: {},  // SID -> count
    unknown: {}       // SID -> count
};

// UTILITY FUNCTIONS

function getOTPCodeFromText(text){
    const match = text.match(/\b[A-Za-z0-9]*\d[A-Za-z0-9]*\b/g);
    if (match) return match;
}

function getDateFromString(str_date){
    // expected input '10-03-2025  12:43:05'
    const dateAndTimeArray = str_date.split(" ");
    const dateArray = dateAndTimeArray[0].split("-");
    const timeArray = dateAndTimeArray[1].split(":");
    let parsedDate = new Date(dateArray[0], dateArray[1]-1, dateArray[2], timeArray[0], timeArray[1], timeArray[2]);
    return parsedDate;
}

function getMaxDelayedDate(raw_date){
    let max_delay = new Date(raw_date.valueOf())
    max_delay.setHours(max_delay.getHours() + DELIVERY_DELAY);
    return max_delay;
}

function textSimilarity(str1, str2) {
    let words1 = new Set(str1.toLowerCase().split(/\s+/));
    let words2 = new Set(str2.toLowerCase().split(/\s+/));
    
    let intersection = new Set([...words1].filter(word => words2.has(word)));
    
    let similarity = (2 * intersection.size) / (words1.size + words2.size);
    return (similarity * 100).toFixed(2);
}

function isHeaderRow(row) {
    const normalized = row.map(x => (x || "").toString().toLowerCase());

    return normalized.includes("account") &&
           normalized.includes("system-id");
}

function parseXLSX(file, callback) {
    const reader = new FileReader();

    reader.onload = function(e) {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { 
            type: 'array',
            WTF: false 
        });

        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];

        // convert to array of arrays
        const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 });

        // finding table header
        const headerIndex = rows.findIndex(isHeaderRow);

        if (headerIndex === -1) {
            throw new Error("Header row not found");
        }

        // cleaning
        const cleanedRows = rows.slice(headerIndex);

        // convert to xlsx
        const csv = XLSX.utils.aoa_to_sheet(cleanedRows);
        const csvString = XLSX.utils.sheet_to_csv(csv);

        callback(csvString);
    };

    reader.readAsArrayBuffer(file);
}


async function initializeSearchAsync(gener, recieve) {
    const BATCH_SIZE = 100; // Test value (avarage from ceiling)
    let processed = 0;
    const clientIndex = buildIndex(recieve);
    
    for (let i = 0; i < gener.length; i += BATCH_SIZE) {
        const chunk = gener.slice(i, i + BATCH_SIZE);

        for (let j = 0; j < chunk.length; j++) {
            processSingle(chunk[j], clientIndex); // OPTIMIZAION 2 
            // processSingle(chunk[j], recieve);
            processed++;
        }

        updateProgress(processed, gener.length);

        await new Promise(r => setTimeout(r, 0));
    }

    drawNotReturned();
    drawReturnedMsgs();
    drawUnknown();

    drawReturnedStats();
    drawNotReturnedStats();
    drawUnknownStats();
}

function buildIndex(recieve) {
    const map = new Map();

    for (let msg of recieve) {
        if (!map.has(msg.destination)) {
            map.set(msg.destination, []);
        }
        map.get(msg.destination).push(msg);
    }

    return map;
}

function processSingle(generItem, recieve) {
    let gener_number = generItem.destination;
    let gener_timestamp = generItem.timestamp;

    let temp_pull_of_msgs = [];
    let temp_unknown_pull = [];

    // const candidates = buildIndex(clientMSGS).get(generItem.destination) || [];
    const candidates = recieve.get(generItem.destination) || [];

    for (let rec of candidates) {


        if (gener_number !== rec.destination) continue;

        let recieve_timestamp = rec.timestamp;

        if (recieve_timestamp < gener_timestamp || recieve_timestamp > getMaxDelayedDate(gener_timestamp)) continue;

        let percSimilarity = textSimilarity(generItem.text, rec.text);

        let generOTPArray = getOTPCodeFromText(generItem.text);
        let receiveOTPArray = getOTPCodeFromText(rec.text);

        let matched = false;

        if (generOTPArray && receiveOTPArray) {
            for (let g of generOTPArray) {
                for (let r of receiveOTPArray) {
                    if (g === r) {
                        matched = true;
                        break;
                    }
                }
                if (matched) break;
            }
        } else if (percSimilarity == 100) {
            matched = true;
        }

        // OPTIMIZATION ATTEMPTS = 1
        // if (percSimilarity === 100) {
        //     matched = true;
        // } else if (generOTPArray && receiveOTPArray) {
        //     const receiveSet = new Set(receiveOTPArray);
        //     matched = generOTPArray.some(g => receiveSet.has(g));
        // }

        if (matched) {
            temp_pull_of_msgs.push(rec);
        } else {
            temp_unknown_pull.push(rec);
        }
    }

    if (temp_pull_of_msgs.length < 1) {
        if (temp_unknown_pull.length < 1) {
            notReturnedMSGS.push(generItem);
            inc(stats.notReturned, generItem.sid);
        } else {
            UnknownMSGS.push([generItem, temp_unknown_pull]);
            inc(stats.unknown, generItem.sid);
        }
    } else {
        returnedMSGS.push([generItem, temp_pull_of_msgs]);
        incReturned(generItem.sid, temp_pull_of_msgs[0].vendor);
    }
}

function inc(obj, key) {
    if (!obj[key]) obj[key] = 0;
    obj[key]++;
}

function incReturned(sid, vendor) {
    if (!stats.returned[sid]) {
        stats.returned[sid] = {
            total: 0,
            vendors: {}
        };
    }

    stats.returned[sid].total++;
    inc(stats.returned[sid].vendors, vendor);
}

// DRAW FUNCTIONS
function updateProgress(done, total) {
    const percent = total ? (done / total) * 100 : 0;

    document.getElementById("progress_bar").style.width = percent + "%";
    document.getElementById("progress_text").innerText = `${done} / ${total}`;
}

function showLoader(total) {
    document.getElementById("loadingOverlay").classList.remove("d-none");

    updateProgress(0, total);
}

function hideLoader() {
    document.getElementById("loadingOverlay").classList.add("d-none");
}

function drawNotReturned(){

    // if (notReturnedMSGS.length < 1){
    //     document.getElementById("total_unreturned").innerHTML = 0;
    //     document.getElementById("table-unreturned").style.display = "none";
    // } else{
    //     document.getElementById("total_unreturned").innerHTML = notReturnedMSGS.length;
    //     var table = document.getElementById("table-unreturned");

    //     for (let i = 0; i < notReturnedMSGS.length; i++){
    //         var row = table.insertRow(-1);
    //         var cell1 = row.insertCell(0); // Time
    //         var cell2 = row.insertCell(1); // SystemID
    //         var cell3 = row.insertCell(2); // Destination
    //         var cell4 = row.insertCell(3); // SID
    //         var cell5 = row.insertCell(4); // Content

    //         cell1.innerHTML = notReturnedMSGS[i]['timestamp'].toLocaleString("uk", DATE_OPTIONS);
    //         cell2.innerHTML = notReturnedMSGS[i]['vendor'];
    //         cell3.innerHTML = notReturnedMSGS[i]['destination'];
    //         cell4.innerHTML = notReturnedMSGS[i]['sid'];
    //         cell5.innerHTML = notReturnedMSGS[i]['text'];
    //     }
    // }

    // OPTIMIZATION 
    const totalEl = document.getElementById("total_unreturned");
    const table = document.getElementById("table-unreturned");

    if (notReturnedMSGS.length === 0) {
        totalEl.innerText = 0;
        table.style.display = "none";
        table.innerHTML = ""; // cleaning
        return;
    }

    totalEl.innerText = notReturnedMSGS.length;
    table.style.display = "table";

    let html = '';

    for (let i = 0; i < notReturnedMSGS.length; i++) {
        const msg = notReturnedMSGS[i];

        html += `
            <tr>
                <td>${msg.timestamp.toLocaleString("uk", DATE_OPTIONS)}</td>
                <td>${msg.vendor}</td>
                <td>${msg.destination}</td>
                <td>${msg.sid}</td>
                <td>${msg.text}</td>
            </tr>
        `;
    }

    table.innerHTML = html;
    
}

function drawUnknown(){
    if (UnknownMSGS.length < 1){
        document.getElementById("total_unknown").innerHTML = 0;
        document.getElementById("table-unknown").style.display = "none";
    } else { 
        document.getElementById("total_unknown").innerHTML = UnknownMSGS.length;
        var table = document.getElementById("table-unknown");

        for (let i = 0; i < UnknownMSGS.length; i++){
            var row = table.insertRow(-1);
            var cell1 = row.insertCell(0); // Gener-Time
            var cell2 = row.insertCell(1); // Gener-SystemID
            var cell3 = row.insertCell(2); // Gener-Destination
            var cell4 = row.insertCell(3); // Gener-SID
            var cell5 = row.insertCell(4); // Gener-Content

            let qty_of_msgs = UnknownMSGS[i][1].length;
            cell1.rowSpan = qty_of_msgs+1;
            cell1.style = "vertical-align: middle;";
            cell2.rowSpan = qty_of_msgs+1;
            cell2.style = "vertical-align: middle;";
            cell3.rowSpan = qty_of_msgs+1;
            cell3.style = "vertical-align: middle;";
            cell4.rowSpan = qty_of_msgs+1;
            cell4.style = "vertical-align: middle;";
            cell5.rowSpan = qty_of_msgs+1;
            cell5.style = "vertical-align: middle;";
            
            

            cell1.innerHTML = UnknownMSGS[i][0]['timestamp'].toLocaleString("uk", DATE_OPTIONS);
            cell2.innerHTML = UnknownMSGS[i][0]['vendor'];
            cell3.innerHTML = UnknownMSGS[i][0]['destination'];;
            cell4.innerHTML = UnknownMSGS[i][0]['sid'];;
            cell5.innerHTML = UnknownMSGS[i][0]['text'];
            
            for (let k = 0; k < qty_of_msgs; k ++ ){
                var row = table.insertRow(-1);
                var rcell1 = row.insertCell(0); // Received-Time
                var rcell2 = row.insertCell(1); // Received-SystemID
                var rcell3 = row.insertCell(2); // Received-Destination
                var rcell4 = row.insertCell(3); // Received-SID
                var rcell5 = row.insertCell(4); // Received-Content

                rcell1.innerHTML = UnknownMSGS[i][1][k]['timestamp'].toLocaleString("uk", DATE_OPTIONS);
                rcell2.innerHTML = UnknownMSGS[i][1][k]['vendor'];
                rcell3.innerHTML = UnknownMSGS[i][1][k]['destination'];;
                rcell4.innerHTML = UnknownMSGS[i][1][k]['sid'];
                rcell5.innerHTML = UnknownMSGS[i][1][k]['text'];
            }
        }
    }
}

function drawReturnedMsgs(){

    // if (returnedMSGS.length < 1){
    //     document.getElementById("total_returned").innerHTML = 0;
    //     document.getElementById("table-returned").style.display = "none";
    // } else { 
    //     document.getElementById("total_returned").innerHTML = returnedMSGS.length;
    //     var table = document.getElementById("table-returned");

    //     for (let i = 0; i < returnedMSGS.length; i++){
    //         var row = table.insertRow(-1);
    //         var cell1 = row.insertCell(0); // Gener-Time
    //         var cell2 = row.insertCell(1); // Gener-SystemID
    //         var cell3 = row.insertCell(2); // Gener-Destination
    //         var cell4 = row.insertCell(3); // Gener-SID
    //         var cell5 = row.insertCell(4); // Gener-Content

    //         let qty_of_msgs = returnedMSGS[i][1].length;
    //         cell1.rowSpan = qty_of_msgs+1;
    //         cell1.style = "vertical-align: middle;";
    //         cell2.rowSpan = qty_of_msgs+1;
    //         cell2.style = "vertical-align: middle;";
    //         cell3.rowSpan = qty_of_msgs+1;
    //         cell3.style = "vertical-align: middle;";
    //         cell4.rowSpan = qty_of_msgs+1;
    //         cell4.style = "vertical-align: middle;";
    //         cell5.rowSpan = qty_of_msgs+1;
    //         cell5.style = "vertical-align: middle;";
            
            

    //         cell1.innerHTML = returnedMSGS[i][0]['timestamp'].toLocaleString("uk", DATE_OPTIONS);
    //         cell2.innerHTML = returnedMSGS[i][0]['vendor'];
    //         cell3.innerHTML = returnedMSGS[i][0]['destination'];;
    //         cell4.innerHTML = returnedMSGS[i][0]['sid'];;
    //         cell5.innerHTML = returnedMSGS[i][0]['text'];
            
    //         for (let k = 0; k < qty_of_msgs; k ++ ){
    //             var row = table.insertRow(-1);
    //             var rcell1 = row.insertCell(0); // Received-Time
    //             rcell1.style = "vertical-align: middle;";
    //             var rcell2 = row.insertCell(1); // Received-SystemID
    //             rcell2.style = "vertical-align: middle;";
    //             var rcell3 = row.insertCell(2); // Received-Destination
    //             rcell3.style = "vertical-align: middle;";
    //             var rcell4 = row.insertCell(3); // Received-SID
    //             rcell4.style = "vertical-align: middle;";
    //             var rcell5 = row.insertCell(4); // Received-Content
    //             rcell5.style = "vertical-align: middle;";

    //             rcell1.innerHTML = returnedMSGS[i][1][k]['timestamp'].toLocaleString("uk", DATE_OPTIONS);
    //             rcell2.innerHTML = returnedMSGS[i][1][k]['vendor'];
    //             rcell3.innerHTML = returnedMSGS[i][1][k]['destination'];;
    //             rcell4.innerHTML = returnedMSGS[i][1][k]['sid'];
    //             rcell5.innerHTML = returnedMSGS[i][1][k]['text'];
    //         }
    //     }

    // }


    // OPTIMIZATION

    if (returnedMSGS.length < 1){
        document.getElementById("total_returned").innerHTML = 0;
        document.getElementById("table-returned").style.display = "none";
    } else { 
        document.getElementById("total_returned").innerHTML = returnedMSGS.length;
        var table = document.getElementById("table-returned");

        let html = '';

        for (let i = 0; i < returnedMSGS.length; i++) {
            const gener = returnedMSGS[i][0];
            const list = returnedMSGS[i][1];
            const qty = list.length;

            const baseCells = `
                <td rowspan="${qty + 1}" class="v-mid">${gener.timestamp.toLocaleString("uk", DATE_OPTIONS)}</td>
                <td rowspan="${qty + 1}" class="v-mid">${gener.vendor}</td>
                <td rowspan="${qty + 1}" class="v-mid">${gener.destination}</td>
                <td rowspan="${qty + 1}" class="v-mid">${gener.sid}</td>
                <td rowspan="${qty + 1}" class="v-mid">${gener.text}</td>
            `;

            html += `<tr>${baseCells}</tr>`;

            for (let k = 0; k < qty; k++) {
                const rec = list[k];

                html += `
                    <tr>
                        <td class="v-mid">${rec.timestamp.toLocaleString("uk", DATE_OPTIONS)}</td>
                        <td class="v-mid">${rec.vendor}</td>
                        <td class="v-mid">${rec.destination}</td>
                        <td class="v-mid">${rec.sid}</td>
                        <td class="v-mid">${rec.text}</td>
                    </tr>
                `;
            }
        }

        table.innerHTML = html;

    }
    
}


function drawReturnedStats() {

    const container = document.getElementById("returned_stats");

    for (let sid in stats.returned) {
        const block = document.createElement("div");

        let html = `<b>${sid} ${stats.returned[sid].total} sms: </b><br/>`;

        for (let vendor in stats.returned[sid].vendors) {
            html += `&nbsp;&nbsp;${vendor}: ${stats.returned[sid].vendors[vendor]}<br/>`;
        }

        block.innerHTML = html;
        container.appendChild(block);
    }
}

function drawNotReturnedStats() {
    const container = document.getElementById("notreturned_stats");

    for (let sid in stats.notReturned) {
        const div = document.createElement("div");
        div.innerText = `${sid}: ${stats.notReturned[sid]}`;
        container.appendChild(div);
    }
}

function drawUnknownStats() {
    const container = document.getElementById("unknown_stats");

    for (let sid in stats.unknown) {
        const div = document.createElement("div");
        div.innerText = `${sid}: ${stats.unknown[sid]}`;
        container.appendChild(div);
    }
}

function showStats(elementId) {
    console.log(elementId);
  var x = document.getElementById(elementId);
  if (x.style.display === "none") {
    x.style.display = "block";
  } else {
    x.style.display = "none";
  }
}


// MAIN LOGIC

function initializeSearch(gener, recieve){

    for (let i = 0; i < gener.length; i++){

        // 1. Find if this number is in returned table
        let gener_number = gener[i]['destination'];
        let gener_timestamp = gener[i]['timestamp'];
        let temp_pull_of_msgs = []
        let temp_unknown_pull = [];
        for (let rt = 0; rt < recieve.length; rt++){
            
            if (gener_number === recieve[rt]['destination']){

                // 2. Check if the finded msg not older then generated and is in the delay limit
                let recieve_timestamp = recieve[rt]['timestamp'];

                if (recieve_timestamp >= gener_timestamp && recieve_timestamp <= getMaxDelayedDate(gener_timestamp)){

                    // 3.1 Check if the text similar
                    let gener_text = gener[i]["text"];
                    let recieve_text = recieve[rt]["text"];
                    let percSimilarity = textSimilarity(gener_text, recieve_text);
                    if (percSimilarity > 95){

                        // 4. Check if the OTP is in text
                        let generOTPArray = getOTPCodeFromText(gener_text); // We can get few OTP in one text, need to compare it
                        let receiveOTPArray = getOTPCodeFromText(recieve_text);
                        if (generOTPArray && receiveOTPArray){
                            for (let n = 0; n < generOTPArray.length; n ++ ){
                                // 5. We can get few OTP in one text, need to compare it all
                                for (let k = 0; k < receiveOTPArray.length; k++){
                                    if (generOTPArray[n] === receiveOTPArray[k]){
                                        temp_pull_of_msgs.push(recieve[rt]);
                                        
                                    }
                                }
                            }
                        } else {
                            if (percSimilarity == 100){
                                temp_pull_of_msgs.push(recieve[rt]);
                            }
                        }

                    // 3.2 If content have modifications
                    } else{
                        // 4 Check if the OTP is in text
                        let generOTPArray = getOTPCodeFromText(gener_text); // We can get few OTP in one text, need to compare it
                        let receiveOTPArray = getOTPCodeFromText(recieve_text);
                        if (generOTPArray && receiveOTPArray){
                            for (let n = 0; n < generOTPArray.length; n ++ ){
                                // 5. We can get few OTP in one text, need to compare it all
                                for (let k = 0; k < receiveOTPArray.length; k++){
                                    if (generOTPArray[n] === receiveOTPArray[k]){
                                        temp_pull_of_msgs.push(recieve[rt]);
                                    } else{
                                        temp_unknown_pull.push(recieve[rt]);
                                    }
                                }
                            }
                        } else{
                            temp_unknown_pull.push(recieve[rt]);
                        }    
                    }
                }
            }
        }
        
        // Check if any msgs are for this number
        if (temp_pull_of_msgs.length < 1){

            // Checking whether there are no messages at all or they have not been identified
            if (temp_unknown_pull.length < 1 ){
                notReturnedMSGS.push(gener[i]);
            } else { 
                let tempPairMSGS = [ gener[i], temp_unknown_pull];
                UnknownMSGS.push(tempPairMSGS);
            }
            
        } else{
            let tempPairMSGS = [ gener[i], temp_pull_of_msgs];
            returnedMSGS.push(tempPairMSGS);
        }
        

    }
    // Draw all msgs that not returned
    drawNotReturned();
    drawReturnedMsgs();
    drawUnknown();

}


// LISTENER EVENTS
$(document).ready(function() {

    const file_1 = document.getElementById('fileInput_1');
    const file_2 = document.getElementById('fileInput_2');


    file_1.addEventListener('change', function(event) {
        const file = event.target.files[0];

        if (file.name.endsWith(".xlsx")) {
            parseXLSX(file, (csvString) => {
                Papa.parse(csvString, {
                    header: true,
                    complete: handleFile1
                });
            });
        } else {
            Papa.parse(file, {
                header: true,
                complete: handleFile1
            });
        }
    });

    file_2.addEventListener('change', function(event) {
        const file = event.target.files[0];

        if (file.name.endsWith(".xlsx")) {
            parseXLSX(file, (csvString) => {
                Papa.parse(csvString, {
                    header: true,
                    complete: handleFile2
                });
            });
        } else {
            Papa.parse(file, {
                header: true,
                complete: handleFile2
            });
        }
    });

    // file_2.addEventListener('change', function(event) {
    //     const file = event.target.files[0];
    //     if (file) {
    //         Papa.parse(file, {
    //             header: true,
    //             complete: function(results) {
    //                 var table = document.getElementById("render_table_2");
    //                 for (let i = 0; i < results.data.length; i++){
    //                     let systID = results.data[i]["System-id"];

    //                     // Normalize string date to JS Date
    //                     timestamp = getDateFromString(results.data[i]["Timestamp"]);

    //                     let DestAddress = results.data[i]["Destination address"];
    //                     let SID = results.data[i]["Source address"];
    //                     let content = results.data[i]["Message text"];
    //                     const TempObj = {vendor: systID, timestamp: timestamp, destination: DestAddress, sid: SID, text: content}; // Append new sms in general list
    //                     clientMSGS.push(TempObj);
    //                     mergedRawData.push(TempObj);
    //                 }
    //                 checkFiles();
    //             },
    //             error: function(error) {
    //                 console.error('Error parsing CSV:', error);
    //             }
    //         });
    //     }
    // });

    function handleFile1(results) {
        for (let i = 0; i < results.data.length; i++){
            let systID = results.data[i]["System-id"];
            let timestamp = getDateFromString(results.data[i]["Timestamp"]);
            let DestAddress = results.data[i]["Destination address"];
            let SID = results.data[i]["Source address"];
            let content = results.data[i]["Message text"];

            const TempObj = {
                vendor: systID,
                timestamp,
                destination: DestAddress,
                sid: SID,
                text: content
            };

            generedMSG.push(TempObj);
        }

        checkFiles();
        
    }

    function handleFile2(results) {
        for (let i = 0; i < results.data.length; i++){
            let systID = results.data[i]["System-id"];
            let timestamp = getDateFromString(results.data[i]["Timestamp"]);
            let DestAddress = results.data[i]["Destination address"];
            let SID = results.data[i]["Source address"];
            let content = results.data[i]["Message text"];

            const TempObj = {
                vendor: systID,
                timestamp,
                destination: DestAddress,
                sid: SID,
                text: content
            };

            clientMSGS.push(TempObj);
        }

        checkFiles();

    }

    async function checkFiles() {
        const analytics = document.getElementById("analytics");
        if (file_1.files.length > 0 && file_2.files.length > 0) {
            
            // initializeSearchAsync(generedMSG, clientMSGS)
            var gener_qty = generedMSG.length;
            document.getElementById("total_gener_quantity").innerHTML = gener_qty;
            showLoader(gener_qty);
            // OPTIMIZATION ATTEMPT = 2
            await initializeSearchAsync(generedMSG, clientMSGS);
            analytics.style.display = "block";
            hideLoader();
            // initializeSearch(generedMSG, clientMSGS);

        } else {
            analytics.style.display = "none";
        }
    }

});
