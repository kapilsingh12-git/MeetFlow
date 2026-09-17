// import express from "express";
// import { createServer } from "node:http";

// import { Server } from "socket.io";

// import mongoose from "mongoose";
// import { connectToSocket } from "./controllers/socket-manager.js";

// import cors from "cors";
// import userRoutes from "./routes/users-routes.js";

// const app = express();
// const server = createServer(app);
// const io = connectToSocket(server);


// app.set("port", (process.env.PORT || 8000))
// app.use(cors());
// app.use(express.json({ limit: "40kb" }));
// app.use(express.urlencoded({ limit: "40kb", extended: true }));

// app.use("/api/v1/users", userRoutes);

// const start = async () => {
//     app.set("mongo_user")
//     const connectionDb = await mongoose.connect("mongodb+srv://kapilsinghchandrawat_db_user:fonLB11Uo18UO7tP@cluster0.2ri15bf.mongodb.net/")

//     console.log(`MONGO Connected DB HOst: ${connectionDb.connection.host}`)
//     server.listen(app.get("port"), () => {
//         console.log("LISTENIN ON PORT 8000")
//     });



// }



// start();
import "dotenv/config";
import express from "express";
import { createServer } from "node:http";

import mongoose from "mongoose";
import { connectToSocket } from "./controllers/socket-manager.js";

import cors from "cors";
import userRoutes from "./routes/users-routes.js";

const app = express();
const server = createServer(app);
connectToSocket(server);

const PORT = process.env.PORT || 8000;
const MONGO_URI = process.env.MONGO_URI;

app.use(cors());
app.use(express.json({ limit: "40kb" }));
app.use(express.urlencoded({ limit: "40kb", extended: true }));

app.get("/", (req, res) => {
    res.status(200).json({ status: "ok" });
});

app.use("/api/v1/users", userRoutes);

const start = async () => {
    if (!MONGO_URI) {
        console.error("MONGO_URI is not set. Create a .env file (see .env.example) before starting the server.");
        process.exit(1);
    }

    try {
        const connectionDb = await mongoose.connect(MONGO_URI);
        console.log(`MONGO Connected DB Host: ${connectionDb.connection.host}`);

        server.listen(PORT, () => {
            console.log(`LISTENING ON PORT ${PORT}`);
        });
    } catch (err) {
        console.error("Failed to start server:", err);
        process.exit(1);
    }
};

start();