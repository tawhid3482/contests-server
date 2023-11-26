const express = require("express");
const app = express();
const cors = require("cors");
require("dotenv").config();
const port = process.env.PORT || 5000;

//Middleware
app.use(cors());
app.use(express.json());

//mongodb connection

const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.s64u1mi.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    // await client.connect();
    // all collections
    const resgisterCollection = client
      .db("last-assignment")
      .collection("registers");
    const contestCollection = client
      .db("last-assignment")
      .collection("contests");

    app.get("/contests", async (req, res) => {
      const result = await contestCollection.find().toArray();
      res.send(result);
    });

    app.get("/registers", async (req, res) => {
      const email = req.query.email;
      const query = { email: email };
      const result = await resgisterCollection.find(query).toArray();
      res.send(result);
    });

    app.post("/registers", async (req, res) => {
      const resUser = req.body;
      const result = await resgisterCollection.insertOne(resUser);
      res.send(result);
    });
    app.delete('/registers/:id',async(req,res)=>{
      const id = req.params.id
      const query = {_id: new ObjectId(id)} 
      const result = await resgisterCollection.deleteOne(query)
      res.send(result)
    })

    // Send a ping to confirm a successful connection
    // await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

// port running

app.get("/", (req, res) => {
  res.send("assignment running");
});
app.listen(port, () => {
  console.log(`assignment site ${port}`);
});
