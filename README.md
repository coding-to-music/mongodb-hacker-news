# Capturing Hacker News Mentions with Node.js and MongoDB

https://www.mongodb.com/developer/how-to/capturing-hacker-news-mentions-nodejs-mongodb/

https://github.com/coding-to-music/mongodb-hacker-news

https://www.mongodb.com/community/forums/t/doing-hacker-news-stream-from-api-but-not-getting-data-back/142406

http://hnstream.com/


```java
Unofficial Hacker News Streaming API
uses HN's firebase API as the data source. endpoints below are powered by fanout.io.
contact: justin
Between this and HNSearch, maybe your programs don't have to hit HN itself too much.

All articles start: GET http://api.hnstream.com/news/items/
All articles next: GET http://api.hnstream.com/news/items/?since=cursor:{last_cursor}
All articles stream: GET http://api.hnstream.com/news/stream/
All comments start: GET http://api.hnstream.com/comments/items/
All comments next: GET http://api.hnstream.com/comments/items/?since=cursor:{last_cursor}
All comments stream: GET http://api.hnstream.com/comments/stream/
Per-article comments start: GET http://api.hnstream.com/news/{article-id}/comments/items/
Per-article comments next: GET http://api.hnstream.com/news/{article-id}/comments/items/?since=cursor:{last_cursor}
Per-article comments stream: GET http://api.hnstream.com/news/{article-id}/comments/stream/

The "all comments" API is being used below, to display the latest comments as they are posted.
```

## Bug I am having

No data seems to come back from the call to the stream API or even via Postman

```java
Time taken by addCount function: 5:40.278 (m:ss.mmm)
FINISHED
```

When I call 

```java
http://api.hnstream.com/comments/stream/
```

Or GET via postman

![image](https://user-images.githubusercontent.com/3156358/149875298-9bcb4e8a-ce97-441d-8a65-015cca67cccd.png)

## Introduction

If you're in the technology space, you've probably stumbled upon Hacker News at some point or another. Maybe you're interested in knowing what's popular this week for technology or maybe you have something to share. It's a platform for information.

The problem is that you're going to find too much information on Hacker News without a particularly easy way to filter through it to find the topics that you're interested in. Let's say, for example, you want to know information about Bitcoin as soon as it is shared. How would you do that on the Hacker News website?

In this tutorial, we're going to learn how to parse through Hacker News data as it is created, filtering for only the topics that we're interested in. We're going to do a sentiment analysis on the potential matches to rank them, and then we're going to store this information in MongoDB so we can run reports from it. We're going to do it all with Node.js and some simple pipelines.

## The Requirements
You won't need a Hacker News account for this tutorial, but you will need a few things to be successful:

Node.js 12.10 or more recent
A properly configured MongoDB Atlas cluster
We'll be storing all of our matches in MongoDB Atlas. This will make it easier for us to run reports and not depend on looking at logs or similarly structured data.

You can deploy and use a MongoDB Atlas M0 cluster for FREE. Learn more by clicking here.

Hacker News doesn't have an API that will allow us to stream data in real-time. Instead, we'll be using the Unofficial Hacker News Streaming API. For this particular example, we'll be looking at the comments stream, but your needs may vary.  http://hnstream.com/

## Installing the Project Dependencies in a New Node.js Application
Before we get into the interesting code and our overall journey toward understanding and storing the Hacker News data as it comes in, we need to bootstrap our project.

On your computer, create a new project directory and execute the following commands:

```java
npm init -y
npm install mongodb ndjson request sentiment through2 through2-filter --save
```

With the above commands, we are creating a package.json file and installing a few packages. We know mongodb will be used for storing our Hacker News Data, but the rest of the list is probably unfamiliar to you.

We'll be using the request package to consume raw data from the API. As we progress, you'll notice that we're working with streams of data rather than one-off requests to the API. This means that the data that we receive might not always be complete. To make sense of this, we use the ndjson package to get useable JSON from the stream. Since we're working with streams, we need to be able to use pipelines, so we can't just pass our JSON data through the pipeline as is. Instead, we need to use through2 and through2-filter to filter and manipulate our JSON data before passing it to another stage in the pipeline. Finally, we have sentiment for doing a sentiment analysis on our data.

We'll reiterate on a lot of these packages as we progress.

Before moving to the next step, make sure you create a main.js file in your project. This is where we'll add our code, which you'll see isn't too many lines.

### Load .env 
```java
npm i dotenv
```

create the file .env and adjust the details from the MongoDB Atlas dashboard
```java
MONGODB_URI="mongodb+srv://userid:password@cluster0.zadqe.mongodb.net/CTG-Clipper?retryWrites=true&w=majority"
```

## Connecting to a MongoDB Cluster to Store Hacker News Mentions
We're going to start by adding our downloaded dependencies to our code file and connecting to a MongoDB cluster or instance.

Open the project's main.js file and add the following code:

```java
const stream = require("stream");
const ndjson = require("ndjson");
const through2 = require("through2");
const request = require("request");
const filter = require("through2-filter");
const sentiment = require("sentiment");
const util = require("util");
const pipeline = util.promisify(stream.pipeline);
const { MongoClient } = require("mongodb");
(async () => {
    const client = new MongoClient(process.env["ATLAS_URI"], { useUnifiedTopology: true });
    try {
        await client.connect();
        const collection = client.db("hacker-news").collection("mentions");
        console.log("FINISHED");
    } catch(error) {
        console.log(error);
    }
})();
```

In the above code, we've added all of our downloaded dependencies, plus some. Remember we're working with a stream of data, so we need to use pipelines in Node.js if we want to work with that data in stages.

When we run the application, we are connecting to a MongoDB instance or cluster as defined in our environment variables. The ATLAS_URI variable would look something like this:

```java
mongodb+srv://<username>:<password>@plummeting-us-east-1.hrrxc.mongodb.net/
```

You can find the connection string in your MongoDB Atlas dashboard.

Test that the application can connect to the database by executing the following command:

```java
node main.js
```

If you don't want to use environment variables, you can hard-code the value in your project or use a configuration file. I personally prefer environment variables because we can set them externally on most cloud deployments for security (and there's no risk that we accidentally commit them to GitHub).

