const request = require("request");
const express = require("express");
const redis = require("redis");
const morgan = require("morgan");
const app = express();
const process = require("process");
const cache = redis.createClient("6379", "redis");

cache.on("error", () => {
  console.log("Redis connection error");
  process.exit(0);
});

app.use(morgan(":method :url :status :response-time ms"));

app.get("*", (req, res, next) => {
  console.log("Request to, server no ", process.env.SERVER);
  next();
});

app.get("/health", (req, res) => {
  cache.keys("*", (err, keys) => {
    if (err) {
      res.status(500).json({
        error: "Something wrong w/ client"
      });
    }
    res.status(200).json({
      info: `Keys stored so far = ${keys.length}`
    });
  });
});

app.get("/reset", (req, res) => {
  cache.flushall((err, reply) => {
    if (err) {
      return res.status(500).json({
        error: "Something went wrong"
      });
    }
    return res.status(200).send(`Cleared all cache ${reply}`);
  });
});

app.get("/*", (req, res) => {
  const assetUrl = "https://www.iplt20.com/" + req.url;
  cache.get(req.url, (err, reply) => {
    if (err) {
      console.error(err);
      return res.status(400).send({
        error: "Something went wrong"
      });
    }
    if (!reply) {
      request(assetUrl, (err, resp, body) => {
        if (err) {
          return res.send("lol, something went wrong");
        }
        console.log("Set to cache");
        res.send(body);
        cache.set(req.url, body);
      });
    } else {
      console.log("Served from cache");
      res.send(reply);//reply is from cache.get NOT from request
    }
  });
});

app.listen(8080, () => {
  console.log("Server listening at port 8080");
});
