const stream = require("stream");
const ndjson = require("ndjson");
const through2 = require("through2");
const request = require("request");
const filter = require("through2-filter");
const sentiment = require("sentiment");
const util = require("util");
const dotenv = require('dotenv').config()
const pipeline = util.promisify(stream.pipeline);
const { MongoClient } = require("mongodb");

const MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost/scraperData"

var timetaken = "Time taken by addCount function";
console.log("MONGODB_URI", MONGODB_URI);

var timetaken = "Time taken by addCount function";

// console.time("loop");

console.time(timetaken);

(async () => {
  const client = new MongoClient(process.env["MONGODB_URI"], { useUnifiedTopology: true });
  const textRank = new sentiment();
  try {
      await client.connect();
      const collection = client.db("hacker-news").collection("mentions");
      await pipeline(
          request("http://api.hnstream.com/comments/stream/"),
          ndjson.parse({ strict: false }),
        //   filter({ objectMode: true }, chunk => {
        //       return chunk["body"].toLowerCase().includes("bitcoin") || chunk["article-title"].toLowerCase().includes("bitcoin");
        //   }),
          through2.obj((row, enc, next) => {
              let result = textRank.analyze(row.body);
              console.log("result.score", result.score);
              row.score = result.score;
              next(null, row);
          }),
          through2.obj((row, enc, next) => {
            row.lastModified = new Date();
            next(null, row);
        }),
        through2.obj((row, enc, next) => {
            console.log("insertOne");
            collection.insertOne({
                  ...row,
                  "user-url": `https://news.ycombinator.com/user?id=${row["author"]}`,
                  "item-url": `https://news.ycombinator.com/item?id=${row["article-id"]}`
              });
              next();
          })
      );
      console.timeEnd(timetaken);
      console.log("FINISHED");
  } catch(error) {
      console.log(error);
  }
})();


// (async () => {
//   const client = new MongoClient(process.env["MONGODB_URI"], { useUnifiedTopology: true });
//   const textRank = new sentiment();
//   try {
//       await client.connect();
//       const collection = client.db("hacker-news").collection("mentions");
//       await pipeline(
//           request("http://api.hnstream.com/comments/stream/"),
//           ndjson.parse({ strict: false }),
//           filter({ objectMode: true }, chunk => {
//               return chunk["body"].toLowerCase().includes("bitcoin") || chunk["article-title"].toLowerCase().includes("bitcoin");
//           }),
//           through2.obj((row, enc, next) => {
//               let result = textRank.analyze(row.body);
//               row.score = result.score;
//               next(null, row);
//           })
//       );
//       console.timeEnd(timetaken);
//       console.log("FINISHED");
//   } catch(error) {
//       console.log(error);
//   }
// })();


// (async () => {
//   const client = new MongoClient(process.env["MONGODB_URI"], { useUnifiedTopology: true });
//   const textRank = new sentiment();
//   try {
//       await client.connect();
//       const collection = client.db("hacker-news").collection("mentions");
//       await pipeline(
//           request("http://api.hnstream.com/comments/stream/"),
//           ndjson.parse({ strict: false }),
//           filter({ objectMode: true }, chunk => {
//               return chunk["body"].toLowerCase().includes("bitcoin") || chunk["article-title"].toLowerCase().includes("bitcoin");
//           }),
//           through2.obj((row, enc, next) => {
//               let result = textRank.analyze(row.body);
//               row.score = result.score;
//               next(null, row);
//           })
//       );
//       console.timeEnd(timetaken);
//       console.log("FINISHED");
//   } catch(error) {
//       console.log(error);
//   }
// })();

// console.timeEnd();

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

// (async () => {
//   const client = new MongoClient(process.env["MONGODB_URI"], { useUnifiedTopology: true });
//   console.log("About to try");
//   try {
//       await client.connect();
//       const collection = client.db("hacker-news").collection("mentions");
//       console.log("About to await pipeline");
//       await pipeline(
//           request("http://api.hnstream.com/comments/stream/"),
//           ndjson.parse({ strict: false }),
//           filter({ objectMode: true }, chunk => {
//               return chunk["body"].toLowerCase().includes("bitcoin") || chunk["article-title"].toLowerCase().includes("bitcoin");
//           })
//       );
//       console.log("FINISHED");
//   } catch(error) {
//       console.log(error);
//   }
// })();


