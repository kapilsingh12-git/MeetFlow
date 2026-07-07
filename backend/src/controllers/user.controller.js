import httpStatus from "http-status";
import { user } from "../models/user-model.js";
import router from "../routes/users-routes.js";
import bcrypt from "bcrypt";
import crypto from "crypto";


//LOGIN
const login = async (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) {
        return res.status(400).json({ messege: "please provide" })
    }
    try {
        const User = await user.findOne({ username });
        if (!User) {
            return res.status(httpStatus.NOT_FOUND).json({ messege: "user not found" })
        }
        const isMatch = await bcrypt.compare(password, User.password);
        if (isMatch) {
            let token = crypto.randomBytes(20).toString("hex");
            User.token = token;

            await User.save();
            return res.status(httpStatus.OK).json({ token: token });

        }

    }
    catch (e) {
        return res.status(500).json({ messege: `something went wrong ${e}` })
    }
}



//REGISTER
const register = async (req, res) => {
    const { name, username, password } = req.body;
    try {
        const existingUser = await user.findOne({ username, password })
        if (existingUser) {
            return res.status(httpStatus.fOUND).json({ messege: "user already exist" })
        }
        const hashedpassword = await bcrypt.hash(password, 10)
        const newuser = new user({
            name: name,
            username: username,
            password: hashedpassword
        });
        await newuser.save();
        res.status(httpStatus.CREATED).json({ messege: "user registered" })



    } catch (e) {
        res.json({ messege: "something went wrong" })
    }
}
export { login, register };