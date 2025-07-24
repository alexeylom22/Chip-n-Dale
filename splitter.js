function changeSymbolFoo() {
    document.getElementById("symbol_count").innerText = document.getElementById("symbol_textarea").value.length;
}

function changeFoo() {
    document.getElementById("result").innerText = document.getElementById("original").value.replace(/\n/g,',');
    document.getElementById("count").innerText = document.getElementById("result").value.split(',').length;
}


// Content analyze 
const gsmCharset = '@£$¥èéùìòÇ\nØø\rÅåΔ_ΦΓΛΩΠΨΣΘΞ\x1BÆæßÉ !"#¤%&\'()*+,-./0123456789:;<=>?'+
                       '¡ABCDEFGHIJKLMNOPQRSTUVWXYZÄÖÑÜ`¿abcdefghijklmnopqrstuvwxyzäöñüàé';

const gsmExtended = {
    '^': '\x1B\x14', '{': '\x1B\x28', '}': '\x1B\x29', '\\': '\x1B\x2F',
    '[': '\x1B\x3C', '~': '\x1B\x3D', ']': '\x1B\x3E', '|': '\x1B\x40',
    '€': '\x1B\x65'
};

function isGSM(char) {
    return gsmCharset.includes(char) || char in gsmExtended;
}

function calculateSmsParts(text) {
    let isAllGSM = [...text].every(c => isGSM(c));
    let byteLength = 0;

    if (!isAllGSM) {
    byteLength = new TextEncoder().encode(text).length;
    let parts = Math.ceil(byteLength / 134); // 134 UCS-2 with UDH
    return {encoding: 'UCS-2', byteLength, parts, limit: 140};
    }

    // GSM 7-bit
    for (let c of text) {
    byteLength += (c in gsmExtended) ? 2 : 1;
    }

    let singleLimit = 153;
    let multipartLimit = 153;
    let parts = byteLength <= singleLimit ? 1 : Math.ceil(byteLength / multipartLimit);

    return {encoding: 'GSM 7-bit', byteLength, parts, limit: parts === 1 ? 160 : 153};
}

function highlightNonGSM(text) {
    return [...text].map(c => isGSM(c) ? c : `<span class="non-gsm" title="Not in GSM charset">${c}</span>`).join('');
}

document.addEventListener('DOMContentLoaded', function(){ 

    document.getElementById('smsInput').addEventListener('input', function () {

        const text = this.value;
        const result = calculateSmsParts(text);
        const highlighted = highlightNonGSM(text);
        var output_text = text;

        document.getElementById('output').innerHTML = `
            <div class="alert alert-${result.parts > 1 ? 'warning' : 'success'}">
            <strong>Encoding:</strong> ${result.encoding}<br>
            <strong>Total characters:</strong> ${text.length}<br>
            <strong>Total bytes:</strong> ${result.byteLength}<br>
            <strong>SMS parts:</strong> 
                ${result.parts}
                <span 
                class="badge bg-secondary" 
                data-bs-toggle="tooltip" 
                title="${result.encoding === 'GSM 7-bit' 
                    ? 'Повідомлення до 160 символів відправляється як 1 SMS. Якщо довжина більша — воно буде поділено на частини по 153 символи, бо 7 байтів йдуть на заголовок UDH.'
                    : 'Повідомлення у UCS-2 (наприклад, з емодзі або кирилицею) розбивається на частини по 67 символів (140 байтів мінус 6 байтів UDH).'}">
                ?
                </span><br>
            <div style="white-space: pre-wrap;">${highlighted}</div>    
            </div>
            <div class="card card-body">
                ${result.encoding === 'GSM 7-bit'
                    ? (output_text.length > 153 ? output_text.slice(0, 153):output_text)
                    : (output_text.length > 67 ? output_text.slice(0, 67):output_text)
                }
            </div>
        `;

        // Enable Bootstrap tooltips
        var tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
        tooltipTriggerList.map(function (tooltipTriggerEl) {
            return new bootstrap.Tooltip(tooltipTriggerEl);
        });
    });
});
