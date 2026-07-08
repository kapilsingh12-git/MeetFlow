import { Router } from "express";
import { login,register } from "../controllers/user.controller.js";
import {User} from "../models/user-model.js";
const router=Router();
router.route("/login").post(login)
router.route("/register",(req,res)=>{
    console.log("route hit");
}).post(register)
router.route("/add_to_activity").post(addToHistory)
router.route("/get_all_activity").get(getUserHistory)
export default router;