Parsing and Filtering Hacker News Data in Real Time
At this point, the code we have will connect us to MongoDB. Now we need to focus on streaming the Hacker News data into our application and filtering it for the data that we actually care about.

Let's make the following changes to our main.js file:

```java
(async () => {
    const client = new MongoClient(process.env["ATLAS_URI"], { useUnifiedTopology: true });
    try {
        await client.connect();
        const collection = client.db("hacker-news").collection("mentions");
        await pipeline(
            request("http://api.hnstream.com/comments/stream/"),
            ndjson.parse({ strict: false }),
            filter({ objectMode: true }, chunk => {
                return chunk["body"].toLowerCase().includes("bitcoin") || chunk["article-title"].toLowerCase().includes("bitcoin");
            })
        );
        console.log("FINISHED");
    } catch(error) {
        console.log(error);
    }
})();
```

In the above code, after we connect, we create a pipeline of stages to complete. The first stage is a simple GET request to the streaming API endpoint. The results from our request should be JSON, but since we're working with a stream of data rather than expecting a single response, our result may be malformed depending on where we are in the stream. This is normal.

To get beyond, this we can either put the pieces of the JSON puzzle together on our own as they come in from the stream, or we can use the ndjson package. This package acts as the second stage and parses the data coming in from the previous stage, being our streaming request.

By the time the ndjson.parse stage completes, we should have properly formed JSON to work with. This means we need to analyze it to see if it is JSON data we want to keep or toss. Remember, the streaming API gives us all data coming from Hacker News, not just what we're looking for. To filter, we can use the through2-filter package which allows us to filter on a stream like we would on an array in javaScript.

In our filter stage, we are returning true if the body of the Hacker News mention includes "bitcoin" or the title of the thread includes the "bitcoin" term. This means that this particular entry is what we're looking for and it will be passed to the next stage in the pipeline. Anything that doesn't match will be ignored for future stages.

## Performing a Sentiment Analysis on Matched Data
At this point, we should have matches on Hacker News data that we're interested in. However, Hacker News has a ton of bots and users posting potentially irrelevant data just to rank in people's searches. It's a good idea to analyze our match and score it to know the quality. Then later, we can choose to ignore matches with a low score as they will probably be a waste of time.

So let's adjust our pipeline a bit in the main.js file:

