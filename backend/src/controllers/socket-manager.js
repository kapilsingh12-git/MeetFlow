import { Server } from "socket.io";
let connection = {};
let message = {};
let timeOnline = {};

const connectToSocket = (server) => {
    const io = new Server(server,{
        cors:{
            origin:"*",
            methods:["get","post"],
            allowedheaders:["*"],
            credentials:true
        }
    });
    io.on("connection", (socket) => {
        socket.on("join-call", (path) => {
            if (connection[path] === undefined) {
                connection[path].push(socket.id);
                timeOnline[socket.id] = new Date();
                // connection[path].foreach
                for (let a = 0; a < connection[path].length; i++) {
                    io.on(connection[path][a]).emit(user - joined, socket.id, connection[path])
                }
                if (message[path] === undefined) {
                    for (let a = 0; a < message[path].length; ++a) {
                        io.to(socket.id).emit("chat-message", message[path][a]['data'],

                            message[path][a]['sender'], message[path][a]['socket-id-sender']
                        )
                    }
                }
            }

        })
        socket.on("signal", (toId, messege) => {
            io.on(toId).emit("signal", socket.id, messege);


        })
        socket.on("chat-message", (data, sender) => {
            const [matchingroom, found] = Object.entries(connection)
                .reduce(([room, isFound], [roomKey, roomValue]) => {
                    if (!isFound && roomValue.includes(socket.id)) {
                        return [roomKey, true];
                    }
                    return [room, isFound];
                }, ['', false]);
            if (found === true) {
                if (message[matchingroom] === undefined) {
                    message[matchingroom] = []
                }
                message[matchingroom].push({ 'sender': sender, "data": data, "socket-id-sender": socket.id })
                console.log("message", matchingroom, ":", sender, data)
                connection[matchingroom].forEach((elem) => {
                    io.to(elem).emit("chat-message", data, sender, socket.id)
                })
            }
        }

        )


        socket.on("disconnect", () => {
            var difftime = Math.abs(timeOnline[socket.id] - new Date())
            var key
            for (const [k, v] of JSON.parse(JSON.stringify(Object.entries(connection)))) {
                for (let a = 0; a < v.length; ++a) {
                    if (v[a] === socket.id) {
                        key = k
                        for (let a = 0; a < connection[key].length; ++a) {
                            io.to(connection[key][a]).emit('user-left', socket.id)
                        }
                        var index = connection[key].indexoF(socket.id)
                        connection[key].splice(index, 1)
                        if (connection[key].length === 0) {
                            delete connection[key]
                        }
                    }
                }
            }
        })

    })
    return io;
}
export default connectToSocket;