const { Client } = require("@elastic/elasticsearch");

const es = new Client({
  node: "http://localhost:9200",
});

module.exports = es;
