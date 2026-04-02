import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import "./App.css";
import LiveLog, { useLiveLog } from './LiveLog';
import ThemeSelector from './ThemeSelector';

interface Passkey {
    id: number;
    credential_id: string;
    registered_at: string;
    authenticator_type?: string;
    backup_eligible?: boolean;
}

function PasskeyManager() {
    const { username } = useParams<{ username: string }>();
    const [passkeys, setPasskeys] = useState<Passkey[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [status, setStatus] = useState<{ message: string; type: 'success' | 'error' | '' }>({ message: '', type: '' });
    const navigate = useNavigate();
    const { logs, addLog, clearLogs } = useLiveLog();
    
    // Fetch users passkeys 
    const fetch_user_passkeys = useCallback(async () => {
        setIsLoading(true)
        clearLogs()
        
        addLog('>>> FETCH PASSKEYS <<<', 'info')
        addLog(`User: ${username}`, 'info')        
        addLog('Connecting to API', 'info')
        addLog('POST /user/passkeys', 'info')
        addLog('Sending request...', 'waiting')
        
        try {
            const response = await fetch("http://localhost:5001/user/passkeys", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ username }),
            })

            if (!response.ok){
                addLog('Response: 404 Not Found', 'error')
                addLog('User not found in database', 'error')
                throw new Error("Failed to fetch users passkeys");
            }
            
            const data = await response.json();
            addLog('Response: 200 OK', 'success')
            addLog('Query Results', 'info')
            addLog('SELECT * FROM credentials', 'info')
            addLog(`WHERE user_id = (user: ${username})`, 'info')
            addLog(`Found ${data.passkeys.length} registered passkeys`, 'success')
            
            // log details for each passkey
            if (data.passkeys.length > 0) {
                addLog('', 'info')
                addLog('► Passkey Details', 'info')
                data.passkeys.forEach((pk: Passkey, idx: number) => {
                    addLog(`[${idx + 1}] ID: ${pk.credential_id.substring(0, 12)}...`, 'info')
                    addLog(`    Registered: ${pk.registered_at}`, 'info')
                });
            }
            
            setPasskeys(data.passkeys);
        } catch(error) {
            console.log('Issue fetching passkeys:', error)
            addLog('>>> FETCH FAILED <<<', 'error')
            addLog(`Error: ${error}`, 'error')
            setStatus({message: "Error loading passkeys", type: "error"})
        } finally {
            setIsLoading(false)
        }
    }, [username, addLog, clearLogs]);

    useEffect(() => {
        if (username) {
            fetch_user_passkeys();
        }
    }, [username, fetch_user_passkeys]);

    const delete_user_passkey = async (passkeyId: number, credentialId: string) => {
        const confirmed = confirm("Are you sure you would like to delete this passkey?")
        // finish if they dont want to delete passkey
        if (!confirmed){
            return 
        }

        clearLogs()
        addLog('═══ DELETE PASSKEY ═══', 'info')
        addLog(`User: ${username}`, 'info')
        addLog(`Passkey ID: ${passkeyId}`, 'info')
        addLog(`Credential: ${credentialId.substring(0, 16)}...`, 'info')
        addLog('Pre-deletion Check', 'info')
        addLog(`Total passkeys: ${passkeys.length}`, 'info')
        
        if (passkeys.length === 1) {
            addLog('Cannot delete last passkey!', 'error')
            addLog('User must have at least one credential', 'error')
            return
        }
        addLog('Multiple passkeys exist - deletion allowed', 'success')
        addLog('Connecting to API', 'info')
        addLog(`DELETE /user/passkeys/${passkeyId}`, 'info')
        addLog('Sending request...', 'waiting')
        try {
            const response = await fetch(`http://localhost:5001/user/passkeys/${passkeyId}`, {
                method:"DELETE",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ username }),
            })

            if(!response.ok){
                const data = await response.json()
                addLog('Response: 400 Bad Request', 'error')
                addLog(`Error: ${data.error}`, 'error')
                throw new Error(data.error || "Error deleting selected passkey")
            }

            addLog('Response: 200 OK', 'success')
            addLog('Database Operations', 'info')
            addLog('DELETE FROM credentials', 'info')
            addLog(`WHERE id = ${passkeyId}`, 'info')
            addLog('Credential removed from PostgreSQL', 'success')
            addLog('>>> DELETION COMPLETE <<<', 'success')
            addLog(`Remaining passkeys: ${passkeys.length - 1}`, 'info')

            setStatus({message: "Passkey deleted successfully", type: "success"})
            fetch_user_passkeys()
        } catch(error){
            console.log('Issue deleting passkey:', error)
            addLog('', 'info')
            addLog('>>> DELETION FAILED <<<', 'error')
            addLog(`Error: ${error}`, 'error')
            setStatus({message: "Error deleting passkey", type: "error"})
        }
        
    };

    let content;

    if (isLoading){
        content = <p className="loading">Loading passkeys...</p>;
    } else if (passkeys.length === 0){
        content = <p className="loading">No passkeys are registered</p>
    } else {
        content = (
            <table className="users-table">
                <thead>
                    <tr>
                        <th>Credential ID</th>
                        <th>Registered</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    {passkeys.map((passkey) => (
                        <tr key={passkey.id}>
                            <td>{passkey.credential_id.substring(0, 16)}...</td>
                            <td>{passkey.registered_at}</td>
                            <td> 
                                <button 
                                    className="btn-revoke" 
                                    onClick={() => delete_user_passkey(passkey.id, passkey.credential_id)}
                                    disabled={passkeys.length === 1}
                                    title={passkeys.length === 1 ? "Cannot delete last passkey" : "Delete this passkey"}>
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
            <ThemeSelector />
            <div className="card-wide">
                <div className="card-header">
                    <div className="icon">🔑</div>
                    <h1>My Passkeys</h1>
                    <p className="subtitle">Managing passkeys for {username}</p>
                </div>

                <div className="card-body">
                    {/* Left panel - Info */}
                    <div className="panel education-panel">
                        <h3>📊 Passkey Info</h3>
                        <div className="admin-stats">
                            <div className="stat-item">
                                <span className="stat-label">Total Passkeys</span>
                                <span className="stat-value">{passkeys.length}</span>
                            </div>
                            <div className="stat-item">
                                <span className="stat-label">User</span>
                                <span className="stat-value">{username}</span>
                            </div>
                        </div>
                        <hr style={{ borderColor: 'var(--border-color)', opacity: 0.3, margin: '15px 0' }} />
                        <h3>💡 Tips</h3>
                        <p style={{ fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '8px' }}>• Register multiple passkeys for backup </p>
                        <p style={{ fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '8px' }}>• You cannot delete your last passkey</p>
                        <p style={{ fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '15px' }}>• Keep recovery codes safe</p>
                        <button className="btn-refresh" onClick={fetch_user_passkeys} style={{ marginBottom: '10px' }}>Refresh Passkeys</button>
                        <button onClick={() => navigate('/')} className="btn-secondary">Back to Login</button>
                    </div>

                    {/* Center panel - Passkey table */}
                    <div className="panel auth-panel">
                        {status.message && (
                            <div className={`status ${status.type}`}>
                                {status.message}
                            </div>
                        )}
                        {content}
                    </div>

                    {/* Right panel - Live Log */}
                    <div className="panel log-panel">
                        <LiveLog logs={logs} />
                    </div>
                </div>
            </div>
        </div>
    );

}

    

export default PasskeyManager;