```java
(async () => {
    const client = new MongoClient(process.env["ATLAS_URI"], { useUnifiedTopology: true });
    const textRank = new sentiment();
    try {
        await client.connect();
        const collection = client.db("hacker-news").collection("mentions");
        await pipeline(
            request("http://api.hnstream.com/comments/stream/"),
            ndjson.parse({ strict: false }),
            filter({ objectMode: true }, chunk => {
                return chunk["body"].toLowerCase().includes("bitcoin") || chunk["article-title"].toLowerCase().includes("bitcoin");
            }),
            through2.obj((row, enc, next) => {
                let result = textRank.analyze(row.body);
                row.score = result.score;
                next(null, row);
            })
        );
        console.log("FINISHED");
    } catch(error) {
        console.log(error);
    }
})();
```

In the above code, we've added two parts related to the sentiment package that we had previously installed.

We first initialize the package through the following line:

```java
const textRank = new sentiment();
```

When looking at our pipeline stages, we make use of the through2 package for streaming object manipulation. Since this is a stream, we can't just take our JSON from the ndjson.parse stage and expect to be able to manipulate it like any other object in JavaScript.

When we manipulate the matched object, we are performing a sentiment analysis on the body of the mention. At this point, we don't care what the score is, but we plan to add it to the data which we'll eventually store in MongoDB.

The object as of now might look something like this:

```java
{
    "_id": "5ffcc041b3ffc428f702d483",
    "body": "<p>this is the body from the streaming API</p>",
    "author": "nraboy",
    "article-id": 43543234,
    "parent-id": 3485345,
    "article-title": "Bitcoin: Is it worth it?",
    "type": "comment",
    "id": 24985379,
    "score": 3
}
```

The only modification we've made to the data as of right now is the addition of a score from our sentiment analysis.

It's important to note that our data is not yet inside of MongoDB. We're just at the stage where we've made modifications to the stream of data that could be a match to our interests.

## Creating Documents and Performing Queries in MongoDB
With the data formatted how we want it, we can focus on storing it within MongoDB and querying it whenever we want.

Let's make a modification to our pipeline:

```java
(async () => {
    const client = new MongoClient(process.env["ATLAS_URI"], { useUnifiedTopology: true });
    const textRank = new sentiment();
    try {
        await client.connect();
        const collection = client.db("hacker-news").collection("mentions");
        await pipeline(
            request("http://api.hnstream.com/comments/stream/"),
            ndjson.parse({ strict: false }),
            filter({ objectMode: true }, chunk => {
                return chunk["body"].toLowerCase().includes("bitcoin") || chunk["article-title"].toLowerCase().includes("bitcoin");
            }),
            through2.obj((row, enc, next) => {
                let result = textRank.analyze(row.body);
                row.score = result.score;
                next(null, row);
            }),
            through2.obj((row, enc, next) => {
                collection.insertOne({
                    ...row,
                    "user-url": `https://news.ycombinator.com/user?id=${row["author"]}`,
                    "item-url": `https://news.ycombinator.com/item?id=${row["article-id"]}`
                });
                next();
            })
        );
        console.log("FINISHED");
    } catch(error) {
        console.log(error);
    }
})();
```

We're doing another transformation on our object. This could have been merged with the earlier transformation stage, but for code cleanliness, we are breaking them into two stages.

In this final stage, we are doing an insertOne operation with the MongoDB Node.js driver. We're taking the row of data from the previous stage and we're adding two new fields to the object before it is inserted. We're doing this so we have quick access to the URL and don't have to rebuild it later.

If we ran the application, it would run forever, collecting any data posted to Hacker News that matched our filter.

If we wanted to query our data within MongoDB, we could use an MQL query like the following:

```java
use("hacker-news");
db.mentions.find({ "score": { "$gt": 3 } });
```

The above MQL query would find all documents that have a score greater than 3. With the sentiment analysis, you're not looking at a score of 0 to 10. It is best you read through the documentation to see how things are scored.

## Conclusion
You just saw an example of using MongoDB and Node.js for capturing relevant data from Hacker News as it happens live. This could be useful for keeping your own feed of particular topics or it can be extended for other use-cases such as monitoring what people are saying about your brand and using the code as a feedback reporting tool.

This tutorial could be expanded beyond what we explored for this example. For example, we could add MongoDB Realm Triggers to look for certain scores and send a message on Twilio or Slack if a match on our criteria was found.

If you've got any questions or comments regarding this tutorial, take a moment to drop them in the MongoDB Community Forums.