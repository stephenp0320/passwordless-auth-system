import { useState, useEffect, useCallback } from "react";
import { useParams } from "react-router-dom";
import "./App.css";

interface Passkey {
    id: number;
    credential_id: string;
    registered_at: string;
}

function PasskeyManager() {
    const { username } = useParams<{ username: string }>();
    const [Passkey, setPasskey] = useState<Passkey[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [status, setStatus] = useState<{ message: string; type: 'success' | 'error' | '' }>({ message: '', type: '' });    
    
    // Fetch users passkeys 
    const fetch_user_passkeys = useCallback(async () => {
        setIsLoading(true)
        try {
            const response = await fetch("http://localhost:5001/user/passkeys", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ username}),
            })

            if (!response.ok){
                throw new Error("Failed to fetch users passkeys");
            }
            const data = await response.json();
            setPasskey(data.passkeys);
        } catch(error) {
            console.log('Issue fetching passkeys:', error)
            setStatus({message: "Error loading passkeys", type: "error"})
        } finally {
            setIsLoading(false)
        }
    }, [username]);

    useEffect(() => {
        if (username) {
            fetch_user_passkeys();
        }
    }, [username, fetch_user_passkeys]);

    const delete_user_passkey = async (passkeyId:number) => {
        const confirmed = confirm("Are you sure you would like to delete this passkey?")
        // finish if they dont want to delete passkey
        if (!confirmed){
            return 
        }

        try {
            const response = await fetch(`http://localhost:5001/user/passkeys/${passkeyId}`, {
                method:"DELETE",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ username}),
            })

            if(!response.ok){
                const data = await response.json()
                throw new Error(data.error || "Error deleting selected passkey")
            }

            setStatus({message: "Passkey deleted successfully", type: "success"})
            fetch_user_passkeys()
        } catch(error){
            console.log('Issue deleting passkey:', error)
            setStatus({message: "Error deleting passkey", type: "error"})
        }
        
    };

    let content;

    if (isLoading){
        content = <p className="loading">Loading passkeys...</p>;
    } else if (Passkey.length === 0){
        content = <p>No passkeys are registered</p>
    } else {
        content = (
            <table className="users-table">
                <thead>
                    <tr>
                        <th>Passkey ID</th>
                        <th>Registered</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    {Passkey.map((passkey) => (
                        <tr key={passkey.id}>
                            <td>{passkey.credential_id.substring(0, 16)}...</td>
                            <td>{passkey.registered_at}</td>
                            <td> 
                                <button 
                                    className="btn-revoke" 
                                    onClick={() => delete_user_passkey(passkey.id)}
                                    disabled={Passkey.length === 1}>
                                    Delete
                                </button>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        );
    }

    // passkey manager card
    return (
        <div className="container">
            <div className="card">
                <div className="icon">🔑</div>
                <h1>My Passkeys</h1>
                <p className="subtitle">Managing passkeys for {username}</p>

                {status.message && (
                    <div className={`status ${status.type}`}>
                        {status.message}
                    </div>
                )}

                {content}

                <button className="btn-refresh" onClick={fetch_user_passkeys}>
                    Refresh
                </button>
            </div>
        </div>
    );

}

    

export default PasskeyManager;