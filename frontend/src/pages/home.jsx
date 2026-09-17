import React, { useContext, useState } from 'react'
import withAuth from '../utils/withAuth'
import { useNavigate } from 'react-router-dom'
import "../App.css";
import { Button, IconButton, TextField } from '@mui/material';
import RestoreIcon from '@mui/icons-material/Restore';
import { AuthContext } from '../contexts/AuthContext';

function HomeComponent() {


    let navigate = useNavigate();
    const [meetingCode, setMeetingCode] = useState("");


    const {addToUserHistory} = useContext(AuthContext);
    let handleJoinVideoCall = async () => {
        await addToUserHistory(meetingCode)
        navigate(`/${meetingCode}`)
    }

    return (
        <>

            <div className="navBar">

                <div style={{ display: "flex", alignItems: "center" }}>

                    <h2>MeetFlow</h2>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                    <IconButton onClick={
                        () => {
                            navigate("/history")
                        }
                    } style={{ color: "white" }}>
                        <RestoreIcon />
                    </IconButton>
                    <p>History</p>

                    <Button
                        style={{ color: "white", marginLeft: "12px" }}
                        onClick={() => {
                            localStorage.removeItem("token")
                            navigate("/auth")
                        }}>
                        Logout
                    </Button>
                </div>


            </div>


            <div className="meetContainer">
                <div className="leftPanel">
                    <div>
                        <h2>Crystal-clear video calls, made simple.</h2>

                        <div style={{ display: 'flex', gap: "10px", flexWrap: "wrap" }}>

                            <TextField
                                onChange={e => setMeetingCode(e.target.value)}
                                id="outlined-basic"
                                label="Meeting Code"
                                variant="outlined"
                                sx={{
                                    input: { color: "white" },
                                    label: { color: "rgba(255,255,255,0.6)" },
                                    "& .MuiOutlinedInput-root": {
                                        borderRadius: "10px",
                                        "& fieldset": { borderColor: "rgba(255,255,255,0.25)" },
                                        "&:hover fieldset": { borderColor: "rgba(255,255,255,0.5)" },
                                    },
                                }}
                            />
                            <Button
                                onClick={handleJoinVideoCall}
                                variant='contained'
                                disabled={!meetingCode.trim()}
                                sx={{
                                    background: "linear-gradient(135deg, #ff9839, #ff5f39)",
                                    borderRadius: "10px",
                                    paddingInline: "1.6rem",
                                    textTransform: "none",
                                    fontWeight: 600,
                                }}
                            >
                                Join
                            </Button>

                        </div>
                    </div>
                </div>
                <div className='rightPanel'>
                    <img srcSet='/logo3.png' alt="" />
                </div>
            </div>
        </>
    )
}


export default withAuth(HomeComponent)