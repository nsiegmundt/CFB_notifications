const fetch = require('node-fetch');
const config = require('./config.json');

fetch(config.cfb_endpoint)
.then(data => data.json())
.then(response => {
    console.log(response);
});