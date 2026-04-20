import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import './App.css';
import LiveLog, { useLiveLog } from './LiveLog';
import ThemeSelector from './ThemeSelector';

interface User {
    username: string;
    registered_at: string;
    credential_id: string;
}

function Admin() {
    const [users, setUsers] = useState<User[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [status, setStatus] = useState<{ message: string; type: 'success' | 'error' | '' }>({ message: '', type: '' });
    const navigate = useNavigate();
    const { logs, addLog, clearLogs } = useLiveLog(); 
    const hasFetched = useRef(false);
    
    // Fetch users on component mount
    // Reference: https://react.dev/reference/react/useEffect
    useEffect(() => {
        if (hasFetched.current) return;
        hasFetched.current = true;
        fetch_registered_users();
    }, []);

    // https://www.geeksforgeeks.org/typescript/how-to-use-fetch-in-typescript/
    const fetch_registered_users = async () => {
        setIsLoading(true);
        clearLogs();
        // logs for fetching users
        addLog('>>> ADMIN: FETCH USERS <<<', 'info');
        addLog('Connecting to Backend', 'info');
        addLog('GET /admin/users', 'info');
        addLog('Querying PostgreSQL database...', 'waiting');
        
        try {
            const response = await fetch("http://localhost:5001/admin/users");
            // handle non-200 responses
            if (!response.ok) {
                addLog('Response: 500 Server Error', 'error');
                addLog('Database connection failed', 'error');
                throw new Error('failed to fetch registered user');
            }
            // handle successful response
            const data = await response.json();
            setUsers(data.users);
            // logs for successful fetch and database query results
            addLog('Response: 200 OK', 'success');
            addLog('Database Query Results', 'info');
            addLog('SELECT * FROM users', 'info');
            addLog('JOIN credentials ON user_id', 'info');
            addLog(`Records returned: ${data.users.length}`, 'success');
            
            // log each user
            if (data.users.length > 0) {
                addLog('Registered Users:', 'info');
                data.users.forEach((user: User, index: number) => {
                    addLog(`  ${index + 1}. ${user.username}`, 'info');
                });
            }
            // final log for fetch completion
            addLog('>>> FETCH COMPLETE <<<', 'success');
            
        } catch (error) {
            console.log('issue retrieving registered user', error);
            addLog('>>> FETCH FAILED <<<', 'error');
            addLog(`Error: ${error}`, 'error');
            setStatus({ message: 'Failed to load users', type: 'error' });
        } finally {
            setIsLoading(false);
        }
    };


    const revoke_credential = async (username: string) => {
        const answer = confirm(`Are you sure you want to revoke credentials for ${username}?`);
        if (!answer) {
            return;
        }

        // logs for revoking credential
        clearLogs();
        addLog('>>> ADMIN: REVOKE CREDENTIAL <<<', 'info');
        addLog(`Target user: ${username}`, 'info');
        addLog('Phase 1: Send Revocation Request', 'info');
        addLog('DELETE /admin/revoke', 'info');
        addLog(`Payload: { username: "${username}" }`, 'info');
        addLog('Connecting to backend API...', 'waiting');

        try {
            const response = await fetch("http://localhost:5001/admin/revoke", {
                method: "DELETE",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ username }),
            });

            if (!response.ok) {
                addLog('Response: 404 Not Found', 'error');
                addLog(`User "${username}" does not exist`, 'error');
                throw new Error(`Credential revoked failed for ${username}`);
            }
            
            // logs for successful revocation request
            addLog('Response: 200 OK', 'success');
            addLog('Phase 2: Database Cleanup', 'info');
            addLog('BEGIN TRANSACTION', 'info');
            addLog('DELETE FROM recovery_codes', 'info');
            addLog(`WHERE user_id = (user: ${username})`, 'info');
            addLog('Recovery codes deleted', 'success');
            addLog('DELETE FROM credentials', 'info');
            addLog(`WHERE user_id = (user: ${username})`, 'info');
            addLog('Credentials deleted', 'success');
            addLog('DELETE FROM users', 'info');
            addLog(`WHERE username = '${username}'`, 'info');
            addLog('User record deleted', 'success');
            addLog('COMMIT TRANSACTION', 'success');
            addLog('>>> REVOCATION COMPLETE <<<', 'success');
            addLog(`User "${username}" has been removed`, 'success');
            setStatus({ message: `Credential Revoked for ${username}`, type: 'success' });
            
        } catch (error) {
            console.log(error);
            addLog('', 'info');
            addLog('ROLLBACK TRANSACTION', 'error');
            addLog('>>> REVOCATION FAILED <<<', 'error');
            addLog(`Error: ${error}`, 'error');
            setStatus({ message: `Failed to revoke credential for ${username}`, type: 'error' });

        }

    };

    let content;

    if (isLoading) {
        content = <p className="loading">Loading users...</p>;
    } else if (users.length === 0) {
        content = <p className="loading">No registered users found</p>;
    } else {
        content = (
            <table className="users-table">
                <thead>
                    <tr>
                        <th>Username</th>
                        <th>Registered</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    {/* loops and transforms each item in users */}
                    {users.map((user) => (
                        <tr key={user.username}>
                            <td>{user.username}</td>
                            <td>{user.registered_at}</td>
                            <td>
                                {/* manage passkeys btn */}
                                <button className="btn-revoke" onClick={() => navigate(`/passkeys/${user.username}`)}
                                style={{ 
                                    marginRight: '5px',color: 'var(--accent-color, #4a90e2)',
                                    borderColor: 'var(--accent-color, #4a90e2)' }}>Manage</button>
                                {/* revoke btn */}
                                <button className="btn-revoke" onClick={() => revoke_credential(user.username)}>
                                    Revoke
                                </button>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        );
    }

    return (
        <div className="container">
            <ThemeSelector />
            <div className="card-wide">
                <div className="card-header">
                    <div className="icon">🔐</div>
                    <h1>Admin Dashboard</h1>
                    <p className="subtitle">Manage registered users and credentials</p>
                </div>
                <div className="card-body">
                    {/* Left panel - Stats/Info */}
                    <div className="panel education-panel">
                        <h3>📊 System Stats</h3>
                        <div className="admin-stats">
                            <div className="stat-item">
                                <span className="stat-label">Total Users</span>
                                <span className="stat-value">{users.length}</span>
                            </div>
                            <div className="stat-item">
                                <span className="stat-label">Database</span>
                                <span className="stat-value status-online">● PostgreSQL</span>
                            </div>
                            <div className="stat-item">
                                <span className="stat-label">Cache</span>
                                <span className="stat-value status-online">● Redis</span>
                            </div>
                        </div>
                        <hr style={{ borderColor: 'var(--border-color)', opacity: 0.3, margin: '15px 0' }} />
                        <h3>⚡ Quick Actions</h3>
                        <button className='btn-refresh' onClick={() => { hasFetched.current = false; fetch_registered_users(); }} style={{ marginBottom: '10px' }}>Refresh Users</button>
                        <button onClick={() => navigate('/')} className="btn-secondary">Back to Login</button>
                    </div>

            {/* Center panel - User table */}
            <div className="panel auth-panel">
                {status.message && (
                    <div className={`status ${status.type}`}>
                        {status.message}
                    </div>
                )}
                {/* content logic added */}
                {content}
                {/* Credential refresh button */}
                <button className='btn-refresh' onClick={fetch_registered_users}>
                    Refresh list of credentials
                </button>
                <button onClick={() => navigate('/')} className="btn-secondary"style={{marginTop: '10px'}}>
                    Back to Login
                </button>
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

export default Admin;