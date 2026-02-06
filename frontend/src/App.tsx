import { startRegistration, startAuthentication } from "@simplewebauthn/browser";
import { useState } from 'react';
import './App.css';
import { useNavigate } from 'react-router-dom';


// https://simplewebauthn.dev/docs/packages/browser
// https://react.dev/reference/react/useState
function App() {
  const [username, setUsername] = useState("")
  const [status, setStatus] = useState<{ message: string; type: 'success' | 'error' | '' }>({ message: '', type: '' })
  const [isLoading, setIsLoading] = useState(false)

  const navigate = useNavigate();


  // Passkey registration flow
  const register = async () => {
    if (!username.trim()) {
      setStatus({ message: 'Please enter a username', type: 'error' })
      return
    }
    
    setIsLoading(true)
    setStatus({ message: '', type: '' })
    
    try {
      // Fetch registration options from server
      // https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API
      const response = await fetch("http://localhost:5001/register/start", {
        method: "POST",
        headers: { "Content-type": "application/json" },
        body: JSON.stringify({ username }),
      });

      const options = await response.json();
      console.log("Options received:", options);
      // Trigger browser's WebAuthn credential creation
      // https://simplewebauthn.dev/docs/packages/browser#startregistration
      const credentials = await startRegistration(options.publicKey);

      const finish_response = await fetch("http://localhost:5001/register/finish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, credential: credentials }),
      });

      // check if recovery codes are returned
      const res = await finish_response.json()
      if (res.recovery_codes) {
        // https://www.w3schools.com/jsref/met_win_alert.asp
        alert( // show the generated recovery codes to the user
          "SAVE THESE RECOVERY CODES!\n\n" +
          "If you lose your device, use one of these codes to recover your account:\n\n" +
          res.recovery_codes.join("\n") +
          "\n\nEach code can only be used once."
        );
      }
      
      // await fetch("http://localhost:5001/register/finish", {
      //   method: "POST",
      //   headers: { "Content-Type": "application/json" },
      //   body: JSON.stringify({ username, credential: credentials }),
      // });
      
      setStatus({ message: 'Registration successful! You can now login.', type: 'success' })
    } catch (error) {
      console.error(error)
      setStatus({ message: 'Registration failed. Please try again.', type: 'error' })
    } finally {
      setIsLoading(false)
    }
  };

  // Passwordless login flow
  const login = async () => {
    if (!username.trim()) {
      setStatus({ message: 'Please enter a username', type: 'error' })
      return
    }
    
    setIsLoading(true)
    setStatus({ message: '', type: '' })
    
    try {
      // Fetch authentication options from server
      const response = await fetch("http://localhost:5001/login/start", {
        method: "POST",
        headers: { "Content-type": "application/json" },
        body: JSON.stringify({ username }),
      });

      if (!response.ok) {
        throw new Error('User not registered')
      }

      const options = await response.json();
      console.log("Login options received:", options);

      //Trigger browser's WebAuthn authentication
      //https://simplewebauthn.dev/docs/packages/browser#startauthentication
      const assertion = await startAuthentication(options.publicKey);

      // Send assertion to server for verification
      await fetch("http://localhost:5001/login/finish", {
        method: "POST",
        headers: { "Content-type": "application/json" },
        body: JSON.stringify({ username, credential: assertion }),
      });
      
      setStatus({ message: `Welcome back, ${username}!`, type: 'success' })
      navigate('/admin') // naviagtes to the admin screen
    } catch (error) {
      console.error(error)
      setStatus({ message: 'Login failed. Make sure you are registered.', type: 'error' })
    } finally {
      setIsLoading(false)
    }
  };

  // Passwordless login flow
  const usernamelessLogin = async () => {
    setIsLoading(true)
    setStatus({ message: '', type: '' })
    
    try { // start the login without the need for username
      const response = await fetch("http://localhost:5001/login/start/usernameless", {
        method: "POST",
        headers: { "Content-type": "application/json" },
        body: JSON.stringify({}),
      });

      if (!response.ok) {
        throw new Error('Login failed')
      }

      const options = await response.json();
      console.log("Usernameless login options received:", options);

      //Trigger browser's WebAuthn authentication
      //https://simplewebauthn.dev/docs/packages/browser#startauthentication
      const assertion = await startAuthentication(options.publicKey);

      // server gets the username from usr_handle
      const finishRes = await fetch("http://localhost:5001/login/finish/usernameless", {
        method: "POST",
        headers: { "Content-type": "application/json" },
        body: JSON.stringify({ credential: assertion }),
      });

      const result = await finishRes.json();
      if (!finishRes.ok){
        throw new Error(result.error|| 'Login failed')
      }    
      
      setStatus({ message: `Welcome back, ${username}!`, type: 'success' })
      navigate('/admin') // naviagtes to the admin screen
    } catch (error) {
      console.error(error)
      setStatus({ message: 'Login failed. Make sure you are registered.', type: 'error' })
    } finally {
      setIsLoading(false)
    }
  };




  //UI Component
  //https://react.dev/learn/writing-markup-with-jsx
  return (
    <div className="container">
      <div className="card">
        <div className="icon">🔐</div>
        <h1>Passwordless Auth</h1>
        <p className="subtitle">Secure authentication using passkeys</p>
        
        <div className="form">
          <input
            type="text"
            placeholder="Enter username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            disabled={isLoading}
          />
          
          <div className="buttons">
            <button onClick={register} disabled={isLoading} className="btn-primary">
              {isLoading ? 'Please wait...' : 'Register Passkey'}
            </button>
            <button onClick={login} disabled={isLoading} className="btn-secondary">
              {isLoading ? 'Please wait...' : 'Login with username'}
            </button>
            <button onClick={usernamelessLogin} disabled={isLoading} className="btn-secondary">
              {isLoading ? 'Please wait...' : 'Login with Passkey'}
            </button>
          </div>
        </div>



        {status.message && (
          <div className={`status ${status.type}`}>
            {status.message}
          </div>
        )}
      </div>
    </div>
  )
}

export default App