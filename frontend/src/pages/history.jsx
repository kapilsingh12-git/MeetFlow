import React, { useContext, useEffect, useState } from 'react'
import { AuthContext } from '../contexts/AuthContext'
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, Typography, IconButton, CircularProgress } from '@mui/material';
import HomeIcon from '@mui/icons-material/Home';
import EventIcon from '@mui/icons-material/Event';

export default function History() {

    const { getHistoryOfUser } = useContext(AuthContext);

    const [meetings, setMeetings] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);

    const routeTo = useNavigate();

    useEffect(() => {
        const fetchHistory = async () => {
            try {
                const history = await getHistoryOfUser();
                setMeetings(Array.isArray(history) ? history : []);
            } catch {
                setError(true);
            } finally {
                setLoading(false);
            }
        }

        fetchHistory();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    const formatDate = (dateString) => {
        const date = new Date(dateString);
        const day = date.getDate().toString().padStart(2, "0");
        const month = (date.getMonth() + 1).toString().padStart(2, "0")
        const year = date.getFullYear();
        return `${day}/${month}/${year}`
    }

    return (
        <div style={{ minHeight: "100vh", background: "var(--color-bg)", color: "white" }}>
            <div className="navBar">
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                    <IconButton onClick={() => routeTo("/home")} style={{ color: "white" }}>
                        <HomeIcon />
                    </IconButton>
                    <h2>Meeting history</h2>
                </div>
            </div>

            <div style={{ padding: "1.5rem clamp(1rem, 6vw, 4rem)" }}>
                {loading && (
                    <div style={{ display: "flex", justifyContent: "center", marginTop: "3rem" }}>
                        <CircularProgress style={{ color: "#ff9839" }} />
                    </div>
                )}

                {!loading && error && (
                    <p style={{ color: "rgba(255,255,255,0.6)", textAlign: "center", marginTop: "3rem" }}>
                        Couldn't load your history. Please try again later.
                    </p>
                )}

                {!loading && !error && meetings.length === 0 && (
                    <div style={{ textAlign: "center", marginTop: "3rem", color: "rgba(255,255,255,0.5)" }}>
                        <EventIcon style={{ fontSize: "3rem", marginBottom: "0.5rem" }} />
                        <p>No meetings yet — your joined calls will show up here.</p>
                    </div>
                )}

                {!loading && !error && meetings.length > 0 && (
                    <div style={{
                        display: "grid",
                        gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))",
                        gap: "1rem",
                    }}>
                        {meetings.map((e, i) => (
                            <Card
                                key={i}
                                variant="outlined"
                                style={{
                                    background: "rgba(255,255,255,0.04)",
                                    borderColor: "rgba(255,255,255,0.08)",
                                    borderRadius: "14px",
                                }}
                            >
                                <CardContent>
                                    <Typography style={{ color: "#ff9839", fontWeight: 600 }} gutterBottom>
                                        Code: {e.meetingCode}
                                    </Typography>
                                    <Typography style={{ color: "rgba(255,255,255,0.6)" }}>
                                        {formatDate(e.date)}
                                    </Typography>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                )}
            </div>
        </div>
    )
}