const express = require("express");
const app = express();
const cors = require("cors");
const jwt = require("jsonwebtoken");
require("dotenv").config();
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
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
    const userCollection = client.db("last-assignment").collection("users");
    const paymentCollection = client.db("last-assignment").collection("payments");
    const winnerCollection = client.db("last-assignment").collection("winners");
    const resMemberCollection = client.db("last-assignment").collection("resMembers");
    const contestsCountCollection = client.db("last-assignment").collection("contestCounts");


    // jwt api
    app.post("/jwt", async (req, res) => {
      const user = req.body;
      const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {
        expiresIn: "1h",
      });
      res.send({ token });
    });

    //middleware jwt
    const verifyToken = (req, res, next) => {
      // console.log("insite verify", req.headers.authorization);
      if (!req.headers.authorization) {
        return res.status(401).send({ message: "unauthorized accesss" });
      }
      const token = req.headers.authorization.split(" ")[1];
      jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (error, decoded) => {
        if (error) {
          return res.status(401).send({ message: "unauthorized access" });
        }
        req.decoded = decoded;

        next();
      });
    };

    const verifyAdmin = async (req, res, next) => {
      const email = req.decoded.email;
      const query = { email: email };
      const user = await userCollection.findOne(query);
      const isAdmin = user?.role === "admin";
      if (!isAdmin) {
        return res.status(403).send({ message: "forbidden access" });
      }
      next();
    };
    //
    // resMembers api
    app.get('/resMembers', async (req, res) => {
      const email = req.query.email; 
      const filter = { email: email };
      const result = await resMemberCollection.find(filter).toArray();
      res.send(result);
    });
    
    app.post('/resMembers',async(req,res)=>{
      const user = req.body;
      const query = { email: user?.email };
      const exitingres = await resMemberCollection.findOne(query);
      if (exitingres) {
        return res.send({ message: "Registration already complete", insertedId: null });
      }
      const result = await resMemberCollection.insertOne(user);
      res.send(result);
    })

    // user api
    app.post("/users", async (req, res) => {
      const user = req.body;
      const query = { email: user?.email };
      const exitingUser = await userCollection.findOne(query);
      if (exitingUser) {
        return res.send({ message: "user already exit", insertedId: null });
      }
      const result = await userCollection.insertOne(user);
      res.send(result);
    });

    app.get("/users", verifyToken, verifyAdmin, async (req, res) => {
      const result = await userCollection.find().toArray();
      res.send(result);
    });

    app.get("/users/admin/:email", verifyToken, async (req, res) => {
      const email = req.params.email;
      if (email !== req.decoded.email) {
        return res.status(403).send({ message: "forbidden access" });
      }

      const query = { email: email };
      const user = await userCollection.findOne(query);
      let admin = false;
      if (user) {
        admin = user?.role === "admin";
      }
      res.send({ admin });
    });

    app.delete("/users/:id", verifyToken, verifyAdmin, async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await userCollection.deleteOne(query);
      res.send(result);
    });
    app.patch(
      "/users/admin/:id",
      verifyToken,
      verifyAdmin,
      async (req, res) => {
        const id = req.params.id;
        const query = { _id: new ObjectId(id) };
        const updatedDoc = {
          $set: {
            role: "admin",
          },
        };
        const result = await userCollection.updateOne(query, updatedDoc);
        res.send(result);
      }
    );
    // contests api
    app.get("/contests", async (req, res) => {
      const result = await contestCollection.find().toArray();
      res.send(result);
    });
    app.get("/contests/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await contestCollection.findOne(query);
      res.send(result);
    });

    app.post("/contests", verifyToken, verifyAdmin, async (req, res) => {
      const contest = req.body;
      const result = await contestCollection.insertOne(contest);
      res.send(result);
    });
    app.patch("/contests/:id", verifyToken, verifyAdmin, async (req, res) => {
      const item = req.body;
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const updatedDoc = {
        $set: {
          name: item.name,
          count: item.count,
          fee: item.fee,
          deadline: item.deadline,
          contestDescription: item.contestDescription,
          shortDescription: item.shortDescription,
          contestPrize: item.contestPrize,
          img: item.img,
        },
      };
      const result = await contestCollection.updateOne(query, updatedDoc);
      res.send(result);
    });
    app.delete("/contests/:id", verifyToken, verifyAdmin, async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await contestCollection.deleteOne(query);
      res.send(result);
    });

    // registers api
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
    app.delete("/registers/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await resgisterCollection.deleteOne(query);
      res.send(result);
    });

    // payments api
    app.post("/create-payment-intent", async (req, res) => {
      const { fee } = req.body;
      const amount = parseInt(fee * 100);

      const paymentIntent = await stripe.paymentIntents.create({
        amount: amount,
        currency: "usd",
        payment_method_types: ["card"],
      });
      res.send({
        clientSecret: paymentIntent.client_secret,
      });
    });
    app.get("/payments/:email", verifyToken, async (req, res) => {
      const query = { email: req.params.email };
      if (req.params.email !== req.decoded.email) {
        return res.status(403).send({ message: "forbidden access" });
      }
      const result = await paymentCollection.find(query).toArray();
      res.send(result);
    });

    app.post("/payments", async (req, res) => {
      const payment = req.body;
      const query = {
        _id: {
          $in: payment.cartIds.map((id) => new ObjectId(id)),
        },
      };
      console.log(query)
      const deleteResult = await resgisterCollection.deleteMany(query);

      const paymentResult = await paymentCollection.insertOne(payment);
      res.send({ paymentResult, deleteResult });
    });

    // stats 
    app.get("/admin-status",verifyToken,verifyAdmin, async (req, res) => {
      const user = await userCollection.estimatedDocumentCount();
      const menuItems = await contestCollection.estimatedDocumentCount();
      const orderItems = await paymentCollection.estimatedDocumentCount();
      const result = await paymentCollection
        .aggregate([
          {
            $group: {
              _id: null,
              totalRevenue: {
                $sum: "$fee",
              },
            },
          },
        ])
        .toArray();
      const revenue = result.length > 0 ? result[0].totalRevenue : 0;
      res.send({
        user,
        menuItems,
        orderItems,
        revenue,
      });
    });
    /// winner api

    app.get('/winners',async(req,res)=>{
      const result = await winnerCollection.find().toArray()
      res.send(result)
    })

    app.post("/winners", verifyToken, verifyAdmin, async (req, res) => {
      const contest = req.body;
      const result = await winnerCollection.insertOne(contest);
      res.send(result);
    });

    // contest count api

    app.get('/contestCount',async(req,res)=>{
      const count = await contestCollection.estimatedDocumentCount()
      res.send({count})
    })


    // Send a ping to confirm a successful connecti
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
