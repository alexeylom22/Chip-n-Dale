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

// DRAW FUNCTIONS

function drawNotReturned(){

    if (notReturnedMSGS.length < 1){
        document.getElementById("total_unreturned").innerHTML = 0;
        document.getElementById("table-unreturned").style.display = "none";
    } else{
        document.getElementById("total_unreturned").innerHTML = notReturnedMSGS.length;
        var table = document.getElementById("table-unreturned");

        for (let i = 0; i < notReturnedMSGS.length; i++){
            var row = table.insertRow(-1);
            var cell1 = row.insertCell(0); // Time
            var cell2 = row.insertCell(1); // SystemID
            var cell3 = row.insertCell(2); // Destination
            var cell4 = row.insertCell(3); // SID
            var cell5 = row.insertCell(4); // Content

            cell1.innerHTML = notReturnedMSGS[i]['timestamp'].toLocaleString("uk", DATE_OPTIONS);
            cell2.innerHTML = notReturnedMSGS[i]['vendor'];
            cell3.innerHTML = notReturnedMSGS[i]['destination'];
            cell4.innerHTML = notReturnedMSGS[i]['sid'];
            cell5.innerHTML = notReturnedMSGS[i]['text'];
        }
    }
    
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

    if (returnedMSGS.length < 1){
        document.getElementById("total_returned").innerHTML = 0;
        document.getElementById("table-returned").style.display = "none";
    } else { 
        document.getElementById("total_returned").innerHTML = returnedMSGS.length;
        var table = document.getElementById("table-returned");

        for (let i = 0; i < returnedMSGS.length; i++){
            var row = table.insertRow(-1);
            var cell1 = row.insertCell(0); // Gener-Time
            var cell2 = row.insertCell(1); // Gener-SystemID
            var cell3 = row.insertCell(2); // Gener-Destination
            var cell4 = row.insertCell(3); // Gener-SID
            var cell5 = row.insertCell(4); // Gener-Content

            let qty_of_msgs = returnedMSGS[i][1].length;
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
            
            

            cell1.innerHTML = returnedMSGS[i][0]['timestamp'].toLocaleString("uk", DATE_OPTIONS);
            cell2.innerHTML = returnedMSGS[i][0]['vendor'];
            cell3.innerHTML = returnedMSGS[i][0]['destination'];;
            cell4.innerHTML = returnedMSGS[i][0]['sid'];;
            cell5.innerHTML = returnedMSGS[i][0]['text'];
            
            for (let k = 0; k < qty_of_msgs; k ++ ){
                var row = table.insertRow(-1);
                var rcell1 = row.insertCell(0); // Received-Time
                var rcell2 = row.insertCell(1); // Received-SystemID
                var rcell3 = row.insertCell(2); // Received-Destination
                var rcell4 = row.insertCell(3); // Received-SID
                var rcell5 = row.insertCell(4); // Received-Content

                rcell1.innerHTML = returnedMSGS[i][1][k]['timestamp'].toLocaleString("uk", DATE_OPTIONS);
                rcell2.innerHTML = returnedMSGS[i][1][k]['vendor'];
                rcell3.innerHTML = returnedMSGS[i][1][k]['destination'];;
                rcell4.innerHTML = returnedMSGS[i][1][k]['sid'];
                rcell5.innerHTML = returnedMSGS[i][1][k]['text'];
            }
        }
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
            if (temp_unknown_pull < 1 ){
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
        if (file) {
            Papa.parse(file, {
                header: true,
                complete: function(results) {
                    var table = document.getElementById("render_table_1");
                    for (let i = 0; i < results.data.length; i++){
                        let systID = results.data[i]["System-id"];

                        // Normalize string date to JS Date
                        timestamp = getDateFromString(results.data[i]["Timestamp"]);

                        let DestAddress = results.data[i]["Destination address"];
                        let SID = results.data[i]["Source address"];
                        let content = results.data[i]["Message text"];
                        const TempObj = {vendor: systID, timestamp: timestamp, destination: DestAddress, sid: SID, text: content}; // Append new sms in general list
                        generedMSG.push(TempObj);
                        mergedRawData.push(TempObj);
                    }
                    checkFiles();
                    document.getElementById("total_gener_quantity").innerHTML = generedMSG.length;
                },
                error: function(error) {
                    console.error('Error parsing CSV:', error);
                }
            });
        }
    });
    file_2.addEventListener('change', function(event) {
        const file = event.target.files[0];
        if (file) {
            Papa.parse(file, {
                header: true,
                complete: function(results) {
                    var table = document.getElementById("render_table_2");
                    for (let i = 0; i < results.data.length; i++){
                        let systID = results.data[i]["System-id"];

                        // Normalize string date to JS Date
                        timestamp = getDateFromString(results.data[i]["Timestamp"]);

                        let DestAddress = results.data[i]["Destination address"];
                        let SID = results.data[i]["Source address"];
                        let content = results.data[i]["Message text"];
                        const TempObj = {vendor: systID, timestamp: timestamp, destination: DestAddress, sid: SID, text: content}; // Append new sms in general list
                        clientMSGS.push(TempObj);
                        mergedRawData.push(TempObj);
                    }
                    checkFiles();
                },
                error: function(error) {
                    console.error('Error parsing CSV:', error);
                }
            });
        }
    });



    function checkFiles() {
        const analytics = document.getElementById("analytics");
        if (file_1.files.length > 0 && file_2.files.length > 0) {
            analytics.style.display = "block";
            initializeSearch(generedMSG, clientMSGS);

        } else {
            analytics.style.display = "none";
        }
    }

});
