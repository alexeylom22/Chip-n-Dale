function changeFoo() {
    document.querySelector("#result").textContent = document.querySelector("#original").value.replace(/\n/g,',');
}