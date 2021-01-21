// This code runs as soon as the page is loaded, when 
// the script tag in the HTML file is executed. 

// It sends a GET request for the JSON file postcardData.json 

let xhr = new XMLHttpRequest();
let r = window.location.search;
console.log("r is");
console.log(r);
xhr.open("GET", '/showPostcard?id=' + r, true);

xhr.setRequestHeader("Content-Type", "application/json;charset=UTF-8");

// set up callback function that will run when the HTTP response comes back
xhr.onloadend = function(e) {
  console.log("display callback:");
  console.log(xhr.responseText);
  
  // responseText is a string
  let data = JSON.parse(xhr.responseText);
  
  // get the postcard data out of the object "data" and 
  // configure the postcard
  let postcardImage = document.getElementById("cardImg");
  postcardImage.style.display = 'block';
  postcardImage.src = data.image;
  let postcardMessage = document.getElementById("message");
  //postcardMessage.textContent = data.message;
  // textContent throws away newlines; so use innerText instead
  postcardMessage.innerText = data.message; 
  postcardMessage.className = data.font;
  document.querySelector(".postcard").style.backgroundColor = data.color;
}

// send off request
xhr.send(null);

