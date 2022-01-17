const stream = require("stream");
const ndjson = require("ndjson");
const through2 = require("through2");
const request = require("request");
const filter = require("through2-filter");
const sentiment = require("sentiment");
const util = require("util");
const pipeline = util.promisify(stream.pipeline);
const mongoose = require("mongoose");
const { MongoClient } = require("mongodb");

const MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost/scraperData"

console.log("MONGODB_URI", MONGODB_URI);

// mongoose.Promise = Promise;

mongoose.connect(MONGODB_URI, { 
    useNewUrlParser: true, 
    useUnifiedTopology: true, 
    // useCreateIndex: true
  });

// (async () => {
//     const client = new MongoClient(process.env["MONGODB_URI"], { useUnifiedTopology: true });
//     try {
//         await client.connect();
//         const collection = client.db("hacker-news").collection("mentions");
//         console.log("FINISHED");
//     } catch(error) {
//         console.log(error);
//     }
// })();