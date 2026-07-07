import express from "express";
import {createServer} from "node:http";
import { Server } from "socket.io";
import mongoose, { connections } from "mongoose";
import connectToSocket from "./controllers/socket-manager.js";
import cors from "cors";
import userRoutes from "./routes/users-routes.js"
import router from "./routes/users-routes.js";
const app=express();
const server=createServer(app);
const io=connectToSocket(server)
app.set("port",(process.env.port||8000));
app.use(cors());
app.use(express.json({limit:"40kb"}));
app.use(express.urlencoded({limit:"40kb",extended:true}))
app.use("/api/v1/users",userRoutes);
// app.use("/api/v2/users",newuserroutes)
 app.get("/home",(req,res)=>{
    return res.json({"hello":"world"});

 });
 const start=async()=>{
    app.set("mongo_user")
    const connectiondb=await mongoose.connect("mongodb+srv://kapilsinghchandrawat_db_user:fonLB11Uo18UO7tP@cluster0.2ri15bf.mongodb.net/")
    console.log(`mongo connecteddb host:${connectiondb.connection.host}`)
    app.listen(app.get("port"),()=>{
        console.log("listening on port 8000");
    });
 }
start();