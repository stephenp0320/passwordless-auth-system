import { startRegistration } from "@simplewebauthn/browser";
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './App.css';

function Recovery() {
  const [username, setUsername] = useState("");
  const [recoveryCode, setRecoveryCode] = useState("");
  const [status, setStatus] = useState<{ message: string; type: 'success' | 'error' | '' }>({ message: '', type: '' });
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const recoverAccount = async () => {
    if (!username.trim() || !recoveryCode.trim()) {
      setStatus({ message: 'Please enter username and recovery code', type: 'error' });
      return;
    }

    setIsLoading(true);
    setStatus({ message: '', type: '' });

    try {
      // code verification
      const response = await fetch("http://localhost:5001/recover", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, recovery_code: recoveryCode }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Recovery failed');
      }

      // passkey registration
      const credentials = await startRegistration(result.options.publicKey);

      // completed registration
      await fetch("http://localhost:5001/register/finish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, credential: credentials }),
      });

      setStatus({ 
        message: `Recovery successful! You have ${result.codes_remaining} recovery codes left.`, 
        type: 'success' 
      });
      
      // Redirect to login after 2 seconds
      setTimeout(() => navigate('/'), 2000);
    } catch (error: unknown) {
      console.error(error);
      const errorMessage = error instanceof Error ? error.message : 'Recovery failed';
      setStatus({ message: errorMessage, type: 'error' });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container">
      <div className="card">
        <div className="icon">🔑</div>
        <h1>Account Recovery</h1>
        <p className="subtitle">Use a recovery code to register a new passkey</p>

        <div className="form">
          <input
            type="text"
            placeholder="Username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            disabled={isLoading}
          />
          <input
            type="text"
            placeholder="Recovery code (e.g. A1B2-C3D4)"
            value={recoveryCode}
            onChange={(e) => setRecoveryCode(e.target.value.toUpperCase())}
            disabled={isLoading}
          />
          
          <button onClick={recoverAccount} disabled={isLoading} className="btn-primary">
            {isLoading ? 'Please wait...' : 'Recover Account'}
          </button>
          
          <button onClick={() => navigate('/')} className="btn-secondary">
            Back to Login
          </button>
        </div>

        {status.message && (
          <div className={`status ${status.type}`}>
            {status.message}
          </div>
        )}
      </div>
    </div>
  );
}

export default Recovery;