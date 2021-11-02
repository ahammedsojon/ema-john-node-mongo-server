const express = require('express');
const app = express();
const port = process.env.PORT || 5000;
const { MongoClient } = require('mongodb');
require('dotenv').config();
const cors = require('cors');
var admin = require("firebase-admin");

// firebase admin 

var serviceAccount = require('./ema-john-simple-360b4-firebase-adminsdk-hbotk-5b33eb0668.json');

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});


// middleware
app.use(cors());
app.use(express.json());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.a6jam.mongodb.net/myFirstDatabase?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true });

async function verifyToken(req, res, next) {
    if (req.headers?.authorization?.startsWith('Bearer ')) {
        const idToken = req.headers.authorization.split('Bearer ')[1];

        try {
            const decodedUser = await admin.auth().verifyIdToken(idToken);
            req.decodedUser = decodedUser.email;
        }
        catch {

        }
    }
    next();
}
async function run() {

    try {
        await client.connect();

        const database = client.db('online_shop');
        const productCollection = database.collection('products');
        const orderCollection = database.collection('orders');

        // GET API
        app.get('/products', async (req, res) => {
            const cursor = productCollection.find({});
            const page = req.query.page;
            const size = parseInt(req.query.size);
            let products;
            const count = await cursor.count();
            if (page) {
                products = await cursor.skip(page * size).limit(size).toArray();
            } else {
                products = await cursor.toArray();
            }
            res.json({
                count,
                products
            });
        })

        app.get('/orders', verifyToken, async (req, res) => {
            const email = req.query.email;
            if (req.decodedUser === email) {
                const query = { email: email }
                const cursor = orderCollection.find(query);
                const result = await cursor.toArray();
                res.send(result);
            }
            else {
                res.status(401).json({ message: 'User not authorized' });
            }
        })
        // POST API
        app.post('/products/bykeys', async (req, res) => {
            const keys = req.body;
            const query = { key: { $in: keys } }
            const products = await productCollection.find(query).toArray();
            console.log('hitting post', req.body)
            res.send(products);
        })
        app.post('/order', async (req, res) => {
            const order = req.body;
            order.date = new Date();
            const result = await orderCollection.insertOne(order)
            res.json(result);
        })
    }
    finally {
        // await client.close();
    }
}
run().catch(console.dir);
app.get('/', (req, res) => {
    res.send('Ema john server is runnig');
})
app.get('/hello', (req, res) => {
    res.send('Hello, Ema john server is runnig');
})

app.listen(port, () => {
    console.log('listening at port: ', port);
})