const fetch = require("node-fetch");
const express = require('express')
const app = express()
var http = require('http');
var path    = require("path");
var server = http.createServer(app);
var CryptoJS = require("crypto-js");
var io = require('socket.io')(server);
var port = process.env.PORT || 3009;
app.use(express.static('dist'));
async function songidgrabber(songname) {
    let url = "https://www.jiosaavn.com/api.php?__call=autocomplete.get&_format=json&_marker=0&cc=in&includeMetaTags=1&query=" + songname;
    var response = await fetch(url) //RUN RUN RUN
    var resdata = await response.json();
    var songdata = resdata['songs']['data']
    var songids = []
    for (let index = 0; index < songdata.length; index++) {
        const id = songdata[index]['id'];
        songids.push(id)
    }
    return songids
  }
async function singleidurl(id){
    let url = "https://www.jiosaavn.com/api.php?__call=song.getDetails&cc=in&_marker=0%3F_marker%3D0&_format=json&pids=" + id
    let response = await fetch(url)
    let resdata = await response.json()
    return helper(resdata[id])
}
function decryptByDES(ciphertext) {
  var key = '38346591';
  var keyHex = CryptoJS.enc.Utf8.parse(key);
  // direct decrypt ciphertext
  var decrypted = CryptoJS.DES.decrypt({
      ciphertext: CryptoJS.enc.Base64.parse(ciphertext)
  }, keyHex, {
      mode: CryptoJS.mode.ECB,
      padding: CryptoJS.pad.Pkcs7
  });

  return decrypted.toString(CryptoJS.enc.Utf8);
}
function helper(data){
        if('media_preview_url' in data){
           var url = data['media_preview_url'];
           url = url.replace('preview', 'aac');
        }
        else{
            var url = decryptByDES(data['encrypted_media_url'])
        }
        if(data['320kbps'] == 'true'){
            url = url.replace("_96_p.mp4", "_320.mp4")
        }
        else{
            url = url.replace("_96_p.mp4", "_160.mp4")
        }
        var dict = { 'song': data['song'], 'singers': data['singers'],'thumbnail':data['image'] ,'url': url}
        return dict
}
app.get('/', (req,res)=>{
    res.sendFile(path.join(__dirname+'/dist/saavan.html'))
})
io.on('connection', function(wss){
    wss.on('message', (message)=> {
        songidgrabber(message).then((ids)=>{
            for (let index = 0; index < ids.length; index++) {
                singleidurl(ids[index]).then((data)=>{
                    wss.send(data)
                })
            }
        })
    })
 })
 server.listen(port)
